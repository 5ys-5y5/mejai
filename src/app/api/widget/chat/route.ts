import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
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
import { fetchWidgetChatPolicy } from "@/lib/widgetChatPolicy";
import { normalizeWidgetOverrides, readWidgetMeta, normalizeStringArray } from "@/lib/widgetTemplateMeta";
import { resolveWidgetRuntimeConfig } from "@/lib/widgetRuntimeConfig";

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
  if (override) return override.replace(/\/+$/, "");
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
  orgId: string;
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
        org_id: orgId,
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

  const { data: widget } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, org_id, agent_id, is_active, name, public_key, allowed_domains, allowed_paths, theme")
    .eq("id", payload.widget_id)
    .maybeSingle();
  if (!widget || !widget.is_active) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  const widgetMeta = readWidgetMeta(widget.theme);
  const templateId = widgetMeta.template_id ? String(widgetMeta.template_id) : "";
  const { data: template } = templateId
    ? await supabaseAdmin.from("B_chat_widgets").select("*").eq("id", templateId).maybeSingle()
    : { data: null };

  const resolved = resolveWidgetRuntimeConfig(widget, template || null, overrides);

  let providerValue: ConversationFeaturesProviderShape | null = null;
  try {
    providerValue = resolved.chat_policy || (await fetchWidgetChatPolicy(supabaseAdmin, String(widget.org_id || "")));
  } catch {
    providerValue = null;
  }
  const featureFlags = applyConversationFeatureVisibility(
    resolveConversationPageFeatures(WIDGET_PAGE_KEY, providerValue),
    false
  );
  const requestToolIds: unknown[] = Array.isArray(mcpToolIds) ? mcpToolIds : [];
  const requestProviderKeys: unknown[] = Array.isArray(mcpProviderKeys) ? mcpProviderKeys : [];
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
  const resolvedAgentId = resolved.agent_id || null;
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

  if (!resolvedAgentId && mergedMcpSelectors.length === 0) {
    return NextResponse.json({ error: "MCP_REQUIRED" }, { status: 400 });
  }

  const normalizedLlm = String(llm || "").trim();
  const effectiveLlmCandidate = enforcedLlm || normalizedLlm;
  const effectiveLlm = featureFlags.setup.llmSelector
    ? effectiveLlmCandidate || featureFlags.setup.defaultLlm
    : featureFlags.setup.defaultLlm;

  const effectiveKbId =
    !resolvedAgentId && featureFlags.setup.kbSelector
      ? enforcedKbId || String(kbId || "").trim() || undefined
      : undefined;
  const effectiveInlineKb =
    !resolvedAgentId && featureFlags.setup.inlineUserKbInput
      ? String(inlineKb || "").trim() || undefined
      : undefined;
  const effectiveAdminKbIds =
    !resolvedAgentId && featureFlags.setup.adminKbSelector
      ? Array.from(
          new Set(
            [...enforcedAdminKbIds, ...(Array.isArray(adminKbIds) ? adminKbIds : [])]
              .map((value: unknown) => String(value || "").trim())
              .filter((value: string) => value.length > 0)
          )
        )
      : [];

  if (!resolvedAgentId && kbConfig.mode !== "inline" && !effectiveKbId) {
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
    widgetId: String(widget.id),
    orgId: String(widget.org_id),
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
        "x-widget-org-id": String(widget.org_id),
        "x-widget-id": String(widget.id || ""),
        "x-widget-name": encodeHeaderValue(String(resolved.name || widget.name || "")),
        "x-widget-public-key": String(widget.public_key || ""),
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
        admin_kb_ids: effectiveAdminKbIds,
        mcp_tool_ids: mergedMcpSelectors,
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
      widgetId: String(widget.id),
      orgId: String(widget.org_id),
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
      widgetId: String(widget.id),
      orgId: String(widget.org_id),
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
      widgetId: String(widget.id),
      orgId: String(widget.org_id),
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
      widgetId: String(widget.id),
      orgId: String(widget.org_id),
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
      widgetId: String(widget.id),
      orgId: String(widget.org_id),
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
    widgetId: String(widget.id),
    orgId: String(widget.org_id),
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
