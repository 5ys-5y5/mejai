import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getServerContext, type ServerContextSuccess } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { fetchChatPolicy } from "@/lib/chatPolicyStore";
import { normalizeConversationPageKey } from "@/lib/conversation/pageFeaturePolicy";
import { compilePolicy, type PolicyPack } from "@/lib/policyEngine";
import { isUuidLike, isValidLlm } from "../shared/slotUtils";
import type { KbRow } from "../shared/types";
import {
  fetchAdminKbs,
  fetchActiveAgentByParent,
  fetchAgent,
  fetchDefaultUserKb,
  fetchKb,
  fetchLatestSampleKb,
  getRecentTurns,
  matchesAdminGroup,
  createSession,
} from "../services/dataAccess";
import { insertEvent } from "../services/auditRuntime";
import { prepareSessionState } from "./sessionRuntime";
import { pushRuntimeTimingStage, type RuntimeTimingStage } from "./runtimeSupport";
import { DEFAULT_TOOL_PROVIDER_MAP } from "./mcpToolRegistry";
import type { CompiledPolicy, RuntimeContext } from "../shared/runtimeTypes";

type Body = {
  page_key?: string;
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
  widgetAllowedDomains: string[];
  widgetAllowedPaths: string[];
};

const WIDGET_GUEST_USER_ID = "00000000-0000-0000-0000-000000000000";
const policyFailureOnce = new Set<string>();

async function recordPolicyFailure(input: {
  context: RuntimeContextAny;
  sessionId: string | null;
  pageKey: string;
  reason: string;
  error?: unknown;
}) {
  const { context, sessionId, pageKey, reason, error } = input;
  const key = `${sessionId || "no_session"}:${pageKey}:${reason}`;
  if (policyFailureOnce.has(key)) return;
  policyFailureOnce.add(key);
  console.error("[runtime/chat/mk2] chat_policy error", {
    page_key: pageKey,
    reason,
    error: error instanceof Error ? error.message : error ? String(error) : null,
  });
  if (!sessionId) return;
  await insertEvent(
    context,
    sessionId,
    null,
    "CHAT_POLICY_ERROR",
    {
      page_key: pageKey,
      reason,
      error: error instanceof Error ? error.message : error ? String(error) : null,
    },
    { source: "runtime_bootstrap" }
  );
}

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

function isPublicPageKey(value: unknown) {
  const key = String(value || "").trim();
  return key === "/" || key === "/demo";
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
        providerConfig: { cafe24_mall_id: string | null; cafe24_shop_no: string | null; cafe24_board_no: string | null };
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
  let isWidgetGuestUser = false;
  let context: RuntimeContextAny | null = null;
  let authContext: RuntimeContextAny | null = null;
  let resolvedUserPlan: string | null = null;
  let resolvedUserGroup: Record<string, any> | null = null;
  let resolvedUserIsAdmin: boolean | null = null;
  let userOrgId: string | null = null;
  const authStartedAt = Date.now();

  const parseBodyStartedAt = Date.now();
  const body = (await req.json().catch(() => null)) as Body | null;
  pushRuntimeTimingStage(timingStages, "parse_body", parseBodyStartedAt);
  const agentId = String(body?.agent_id || "").trim();
  const headerAgentId = decodeHeaderValue(req.headers.get("x-agent-id") || "");
  const message = String(body?.message || "").trim();
  const conversationMode = String(body?.mode || "").trim().toLowerCase() === "natural" ? "natural" : "mk2";
  const runtimeFlags = {
    restock_lite: Boolean(body?.runtime_flags?.restock_lite),
  };
  const runtimeEndUser =
    (body?.end_user && typeof body.end_user === "object" ? body.end_user : null) ||
    (body?.visitor && typeof body.visitor === "object" ? body.visitor : null);
  const pageKey = String(body?.page_key || "").trim();
  const requestSessionId = String(body?.session_id || "").trim() || null;
  if (!message) {
    return { response: respond({ error: "INVALID_BODY" }, { status: 400 }), state: null };
  }

  if (isWidgetRequest) {
    const agentId = String(req.headers.get("x-widget-agent-id") || "").trim();
    if (!agentId) {
      return { response: respond({ error: "WIDGET_AGENT_ID_REQUIRED" }, { status: 400 }), state: null };
    }
    const widgetHeaderAgentId = decodeHeaderValue(req.headers.get("x-widget-agent-id") || "");
    const widgetAgentId = widgetHeaderAgentId || agentId || null;
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
    let userId = "";
    let agentRole = "viewer";
    if (headerUserId) {
      const { data: accessRow } = await supabaseAdmin
        .from("B_bot_agent_access")
        .select("role")
        .eq("agent_id", agentId)
        .eq("user_id", headerUserId)
        .maybeSingle();
      const { data: profileRow } = await supabaseAdmin
        .from("A_iam_user_profiles")
        .select("is_admin, plan, group")
        .eq("user_id", headerUserId)
        .maybeSingle();
      if (accessRow?.role || profileRow?.is_admin) {
        userId = headerUserId;
        resolvedUserIsAdmin = Boolean(profileRow?.is_admin);
        resolvedUserPlan = (profileRow?.plan as string | null) ?? null;
        resolvedUserGroup = (profileRow?.group as Record<string, any> | null) ?? null;
        agentRole = accessRow?.role || (resolvedUserIsAdmin ? "admin" : "viewer");
      }
    }
    if (!userId) {
      userId = WIDGET_GUEST_USER_ID;
      agentRole = "guest";
      isWidgetGuestUser = true;
      resolvedUserIsAdmin = false;
      resolvedUserPlan = null;
      resolvedUserGroup = null;
    }
    const user = { id: userId } as User;
    context = { supabase: supabaseAdmin, user, agentId: widgetAgentId, agentRole };
    authContext = context;
    userOrgId = widgetAgentId;
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
      const isAnonymousNewModel = !agentId && isPublicPageKey(pageKey);
      if (!isAnonymousNewModel) {
        return { response: respond({ error: contextRes.error }, { status: 401 }), state: null };
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
      const user = { id: WIDGET_GUEST_USER_ID } as User;
      const guestAgentId = headerAgentId || agentId || null;
      context = { supabase: supabaseAdmin, user, agentId: guestAgentId, agentRole: "guest" };
      authContext = context;
      userOrgId = guestAgentId;
    } else {
      const resolvedAgentId = headerAgentId || agentId || null;
      context = { ...contextRes, agentId: resolvedAgentId };
      authContext = context;
      resolvedUserPlan = contextRes.plan ?? null;
      resolvedUserGroup = (contextRes.group as Record<string, any> | null) ?? null;
      resolvedUserIsAdmin = contextRes.isAdmin ?? null;
      userOrgId = contextRes.agentId ?? null;
    }
  }
  if (!context || !authContext) {
    return { response: respond({ error: "AUTH_CONTEXT_MISSING" }, { status: 401 }), state: null };
  }

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
  if (agent?.id) {
    context.agentId = String(agent.id);
    authContext.agentId = String(agent.id);
  } else if (!context.agentId) {
    context.agentId = null;
    authContext.agentId = null;
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
      title: "User KB",
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
  } else if (!agentId && context.agentId) {
    const userKbRes = await fetchDefaultUserKb(context);
    pushRuntimeTimingStage(timingStages, "load_primary_kb", kbLookupStartedAt, { default_user_kb: true });
    if (userKbRes.data) {
      kb = userKbRes.data;
    } else {
    kb = {
      id: "__LAB_NO_KB__",
      title: "KB not selected",
      content: null,
      is_active: true,
      version: null,
      is_admin: false,
      apply_groups: null,
      apply_groups_mode: null,
      content_json: null,
    };
    }
  } else if (!agentId && !context.agentId) {
    const sampleRes = await fetchLatestSampleKb(context);
    pushRuntimeTimingStage(timingStages, "load_primary_kb", kbLookupStartedAt, { sample_kb: true });
    if (sampleRes.data) {
      kb = sampleRes.data;
    } else {
    kb = {
      id: "__LAB_NO_KB__",
      title: "KB not selected",
      content: null,
      is_active: true,
      version: null,
      is_admin: false,
      apply_groups: null,
      apply_groups_mode: null,
      content_json: null,
    };
    }
  } else {
    pushRuntimeTimingStage(timingStages, "load_primary_kb", kbLookupStartedAt, { skipped: true });
    kb = {
      id: "__LAB_NO_KB__",
      title: "KB not selected",
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
  const userGroup = resolvedUserGroup;
  const userPlan = resolvedUserPlan;
  const rawUserIsAdmin = typeof resolvedUserIsAdmin === "boolean" ? resolvedUserIsAdmin : null;
  const userIsAdmin = isWidgetRequest && isWidgetGuestUser ? false : rawUserIsAdmin;
  const userRole = context.agentRole ?? null;
  const userAgentId = context.agentId ?? null;

  let authSettings: { id?: string | null; providers?: Record<string, Record<string, any> | undefined> | null } | null = null;
  let providers: Record<string, Record<string, any> | undefined> = {};
  if (authContext.agentId) {
    const { data: authSettingsByUser } = await context.supabase
      .from("A_iam_auth_settings")
      .select("id, providers")
      .eq("agent_id", authContext.agentId)
      .eq("user_id", authContext.user.id)
      .maybeSingle();
    const { data: authSettingsByOrg } = await context.supabase
      .from("A_iam_auth_settings")
      .select("id, providers")
      .eq("agent_id", authContext.agentId)
      .is("user_id", null)
      .maybeSingle();
    const userProviders = (authSettingsByUser?.providers || {}) as Record<string, Record<string, any> | undefined>;
    const orgProviders = (authSettingsByOrg?.providers || {}) as Record<string, Record<string, any> | undefined>;
    const mergedProviders: Record<string, Record<string, any> | undefined> = { ...userProviders };
    if (isWidgetRequest && !authSettingsByUser) {
      Object.assign(mergedProviders, orgProviders);
    }
    authSettings = { providers: mergedProviders };
    providers = (authSettings?.providers || {}) as Record<string, Record<string, any> | undefined>;
  } else {
    const mergedProviders: Record<string, Record<string, any> | undefined> = {};
    authSettings = { providers: mergedProviders };
    providers = (authSettings?.providers || {}) as Record<string, Record<string, any> | undefined>;
  }
  try {
    const adminSupabase = createAdminSupabaseClient();
    const orgChatPolicy = await fetchChatPolicy(adminSupabase, authContext.agentId || "");
    if (!orgChatPolicy) {
      await recordPolicyFailure({
        context,
        sessionId: requestSessionId,
        pageKey: pageKey || "/",
        reason: "CHAT_POLICY_MISSING",
      });
      return { response: respond({ error: "CHAT_POLICY_MISSING" }, { status: 500 }), state: null };
    }
    const normalizedPageKey = normalizeConversationPageKey(pageKey || "/");
    const registry = Array.isArray(orgChatPolicy.page_registry)
      ? orgChatPolicy.page_registry.map((entry) => normalizeConversationPageKey(entry))
      : [];
    if (!registry.includes(normalizedPageKey)) {
      await recordPolicyFailure({
        context,
        sessionId: requestSessionId,
        pageKey: normalizedPageKey,
        reason: "CHAT_POLICY_PAGE_NOT_REGISTERED",
      });
      return { response: respond({ error: "CHAT_POLICY_PAGE_NOT_REGISTERED" }, { status: 500 }), state: null };
    }
    if (!orgChatPolicy.pages || !orgChatPolicy.pages[normalizedPageKey]) {
      await recordPolicyFailure({
        context,
        sessionId: requestSessionId,
        pageKey: normalizedPageKey,
        reason: "CHAT_POLICY_PAGE_SETTINGS_MISSING",
      });
      return { response: respond({ error: "CHAT_POLICY_PAGE_SETTINGS_MISSING" }, { status: 500 }), state: null };
    }
    providers = { ...providers, chat_policy: orgChatPolicy as unknown as Record<string, any> };
    authSettings = { ...(authSettings || {}), providers };
  } catch (error) {
    await recordPolicyFailure({
      context,
      sessionId: requestSessionId,
      pageKey: pageKey || "/",
      reason: "CHAT_POLICY_FETCH_FAILED",
      error,
    });
    return { response: respond({ error: "CHAT_POLICY_FETCH_FAILED" }, { status: 500 }), state: null };
  }
  const providerAvailable = Object.keys(providers || {}).filter((key) => {
    const value = providers[key];
    return value && Object.keys(value).length > 0;
  });
  const cafe24Provider = (providers.cafe24 || {}) as Record<string, any>;
  const providerConfig = {
    cafe24_mall_id: cafe24Provider.mall_id ? String(cafe24Provider.mall_id) : null,
    cafe24_shop_no: cafe24Provider.shop_no ? String(cafe24Provider.shop_no) : null,
    cafe24_board_no: cafe24Provider.board_no ? String(cafe24Provider.board_no) : null,
  };
  pushRuntimeTimingStage(timingStages, "load_auth_settings", iamLookupStartedAt);

  const adminKbStartedAt = Date.now();
  let adminKbFilterMeta: Array<{
    id: string;
    title?: string | null;
    apply_groups?: unknown;
    apply_groups_mode?: string | null;
    matched: boolean;
    reason: string;
  }> = [];
  let adminKbs: Array<Record<string, any>> = [];
  let shouldLoadAdminKbs = true;
  try {
    const existsRes = await context.supabase
      .from("B_bot_knowledge_bases")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true)
      .eq("is_active", true)
      .not("content_json", "is", null)
      .or(`agent_id.eq.${context.agentId},agent_id.is.null`);
    shouldLoadAdminKbs = Boolean((existsRes as { count?: number | null }).count);
  } catch {
    shouldLoadAdminKbs = true;
  }
  let adminKbAll: Array<Record<string, any>> = [];
  if (shouldLoadAdminKbs) {
    const adminKbRes = await fetchAdminKbs(context);
    adminKbAll = adminKbRes.data || [];
  }
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
  const isPublicContext = !context.agentId;
  const applyPublicToolFilter = (query: any) => (isPublicContext ? query.eq("is_public", true) : query);
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
        ? applyPublicToolFilter(
          context.supabase
          .from("C_mcp_tools")
          .select("id, name, provider_key, scope_key, version, is_active")
          .in("id", validToolIds)
        )
        : Promise.resolve({
          data: [] as Array<{ id: string; name: string; provider_key: string; scope_key?: string | null; version?: string | null; is_active?: boolean | null }>,
        }),
      providerSelections.length
        ? applyPublicToolFilter(
          context.supabase
          .from("C_mcp_tools")
          .select("id, name, provider_key, scope_key, version, is_active")
          .in("provider_key", providerSelections)
          .eq("is_active", true)
        )
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
      const { data: expanded } = await applyPublicToolFilter(
        context.supabase
          .from("C_mcp_tools")
          .select("id, name, provider_key, version")
          .eq("provider_key", "cafe24")
          .eq("is_active", true)
          .in("scope_key", legacyScopes)
      );
      (expanded || []).forEach((t: Record<string, any>) => {
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
        widgetOrgId: decodeHeaderValue(req.headers.get("x-widget-agent-id") || "") || authContext.agentId || null,
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


