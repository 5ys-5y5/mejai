import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";
import { issueWidgetToken, readWidgetTokenInstanceId, readWidgetTokenTemplateId, verifyWidgetToken } from "@/lib/widgetToken";
import { resolveRuntimeFlags } from "@/lib/runtimeFlags";
import { ensureWidgetSession } from "@/lib/widgetSessions";
import {
  applyConversationFeatureVisibility,
  isEnabledByGate,
  isProviderEnabled,
  isToolEnabled,
  resolveConversationPageFeatures,
  WIDGET_PAGE_KEY,
  type ConversationFeaturesProviderShape,
} from "@/lib/conversation/pageFeaturePolicy";
import { normalizeWidgetOverrides } from "@/lib/widgetTemplateMeta";
import {
  filterWidgetOverridesByPolicy,
  resolveWidgetBasePolicy,
  resolveWidgetRuntimeConfig,
  type WidgetInstanceRow,
  type WidgetTemplateRow,
} from "@/lib/widgetRuntimeConfig";

type RuntimeTemplateRow = WidgetTemplateRow & {
  public_key?: string | null;
};

const WIDGET_CHAT_ERROR_EVENT = "WIDGET_CHAT_ERROR";

function encodeHeaderValue(input: string) {
  const value = String(input || "").trim();
  if (!value) return "";
  try {
    return encodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodeHeaderJson(input: unknown) {
  if (!input) return "";
  try {
    return encodeHeaderValue(JSON.stringify(input));
  } catch {
    return "";
  }
}

function resolveRuntimeBaseUrl(req: NextRequest) {
  const override = String(process.env.WIDGET_RUNTIME_BASE_URL || "").trim();
  if (override) {
    try {
      new URL(override);
      return override.replace(/\/+$/, "");
    } catch {
      // ignore invalid override
    }
  }
  const forwardedHost = String(req.headers.get("x-forwarded-host") || "").trim();
  const forwardedProto = String(req.headers.get("x-forwarded-proto") || "").trim();
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`;
  }
  const host = String(req.headers.get("host") || "").trim();
  if (host) {
    const proto = forwardedProto || req.nextUrl.protocol.replace(":", "") || "http";
    return `${proto}://${host}`;
  }
  return req.nextUrl.origin;
}

async function logWidgetProxyEvent(input: {
  supabase: ReturnType<typeof createAdminSupabaseClient>;
  sessionId: string;
  widgetId: string;
  orgId?: string | null;
  agentId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const { supabase, sessionId, widgetId, orgId, agentId, eventType, payload } = input;
  try {
    await supabase.from("F_audit_events").insert({
      session_id: sessionId,
      turn_id: null,
      event_type: eventType,
      payload: {
        widget_id: widgetId,
        org_id: orgId || null,
        agent_id: agentId || null,
        ...payload,
      },
      created_at: new Date().toISOString(),
      bot_context: { source: "widget_proxy" },
    });
  } catch (error) {
    console.warn("[widget/chat] failed to log proxy event", {
      eventType,
      sessionId,
      widgetId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function getWidgetRuntimeSecret() {
  return String(process.env.WIDGET_RUNTIME_SECRET || "").trim();
}

function readVisitorUserId(input: Record<string, any> | null | undefined) {
  if (!input || typeof input !== "object") return "";
  const candidate =
    input.id ||
    input.user_id ||
    input.userId ||
    input.account_id ||
    input.accountId ||
    input.external_user_id ||
    input.externalUserId;
  return String(candidate || "").trim();
}

function readVisitorId(input: Record<string, any> | null | undefined) {
  if (!input || typeof input !== "object") return "";
  const candidate = input.id || input.visitor_id || input.visitorId || input.external_user_id || input.externalUserId;
  return String(candidate || "").trim();
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isUsableByVisitor(row: { is_public?: boolean | null; usable_id?: string[] | null }, visitorId: string) {
  if (row.is_public) return true;
  if (!visitorId) return false;
  const usable = Array.isArray(row.usable_id) ? row.usable_id.map((id) => String(id || "").trim()) : [];
  return usable.includes(visitorId);
}

function filterValuesByGate(values: string[], gate?: { enabled?: boolean | null; allowlist?: string[] | null }) {
  if (!gate || gate.enabled !== true) return values;
  const allowlist = Array.isArray(gate.allowlist) ? gate.allowlist : [];
  if (allowlist.length === 0) return values;
  const allowset = new Set(allowlist);
  return values.filter((value) => allowset.has(value));
}

async function isPreviewAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) return false;
  const { data: access } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();
  return Boolean(access?.is_admin);
}

function isSameOriginPreview(req: NextRequest) {
  const requestOrigin = String(req.headers.get("origin") || "").trim();
  const requestReferer = String(req.headers.get("referer") || "").trim();
  const serverOrigin = new URL(req.url).origin;
  if (requestOrigin && requestOrigin === serverOrigin) return true;
  if (requestReferer && requestReferer.startsWith(serverOrigin)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const payload = verifyWidgetToken(token);
  if (!payload) {
    return NextResponse.json({ error: "INVALID_WIDGET_TOKEN" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.message) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const previewMode = body.preview === true || body.preview === "true";
  const previewAllowed = previewMode
    ? (await isPreviewAdmin(req)) || isSameOriginPreview(req)
    : false;
  const message = String(body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
  }
  const requestedSessionId = String(body.session_id || payload.session_id || "").trim();
  const agentId = body.agent_id;
  const llm = body.llm;
  const kbId = body.kb_id;
  const inlineKb = body.inline_kb;
  const adminKbIds = body.admin_kb_ids;
  const mcpToolIds = body.mcp_tool_ids;
  const mcpProviderKeys = body.mcp_provider_keys;
  const route = body.route;
  const overrides = normalizeWidgetOverrides(body.overrides);
  const visitor = body.visitor;
  const requestOrigin = normalizeText(body.origin) || normalizeText(payload.origin);
  const requestPageUrl = normalizeText(body.page_url || body.pageUrl);
  const requestReferrer = normalizeText(body.referrer);
  const runtimeFlags = resolveRuntimeFlags(
    body?.runtime_flags && typeof body.runtime_flags === "object" ? body.runtime_flags : undefined
  );

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const tokenInstanceId = readWidgetTokenInstanceId(payload);
  const tokenTemplateId = readWidgetTokenTemplateId(payload);

  let instance: WidgetInstanceRow | null = null;

  if (tokenInstanceId) {
    const { data } = await supabaseAdmin
      .from("B_chat_widget_instances")
      .select("id, template_id, public_key, name, is_active, is_public, editable_id, usable_id, created_by")
      .eq("id", tokenInstanceId)
      .maybeSingle();
    if (!data || !data.is_active) {
      return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
    }
    instance = data as WidgetInstanceRow;
  }

  const resolvedTemplateId = tokenTemplateId || String(instance?.template_id || "").trim();
  const { data: template } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, name, is_active, chat_policy, is_public, created_by, public_key")
    .eq("id", resolvedTemplateId)
    .maybeSingle();
  const runtimeTemplate = template as RuntimeTemplateRow | null;
  if (!runtimeTemplate || !runtimeTemplate.is_active) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }
  if ((!runtimeTemplate.is_public || (instance && !instance.is_public)) && !previewAllowed) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  let orgId = "";
  if (runtimeTemplate.created_by) {
    const createdBy = String(runtimeTemplate.created_by);
    const { data: accessRow } = await supabaseAdmin
      .from("A_iam_user_access_maps")
      .select("org_id")
      .eq("user_id", createdBy)
      .maybeSingle();
    orgId = accessRow?.org_id ? String(accessRow.org_id) : createdBy;
  }

  const basePolicy = resolveWidgetBasePolicy(runtimeTemplate);
  const filteredOverrides = filterWidgetOverridesByPolicy(overrides, basePolicy);
  const resolved = resolveWidgetRuntimeConfig(runtimeTemplate, instance, filteredOverrides);
  const runtimeWidgetId = String(instance?.id || runtimeTemplate.id || "").trim();
  const runtimeWidgetName = String(resolved.name || runtimeTemplate.name || instance?.name || "").trim();
  const runtimePublicKey = String(instance?.public_key || runtimeTemplate.public_key || "").trim();
  const visitorId = readVisitorId(visitor) || normalizeText(payload.visitor_id);
  let sessionId = "";
  try {
    const ensuredSession = await ensureWidgetSession(supabaseAdmin, {
      sessionId: requestedSessionId,
      templateId: resolvedTemplateId,
      instanceId: instance?.id || null,
      origin: requestOrigin || null,
      pageUrl: requestPageUrl || null,
      referrer: requestReferrer || null,
      visitorId: visitorId || null,
      visitor: visitor && typeof visitor === "object" ? (visitor as Record<string, unknown>) : null,
      createIfMissing: true,
    });
    sessionId = ensuredSession.sessionId;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WIDGET_SESSION_RESOLVE_FAILED" },
      { status: 400 }
    );
  }

  let responseWidgetToken = token;
  try {
    responseWidgetToken = issueWidgetToken({
      org_id: orgId || null,
      template_id: resolvedTemplateId,
      instance_id: instance?.id || null,
      session_id: sessionId,
      visitor_id: visitorId || null,
      origin: requestOrigin || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WIDGET_TOKEN_REFRESH_FAILED" },
      { status: 500 }
    );
  }

  const providerValue: ConversationFeaturesProviderShape | null = resolved.chat_policy || null;
  const featureFlags = applyConversationFeatureVisibility(
    resolveConversationPageFeatures(WIDGET_PAGE_KEY, providerValue),
    false
  );
  const visitorUserId = readVisitorUserId(visitor);
  const editableIds = Array.isArray(instance?.editable_id)
    ? instance.editable_id.map((value) => String(value || "").trim())
    : [];
  const canEditInstance = Boolean(instance && visitorUserId && editableIds.includes(visitorUserId));
  const allowAgentOverride = Boolean(featureFlags.setup.agentSelector || featureFlags.setup.modelSelector);
  const baseAgentId =
    typeof resolved.setup_config?.agent_id === "string" ? resolved.setup_config.agent_id : null;
  const safeAgentId = canEditInstance ? agentId : undefined;
  const normalizedAgentId = String(safeAgentId || "").trim();
  const effectiveAgentId =
    allowAgentOverride && normalizedAgentId ? normalizedAgentId : baseAgentId || null;
  const safeLlm = canEditInstance ? llm : undefined;
  const safeKbId = canEditInstance ? kbId : undefined;
  const safeInlineKb = inlineKb;
  const safeAdminKbIds = canEditInstance ? adminKbIds : [];
  const safeMcpToolIds = canEditInstance ? mcpToolIds : [];
  const safeMcpProviderKeys = canEditInstance ? mcpProviderKeys : [];

  const requestToolIds: unknown[] = Array.isArray(safeMcpToolIds) ? safeMcpToolIds : [];
  const requestProviderKeys: unknown[] = Array.isArray(safeMcpProviderKeys) ? safeMcpProviderKeys : [];
  const defaultProviderKeys = Array.isArray(featureFlags.setup.defaultMcpProviderKeys)
    ? featureFlags.setup.defaultMcpProviderKeys
    : [];
  const allowProviderDefaults =
    featureFlags.mcp.providerSelector || defaultProviderKeys.length > 0;
  const filteredProviderKeys = allowProviderDefaults
    ? (requestProviderKeys.length > 0 ? requestProviderKeys : defaultProviderKeys)
        .map((value: unknown) => String(value || "").trim())
        .filter((key: string) => key.length > 0 && isProviderEnabled(key, featureFlags))
    : [];
  const gatedProviderKeys = filterValuesByGate(filteredProviderKeys, featureFlags.setup.mcpProviderKeys);
  const defaultToolIds = Array.isArray(featureFlags.setup.defaultMcpToolIds)
    ? featureFlags.setup.defaultMcpToolIds
    : [];
  const allowToolDefaults = featureFlags.mcp.actionSelector || defaultToolIds.length > 0;
  const filteredToolIds = allowToolDefaults
    ? (requestToolIds.length > 0 ? requestToolIds : defaultToolIds)
        .map((value: unknown) => String(value || "").trim())
        .filter((id: string) => id.length > 0 && isToolEnabled(id, featureFlags))
    : [];
  const gatedToolIds = filterValuesByGate(filteredToolIds, featureFlags.setup.mcpToolIds);
  const mergedMcpSelectors = Array.from(
    new Set(
      [...gatedToolIds, ...gatedProviderKeys].map((value) => String(value).trim()).filter(Boolean)
    )
  );

  const normalizedLlm = String(safeLlm || "").trim();
  const defaultLlm = featureFlags.setup.defaultLlm;
  const requestedLlm =
    featureFlags.setup.llmSelector && normalizedLlm && isEnabledByGate(normalizedLlm, featureFlags.setup.llms)
      ? normalizedLlm
      : "";
  const effectiveLlm = featureFlags.setup.llmSelector ? requestedLlm || defaultLlm : defaultLlm;

  const normalizedKbId = String(safeKbId || "").trim();
  const defaultKbId = String(featureFlags.setup.defaultKbId || "").trim();
  const effectiveKbId =
    (normalizedKbId && isEnabledByGate(normalizedKbId, featureFlags.setup.kbIds)
      ? normalizedKbId
      : defaultKbId && isEnabledByGate(defaultKbId, featureFlags.setup.kbIds)
        ? defaultKbId
        : undefined);
  const inlineAllowed = featureFlags.setup.inlineUserKbInput;
  const inlinePrefill = String(featureFlags.setup.inlineUserKbPrefill || "").trim();
  const inlineGate = featureFlags.setup.inlineUserKb;
  const defaultInlineKbId = String(featureFlags.setup.defaultInlineUserKb || "").trim();
  let effectiveInlineKb = inlineAllowed ? String(safeInlineKb || "").trim() || "" : "";
  if (inlineAllowed && !effectiveInlineKb && inlinePrefill) {
    effectiveInlineKb = inlinePrefill;
  }
  let inlineKbResolved = effectiveInlineKb ? effectiveInlineKb : undefined;
  const defaultAdminKbIds = Array.isArray(featureFlags.setup.defaultAdminKbIds)
    ? featureFlags.setup.defaultAdminKbIds
    : [];
  const effectiveAdminKbIds = Array.from(
    new Set(
      (Array.isArray(safeAdminKbIds) && safeAdminKbIds.length > 0 ? safeAdminKbIds : defaultAdminKbIds)
        .map((value: unknown) => String(value || "").trim())
        .filter((value: string) => value.length > 0)
        .filter((value: string) => isEnabledByGate(value, featureFlags.setup.adminKbIds))
    )
  );

  if (inlineAllowed && !inlineKbResolved && defaultInlineKbId) {
    const inlineAllowlist = Array.isArray(inlineGate?.allowlist) ? inlineGate.allowlist : [];
    const inlineGateActive = inlineGate?.enabled === true && inlineAllowlist.length > 0;
    if (!inlineGateActive || inlineAllowlist.includes(defaultInlineKbId)) {
      const { data: inlineKbRow } = await supabaseAdmin
        .from("B_bot_knowledge_bases")
        .select("id, content, is_public, usable_id")
        .eq("id", defaultInlineKbId)
        .maybeSingle();
      if (inlineKbRow && (previewAllowed || isUsableByVisitor(inlineKbRow, visitorUserId))) {
        const content = String(inlineKbRow.content || "").trim();
        if (content) {
          inlineKbResolved = content;
        }
      }
    }
  }

  const normalizedRoute = String(route || "").trim();
  const defaultRoute = String(featureFlags.setup.defaultRoute || "").trim();
  const effectiveRoute =
    (normalizedRoute && isEnabledByGate(normalizedRoute, featureFlags.setup.routes)
      ? normalizedRoute
      : defaultRoute && isEnabledByGate(defaultRoute, featureFlags.setup.routes)
        ? defaultRoute
        : undefined);

  const logAndReturn = async (errorCode: string, status: number) => {
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: runtimeWidgetId,
      orgId,
      agentId: null,
      eventType: WIDGET_CHAT_ERROR_EVENT,
      payload: {
        error: errorCode,
        message,
        visitor_id: visitorUserId || null,
      },
    });
    return NextResponse.json({ error: errorCode }, { status });
  };

  if (effectiveKbId) {
    const { data: kb } = await supabaseAdmin
      .from("B_bot_knowledge_bases")
      .select("id, is_public, usable_id")
      .eq("id", effectiveKbId)
      .maybeSingle();
    if (!kb || (!previewAllowed && !isUsableByVisitor(kb, visitorUserId))) {
      return await logAndReturn("KB_NOT_ALLOWED", 403);
    }
  }

  let allowedAdminKbIds = effectiveAdminKbIds;
  if (!previewAllowed && effectiveAdminKbIds.length > 0) {
    const { data: adminKbs } = await supabaseAdmin
      .from("B_bot_knowledge_bases")
      .select("id, is_public, usable_id")
      .in("id", effectiveAdminKbIds);
    const allowedSet = new Set(
      (adminKbs || []).filter((row) => isUsableByVisitor(row, visitorUserId)).map((row) => String(row.id))
    );
    allowedAdminKbIds = effectiveAdminKbIds.filter((id) => allowedSet.has(id));
  }

  const mcpToolCandidates = mergedMcpSelectors.filter((value) => isUuid(String(value || "")));
  let allowedMcpTools = mergedMcpSelectors;
  if (!previewAllowed && mcpToolCandidates.length > 0) {
    const { data: tools } = await supabaseAdmin
      .from("C_mcp_tools")
      .select("id, is_public, usable_id")
      .in("id", mcpToolCandidates);
    const allowedSet = new Set(
      (tools || []).filter((row) => isUsableByVisitor(row, visitorUserId)).map((row) => String(row.id))
    );
    allowedMcpTools = mergedMcpSelectors.filter((value) => {
      const id = String(value || "").trim();
      return !isUuid(id) || allowedSet.has(id);
    });
  }

  if (!previewAllowed && allowedMcpTools.length === 0 && !inlineAllowed) {
    return await logAndReturn("MCP_REQUIRED", 400);
  }

  if (!previewAllowed && !inlineAllowed && !effectiveKbId) {
    return await logAndReturn("KB_REQUIRED", 400);
  }

  const secret = getWidgetRuntimeSecret();
  if (!secret) {
    return NextResponse.json({ error: "WIDGET_RUNTIME_SECRET_MISSING" }, { status: 500 });
  }

  const proxyTraceId = crypto.randomUUID();
  const runtimeBaseUrl = resolveRuntimeBaseUrl(req);
  const targetUrl = new URL("/api/runtime/chat", runtimeBaseUrl).toString();
  const requestMeta = {
    proxy_trace_id: proxyTraceId,
    runtime_base_url: runtimeBaseUrl,
    target_url: targetUrl,
    req_origin: req.nextUrl.origin,
    req_host: req.headers.get("host") || "",
    req_forwarded_host: req.headers.get("x-forwarded-host") || "",
    req_forwarded_proto: req.headers.get("x-forwarded-proto") || "",
  };
  await logWidgetProxyEvent({
    supabase: supabaseAdmin,
    sessionId,
    widgetId: runtimeWidgetId,
    orgId: orgId || null,
    agentId: effectiveAgentId,
    eventType: "WIDGET_RUNTIME_PROXY_START",
    payload: {
      ...requestMeta,
      message_length: message.length,
    },
  });

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-widget-secret": secret,
        "x-widget-org-id": orgId,
        "x-widget-id": runtimeWidgetId,
        "x-widget-name": encodeHeaderValue(runtimeWidgetName),
        "x-widget-public-key": runtimePublicKey,
        "x-widget-agent-id": effectiveAgentId ? encodeHeaderValue(effectiveAgentId) : "",
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        agent_id: effectiveAgentId || undefined,
        mode: body.mode,
        llm: effectiveLlm,
        kb_id: effectiveKbId,
        inline_kb: inlineKbResolved,
        admin_kb_ids: allowedAdminKbIds,
        route: effectiveRoute,
        mcp_tool_ids: allowedMcpTools,
        mcp_provider_keys: gatedProviderKeys,
        page_key: WIDGET_PAGE_KEY,
        visitor,
        runtime_flags: runtimeFlags,
      }),
    });
  } catch (error) {
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: runtimeWidgetId,
      orgId: orgId || null,
      agentId: effectiveAgentId,
      eventType: "WIDGET_RUNTIME_PROXY_FETCH_FAILED",
      payload: {
        ...requestMeta,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: runtimeWidgetId,
      orgId: orgId || null,
      agentId: effectiveAgentId,
      eventType: "WIDGET_RUNTIME_PROXY_END",
      payload: {
        ...requestMeta,
        ok: false,
        status: 0,
      },
    });
    return NextResponse.json(
      {
        error: "WIDGET_RUNTIME_PROXY_FETCH_FAILED",
        detail: error instanceof Error ? error.message : String(error),
      proxy_trace_id: proxyTraceId,
    },
    { status: 502 }
  );
  }

  const rawText = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
  } catch (error) {
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: runtimeWidgetId,
      orgId: orgId || null,
      agentId: effectiveAgentId,
      eventType: "WIDGET_RUNTIME_PROXY_INVALID_JSON",
      payload: {
        ...requestMeta,
        status: res.status,
        body_snippet: rawText.slice(0, 800),
      },
    });
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: runtimeWidgetId,
      orgId: orgId || null,
      agentId: effectiveAgentId,
      eventType: "WIDGET_RUNTIME_PROXY_END",
      payload: {
        ...requestMeta,
        ok: false,
        status: res.status,
      },
    });
    return NextResponse.json(
      {
        error: "WIDGET_RUNTIME_INVALID_RESPONSE",
        status: res.status,
        proxy_trace_id: proxyTraceId,
      },
      { status: 502 }
    );
  }

  if (!res.ok) {
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: runtimeWidgetId,
      orgId: orgId || null,
      agentId: effectiveAgentId,
      eventType: "WIDGET_RUNTIME_PROXY_ERROR",
      payload: {
        ...requestMeta,
        status: res.status,
        runtime_error: data.error || null,
        runtime_detail: data.detail || null,
      },
    });
  }
  const responseSchema = data.response_schema && typeof data.response_schema === "object" ? (data.response_schema as Record<string, any>) : null;
  const renderPlan = data.render_plan && typeof data.render_plan === "object" ? (data.render_plan as Record<string, any>) : null;
  const quickReplyCount = Array.isArray(data.quick_replies) ? data.quick_replies.length : 0;
  const productCardCount = Array.isArray(data.product_cards) ? data.product_cards.length : 0;
  const schemaQuickReplyCount = Array.isArray(responseSchema?.quick_replies) ? responseSchema?.quick_replies?.length || 0 : 0;
  const schemaCardCount = Array.isArray(responseSchema?.cards) ? responseSchema?.cards?.length || 0 : 0;
  await logWidgetProxyEvent({
    supabase: supabaseAdmin,
    sessionId,
    widgetId: runtimeWidgetId,
    orgId: orgId || null,
    agentId: effectiveAgentId,
    eventType: "WIDGET_RUNTIME_PROXY_END",
    payload: {
      ...requestMeta,
      status: res.status,
      ok: res.ok,
      ui_signal: {
        render_view: String(renderPlan?.view || ""),
        enable_cards: Boolean(renderPlan?.enable_cards),
        enable_quick_replies: Boolean(renderPlan?.enable_quick_replies),
        quick_replies: quickReplyCount,
        product_cards: productCardCount,
        response_schema_quick_replies: schemaQuickReplyCount,
        response_schema_cards: schemaCardCount,
      },
    },
  });

  return NextResponse.json(
    {
      ...data,
      session_id: sessionId,
      widget_token: responseWidgetToken,
      proxy_trace_id: proxyTraceId,
    },
    { status: res.status }
  );
}
