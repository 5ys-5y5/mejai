import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import {
  applyConversationFeatureVisibility,
  isProviderEnabled,
  isToolEnabled,
  resolveConversationPageFeatures,
  type ConversationFeaturesProviderShape,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";
import { buildDebugPrefixJson, buildFailedPayload, nowIso } from "@/app/api/runtime/chat/runtime/runtimeSupport";
import { upsertDebugLog } from "@/app/api/runtime/chat/services/auditRuntime";
import { isUuidLike } from "@/app/api/runtime/chat/shared/slotUtils";

function normalizeRoute(value?: string | null) {
  // Runtime chat is now a single core endpoint.
  if (!value) return "/api/runtime/chat";
  return "/api/runtime/chat";
}

function makeTraceId() {
  return `lab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parsePageKey(value: unknown): ConversationPageKey {
  const pageKey = String(value || "").trim();
  if (!pageKey) return "/app/laboratory";
  return pageKey;
}

function parseForwardedHeader(value?: string | null) {
  if (!value) return "";
  return String(value)
    .split(",")[0]
    ?.trim();
}

function isLocalHost(value?: string | null) {
  const host = String(value || "").toLowerCase();
  if (!host) return false;
  return host.includes("localhost") || host.startsWith("127.") || host.startsWith("0.0.0.0");
}

function resolveRuntimeOrigin(req: NextRequest) {
  const forwardedHost = parseForwardedHeader(req.headers.get("x-forwarded-host"));
  const forwardedProto =
    parseForwardedHeader(req.headers.get("x-forwarded-proto")) ||
    parseForwardedHeader(req.headers.get("x-forwarded-protocol"));
  const hostHeader = parseForwardedHeader(req.headers.get("host"));
  const candidateHost = forwardedHost || hostHeader || "";
  const nextProtocol = String(req.nextUrl.protocol || "").replace(":", "");
  let proto = forwardedProto || nextProtocol || "https";
  if (!forwardedProto && candidateHost && !isLocalHost(candidateHost)) {
    proto = "https";
  }
  const resolvedOrigin = candidateHost ? `${proto}://${candidateHost}` : req.nextUrl.origin;
  return {
    origin: resolvedOrigin,
    info: {
      resolved_origin: resolvedOrigin,
      next_origin: req.nextUrl.origin,
      next_protocol: nextProtocol,
      host_header: hostHeader || null,
      forwarded_host: forwardedHost || null,
      forwarded_proto: forwardedProto || null,
      proto_used: proto,
      is_localhost: isLocalHost(candidateHost),
      request_url: req.nextUrl.href,
    },
  };
}

function deriveScopeLevels(stage: string) {
  const safeStage = String(stage || "").trim() || "lab.proxy";
  const parts = safeStage.split(".").filter(Boolean);
  const level5 = "lab.proxy";
  const level2 = parts[0] || "lab";
  const level1 = parts.slice(0, 2).join(".") || safeStage;
  return { level5, level2, level1 };
}

async function insertLabAuditEvent(input: {
  supabase: ReturnType<typeof createAdminSupabaseClient>;
  sessionId: string;
  turnId: string | null;
  eventType: string;
  payload: Record<string, any>;
  botContext?: Record<string, any>;
}) {
  const { supabase, sessionId, turnId, eventType, payload, botContext } = input;
  try {
    await supabase.from("F_audit_events").insert({
      session_id: sessionId,
      turn_id: turnId,
      event_type: eventType,
      payload,
      created_at: nowIso(),
      bot_context: botContext || {},
    });
  } catch (error) {
    console.warn("[laboratory/run] failed to insert audit event", {
      eventType,
      session_id: sessionId,
      turn_id: turnId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function persistProxyFailure(input: {
  error: unknown;
  traceId: string;
  body: Record<string, any> | null;
  targetPath: string;
  targetUrl: string | null;
  pageKey: string;
  authHeader: string;
  cookieHeader: string;
  originInfo: Record<string, any> | null;
  stageHistory: Array<{ stage: string; at: string }>;
  lastStage: string;
  requestStartedAt: number;
  serverContext?: { userId?: string | null; orgId?: string | null } | null;
}) {
  const {
    error,
    traceId,
    body,
    targetPath,
    targetUrl,
    pageKey,
    authHeader,
    cookieHeader,
    originInfo,
    stageHistory,
    lastStage,
    requestStartedAt,
    serverContext,
  } = input;
  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (err) {
    console.warn("[laboratory/run] admin supabase init failed", {
      trace_id: traceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  const errorMessage = error instanceof Error ? error.message : String(error || "LAB_PROXY_FAILED");
  const errorStack = error instanceof Error ? error.stack || null : null;
  const errorCause = (error as { cause?: unknown } | null)?.cause;
  const errorCauseDetail =
    errorCause && typeof errorCause === "object"
      ? {
          name: (errorCause as { name?: string }).name || null,
          message: (errorCause as { message?: string }).message || null,
          code: (errorCause as { code?: string }).code || null,
          errno: (errorCause as { errno?: string | number }).errno || null,
          syscall: (errorCause as { syscall?: string }).syscall || null,
          address: (errorCause as { address?: string }).address || null,
          port: (errorCause as { port?: number }).port || null,
        }
      : errorCause
        ? { message: String(errorCause) }
        : null;
  const providedSessionId = String(body?.session_id || "").trim();
  const resolvedSessionId = isUuidLike(providedSessionId) ? providedSessionId : crypto.randomUUID();
  const needsSessionInsert = !isUuidLike(providedSessionId);
  let sessionExists = false;
  if (!needsSessionInsert) {
    try {
      const { data } = await supabaseAdmin
        .from("D_conv_sessions")
        .select("id")
        .eq("id", resolvedSessionId)
        .maybeSingle();
      sessionExists = Boolean(data?.id);
    } catch (err) {
      console.warn("[laboratory/run] failed to check session existence", {
        trace_id: traceId,
        session_id: resolvedSessionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  if (needsSessionInsert || !sessionExists) {
    try {
      await supabaseAdmin.from("D_conv_sessions").insert({
        id: resolvedSessionId,
        org_id: serverContext?.orgId || null,
        session_code: `lab_${Math.random().toString(36).slice(2, 8)}`,
        started_at: nowIso(),
        channel: "laboratory_proxy_error",
        metadata: {
          trace_id: traceId,
          page_key: pageKey,
          route: targetPath,
          reason: "proxy_failed",
        },
      });
    } catch (err) {
      console.warn("[laboratory/run] failed to insert error session", {
        trace_id: traceId,
        session_id: resolvedSessionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const resolvedTurnId = crypto.randomUUID();
  const fallback = "처리 중 오류가 발생했습니다. 같은 내용을 한 번 더 보내주세요.";
  const failed = buildFailedPayload({
    code: "LAB_PROXY_FAILED",
    summary: errorMessage || "LAB_PROXY_FAILED",
    stage: "lab.proxy",
    retryable: true,
    detail: errorStack ? { stack: errorStack } : undefined,
  });
  const scope = deriveScopeLevels(lastStage);
  const messageExcerpt = String(body?.message || "").slice(0, 200) || null;
  const eventPayload = {
    code: "LAB_PROXY_FAILED",
    summary: errorMessage || "LAB_PROXY_FAILED",
    stage: "lab.proxy",
    trace_id: traceId,
    last_stage: lastStage,
    scope,
    page_key: pageKey,
    route: targetPath,
    target_url: targetUrl,
    origin_info: originInfo || null,
    message_excerpt: messageExcerpt,
    stage_history: stageHistory,
    duration_ms: Date.now() - requestStartedAt,
    has_auth_header: Boolean(authHeader),
    has_cookie: Boolean(cookieHeader),
    error_stack: errorStack,
    error_cause: errorCauseDetail,
  };

  const eventCreatedAt = nowIso();

  await insertLabAuditEvent({
    supabase: supabaseAdmin,
    sessionId: resolvedSessionId,
    turnId: resolvedTurnId,
    eventType: "LAB_PROXY_FAILURE_BEFORE_TURN_WRITE",
    payload: { ...eventPayload, point: "before_turn_write" },
    botContext: { trace_id: traceId, stage: "lab_proxy" },
  });

  let persistedTurnId = resolvedTurnId;
  let persistedSeq: number | null = null;
  try {
    const { data, error: turnError } = await supabaseAdmin
      .from("D_conv_turns")
      .insert({
        id: resolvedTurnId,
        session_id: resolvedSessionId,
        seq: null,
        transcript_text: String(body?.message || ""),
        answer_text: fallback,
        final_answer: fallback,
        failed,
        bot_context: {
          intent_name: "general",
          entity: {},
          error_code: "LAB_PROXY_FAILED",
          error_stage: lastStage,
          trace_id: traceId,
        },
      })
      .select("id, session_id, seq")
      .single();
    if (turnError) throw new Error(turnError.message);
    if (data?.id) persistedTurnId = String(data.id);
    persistedSeq = data?.seq ? Number(data.seq) : null;
  } catch (err) {
    console.warn("[laboratory/run] failed to insert error turn", {
      trace_id: traceId,
      session_id: resolvedSessionId,
      turn_id: resolvedTurnId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const debugPrefix = buildDebugPrefixJson({
    llmModel: null,
    mcpTools: [],
    mcpProviders: [],
    mcpLastFunction: "NO_TOOL_CALLED:LAB_PROXY",
    mcpLastStatus: "error",
    mcpLastError: errorMessage || "LAB_PROXY_FAILED",
    mcpLastCount: null,
    mcpLogs: [
      `lab_proxy_error: ${errorMessage || "LAB_PROXY_FAILED"}`,
      `last_stage: ${lastStage}`,
      ...(targetUrl ? [`target_url: ${targetUrl}`] : []),
      ...(originInfo?.resolved_origin ? [`resolved_origin: ${originInfo.resolved_origin}`] : []),
    ],
    providerAvailable: [],
    conversationMode: String(body?.mode || "mk2"),
  });
  try {
    await upsertDebugLog(
      { supabase: supabaseAdmin } as any,
      {
        sessionId: resolvedSessionId,
        turnId: persistedTurnId,
        seq: persistedSeq,
        prefixJson: debugPrefix,
      }
    );
  } catch (err) {
    console.warn("[laboratory/run] failed to upsert debug log", {
      trace_id: traceId,
      session_id: resolvedSessionId,
      turn_id: persistedTurnId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const inlineDebugLog = {
    id: null,
    session_id: resolvedSessionId,
    turn_id: persistedTurnId,
    seq: persistedSeq,
    prefix_json: debugPrefix,
    prefix_tree: null,
    created_at: eventCreatedAt,
  };
  const inlineEventBefore = {
    id: null,
    event_type: "LAB_PROXY_FAILURE_BEFORE_TURN_WRITE",
    payload: { ...eventPayload, point: "before_turn_write" },
    created_at: eventCreatedAt,
    session_id: resolvedSessionId,
    turn_id: persistedTurnId,
  };
  const inlineEventAfter = {
    id: null,
    event_type: "LAB_PROXY_FAILURE_AFTER_TURN_WRITE",
    payload: { ...eventPayload, point: "after_turn_write", turn_id: persistedTurnId },
    created_at: eventCreatedAt,
    session_id: resolvedSessionId,
    turn_id: persistedTurnId,
  };
  const inlineEventUnhandled = {
    id: null,
    event_type: "UNHANDLED_ERROR_CAUGHT",
    payload: { ...eventPayload, turn_id: persistedTurnId },
    created_at: eventCreatedAt,
    session_id: resolvedSessionId,
    turn_id: persistedTurnId,
  };

  await insertLabAuditEvent({
    supabase: supabaseAdmin,
    sessionId: resolvedSessionId,
    turnId: persistedTurnId,
    eventType: "LAB_PROXY_FAILURE_AFTER_TURN_WRITE",
    payload: { ...eventPayload, point: "after_turn_write", turn_id: persistedTurnId },
    botContext: { trace_id: traceId, stage: "lab_proxy" },
  });
  await insertLabAuditEvent({
    supabase: supabaseAdmin,
    sessionId: resolvedSessionId,
    turnId: persistedTurnId,
    eventType: "UNHANDLED_ERROR_CAUGHT",
    payload: { ...eventPayload, turn_id: persistedTurnId },
    botContext: { trace_id: traceId, stage: "lab_proxy" },
  });

  return {
    sessionId: resolvedSessionId,
    turnId: persistedTurnId,
    logBundle: {
      mcp_logs: [],
      event_logs: [inlineEventBefore, inlineEventAfter, inlineEventUnhandled],
      debug_logs: [inlineDebugLog],
    },
  };
}

function sanitizeRuntimePayloadByInteractionPolicy(
  payload: unknown,
  interaction: { quickReplies: boolean; productCards: boolean }
) {
  if (!payload || typeof payload !== "object") return payload;
  const next = { ...(payload as Record<string, unknown>) };
  const responseSchema =
    next.response_schema && typeof next.response_schema === "object"
      ? { ...(next.response_schema as Record<string, unknown>) }
      : null;
  const renderPlan =
    next.render_plan && typeof next.render_plan === "object"
      ? { ...(next.render_plan as Record<string, unknown>) }
      : null;

  if (!interaction.quickReplies) {
    delete next.quick_replies;
    delete next.quick_reply_config;
    if (responseSchema) {
      responseSchema.quick_replies = [];
      responseSchema.quick_reply_config = null;
    }
    if (renderPlan) renderPlan.enable_quick_replies = false;
  }

  if (!interaction.productCards) {
    delete next.product_cards;
    if (responseSchema) {
      responseSchema.cards = [];
    }
    if (renderPlan) renderPlan.enable_cards = false;
  }

  if (renderPlan && !interaction.quickReplies && !interaction.productCards) {
    renderPlan.enable_quick_replies = false;
    renderPlan.enable_cards = false;
  }

  if (responseSchema) next.response_schema = responseSchema;
  if (renderPlan) next.render_plan = renderPlan;
  return next;
}

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  const incomingTraceId = String(req.headers.get("x-runtime-trace-id") || "").trim();
  const traceId = incomingTraceId || makeTraceId();
  let lastStage = "lab.proxy.start";
  const stageHistory: Array<{ stage: string; at: string }> = [{ stage: lastStage, at: nowIso() }];
  const markStage = (stage: string) => {
    const safe = String(stage || "").trim();
    if (!safe) return;
    lastStage = safe;
    stageHistory.push({ stage: safe, at: nowIso() });
    if (stageHistory.length > 12) stageHistory.shift();
  };
  let body: Record<string, any> | null = null;
  let targetPath = "/api/runtime/chat";
  let targetUrl: string | null = null;
  let pageKey: ConversationPageKey = "/app/laboratory";
  let authHeader = "";
  let cookieHeader = "";
  let serverContext: { userId?: string | null; orgId?: string | null } | null = null;
  let originInfo: Record<string, any> | null = null;
  try {
    const parseStartedAt = Date.now();
    markStage("lab.proxy.parse_body.start");
    body = await req.json().catch(() => null);
    markStage("lab.proxy.parse_body.done");
    if (!body || !body.message) {
      console.info("[laboratory/run][timing]", {
        trace_id: traceId,
        status: "invalid_body",
        parse_body_ms: Date.now() - parseStartedAt,
        total_ms: Date.now() - requestStartedAt,
      });
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    targetPath = normalizeRoute(String(body.route || ""));
    markStage("lab.proxy.origin.resolve.start");
    const runtimeOrigin = resolveRuntimeOrigin(req);
    originInfo = runtimeOrigin.info;
    markStage("lab.proxy.origin.resolve.done");
    const targetUrlObject = new URL(targetPath, runtimeOrigin.origin);
    targetUrl = targetUrlObject.toString();
    authHeader = req.headers.get("authorization") || "";
    cookieHeader = req.headers.get("cookie") || "";
    pageKey = parsePageKey(body.page_key);
    const requestToolIds: unknown[] = Array.isArray(body.mcp_tool_ids) ? body.mcp_tool_ids : [];
    const requestProviderKeys: unknown[] = Array.isArray(body.mcp_provider_keys) ? body.mcp_provider_keys : [];
    let providerValue: ConversationFeaturesProviderShape | null = null;
    let isAdminUser = false;
    markStage("lab.proxy.auth_context.start");
    const serverCtx = await getServerContext(authHeader, cookieHeader);
    markStage("lab.proxy.auth_context.done");
    if (!("error" in serverCtx)) {
      serverContext = { userId: serverCtx.user.id, orgId: serverCtx.orgId };
      const { data: access } = await serverCtx.supabase
        .from("A_iam_user_access_maps")
        .select("is_admin")
        .eq("user_id", serverCtx.user.id)
        .maybeSingle();
      isAdminUser = Boolean(access?.is_admin);
      const { data: settings } = await serverCtx.supabase
        .from("A_iam_auth_settings")
        .select("providers")
        .eq("org_id", serverCtx.orgId)
        .is("user_id", null)
        .maybeSingle();
      const providers = (settings?.providers || {}) as Record<string, ConversationFeaturesProviderShape | undefined>;
      providerValue = providers.chat_policy || null;
    }
    const featureFlags = applyConversationFeatureVisibility(
      resolveConversationPageFeatures(pageKey, providerValue),
      isAdminUser
    );
    const filteredProviderKeys = featureFlags.mcp.providerSelector
      ? requestProviderKeys
          .map((value: unknown) => String(value || "").trim())
          .filter((key: string) => key.length > 0 && isProviderEnabled(key, featureFlags))
      : [];
    const filteredToolIds = featureFlags.mcp.actionSelector
      ? requestToolIds
          .map((value: unknown) => String(value || "").trim())
          .filter((id: string) => id.length > 0 && isToolEnabled(id, featureFlags))
      : [];
    const mergedMcpSelectors = Array.from(
      new Set(
        [...filteredToolIds, ...filteredProviderKeys]
          .map((value) => String(value).trim())
          .filter(Boolean)
      )
    );
    const normalizedLlm = String(body.llm || "").trim();
    const effectiveLlm = featureFlags.setup.llmSelector
      ? normalizedLlm || featureFlags.setup.defaultLlm
      : featureFlags.setup.defaultLlm;
    const effectiveKbId = featureFlags.setup.kbSelector ? String(body.kb_id || "").trim() || undefined : undefined;
    const effectiveInlineKb = featureFlags.setup.inlineUserKbInput
      ? String(body.inline_kb || "").trim() || undefined
      : undefined;
    const effectiveAdminKbIds = featureFlags.setup.adminKbSelector
      ? (Array.isArray(body.admin_kb_ids) ? body.admin_kb_ids : [])
          .map((value: unknown) => String(value || "").trim())
          .filter((value: string) => value.length > 0)
      : [];

    const fetchStartedAt = Date.now();
    markStage("lab.proxy.runtime.fetch.start");
    const res = await fetch(targetUrlObject.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        "x-runtime-trace-id": traceId,
      },
      body: JSON.stringify({
        message: String(body.message || ""),
        session_id: body.session_id || undefined,
        agent_id: body.agent_id || undefined,
        llm: effectiveLlm,
        kb_id: effectiveKbId,
        inline_kb: effectiveInlineKb,
        admin_kb_ids: effectiveAdminKbIds,
        mcp_tool_ids: mergedMcpSelectors,
        mcp_provider_keys: filteredProviderKeys,
        mode: body.mode,
        runtime_flags: body.runtime_flags || undefined,
        metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
        end_user: body?.end_user && typeof body.end_user === "object" ? body.end_user : undefined,
        visitor: body?.visitor && typeof body.visitor === "object" ? body.visitor : undefined,
      }),
    });
    markStage("lab.proxy.runtime.fetch.done");
    const runtimeFetchMs = Date.now() - fetchStartedAt;

    const parseResponseStartedAt = Date.now();
    const data = await res.json().catch(() => ({}));
    const sanitizedData = sanitizeRuntimePayloadByInteractionPolicy(data, {
      quickReplies: featureFlags.interaction.quickReplies,
      productCards: featureFlags.interaction.productCards,
    });
    const parseResponseMs = Date.now() - parseResponseStartedAt;
    console.info("[laboratory/run][timing]", {
      trace_id: traceId,
      status: res.status,
      route: targetPath,
      is_first_turn: !body.session_id,
      parse_body_ms: fetchStartedAt - parseStartedAt,
      runtime_fetch_ms: runtimeFetchMs,
      parse_response_ms: parseResponseMs,
      total_ms: Date.now() - requestStartedAt,
    });
    return NextResponse.json(sanitizedData, { status: res.status });
  } catch (error) {
    markStage("lab.proxy.error");
    const persisted = await persistProxyFailure({
      error,
      traceId,
      body,
      targetPath,
      targetUrl,
      pageKey,
      authHeader,
      cookieHeader,
      originInfo,
      stageHistory,
      lastStage,
      requestStartedAt,
      serverContext,
    });
    console.error("[laboratory/run] proxy failed", error);
    console.info("[laboratory/run][timing]", {
      trace_id: traceId,
      status: "proxy_failed",
      total_ms: Date.now() - requestStartedAt,
    });
    return NextResponse.json(
      {
        step: "final",
        message: "처리 중 오류가 발생했습니다. 같은 내용을 한 번 더 보내주세요.",
        mcp_actions: [],
        error: "LAB_PROXY_FAILED",
        trace_id: traceId,
        session_id: persisted?.sessionId || (body?.session_id ? String(body.session_id) : null),
        turn_id: persisted?.turnId || null,
        log_bundle: persisted?.logBundle || null,
      },
      { status: 200 }
    );
  }
}
