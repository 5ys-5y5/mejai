import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
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
    agent_id?: string | null;
    llm?: string | null;
    kb_id?: string | null;
    inline_kb?: string | null;
    admin_kb_ids?: unknown[] | null;
    mcp_tool_ids?: unknown[] | null;
    mcp_provider_keys?: unknown[] | null;
    mode?: string | null;
    overrides?: Record<string, unknown> | null;
    origin?: string | null;
    page_url?: string | null;
    referrer?: string | null;
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

  const tokenInstanceId = readWidgetTokenInstanceId(payload);
  const tokenTemplateId = readWidgetTokenTemplateId(payload);

  let instance: WidgetInstanceRow | null = null;

  if (tokenInstanceId) {
    const { data } = await supabaseAdmin
      .from("B_chat_widget_instances")
      .select("id, template_id, public_key, name, is_active, is_public, editable_id, usable_id")
      .eq("id", tokenInstanceId)
      .maybeSingle();
    if (!data || !data.is_active) {
      return new Response(encodeEvent("error", { error: "WIDGET_NOT_FOUND" }), {
        status: 404,
        headers: { "Content-Type": "text/event-stream" },
      });
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
    return new Response(encodeEvent("error", { error: "WIDGET_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  if (!runtimeTemplate.is_public || (instance && !instance.is_public)) {
    return new Response(encodeEvent("error", { error: "WIDGET_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const overrides = normalizeWidgetOverrides(extras?.overrides);
  const basePolicy = resolveWidgetBasePolicy(runtimeTemplate);
  const filteredOverrides = filterWidgetOverridesByPolicy(overrides, basePolicy);
  const resolved = resolveWidgetRuntimeConfig(runtimeTemplate, instance, filteredOverrides);
  const visitorId = readVisitorId(extras?.visitor) || normalizeText(payload.visitor_id);
  const requestedOrigin = normalizeText(extras?.origin) || normalizeText(payload.origin);
  const requestedPageUrl = normalizeText(extras?.page_url);
  const requestedReferrer = normalizeText(extras?.referrer);
  const ensuredSession = await ensureWidgetSession(supabaseAdmin, {
    sessionId,
    templateId: resolvedTemplateId,
    instanceId: instance?.id || null,
    origin: requestedOrigin || null,
    pageUrl: requestedPageUrl || null,
    referrer: requestedReferrer || null,
    visitorId: visitorId || null,
    visitor: extras?.visitor && typeof extras.visitor === "object" ? extras.visitor : null,
    createIfMissing: true,
  });
  const resolvedSessionId = ensuredSession.sessionId;
  const responseWidgetToken = issueWidgetToken({
    org_id: runtimeTemplate.created_by ? String(runtimeTemplate.created_by) : null,
    template_id: resolvedTemplateId,
    instance_id: instance?.id || null,
    session_id: resolvedSessionId,
    visitor_id: visitorId || null,
    origin: requestedOrigin || null,
  });

  const providerValue: ConversationFeaturesProviderShape | null = resolved.chat_policy || null;
  const featureFlags = applyConversationFeatureVisibility(
    resolveConversationPageFeatures(WIDGET_PAGE_KEY, providerValue),
    false
  );
  const visitorUserId = readVisitorUserId(extras?.visitor) || String(payload.visitor_id || "").trim();
  const editableIds = Array.isArray(instance?.editable_id)
    ? instance.editable_id.map((value) => String(value || "").trim())
    : [];
  const canEditInstance = Boolean(instance && visitorUserId && editableIds.includes(visitorUserId));
  const allowAgentOverride = Boolean(featureFlags.setup.agentSelector || featureFlags.setup.modelSelector);
  const baseAgentId =
    typeof resolved.setup_config?.agent_id === "string" ? resolved.setup_config.agent_id : null;
  const safeAgentId = canEditInstance ? extras?.agent_id : undefined;
  const normalizedAgentId = String(safeAgentId || "").trim();
  const effectiveAgentId =
    allowAgentOverride && normalizedAgentId ? normalizedAgentId : baseAgentId || null;
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
  const gatedProviderKeys = filterValuesByGate(filteredProviderKeys, featureFlags.setup.mcpProviderKeys);
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
  const effectiveKbId =
    featureFlags.setup.kbSelector && normalizedKbId && isEnabledByGate(normalizedKbId, featureFlags.setup.kbIds)
      ? normalizedKbId
      : undefined;
  const inlineAllowed = featureFlags.setup.inlineUserKbInput;
  const inlinePrefill = String(featureFlags.setup.inlineUserKbPrefill || "").trim();
  const inlineGate = featureFlags.setup.inlineUserKb;
  const defaultInlineKbId = String(featureFlags.setup.defaultInlineUserKb || "").trim();
  let effectiveInlineKb = inlineAllowed ? String(safeInlineKb || "").trim() || "" : "";
  if (inlineAllowed && !effectiveInlineKb && inlinePrefill) {
    effectiveInlineKb = inlinePrefill;
  }
  let inlineKbResolved = effectiveInlineKb ? effectiveInlineKb : undefined;
  const effectiveAdminKbIds = featureFlags.setup.adminKbSelector
    ? Array.from(
        new Set(
          (Array.isArray(safeAdminKbIds) ? safeAdminKbIds : [])
            .map((value: unknown) => String(value || "").trim())
            .filter((value: string) => value.length > 0)
            .filter((value: string) => isEnabledByGate(value, featureFlags.setup.adminKbIds))
        )
      )
    : [];

  if (inlineAllowed && !inlineKbResolved && defaultInlineKbId) {
    const inlineAllowlist = Array.isArray(inlineGate?.allowlist) ? inlineGate.allowlist : [];
    const inlineGateActive = inlineGate?.enabled === true && inlineAllowlist.length > 0;
    if (!inlineGateActive || inlineAllowlist.includes(defaultInlineKbId)) {
      const { data: inlineKbRow } = await supabaseAdmin
        .from("B_bot_knowledge_bases")
        .select("id, content, is_public, usable_id")
        .eq("id", defaultInlineKbId)
        .maybeSingle();
      if (inlineKbRow && isUsableByVisitor(inlineKbRow, visitorUserId)) {
        const content = String(inlineKbRow.content || "").trim();
        if (content) {
          inlineKbResolved = content;
        }
      }
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

  if (allowedMcpTools.length === 0 && !inlineAllowed) {
    return new Response(encodeEvent("error", { error: "MCP_REQUIRED" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  if (!inlineAllowed && !effectiveKbId) {
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
      controller.enqueue(
        encoder.encode(
          encodeEvent("session", {
            session_id: resolvedSessionId,
            widget_token: responseWidgetToken,
          })
        )
      );
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
            "x-widget-org-id": runtimeTemplate.created_by ? String(runtimeTemplate.created_by) : "",
          },
          body: JSON.stringify({
            message,
            session_id: resolvedSessionId,
            agent_id: effectiveAgentId || undefined,
            page_key: WIDGET_PAGE_KEY,
            mode: extras?.mode || undefined,
            llm: effectiveLlm,
            kb_id: effectiveKbId,
            inline_kb: inlineKbResolved,
            admin_kb_ids: allowedAdminKbIds,
            mcp_tool_ids: allowedMcpTools,
            mcp_provider_keys: gatedProviderKeys,
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
  if (!message) {
    return new Response(encodeEvent("error", { error: "INVALID_INPUT" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  const visitor = body?.visitor && typeof body.visitor === "object" ? body.visitor : null;
  const endUser = body?.end_user && typeof body.end_user === "object" ? body.end_user : null;
  const runtimeFlags = body?.runtime_flags && typeof body.runtime_flags === "object" ? body.runtime_flags : null;
  const llm = typeof body?.llm === "string" ? body.llm : null;
  const agentId = typeof body?.agent_id === "string" ? body.agent_id : null;
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
    agent_id: agentId,
    llm,
    kb_id: kbId,
    inline_kb: inlineKb,
    admin_kb_ids: adminKbIds,
    mcp_tool_ids: mcpToolIds,
    mcp_provider_keys: mcpProviderKeys,
    mode,
    overrides,
    origin: typeof body?.origin === "string" ? body.origin : null,
    page_url: typeof body?.page_url === "string" ? body.page_url : null,
    referrer: typeof body?.referrer === "string" ? body.referrer : null,
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const message = String(url.searchParams.get("message") || "").trim();
  const sessionId = String(url.searchParams.get("session_id") || "").trim();
  if (!message) {
    return new Response(encodeEvent("error", { error: "INVALID_INPUT" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  return handleStream(req, message, sessionId);
}
