import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import {
  applyConversationFeatureVisibility,
  isProviderEnabled,
  isToolEnabled,
  resolveConversationPageFeatures,
  type ConversationFeaturesProviderShape,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";

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
  try {
    const parseStartedAt = Date.now();
    const body = await req.json().catch(() => null);
    if (!body || !body.message) {
      console.info("[laboratory/run][timing]", {
        trace_id: traceId,
        status: "invalid_body",
        parse_body_ms: Date.now() - parseStartedAt,
        total_ms: Date.now() - requestStartedAt,
      });
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const targetPath = normalizeRoute(String(body.route || ""));
    const targetUrl = new URL(targetPath, req.nextUrl.origin);
    const authHeader = req.headers.get("authorization") || "";
    const cookieHeader = req.headers.get("cookie") || "";
    const pageKey = parsePageKey(body.page_key);
    const requestToolIds: unknown[] = Array.isArray(body.mcp_tool_ids) ? body.mcp_tool_ids : [];
    const requestProviderKeys: unknown[] = Array.isArray(body.mcp_provider_keys) ? body.mcp_provider_keys : [];
    let providerValue: ConversationFeaturesProviderShape | null = null;
    let isAdminUser = false;
    const serverCtx = await getServerContext(authHeader, cookieHeader);
    if (!("error" in serverCtx)) {
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
    const res = await fetch(targetUrl.toString(), {
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
      }),
    });
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
      },
      { status: 200 }
    );
  }
}
