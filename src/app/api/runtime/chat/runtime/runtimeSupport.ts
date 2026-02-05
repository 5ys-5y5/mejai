export type DebugPayload = {
  llmModel?: string | null;
  mcpTools?: string[];
  mcpProviders?: string[];
  mcpLastFunction?: string | null;
  mcpLastStatus?: string | null;
  mcpLastError?: string | null;
  mcpLastCount?: number | null;
  mcpLogs?: string[];
  providerConfig?: Record<string, string | null>;
  userId?: string | null;
  orgId?: string | null;
  userPlan?: string | null;
  userIsAdmin?: boolean | null;
  userRole?: string | null;
  providerAvailable?: string[];
  authSettingsId?: string | null;
  kbUserId?: string | null;
  kbAdminIds?: string[];
  usedRuleIds?: string[];
  usedTemplateIds?: string[];
  usedToolPolicies?: string[];
  conversationMode?: string | null;
  slotExpectedInput?: string | null;
  slotOrderId?: string | null;
  slotPhone?: string | null;
  slotPhoneMasked?: string | null;
  slotZipcode?: string | null;
  slotAddress?: string | null;
  mcpCandidateCalls?: string[];
  mcpSkipped?: string[];
  policyInputRules?: string[];
  policyToolRules?: string[];
  contextContamination?: string[];
};

type DebugEntry = { key: string; value: string | number };

export type RuntimeTimingStage = {
  stage: string;
  ms: number;
  at: string;
  detail?: Record<string, unknown>;
};

export const ENABLE_RUNTIME_TIMING = false;

export function nowIso() {
  return new Date().toISOString();
}

export function buildFailedPayload(input: {
  code: string;
  summary: string;
  intent?: string;
  stage?: string;
  tool?: string;
  required_scope?: string;
  retryable?: boolean;
  detail?: Record<string, unknown>;
}) {
  return {
    code: input.code,
    summary: input.summary,
    intent: input.intent || null,
    stage: input.stage || null,
    tool: input.tool || null,
    required_scope: input.required_scope || null,
    retryable: input.retryable ?? false,
    detail: input.detail || null,
    at: nowIso(),
  };
}

function inferToolProvider(toolName: string, providerHints: string[]) {
  const normalized = String(toolName || "").trim().toLowerCase();
  if (normalized === "search_address") return "juso";
  if (normalized === "send_otp" || normalized === "verify_otp") return "solapi";
  if (
    normalized === "list_orders" ||
    normalized === "lookup_order" ||
    normalized === "track_shipment" ||
    normalized === "update_order_shipping_address" ||
    normalized === "create_ticket" ||
    normalized === "find_customer_by_phone" ||
    normalized === "read_shipping" ||
    normalized === "read_product" ||
    normalized === "read_supply" ||
    normalized === "resolve_product" ||
    normalized === "subscribe_restock" ||
    normalized === "subscribe_notification" ||
    normalized === "trigger_restock"
  ) {
    return "cafe24";
  }
  if (normalized.startsWith("cafe24_") || normalized.startsWith("scope_")) return "cafe24";
  if (providerHints.length === 1) return providerHints[0];
  return "unknown";
}

function inferToolScope(toolName: string) {
  const normalized = String(toolName || "").trim().toLowerCase();
  if (
    normalized.startsWith("list_") ||
    normalized.startsWith("lookup_") ||
    normalized.startsWith("resolve_") ||
    normalized.startsWith("read_") ||
    normalized.startsWith("search_") ||
    normalized.startsWith("track_")
  ) {
    return "read";
  }
  if (
    normalized.startsWith("update_") ||
    normalized.startsWith("create_") ||
    normalized.startsWith("trigger_") ||
    normalized.startsWith("send_") ||
    normalized.startsWith("verify_")
  ) {
    return "write";
  }
  return "unknown";
}

function buildStructuredDebugPrefix(payload: DebugPayload) {
  const uniq = (items?: string[]) => Array.from(new Set(items || [])).filter(Boolean);
  const providers = uniq(payload.mcpProviders);
  const tools = uniq(payload.mcpTools).map((raw) => {
    const value = String(raw || "").trim();
    const parts = value.split(":");
    const hasProvider = parts.length > 1;
    const toolName = hasProvider ? parts.slice(1).join(":").trim() : value;
    const provider = hasProvider ? parts[0].trim().toLowerCase() : inferToolProvider(toolName, providers);
    return { provider, name: toolName, scope: inferToolScope(toolName), endpoint: toolName };
  });
  const providerMap = new Map<string, Array<{ name: string; scope: string; endpoint: string }>>();
  tools.forEach((tool) => {
    const list = providerMap.get(tool.provider) || [];
    list.push({ name: tool.name, scope: tool.scope, endpoint: tool.endpoint });
    providerMap.set(tool.provider, list);
  });
  const providerNodes = Array.from(providerMap.entries()).map(([provider, functions]) => ({ provider, functions }));
  const providerConfig = Object.fromEntries(
    Object.entries(payload.providerConfig || {}).filter(([, value]) => Boolean(value))
  );
  const mcpLast: Record<string, unknown> = {
    function: payload.mcpLastFunction || "none",
    status: payload.mcpLastStatus || "none",
    error: payload.mcpLastError || null,
    result_count: payload.mcpLastCount ?? null,
  };
  return {
    schema_version: 2,
    ...(payload.llmModel ? { llm: { model: payload.llmModel } } : {}),
    mcp: {
      ...(providerNodes.length > 0 ? { providers: providerNodes } : {}),
      last: mcpLast,
      ...(uniq(payload.mcpCandidateCalls).length > 0 ? { candidate_calls: uniq(payload.mcpCandidateCalls) } : {}),
      ...(uniq(payload.mcpSkipped).length > 0 ? { skipped: uniq(payload.mcpSkipped) } : {}),
      ...(uniq(payload.mcpLogs).length > 0 ? { logs: uniq(payload.mcpLogs) } : {}),
      ...(Object.keys(providerConfig).length > 0 ? { provider_config: providerConfig } : {}),
    },
    ...(uniq(payload.providerAvailable).length > 0 || payload.authSettingsId
      ? {
          auth: {
            ...(uniq(payload.providerAvailable).length > 0 ? { providers: uniq(payload.providerAvailable) } : {}),
            ...(payload.authSettingsId ? { settings_id: payload.authSettingsId } : {}),
          },
        }
      : {}),
    ...(uniq(payload.usedRuleIds).length > 0 ||
    uniq(payload.usedTemplateIds).length > 0 ||
    uniq(payload.usedToolPolicies).length > 0 ||
    uniq(payload.kbAdminIds).length > 0 ||
    payload.kbUserId
      ? {
          kb_admin: {
            ...(uniq(payload.usedRuleIds).length > 0 ? { rule_ids: uniq(payload.usedRuleIds) } : {}),
            ...(uniq(payload.usedTemplateIds).length > 0 ? { template_ids: uniq(payload.usedTemplateIds) } : {}),
            ...(uniq(payload.usedToolPolicies).length > 0 ? { tool_policies: uniq(payload.usedToolPolicies) } : {}),
            ...(uniq(payload.kbAdminIds).length > 0 ? { kb_admin_ids: uniq(payload.kbAdminIds) } : {}),
            ...(payload.kbUserId ? { kb_user_id: payload.kbUserId } : {}),
          },
        }
      : {}),
    ...(uniq(payload.policyInputRules).length > 0 || uniq(payload.policyToolRules).length > 0
      ? {
          policy: {
            ...(uniq(payload.policyInputRules).length > 0 ? { input_rules: uniq(payload.policyInputRules) } : {}),
            ...(uniq(payload.policyToolRules).length > 0 ? { tool_rules: uniq(payload.policyToolRules) } : {}),
          },
        }
      : {}),
    ...(payload.slotExpectedInput ||
    payload.slotOrderId ||
    payload.slotPhone ||
    payload.slotPhoneMasked ||
    payload.slotZipcode ||
    payload.slotAddress
      ? {
          slot: {
            ...(payload.slotExpectedInput ? { expected_input: payload.slotExpectedInput } : {}),
            ...(payload.slotOrderId ? { order_id: payload.slotOrderId } : {}),
            ...(payload.slotPhone ? { phone: payload.slotPhone } : {}),
            ...(payload.slotPhoneMasked ? { phone_masked: payload.slotPhoneMasked } : {}),
            ...(payload.slotZipcode ? { zipcode: payload.slotZipcode } : {}),
            ...(payload.slotAddress ? { address: payload.slotAddress } : {}),
          },
        }
      : {}),
    ...(uniq(payload.contextContamination).length > 0
      ? {
          context: {
            contamination: uniq(payload.contextContamination),
            contamination_count: uniq(payload.contextContamination).length,
          },
        }
      : {}),
    ...(payload.userId || payload.orgId || payload.userPlan || payload.userRole || payload.userIsAdmin !== undefined
      ? {
          user: {
            ...(payload.userId ? { id: payload.userId } : {}),
            ...(payload.orgId ? { org_id: payload.orgId } : {}),
            ...(payload.userPlan ? { plan: payload.userPlan } : {}),
            ...(payload.userRole ? { role: payload.userRole } : {}),
            ...(payload.userIsAdmin !== undefined && payload.userIsAdmin !== null ? { is_admin: payload.userIsAdmin } : {}),
          },
        }
      : {}),
    ...(payload.conversationMode ? { mode: payload.conversationMode } : {}),
  };
}

export function buildDebugPrefix(payload: DebugPayload) {
  const entries = buildDebugEntries(payload);
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  type TreeNode = { value?: string; children: Map<string, TreeNode> };
  const root: TreeNode = { children: new Map() };
  entries.forEach((entry) => {
    const path = entry.key.split(".").filter(Boolean);
    let node = root;
    path.forEach((seg, idx) => {
      if (!node.children.has(seg)) {
        node.children.set(seg, { children: new Map() });
      }
      node = node.children.get(seg)!;
      if (idx === path.length - 1) {
        node.value = String(entry.value);
      }
    });
  });
  const listStyleForDepth = (depth: number) => {
    if (depth <= 0) return "disc";
    if (depth === 1) return "circle";
    return "square";
  };
  const renderList = (node: TreeNode, depth: number): string => {
    const items = Array.from(node.children.entries())
      .map(([key, child]) => {
        const valuePart = child.value !== undefined ? `: ${escapeHtml(child.value)}` : "";
        const childrenPart = child.children.size > 0 ? renderList(child, depth + 1) : "";
        return `<li style="margin:2px 0;">${escapeHtml(key)}${valuePart}${childrenPart}</li>`;
      })
      .join("");
    return `<ul style="list-style:${listStyleForDepth(depth)}; margin:0 0 0 1.1rem; padding:0;">${items}</ul>`;
  };
  const treeHtml = renderList(root, 0);
  return `<div class="debug_prefix">${treeHtml}</div>`;
}

function buildDebugEntries(payload: DebugPayload): DebugEntry[] {
  const uniq = (items?: string[]) => Array.from(new Set(items || [])).filter(Boolean);
  const providerConfig = payload.providerConfig || {};
  const configParts = Object.entries(providerConfig)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`);
  return [
    { key: "LLM.model", value: payload.llmModel || "-" },
    { key: "MCP.functions", value: uniq(payload.mcpTools).join(", ") || "-" },
    { key: "MCP.provider", value: uniq(payload.mcpProviders).join(", ") || "-" },
    { key: "MCP.last_function", value: payload.mcpLastFunction || "none" },
    { key: "MCP.last_status", value: payload.mcpLastStatus || "-" },
    { key: "MCP.last_error", value: payload.mcpLastError || "-" },
    { key: "MCP.last_result_count", value: payload.mcpLastCount ?? "-" },
    { key: "MCP.provider_config", value: configParts.join(", ") || "-" },
    ...(payload.mcpLogs && payload.mcpLogs.length > 0
      ? payload.mcpLogs.map((line, index) => ({
        key: `MCP.logs.${index + 1}`,
        value: line,
      }))
      : [{ key: "MCP.logs", value: "-" }]),
    { key: "USER.id", value: payload.userId || "-" },
    { key: "ORG.id", value: payload.orgId || "-" },
    { key: "USER.plan", value: payload.userPlan || "-" },
    {
      key: "USER.is_admin",
      value:
        payload.userIsAdmin === null || payload.userIsAdmin === undefined
          ? "-"
          : payload.userIsAdmin
            ? "true"
            : "false",
    },
    { key: "USER.role", value: payload.userRole || "-" },
    { key: "AUTH_SETTINGS.id", value: payload.authSettingsId || "-" },
    { key: "AUTH_SETTINGS.providers", value: uniq(payload.providerAvailable).join(", ") || "-" },
    { key: "KB.user.id", value: payload.kbUserId || "-" },
    { key: "KB.admin.ids", value: uniq(payload.kbAdminIds).join(", ") || "-" },
    { key: "KB_ADMIN.rules", value: uniq(payload.usedRuleIds).join(", ") || "-" },
    { key: "KB_ADMIN.templates", value: uniq(payload.usedTemplateIds).join(", ") || "-" },
    { key: "KB_ADMIN.tool_policies", value: uniq(payload.usedToolPolicies).join(", ") || "-" },
    { key: "SLOT.expected_input", value: payload.slotExpectedInput || "-" },
    { key: "SLOT.order_id", value: payload.slotOrderId || "-" },
    { key: "SLOT.phone", value: payload.slotPhone || "-" },
    { key: "SLOT.phone_masked", value: payload.slotPhoneMasked || "-" },
    { key: "SLOT.zipcode", value: payload.slotZipcode || "-" },
    { key: "SLOT.address", value: payload.slotAddress || "-" },
    { key: "POLICY.input_rules", value: uniq(payload.policyInputRules).join(", ") || "-" },
    { key: "POLICY.tool_rules", value: uniq(payload.policyToolRules).join(", ") || "-" },
    { key: "CONTEXT.contamination.count", value: uniq(payload.contextContamination).length || "-" },
    ...(payload.contextContamination && payload.contextContamination.length > 0
      ? uniq(payload.contextContamination).map((line, index) => ({
        key: `CONTEXT.contamination.${index + 1}`,
        value: line,
      }))
      : [{ key: "CONTEXT.contamination", value: "-" }]),
    { key: "MCP.candidate_calls", value: uniq(payload.mcpCandidateCalls).join(", ") || "-" },
    ...(payload.mcpSkipped && payload.mcpSkipped.length > 0
      ? payload.mcpSkipped.map((line, index) => ({
        key: `MCP.skipped.${index + 1}`,
        value: line,
      }))
      : [{ key: "MCP.skipped", value: "-" }]),
    { key: "MODE", value: payload.conversationMode || "-" },
  ];
}

export function buildDebugPrefixJson(payload: DebugPayload) {
  return buildStructuredDebugPrefix(payload) as Record<string, unknown>;
}

export function pushRuntimeTimingStage(
  stages: RuntimeTimingStage[],
  stage: string,
  startedAt: number,
  detail?: Record<string, unknown>
) {
  if (!ENABLE_RUNTIME_TIMING) return;
  stages.push({
    stage,
    ms: Date.now() - startedAt,
    at: nowIso(),
    ...(detail ? { detail } : {}),
  });
}

export function buildDefaultOrderRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const toDate = (d: Date) => d.toISOString().slice(0, 10);
  return { start_date: toDate(start), end_date: toDate(end) };
}

export function extractTemplateIds(rules: Array<{ enforce?: { actions?: Array<Record<string, unknown>> } }>) {
  const ids: string[] = [];
  rules.forEach((rule) => {
    (rule.enforce?.actions || []).forEach((action) => {
      if (String(action.type || "") === "force_response_template") {
        const id = String(action.template_id || "");
        if (id) ids.push(id);
      }
    });
  });
  return ids;
}
