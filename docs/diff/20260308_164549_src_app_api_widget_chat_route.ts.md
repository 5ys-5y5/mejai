import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";
import { verifyWidgetToken } from "@/lib/widgetToken";
import { resolveRuntimeFlags } from "@/lib/runtimeFlags";
import {
  applyConversationFeatureVisibility,
  isProviderEnabled,
  isToolEnabled,
  resolveConversationPageFeatures,
  WIDGET_PAGE_KEY,
  type ConversationFeaturesProviderShape,
} from "@/lib/conversation/pageFeaturePolicy";
import { normalizeWidgetOverrides, normalizeStringArray } from "@/lib/widgetTemplateMeta";
import { filterWidgetOverridesByPolicy, resolveWidgetBasePolicy, resolveWidgetRuntimeConfig } from "@/lib/widgetRuntimeConfig";

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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isUsableByVisitor(row: { is_public?: boolean | null; usable_id?: string[] | null }, visitorId: string) {
  if (row.is_public) return true;
  if (!visitorId) return false;
  const usable = Array.isArray(row.usable_id) ? row.usable_id.map((id) => String(id || "").trim()) : [];
  return usable.includes(visitorId);
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
  const sessionId = String(body.session_id || payload.session_id || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "SESSION_ID_REQUIRED" }, { status: 400 });
  }
  const llm = body.llm;
  const kbId = body.kb_id;
  const inlineKb = body.inline_kb;
  const adminKbIds = body.admin_kb_ids;
  const mcpToolIds = body.mcp_tool_ids;
  const mcpProviderKeys = body.mcp_provider_keys;
  const overrides = normalizeWidgetOverrides(body.overrides);
  const visitor = body.visitor;
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

  const { data: instance } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .select("id, template_id, public_key, name, is_active, chat_policy, is_public, editable_id, usable_id, created_by")
    .eq("id", payload.widget_id)
    .maybeSingle();
  if (!instance || !instance.is_active) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  const { data: template } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, name, is_active, chat_policy, is_public, created_by")
    .eq("id", instance.template_id)
    .maybeSingle();
  if (!template || !template.is_active) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }
  if ((!template.is_public || !instance.is_public) && !previewAllowed) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  let orgId = "";
  if (template.created_by) {
    const createdBy = String(template.created_by);
    const { data: accessRow } = await supabaseAdmin
      .from("A_iam_user_access_maps")
      .select("org_id")
      .eq("user_id", createdBy)
      .maybeSingle();
    orgId = accessRow?.org_id ? String(accessRow.org_id) : createdBy;
  }

  const basePolicy = resolveWidgetBasePolicy(template, instance);
  const filteredOverrides = filterWidgetOverridesByPolicy(overrides, basePolicy);
  const resolved = resolveWidgetRuntimeConfig(template, instance, filteredOverrides);

  const providerValue: ConversationFeaturesProviderShape | null = resolved.chat_policy || null;
  const featureFlags = applyConversationFeatureVisibility(
    resolveConversationPageFeatures(WIDGET_PAGE_KEY, providerValue),
    false
  );
  const visitorUserId = readVisitorUserId(visitor);
  const editableIds = Array.isArray(instance.editable_id)
    ? instance.editable_id.map((value) => String(value || "").trim())
    : [];
  const canEditInstance = Boolean(visitorUserId && editableIds.includes(visitorUserId));
  const safeLlm = canEditInstance ? llm : undefined;
  const safeKbId = canEditInstance ? kbId : undefined;
  const safeInlineKb = canEditInstance ? inlineKb : undefined;
  const safeAdminKbIds = canEditInstance ? adminKbIds : [];
  const safeMcpToolIds = canEditInstance ? mcpToolIds : [];
  const safeMcpProviderKeys = canEditInstance ? mcpProviderKeys : [];

  const requestToolIds: unknown[] = Array.isArray(safeMcpToolIds) ? safeMcpToolIds : [];
  const requestProviderKeys: unknown[] = Array.isArray(safeMcpProviderKeys) ? safeMcpProviderKeys : [];
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
  const setupConfig = resolved.setup_config || {};
  const resolvedAgentId = setupConfig.agent_id ? String(setupConfig.agent_id) : null;
  const kbConfig = setupConfig.kb || {};
  const mcpConfig = setupConfig.mcp || {};
  const enforcedProviderKeys = normalizeStringArray(mcpConfig.provider_keys);
  const enforcedToolIds = normalizeStringArray(mcpConfig.tool_ids);
  const enforcedKbId = kbConfig.mode === "select" ? String(kbConfig.kb_id || "").trim() : "";
  const enforcedAdminKbIds = normalizeStringArray(kbConfig.admin_kb_ids);
  const enforcedLlm = String(setupConfig.llm?.default || "").trim();

  const filteredEnforcedProviders = enforcedProviderKeys.filter((key) => isProviderEnabled(key, featureFlags));
  const filteredEnforcedTools = enforcedToolIds.filter((id) => isToolEnabled(id, featureFlags));

  const mergedMcpSelectors = resolvedAgentId
    ? []
    : Array.from(
        new Set(
          [
            ...filteredEnforcedTools,
            ...filteredEnforcedProviders,
            ...filteredToolIds,
            ...filteredProviderKeys,
          ]
            .map((value) => String(value).trim())
            .filter(Boolean)
        )
      );

  const normalizedLlm = String(safeLlm || "").trim();
  const effectiveLlmCandidate = enforcedLlm || normalizedLlm;
  const effectiveLlm = featureFlags.setup.llmSelector
    ? effectiveLlmCandidate || featureFlags.setup.defaultLlm
    : featureFlags.setup.defaultLlm;

  const effectiveKbId =
    !resolvedAgentId && featureFlags.setup.kbSelector
      ? enforcedKbId || String(safeKbId || "").trim() || undefined
      : undefined;
  const effectiveInlineKb =
    !resolvedAgentId && featureFlags.setup.inlineUserKbInput
      ? String(safeInlineKb || "").trim() || undefined
      : undefined;
  const effectiveAdminKbIds =
    !resolvedAgentId && featureFlags.setup.adminKbSelector
      ? Array.from(
          new Set(
            [...enforcedAdminKbIds, ...(Array.isArray(safeAdminKbIds) ? safeAdminKbIds : [])]
              .map((value: unknown) => String(value || "").trim())
              .filter((value: string) => value.length > 0)
          )
        )
      : [];

  const logAndReturn = async (errorCode: string, status: number) => {
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: instance.id,
      orgId,
      agentId: resolvedAgentId,
      eventType: WIDGET_CHAT_ERROR_EVENT,
      payload: {
        error: errorCode,
        message,
        visitor_id: visitorUserId || null,
      },
    });
    return NextResponse.json({ error: errorCode }, { status });
  };

  if (resolvedAgentId) {
    const { data: agent } = await supabaseAdmin
      .from("B_bot_agents")
      .select("id, is_public, usable_id")
      .eq("id", resolvedAgentId)
      .maybeSingle();
    if (!agent || (!previewAllowed && !isUsableByVisitor(agent, visitorUserId))) {
      return await logAndReturn("AGENT_NOT_ALLOWED", 403);
    }
  }

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

  if (!previewAllowed && !resolvedAgentId && allowedMcpTools.length === 0) {
    return await logAndReturn("MCP_REQUIRED", 400);
  }

  if (!previewAllowed && !resolvedAgentId && kbConfig.mode !== "inline" && !effectiveKbId) {
    return NextResponse.json({ error: "KB_REQUIRED" }, { status: 400 });
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
  const effectiveAgentId = resolvedAgentId || null;
  await logWidgetProxyEvent({
    supabase: supabaseAdmin,
    sessionId,
    widgetId: String(instance.id),
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
        "x-widget-id": String(instance.id || ""),
        "x-widget-name": encodeHeaderValue(String(resolved.name || template.name || instance.name || "")),
        "x-widget-public-key": String(instance.public_key || ""),
        "x-widget-agent-id": String(resolvedAgentId || ""),
        "x-widget-allowed-domains": encodeHeaderJson(resolved.allowed_domains || []),
        "x-widget-allowed-paths": encodeHeaderJson(resolved.allowed_paths || []),
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        agent_id: resolvedAgentId || undefined,
        mode: body.mode,
        llm: effectiveLlm,
        kb_id: effectiveKbId,
        inline_kb: effectiveInlineKb,
        admin_kb_ids: allowedAdminKbIds,
        mcp_tool_ids: allowedMcpTools,
        mcp_provider_keys: filteredProviderKeys,
        page_key: WIDGET_PAGE_KEY,
        visitor,
        runtime_flags: runtimeFlags,
      }),
    });
  } catch (error) {
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: String(instance.id),
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
      widgetId: String(instance.id),
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
      widgetId: String(instance.id),
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
      widgetId: String(instance.id),
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
      widgetId: String(instance.id),
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
    widgetId: String(instance.id),
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
      proxy_trace_id: proxyTraceId,
    },
    { status: res.status }
  );
}
