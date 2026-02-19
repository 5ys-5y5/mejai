import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getServerContext, type ServerContextSuccess } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { compilePolicy, type PolicyPack } from "@/lib/policyEngine";
import { isUuidLike, isValidLlm } from "../shared/slotUtils";
import type { KbRow } from "../shared/types";
import {
  fetchAdminKbs,
  fetchActiveAgentByParent,
  fetchAgent,
  fetchKb,
  getRecentTurns,
  matchesAdminGroup,
  createSession,
} from "../services/dataAccess";
import { prepareSessionState } from "./sessionRuntime";
import { pushRuntimeTimingStage, type RuntimeTimingStage } from "./runtimeSupport";
import { DEFAULT_TOOL_PROVIDER_MAP } from "./mcpToolRegistry";
import type { CompiledPolicy, RuntimeContext } from "../shared/runtimeTypes";

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
  metadata?: Record<string, any>;
  end_user?: Record<string, any>;
  visitor?: Record<string, any>;
  runtime_flags?: {
    restock_lite?: boolean;
  };
};

type RuntimeContextAny = RuntimeContext;

type AgentShape = {
  id: string | null;
  parent_id?: string | null;
  name?: string | null;
  agent_type?: string | null;
  version?: string | null;
  llm?: string | null;
  kb_id?: string | null;
  mcp_tool_ids?: string[] | null;
  admin_kb_ids?: string[] | null;
  is_active?: boolean | null;
};

type WidgetContext = {
  widgetId: string | null;
  widgetName: string | null;
  widgetPublicKey: string | null;
  widgetAgentId: string | null;
  widgetOrgId: string | null;
  widgetAllowedDomains: string[];
  widgetAllowedPaths: string[];
};

function decodeHeaderValue(input: string) {
  const value = String(input || "").trim();
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseHeaderArray(input: string) {
  const decoded = decodeHeaderValue(input);
  if (!decoded) return [];
  try {
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    }
  } catch {
    // ignore JSON parse errors and fall back to CSV
  }
  return decoded
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

type BootstrapParams = {
  req: NextRequest;
  debugEnabled: boolean;
  timingStages: RuntimeTimingStage[];
  respond: (payload: Record<string, any>, init?: ResponseInit) => Response;
};

export async function bootstrapRuntime(params: BootstrapParams): Promise<
  | { response: Response; state: null }
  | {
      response: null;
      state: {
        context: RuntimeContextAny;
        authContext: RuntimeContextAny;
        body: Body | null;
        agent: AgentShape;
        message: string;
        conversationMode: string;
        kb: KbRow;
        adminKbs: Array<Record<string, any>>;
        compiledPolicy: CompiledPolicy;
        allowedToolNames: Set<string>;
        allowedToolIdByName: Map<string, string>;
        allowedToolVersionByName: Map<string, string | null>;
        allowedToolByName: Map<string, string[]>;
        allowedTools: { keys: Set<string>; byName: Map<string, string[]> };
        allowlistMeta: {
          requestedToolCount: number;
          validToolCount: number;
          providerSelectionCount: number;
          providerSelections: string[];
          toolsByIdCount: number;
          toolsByProviderCount: number;
          resolvedToolCount: number;
          queryErrorById: string | null;
          queryErrorByProvider: string | null;
        };
        providerAvailable: string[];
        providerConfig: { mall_id: string | null; shop_no: string | null; board_no: string | null };
        runtimeFlags: { restock_lite: boolean };
        authSettings: Record<string, any> | null;
        userPlan: string | null;
        userIsAdmin: boolean | null;
        userRole: string | null;
        userOrgId: string | null;
        userGroup: Record<string, any> | null;
        widgetContext: WidgetContext | null;
        agentResolvedFromParent: boolean;
        adminKbFilterMeta: Array<{
          id: string;
          title?: string | null;
          apply_groups?: unknown;
          apply_groups_mode?: string | null;
          matched: boolean;
          reason: string;
        }>;
        sessionId: string;
        reusedSession: boolean;
        recentTurns: Array<Record<string, any>>;
        firstTurnInSession: boolean;
        lastTurn: Record<string, any> | null;
        nextSeq: number;
        prevBotContext: Record<string, any>;
      };
    }
> {
  const { req, debugEnabled, timingStages, respond } = params;
  const widgetSecret = String(req.headers.get("x-widget-secret") || "").trim();
  const expectedWidgetSecret = String(process.env.WIDGET_RUNTIME_SECRET || "").trim();
  const isWidgetRequest = Boolean(widgetSecret && expectedWidgetSecret && widgetSecret === expectedWidgetSecret);
  let context: ServerContextSuccess | null = null;
  let authContext: ServerContextSuccess | null = null;
  const authStartedAt = Date.now();

  if (isWidgetRequest) {
    const orgId = String(req.headers.get("x-widget-org-id") || "").trim();
    if (!orgId) {
      return { response: respond({ error: "WIDGET_ORG_ID_REQUIRED" }, { status: 400 }), state: null };
    }
    let supabaseAdmin;
    try {
      supabaseAdmin = createAdminSupabaseClient();
    } catch (error) {
      return {
        response: respond(
          { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
          { status: 500 }
        ),
        state: null,
      };
    }
    const headerUserId = String(req.headers.get("x-widget-user-id") || "").trim();
    let userId = headerUserId;
    let orgRole = "admin";
    if (userId) {
      const { data: accessRow } = await supabaseAdmin
        .from("A_iam_user_access_maps")
        .select("user_id, is_admin, org_role")
        .eq("org_id", orgId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!accessRow?.user_id) {
        userId = "";
      } else {
        orgRole = String(accessRow.org_role || (accessRow.is_admin ? "admin" : "operator") || "operator");
      }
    }
    if (!userId) {
      const { data: accessRows } = await supabaseAdmin
        .from("A_iam_user_access_maps")
        .select("user_id, is_admin, org_role")
        .eq("org_id", orgId)
        .order("is_admin", { ascending: false })
        .limit(50);
      const candidates = (accessRows || []) as Array<{
        user_id?: string | null;
        is_admin?: boolean | null;
        org_role?: string | null;
      }>;
      const picked =
        candidates.find((row) => String(row.org_role || "").toLowerCase() === "owner") ||
        candidates.find((row) => Boolean(row.is_admin)) ||
        candidates[0] ||
        null;
      userId = picked?.user_id ? String(picked.user_id) : "";
      orgRole = String(picked?.org_role || (picked?.is_admin ? "admin" : "operator") || "operator");
    }
    if (!userId) {
      return { response: respond({ error: "WIDGET_USER_NOT_FOUND" }, { status: 400 }), state: null };
    }
    const user = { id: userId } as User;
    context = { supabase: supabaseAdmin, user, orgId, orgRole };
    authContext = context;
    pushRuntimeTimingStage(timingStages, "auth_context", authStartedAt, { widget: true });
  } else {
    const authHeader = req.headers.get("authorization") || "";
    const cookieHeader = req.headers.get("cookie") || "";
    const contextRes = await getServerContext(authHeader, cookieHeader);
    pushRuntimeTimingStage(timingStages, "auth_context", authStartedAt);
    if ("error" in contextRes) {
      if (debugEnabled) {
        console.debug("[runtime/chat/mk2] auth error", contextRes.error);
      }
      return { response: respond({ error: contextRes.error }, { status: 401 }), state: null };
    }
    context = contextRes;
    authContext = contextRes;
  }
  if (!context || !authContext) {
    return { response: respond({ error: "AUTH_CONTEXT_MISSING" }, { status: 401 }), state: null };
  }

  const parseBodyStartedAt = Date.now();
  const body = (await req.json().catch(() => null)) as Body | null;
  pushRuntimeTimingStage(timingStages, "parse_body", parseBodyStartedAt);
  const agentId = String(body?.agent_id || "").trim();
  const message = String(body?.message || "").trim();
  const conversationMode = String(body?.mode || "").trim().toLowerCase() === "natural" ? "natural" : "mk2";
  const runtimeFlags = {
    restock_lite: Boolean(body?.runtime_flags?.restock_lite),
  };
  const runtimeEndUser =
    (body?.end_user && typeof body.end_user === "object" ? body.end_user : null) ||
    (body?.visitor && typeof body.visitor === "object" ? body.visitor : null);
  if (runtimeEndUser) {
    (context as RuntimeContextAny).runtimeEndUser = runtimeEndUser as Record<string, any>;
  }
  const sessionMetadata =
    body?.metadata && typeof body.metadata === "object"
      ? ({
          ...body.metadata,
          ...(body?.end_user ? { end_user: body.end_user } : {}),
          ...(body?.visitor ? { visitor: body.visitor } : {}),
        } as Record<string, any>)
      : body?.end_user || body?.visitor
      ? ({
          ...(body?.end_user ? { end_user: body.end_user } : {}),
          ...(body?.visitor ? { visitor: body.visitor } : {}),
        } as Record<string, any>)
      : null;
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

  let agent: AgentShape | null = null;
  const agentLookupStartedAt = Date.now();
  let agentResolvedFromParent = false;
  if (agentId) {
    const agentRes = await fetchAgent(context, agentId);
    if (!agentRes.data) {
      return { response: respond({ error: agentRes.error || "AGENT_NOT_FOUND" }, { status: 404 }), state: null };
    }
    agent = agentRes.data;
    if (agent) {
      const activeFlag = agent.is_active;
      const rawParentId = agent.parent_id;
      const shouldResolveChild =
        activeFlag === false || !rawParentId || String(rawParentId) === String(agent.id || agentId);
      if (shouldResolveChild) {
        const parentId = String(rawParentId || agent.id || agentId).trim();
        if (parentId) {
          const activeRes = await fetchActiveAgentByParent(context, parentId);
          if (activeRes.data) {
            agent = activeRes.data;
            agentResolvedFromParent = true;
          }
        }
      }
    }
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

  const agentAdminKbIds = Array.isArray(agent.admin_kb_ids)
    ? agent.admin_kb_ids.map((id) => String(id)).filter(Boolean)
    : [];

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
    };
  }

  const iamLookupStartedAt = Date.now();
  const { data: accessRow } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("group, plan, is_admin, org_role, org_id")
    .eq("user_id", authContext.user.id)
    .maybeSingle();
  const userGroup = (accessRow?.group as Record<string, any> | null) ?? null;
  const userPlan = (accessRow?.plan as string | null) ?? null;
  const userIsAdmin = typeof accessRow?.is_admin === "boolean" ? accessRow.is_admin : null;
  const userRole = (accessRow?.org_role as string | null) ?? null;
  const userOrgId = (accessRow?.org_id as string | null) ?? null;

  let authSettings: { id?: string | null; providers?: Record<string, Record<string, any> | undefined> | null } | null = null;
  const { data: authSettingsByUser } = await context.supabase
    .from("A_iam_auth_settings")
    .select("id, providers")
    .eq("org_id", authContext.orgId)
    .eq("user_id", authContext.user.id)
    .maybeSingle();
  authSettings = authSettingsByUser || null;
  if (!authSettings && isWidgetRequest) {
    const { data: authSettingsByOrg } = await context.supabase
      .from("A_iam_auth_settings")
      .select("id, providers")
      .eq("org_id", authContext.orgId)
      .is("user_id", null)
      .maybeSingle();
    authSettings = authSettingsByOrg || null;
  }
  const providers = (authSettings?.providers || {}) as Record<string, Record<string, any> | undefined>;
  const providerAvailable = Object.keys(providers || {}).filter((key) => {
    const value = providers[key];
    return value && Object.keys(value).length > 0;
  });
  const cafe24Provider = (providers.cafe24 || {}) as Record<string, any>;
  const providerConfig = {
    mall_id: cafe24Provider.mall_id ? String(cafe24Provider.mall_id) : null,
    shop_no: cafe24Provider.shop_no ? String(cafe24Provider.shop_no) : null,
    board_no: cafe24Provider.board_no ? String(cafe24Provider.board_no) : null,
  };
  pushRuntimeTimingStage(timingStages, "load_auth_settings", iamLookupStartedAt);

  const adminKbStartedAt = Date.now();
  const adminKbRes = await fetchAdminKbs(context);
  const adminKbAll = adminKbRes.data || [];
  let adminKbFilterMeta: Array<{
    id: string;
    title?: string | null;
    apply_groups?: unknown;
    apply_groups_mode?: string | null;
    matched: boolean;
    reason: string;
  }> = [];
  let adminKbs = adminKbAll;
    if (agentId) {
      const allowed = new Set(agentAdminKbIds);
      adminKbFilterMeta = adminKbAll.map((item) => ({
        id: String(item.id || ""),
        title: String((item as Record<string, any>).title || "") || null,
        apply_groups: (item as Record<string, any>).apply_groups ?? null,
        apply_groups_mode: String((item as Record<string, any>).apply_groups_mode || "") || null,
        matched: allowed.has(item.id),
        reason: allowed.has(item.id) ? "agent_selected" : "agent_not_selected",
      }));
      adminKbs = adminKbAll.filter((item) => allowed.has(item.id));
    } else if (!agentId && overrideAdminKbIds !== null) {
      const allowed = new Set(overrideAdminKbIds);
      adminKbFilterMeta = adminKbAll.map((item) => ({
        id: String(item.id || ""),
        title: String((item as Record<string, any>).title || "") || null,
        apply_groups: (item as Record<string, any>).apply_groups ?? null,
        apply_groups_mode: String((item as Record<string, any>).apply_groups_mode || "") || null,
        matched: allowed.has(item.id),
        reason: allowed.has(item.id) ? "override_selected" : "override_not_selected",
      }));
      adminKbs = adminKbAll.filter((item) => allowed.has(item.id));
    } else {
      adminKbFilterMeta = adminKbAll.map((item) => {
        const applyGroups = Array.isArray(item.apply_groups) ? item.apply_groups : null;
        const applyMode = item.apply_groups_mode === "any" ? "any" : "all";
        const matched = matchesAdminGroup(applyGroups, userGroup, applyMode);
        return {
          id: String(item.id || ""),
          title: String((item as Record<string, any>).title || "") || null,
          apply_groups: applyGroups,
          apply_groups_mode: applyMode,
          matched,
          reason: matched ? "group_match" : "group_mismatch",
        };
      });
      adminKbs = adminKbAll.filter((item) =>
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
  let allowlistMeta = {
    requestedToolCount: 0,
    validToolCount: 0,
    providerSelectionCount: 0,
    providerSelections: [] as string[],
    toolsByIdCount: 0,
    toolsByProviderCount: 0,
    resolvedToolCount: 0,
    queryErrorById: null as string | null,
    queryErrorByProvider: null as string | null,
  };
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
    const toolsByIdError = (toolsById as { error?: { message?: string } | null }).error;
    const toolsByProviderError = (toolsByProvider as { error?: { message?: string } | null }).error;
    const toolsByIdData = (toolsById as { data?: Array<any> | null }).data || [];
    const toolsByProviderData = (toolsByProvider as { data?: Array<any> | null }).data || [];
    const tools = [...toolsByIdData, ...toolsByProviderData];
    const resolvedTools = new Map<string, { id: string; name: string; provider_key: string; version?: string | null }>();
    (tools || [])
      .filter((t) => t.is_active)
      .forEach((t) => {
        resolvedTools.set(String(t.id), {
          id: String(t.id),
          name: String(t.name || ""),
          provider_key: String(t.provider_key || ""),
          version: typeof (t as Record<string, any>).version === "string"
            ? String((t as Record<string, any>).version)
            : null,
      });
    });
    allowlistMeta = {
      requestedToolCount: requestedToolIds.length,
      validToolCount: validToolIds.length,
      providerSelectionCount: providerSelections.length,
      providerSelections,
      toolsByIdCount: toolsByIdData.length,
      toolsByProviderCount: toolsByProviderData.length,
      resolvedToolCount: resolvedTools.size,
      queryErrorById: toolsByIdError?.message ? String(toolsByIdError.message).slice(0, 200) : null,
      queryErrorByProvider: toolsByProviderError?.message ? String(toolsByProviderError.message).slice(0, 200) : null,
    };

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
          version: typeof (t as Record<string, any>).version === "string"
            ? String((t as Record<string, any>).version)
            : null,
        });
      });
    }

    Array.from(resolvedTools.values()).forEach((t) => {
      const name = String(t.name || "").trim();
      const tRecord = t as Record<string, any>;
      const key = `${String(tRecord.provider_key || "").trim()}:${name}`;
      const id = String(tRecord.id || "").trim();
      if (!name) return;
      allowedToolNames.add(key);
      const list = allowedToolByName.get(name) || [];
      list.push(key);
      allowedToolByName.set(name, list);
      if (id && !allowedToolIdByName.has(name)) {
        allowedToolIdByName.set(name, id);
      }
      if (!allowedToolVersionByName.has(name)) {
        allowedToolVersionByName.set(name, (t as Record<string, any>).version || null);
      }
    });
  }
  const deployEnv = String(process.env.VERCEL_ENV || process.env.NODE_ENV || process.env.DEPLOY_ENV || "")
    .trim()
    .toLowerCase();
  const allowlistQueryFailed = Boolean(allowlistMeta.queryErrorById || allowlistMeta.queryErrorByProvider);
  if (allowlistQueryFailed && allowedToolNames.size === 0 && deployEnv !== "production") {
    Object.entries(DEFAULT_TOOL_PROVIDER_MAP).forEach(([name, providerKey]) => {
      const key = `${providerKey}:${name}`;
      if (!allowedToolNames.has(key)) {
        allowedToolNames.add(key);
      }
      const list = allowedToolByName.get(name) || [];
      if (!list.includes(key)) list.push(key);
      allowedToolByName.set(name, list);
    });
    console.warn("[runtime/chat_mk2] allowlist query failed; applied non-prod fallback", {
      deployEnv: deployEnv || null,
      allowed_tool_count: allowedToolNames.size,
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
    sessionMetadata,
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

  const widgetContext: WidgetContext | null = isWidgetRequest
    ? {
        widgetId: decodeHeaderValue(req.headers.get("x-widget-id") || "") || null,
        widgetName: decodeHeaderValue(req.headers.get("x-widget-name") || "") || null,
        widgetPublicKey: decodeHeaderValue(req.headers.get("x-widget-public-key") || "") || null,
        widgetAgentId:
          decodeHeaderValue(req.headers.get("x-widget-agent-id") || "") ||
          String(agent.id || "").trim() ||
          null,
        widgetOrgId: decodeHeaderValue(req.headers.get("x-widget-org-id") || "") || authContext.orgId || null,
        widgetAllowedDomains: parseHeaderArray(req.headers.get("x-widget-allowed-domains") || ""),
        widgetAllowedPaths: parseHeaderArray(req.headers.get("x-widget-allowed-paths") || ""),
      }
    : null;

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
      allowlistMeta,
      providerAvailable,
      providerConfig,
      runtimeFlags,
      authSettings,
      userPlan,
      userIsAdmin,
      userRole,
      userOrgId,
      userGroup,
      widgetContext,
      agentResolvedFromParent,
      adminKbFilterMeta,
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


