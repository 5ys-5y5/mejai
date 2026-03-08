import { NextRequest } from "next/server";
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
import { normalizeWidgetOverrides, normalizeStringArray } from "@/lib/widgetTemplateMeta";
import { filterWidgetOverridesByPolicy, resolveWidgetBasePolicy, resolveWidgetRuntimeConfig } from "@/lib/widgetRuntimeConfig";

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

function encodeEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function handleStream(
  req: NextRequest,
  message: string,
  sessionId: string,
  extras?: {
    visitor?: Record<string, any> | null;
    end_user?: Record<string, any> | null;
    runtime_flags?: Record<string, any> | null;
    llm?: string | null;
    kb_id?: string | null;
    inline_kb?: string | null;
    admin_kb_ids?: unknown[] | null;
    mcp_tool_ids?: unknown[] | null;
    mcp_provider_keys?: unknown[] | null;
    mode?: string | null;
    overrides?: Record<string, unknown> | null;
  }
) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const payload = verifyWidgetToken(token);
  if (!payload) {
    return new Response(encodeEvent("error", { error: "INVALID_WIDGET_TOKEN" }), {
      status: 401,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return new Response(encodeEvent("error", { error: "ADMIN_SUPABASE_INIT_FAILED" }), {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const { data: instance } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .select("id, template_id, public_key, name, is_active, chat_policy, is_public, editable_id, usable_id")
    .eq("id", payload.widget_id)
    .maybeSingle();
  if (!instance || !instance.is_active) {
    return new Response(encodeEvent("error", { error: "WIDGET_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const { data: template } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, name, is_active, chat_policy, is_public, created_by")
    .eq("id", instance.template_id)
    .maybeSingle();
  if (!template || !template.is_active) {
    return new Response(encodeEvent("error", { error: "WIDGET_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  if (!template.is_public || !instance.is_public) {
    return new Response(encodeEvent("error", { error: "WIDGET_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const overrides = normalizeWidgetOverrides(extras?.overrides);
  const basePolicy = resolveWidgetBasePolicy(template, instance);
  const filteredOverrides = filterWidgetOverridesByPolicy(overrides, basePolicy);
  const resolved = resolveWidgetRuntimeConfig(template, instance, filteredOverrides);

  const providerValue: ConversationFeaturesProviderShape | null = resolved.chat_policy || null;
  const featureFlags = applyConversationFeatureVisibility(
    resolveConversationPageFeatures(WIDGET_PAGE_KEY, providerValue),
    false
  );
  const visitorUserId = readVisitorUserId(extras?.visitor) || String(payload.visitor_id || "").trim();
  const editableIds = Array.isArray(instance.editable_id)
    ? instance.editable_id.map((value) => String(value || "").trim())
    : [];
  const canEditInstance = Boolean(visitorUserId && editableIds.includes(visitorUserId));
  const safeLlm = canEditInstance ? extras?.llm : undefined;
  const safeKbId = canEditInstance ? extras?.kb_id : undefined;
  const safeInlineKb = canEditInstance ? extras?.inline_kb : undefined;
  const safeAdminKbIds = canEditInstance ? extras?.admin_kb_ids : [];
  const safeMcpToolIds = canEditInstance ? extras?.mcp_tool_ids : [];
  const safeMcpProviderKeys = canEditInstance ? extras?.mcp_provider_keys : [];

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

  if (resolvedAgentId) {
    const { data: agent } = await supabaseAdmin
      .from("B_bot_agents")
      .select("id, is_public, usable_id")
      .eq("id", resolvedAgentId)
      .maybeSingle();
    if (!agent || !isUsableByVisitor(agent, visitorUserId)) {
      return new Response(encodeEvent("error", { error: "AGENT_NOT_ALLOWED" }), {
        status: 403,
        headers: { "Content-Type": "text/event-stream" },
      });
    }
  }

  if (effectiveKbId) {
    const { data: kb } = await supabaseAdmin
      .from("B_bot_knowledge_bases")
      .select("id, is_public, usable_id")
      .eq("id", effectiveKbId)
      .maybeSingle();
    if (!kb || !isUsableByVisitor(kb, visitorUserId)) {
      return new Response(encodeEvent("error", { error: "KB_NOT_ALLOWED" }), {
        status: 403,
        headers: { "Content-Type": "text/event-stream" },
      });
    }
  }

  let allowedAdminKbIds = effectiveAdminKbIds;
  if (effectiveAdminKbIds.length > 0) {
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
  if (mcpToolCandidates.length > 0) {
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

  if (!resolvedAgentId && allowedMcpTools.length === 0) {
    return new Response(encodeEvent("error", { error: "MCP_REQUIRED" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  if (!resolvedAgentId && kbConfig.mode !== "inline" && !effectiveKbId) {
    return new Response(encodeEvent("error", { error: "KB_REQUIRED" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const secret = getWidgetRuntimeSecret();
  if (!secret) {
    return new Response(encodeEvent("error", { error: "WIDGET_RUNTIME_SECRET_MISSING" }), {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(encodeEvent("ready", { ts: Date.now() })));
      try {
        const targetUrl = new URL("/api/runtime/chat", req.nextUrl.origin);
        const runtimeFlags = resolveRuntimeFlags(
          extras?.runtime_flags && typeof extras.runtime_flags === "object" ? extras.runtime_flags : undefined
        );
        const res = await fetch(targetUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-widget-secret": secret,
            "x-widget-org-id": template.created_by ? String(template.created_by) : "",
          },
          body: JSON.stringify({
            message,
            session_id: sessionId,
            agent_id: resolvedAgentId || undefined,
            page_key: WIDGET_PAGE_KEY,
            mode: extras?.mode || undefined,
            llm: effectiveLlm,
            kb_id: effectiveKbId,
            inline_kb: effectiveInlineKb,
            admin_kb_ids: allowedAdminKbIds,
            mcp_tool_ids: allowedMcpTools,
            mcp_provider_keys: filteredProviderKeys,
            runtime_flags: runtimeFlags,
            ...(extras?.visitor && typeof extras.visitor === "object" ? { visitor: extras.visitor } : {}),
            ...(extras?.end_user && typeof extras.end_user === "object" ? { end_user: extras.end_user } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        controller.enqueue(encoder.encode(encodeEvent("message", { payload: data })));
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            encodeEvent("error", { error: error instanceof Error ? error.message : "STREAM_FAILED" })
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.message) {
    return new Response(encodeEvent("error", { error: "INVALID_BODY" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  const message = String(body.message || "").trim();
  const sessionId = String(body.session_id || "").trim();
  if (!sessionId || !message) {
    return new Response(encodeEvent("error", { error: "INVALID_INPUT" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  const visitor = body?.visitor && typeof body.visitor === "object" ? body.visitor : null;
  const endUser = body?.end_user && typeof body.end_user === "object" ? body.end_user : null;
  const runtimeFlags = body?.runtime_flags && typeof body.runtime_flags === "object" ? body.runtime_flags : null;
  const llm = typeof body?.llm === "string" ? body.llm : null;
  const kbId = typeof body?.kb_id === "string" ? body.kb_id : null;
  const inlineKb = typeof body?.inline_kb === "string" ? body.inline_kb : null;
  const adminKbIds = Array.isArray(body?.admin_kb_ids) ? body.admin_kb_ids : null;
  const mcpToolIds = Array.isArray(body?.mcp_tool_ids) ? body.mcp_tool_ids : null;
  const mcpProviderKeys = Array.isArray(body?.mcp_provider_keys) ? body.mcp_provider_keys : null;
  const mode = typeof body?.mode === "string" ? body.mode : null;
  const overrides = body?.overrides && typeof body.overrides === "object" ? body.overrides : null;
  return handleStream(req, message, sessionId, {
    visitor,
    end_user: endUser,
    runtime_flags: runtimeFlags,
    llm,
    kb_id: kbId,
    inline_kb: inlineKb,
    admin_kb_ids: adminKbIds,
    mcp_tool_ids: mcpToolIds,
    mcp_provider_keys: mcpProviderKeys,
    mode,
    overrides,
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const message = String(url.searchParams.get("message") || "").trim();
  const sessionId = String(url.searchParams.get("session_id") || "").trim();
  if (!message || !sessionId) {
    return new Response(encodeEvent("error", { error: "INVALID_INPUT" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  return handleStream(req, message, sessionId);
}
