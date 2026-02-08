import type { NextRequest } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { compilePolicy, type PolicyPack } from "@/lib/policyEngine";
import { isUuidLike, isValidLlm } from "../shared/slotUtils";
import type { KbRow } from "../shared/types";
import {
  fetchAdminKbs,
  fetchAgent,
  fetchKb,
  getRecentTurns,
  matchesAdminGroup,
  createSession,
} from "../services/dataAccess";
import { prepareSessionState } from "./sessionRuntime";
import { pushRuntimeTimingStage, type RuntimeTimingStage } from "./runtimeSupport";

type Body = {
  agent_id?: string;
  message?: string;
  session_id?: string;
  llm?: "chatgpt" | "gemini";
  kb_id?: string;
  inline_kb?: string;
  admin_kb_ids?: string[];
  mcp_tool_ids?: string[];
  mcp_provider_keys?: string[];
  mode?: string;
  runtime_flags?: {
    restock_lite?: boolean;
  };
};

type BootstrapParams = {
  req: NextRequest;
  debugEnabled: boolean;
  timingStages: RuntimeTimingStage[];
  respond: (payload: Record<string, unknown>, init?: ResponseInit) => Response;
};

export async function bootstrapRuntime(params: BootstrapParams): Promise<
  | { response: Response; state: null }
  | {
      response: null;
      state: {
        context: any;
        authContext: any;
        body: Body | null;
        agent: any;
        message: string;
        conversationMode: string;
        kb: KbRow;
        adminKbs: any[];
        compiledPolicy: any;
        allowedToolNames: Set<string>;
        allowedToolIdByName: Map<string, string>;
        allowedToolVersionByName: Map<string, string | null>;
        allowedToolByName: Map<string, string[]>;
        allowedTools: { keys: Set<string>; byName: Map<string, string[]> };
        providerAvailable: string[];
        providerConfig: { mall_id: string | null; shop_no: string | null; board_no: string | null };
        runtimeFlags: { restock_lite: boolean };
        authSettings: any;
        userPlan: string | null;
        userIsAdmin: boolean | null;
        userRole: string | null;
        userOrgId: string | null;
        sessionId: string;
        reusedSession: boolean;
        recentTurns: any[];
        firstTurnInSession: boolean;
        lastTurn: any;
        nextSeq: number;
        prevBotContext: Record<string, unknown>;
      };
    }
> {
  const { req, debugEnabled, timingStages, respond } = params;
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const authStartedAt = Date.now();
  const context = await getServerContext(authHeader, cookieHeader);
  pushRuntimeTimingStage(timingStages, "auth_context", authStartedAt);
  if ("error" in context) {
    if (debugEnabled) {
      console.debug("[runtime/chat/mk2] auth error", context.error);
    }
    return { response: respond({ error: context.error }, { status: 401 }), state: null };
  }
  const authContext = context;

  const parseBodyStartedAt = Date.now();
  const body = (await req.json().catch(() => null)) as Body | null;
  pushRuntimeTimingStage(timingStages, "parse_body", parseBodyStartedAt);
  const agentId = String(body?.agent_id || "").trim();
  const message = String(body?.message || "").trim();
  const conversationMode = String(body?.mode || "").trim().toLowerCase() === "natural" ? "natural" : "mk2";
  const runtimeFlags = {
    restock_lite: Boolean(body?.runtime_flags?.restock_lite),
  };
  const overrideLlm = body?.llm;
  const overrideKbId = body?.kb_id;
  const inlineKbText = typeof body?.inline_kb === "string" ? body.inline_kb.trim() : "";
  const hasInlineKb = inlineKbText.length > 0;
  const overrideAdminKbIds = Array.isArray(body?.admin_kb_ids)
    ? body?.admin_kb_ids.map((id) => String(id)).filter(Boolean)
    : null;
  const overrideMcpToolIds = Array.from(
    new Set(
      [
        ...(Array.isArray(body?.mcp_tool_ids) ? body.mcp_tool_ids : []),
        ...(Array.isArray(body?.mcp_provider_keys) ? body.mcp_provider_keys : []),
      ]
        .map((id) => String(id).trim())
        .filter(Boolean)
    )
  );
  if (!message) {
    return { response: respond({ error: "INVALID_BODY" }, { status: 400 }), state: null };
  }

  let agent: any = null;
  const agentLookupStartedAt = Date.now();
  if (agentId) {
    const agentRes = await fetchAgent(context, agentId);
    if (!agentRes.data) {
      return { response: respond({ error: agentRes.error || "AGENT_NOT_FOUND" }, { status: 404 }), state: null };
    }
    agent = agentRes.data;
  } else {
    if (!isValidLlm(overrideLlm)) {
      return { response: respond({ error: "INVALID_BODY" }, { status: 400 }), state: null };
    }
    agent = {
      id: null,
      name: "Labolatory",
      llm: overrideLlm,
      kb_id: overrideKbId ? String(overrideKbId) : null,
      mcp_tool_ids: overrideMcpToolIds,
    };
  }
  pushRuntimeTimingStage(timingStages, "resolve_agent", agentLookupStartedAt, { has_agent_id: Boolean(agentId) });
  if (!agent) {
    return { response: respond({ error: "AGENT_NOT_FOUND" }, { status: 404 }), state: null };
  }

  const kbLookupStartedAt = Date.now();
  let kb: KbRow;
  if (hasInlineKb) {
    pushRuntimeTimingStage(timingStages, "load_primary_kb", kbLookupStartedAt, { inline: true });
    kb = {
      id: "__INLINE_KB__",
      title: "사용자 KB",
      content: inlineKbText,
      is_active: true,
      version: "inline",
      is_admin: false,
      apply_groups: null,
      apply_groups_mode: null,
      content_json: null,
      kb_kind: "inline",
    };
  } else if (agent.kb_id) {
    const kbRes = await fetchKb(context, agent.kb_id);
    pushRuntimeTimingStage(timingStages, "load_primary_kb", kbLookupStartedAt);
    if (!kbRes.data) {
      return { response: respond({ error: kbRes.error || "KB_NOT_FOUND" }, { status: 404 }), state: null };
    }
    kb = kbRes.data;
  } else {
    pushRuntimeTimingStage(timingStages, "load_primary_kb", kbLookupStartedAt, { skipped: true });
    kb = {
      id: "__LAB_NO_KB__",
      title: "KB 미선택",
      content: null,
      is_active: true,
      version: null,
      is_admin: false,
      apply_groups: null,
      apply_groups_mode: null,
      content_json: null,
      kb_kind: "none",
    };
  }

  const iamLookupStartedAt = Date.now();
  const { data: accessRow } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("group, plan, is_admin, org_role, org_id")
    .eq("user_id", authContext.user.id)
    .maybeSingle();
  const userGroup = (accessRow?.group as Record<string, unknown> | null) ?? null;
  const userPlan = (accessRow?.plan as string | null) ?? null;
  const userIsAdmin = typeof accessRow?.is_admin === "boolean" ? accessRow.is_admin : null;
  const userRole = (accessRow?.org_role as string | null) ?? null;
  const userOrgId = (accessRow?.org_id as string | null) ?? null;

  const { data: authSettings } = await context.supabase
    .from("A_iam_auth_settings")
    .select("id, providers")
    .eq("org_id", authContext.orgId)
    .eq("user_id", authContext.user.id)
    .maybeSingle();
  const providers = (authSettings?.providers || {}) as Record<string, Record<string, unknown> | undefined>;
  const providerAvailable = Object.keys(providers || {}).filter((key) => {
    const value = providers[key];
    return value && Object.keys(value).length > 0;
  });
  const cafe24Provider = providers.cafe24 || {};
  const providerConfig = {
    mall_id: (cafe24Provider as any)?.mall_id ? String((cafe24Provider as any).mall_id) : null,
    shop_no: (cafe24Provider as any)?.shop_no ? String((cafe24Provider as any).shop_no) : null,
    board_no: (cafe24Provider as any)?.board_no ? String((cafe24Provider as any).board_no) : null,
  };
  pushRuntimeTimingStage(timingStages, "load_auth_settings", iamLookupStartedAt);

  const adminKbStartedAt = Date.now();
  const adminKbRes = await fetchAdminKbs(context);
  let adminKbs = adminKbRes.data || [];
  if (overrideAdminKbIds !== null) {
    const allowed = new Set(overrideAdminKbIds);
    adminKbs = adminKbs.filter((item) => allowed.has(item.id));
  } else {
    adminKbs = adminKbs.filter((item) =>
      matchesAdminGroup(
        Array.isArray(item.apply_groups) ? item.apply_groups : null,
        userGroup,
        item.apply_groups_mode === "any" ? "any" : "all"
      )
    );
  }
  const policyPacks = adminKbs
    .filter((item) => item.content_json)
    .map((item) => item.content_json as PolicyPack);
  const compiledPolicy = compilePolicy(policyPacks);
  pushRuntimeTimingStage(timingStages, "load_admin_kb_and_compile_policy", adminKbStartedAt, {
    admin_kb_count: adminKbs.length,
    policy_pack_count: policyPacks.length,
  });

  const allowedToolNames = new Set<string>();
  const allowedToolIdByName = new Map<string, string>();
  const allowedToolVersionByName = new Map<string, string | null>();
  const allowedToolByName = new Map<string, string[]>();
  const allowedToolsStartedAt = Date.now();
  if (agent.mcp_tool_ids && agent.mcp_tool_ids.length > 0) {
    const requestedToolIds = agent.mcp_tool_ids.map((id: string) => String(id)).filter(Boolean);
    const validToolIds = requestedToolIds.filter((id: string) => isUuidLike(id));
    const providerSelections = Array.from(
      new Set(
        requestedToolIds
          .filter((id: string) => !isUuidLike(id))
          .map((id: string) => id.trim().toLowerCase())
          .filter(Boolean)
      )
    );
    const [toolsById, toolsByProvider] = await Promise.all([
      validToolIds.length
        ? context.supabase
          .from("C_mcp_tools")
          .select("id, name, provider_key, scope_key, version, is_active")
          .in("id", validToolIds)
        : Promise.resolve({
          data: [] as Array<{ id: string; name: string; provider_key: string; scope_key?: string | null; version?: string | null; is_active?: boolean | null }>,
        }),
      providerSelections.length
        ? context.supabase
          .from("C_mcp_tools")
          .select("id, name, provider_key, scope_key, version, is_active")
          .in("provider_key", providerSelections)
          .eq("is_active", true)
        : Promise.resolve({
          data: [] as Array<{ id: string; name: string; provider_key: string; scope_key?: string | null; version?: string | null; is_active?: boolean | null }>,
        }),
    ]);
    const tools = [...(toolsById.data || []), ...(toolsByProvider.data || [])];
    const resolvedTools = new Map<string, { id: string; name: string; provider_key: string; version?: string | null }>();
    (tools || [])
      .filter((t) => t.is_active)
      .forEach((t) => {
        resolvedTools.set(String(t.id), {
          id: String(t.id),
          name: String(t.name || ""),
          provider_key: String(t.provider_key || ""),
          version: typeof (t as any).version === "string" ? String((t as any).version) : null,
        });
      });

    const legacyScopes = Array.from(
      new Set(
        (tools || [])
          .filter(
            (t) =>
              !t.is_active &&
              String(t.provider_key || "") === "cafe24" &&
              String(t.name || "").startsWith("scope_mall_") &&
              String(t.scope_key || "").trim().length > 0
          )
          .map((t) => String(t.scope_key || ""))
      )
    );
    if (legacyScopes.length > 0) {
      const { data: expanded } = await context.supabase
        .from("C_mcp_tools")
        .select("id, name, provider_key, version")
        .eq("provider_key", "cafe24")
        .eq("is_active", true)
        .in("scope_key", legacyScopes);
      (expanded || []).forEach((t) => {
        resolvedTools.set(String(t.id), {
          id: String(t.id),
          name: String(t.name || ""),
          provider_key: String(t.provider_key || ""),
          version: typeof (t as any).version === "string" ? String((t as any).version) : null,
        });
      });
    }

    Array.from(resolvedTools.values()).forEach((t) => {
      const name = String(t.name || "").trim();
      const key = `${String((t as any).provider_key || "").trim()}:${name}`;
      const id = String((t as any).id || "").trim();
      if (!name) return;
      allowedToolNames.add(key);
      const list = allowedToolByName.get(name) || [];
      list.push(key);
      allowedToolByName.set(name, list);
      if (id && !allowedToolIdByName.has(name)) {
        allowedToolIdByName.set(name, id);
      }
      if (!allowedToolVersionByName.has(name)) {
        allowedToolVersionByName.set(name, (t as any).version || null);
      }
    });
  }
  pushRuntimeTimingStage(timingStages, "resolve_allowed_tools", allowedToolsStartedAt, {
    requested_tool_count: agent.mcp_tool_ids?.length || 0,
    allowed_tool_count: allowedToolNames.size,
  });
  const allowedTools = { keys: allowedToolNames, byName: allowedToolByName };

  const sessionPrepareStartedAt = Date.now();
  const sessionStateRes = await prepareSessionState({
    context,
    requestedSessionId: String(body?.session_id || "").trim(),
    agentId: agent.id,
    createSession,
    getRecentTurns,
    recentTurnLimit: 15,
  });
  if (!sessionStateRes.state) {
    return { response: respond({ error: sessionStateRes.error || "SESSION_CREATE_FAILED" }, { status: 400 }), state: null };
  }
  const { sessionId, reusedSession, recentTurns, firstTurnInSession, lastTurn, nextSeq, prevBotContext } = sessionStateRes.state;
  pushRuntimeTimingStage(timingStages, "prepare_session", sessionPrepareStartedAt, {
    reused_session: reusedSession,
  });
  const recentTurnsStartedAt = Date.now();
  pushRuntimeTimingStage(timingStages, "load_recent_turns", recentTurnsStartedAt, {
    recent_turn_count: recentTurns.length,
    is_first_turn: firstTurnInSession,
  });

  return {
    response: null,
    state: {
      context,
      authContext,
      body,
      agent,
      message,
      conversationMode,
      kb,
      adminKbs,
      compiledPolicy,
      allowedToolNames,
      allowedToolIdByName,
      allowedToolVersionByName,
      allowedToolByName,
      allowedTools,
      providerAvailable,
      providerConfig,
      runtimeFlags,
      authSettings,
      userPlan,
      userIsAdmin,
      userRole,
      userOrgId,
      sessionId,
      reusedSession,
      recentTurns,
      firstTurnInSession,
      lastTurn,
      nextSeq,
      prevBotContext,
    },
  };
}
