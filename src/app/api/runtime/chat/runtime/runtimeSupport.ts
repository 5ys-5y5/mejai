const RUNTIME_STARTED_AT = new Date().toISOString();

function resolveBuildInfo() {
  const env = process.env || {};
  const commit =
    String(env.VERCEL_GIT_COMMIT_SHA || env.GIT_COMMIT_SHA || env.BUILD_COMMIT || env.COMMIT_SHA || "").trim() || null;
  const ref = String(env.VERCEL_GIT_COMMIT_REF || env.GIT_BRANCH || env.BUILD_BRANCH || "").trim() || null;
  const buildId =
    String(env.VERCEL_DEPLOYMENT_ID || env.BUILD_ID || env.NEXT_PUBLIC_BUILD_ID || "").trim() || null;
  const buildAt =
    String(env.BUILD_TIMESTAMP || env.NEXT_PUBLIC_BUILD_TIMESTAMP || env.VERCEL_BUILD_TIME || "").trim() || null;
  const deployEnv =
    String(env.VERCEL_ENV || env.NODE_ENV || env.DEPLOY_ENV || env.NEXT_PUBLIC_VERCEL_ENV || "").trim() || null;

  return {
    tag: "debug-prefix-v3",
    commit,
    ref,
    build_id: buildId,
    build_at: buildAt,
    deploy_env: deployEnv,
    runtime_started_at: RUNTIME_STARTED_AT,
    node: typeof process !== "undefined" ? process.version : null,
  };
}

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
  runtimeCallChain?: Array<{ module_path: string; function_name: string }>;
  templateOverrides?: Record<string, string>;
  agentId?: string | null;
  agentParentId?: string | null;
  agentName?: string | null;
  agentType?: string | null;
  agentVersion?: string | null;
  agentLlm?: string | null;
  agentKbId?: string | null;
  kbId?: string | null;
  kbTitle?: string | null;
  kbVersion?: string | null;
  kbIsAdmin?: boolean | null;
  kbAdminSummary?: Array<{
    id: string;
    title?: string | null;
    version?: string | null;
    is_admin?: boolean | null;
  }>;
  widgetId?: string | null;
  widgetName?: string | null;
  widgetPublicKey?: string | null;
  widgetAgentId?: string | null;
  widgetOrgId?: string | null;
  widgetAllowedDomains?: string[];
  widgetAllowedPaths?: string[];
  requestDomain?: string | null;
  requestOrigin?: string | null;
  requestWidgetOrgIdPresent?: boolean;
  requestWidgetUserIdPresent?: boolean;
  requestWidgetAgentIdPresent?: boolean;
  requestWidgetSecretPresent?: boolean;
  agentIsActive?: boolean | null;
  agentResolvedFromParent?: boolean;
  agentMcpToolIdsRaw?: string[];
  userGroup?: Record<string, any> | null;
  kbAdminApplyGroups?: Array<Record<string, any>>;
  kbAdminApplyGroupsMode?: Array<string | null>;
  kbAdminFilterReasons?: Array<string>;
  modelSelectionReason?: string | null;
  modelSelectionInputLength?: number | null;
  modelSelectionLengthRuleHit?: boolean | null;
  modelSelectionKeywordRuleHit?: boolean | null;
  allowlistResolvedToolIds?: string[];
  allowlistAllowedToolNames?: string[];
  allowlistAllowedToolCount?: number | null;
  allowlistMissingExpectedTools?: string[];
  allowlistRequestedToolCount?: number | null;
  allowlistValidToolCount?: number | null;
  allowlistProviderSelectionCount?: number | null;
  allowlistProviderSelections?: string[];
  allowlistToolsByIdCount?: number | null;
  allowlistToolsByProviderCount?: number | null;
  allowlistResolvedToolCount?: number | null;
  allowlistQueryErrorById?: string | null;
  allowlistQueryErrorByProvider?: string | null;
  slotExpectedInputPrev?: string | null;
  slotExpectedInputSource?: string | null;
  slotDerivedOrderId?: string | null;
  slotDerivedPhone?: string | null;
  slotDerivedZipcode?: string | null;
  slotDerivedAddress?: string | null;
  intentScopeMismatchReason?: string | null;
  policyConflicts?: Array<Record<string, any>>;
  policyConflictResolution?: string | null;
};

type DebugEntry = { key: string; value: string | number };

export type RuntimeTimingStage = {
  stage: string;
  ms: number;
  at: string;
  detail?: Record<string, any>;
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
  detail?: Record<string, any>;
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
  const normalizedLastFunction = resolveMcpLastFunctionValue(payload);
  const mcpLast: Record<string, any> = {
    function: normalizedLastFunction,
    status: payload.mcpLastStatus || "none",
    error: payload.mcpLastError || null,
    result_count: payload.mcpLastCount ?? null,
  };
  return {
    schema_version: 3,
    build: resolveBuildInfo(),
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
    ...(Array.isArray(payload.runtimeCallChain) && payload.runtimeCallChain.length > 0
      ? {
          execution: {
            call_chain: payload.runtimeCallChain
              .map((item) => ({
                module_path: String((item as Record<string, any>)?.module_path || "").trim(),
                function_name: String((item as Record<string, any>)?.function_name || "").trim(),
              }))
              .filter((item) => Boolean(item.module_path) && Boolean(item.function_name)),
          },
        }
      : {}),
    ...(payload.templateOverrides && Object.keys(payload.templateOverrides).length > 0
      ? {
          templates: {
            overrides_applied: payload.templateOverrides,
            override_count: Object.keys(payload.templateOverrides).length,
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
    ...(payload.agentId ||
    payload.agentName ||
    payload.agentParentId ||
    payload.agentType ||
    payload.agentVersion ||
    payload.agentLlm ||
    payload.agentKbId
      ? {
          agent: {
            ...(payload.agentId ? { id: payload.agentId } : {}),
            ...(payload.agentParentId ? { parent_id: payload.agentParentId } : {}),
            ...(payload.agentName ? { name: payload.agentName } : {}),
            ...(payload.agentType ? { type: payload.agentType } : {}),
            ...(payload.agentVersion ? { version: payload.agentVersion } : {}),
            ...(payload.agentLlm ? { llm: payload.agentLlm } : {}),
            ...(payload.agentKbId ? { kb_id: payload.agentKbId } : {}),
          },
        }
      : {}),
    ...(payload.kbId ||
    payload.kbTitle ||
    payload.kbVersion ||
    payload.kbIsAdmin !== undefined ||
    (Array.isArray(payload.kbAdminSummary) && payload.kbAdminSummary.length > 0)
      ? {
          kb: {
            primary: {
              ...(payload.kbId ? { id: payload.kbId } : {}),
              ...(payload.kbTitle ? { title: payload.kbTitle } : {}),
              ...(payload.kbVersion ? { version: payload.kbVersion } : {}),
              ...(payload.kbIsAdmin !== undefined && payload.kbIsAdmin !== null ? { is_admin: payload.kbIsAdmin } : {}),
            },
            ...(Array.isArray(payload.kbAdminSummary) && payload.kbAdminSummary.length > 0
              ? { admin: payload.kbAdminSummary }
              : {}),
          },
        }
      : {}),
    ...(payload.widgetId ||
    payload.widgetName ||
    payload.widgetPublicKey ||
    payload.widgetAgentId ||
    payload.widgetOrgId ||
    (Array.isArray(payload.widgetAllowedDomains) && payload.widgetAllowedDomains.length > 0) ||
    (Array.isArray(payload.widgetAllowedPaths) && payload.widgetAllowedPaths.length > 0)
      ? {
          widget: {
            ...(payload.widgetId ? { id: payload.widgetId } : {}),
            ...(payload.widgetName ? { name: payload.widgetName } : {}),
            ...(payload.widgetPublicKey ? { public_key: payload.widgetPublicKey } : {}),
            ...(payload.widgetAgentId ? { agent_id: payload.widgetAgentId } : {}),
            ...(payload.widgetOrgId ? { org_id: payload.widgetOrgId } : {}),
            ...(Array.isArray(payload.widgetAllowedDomains) && payload.widgetAllowedDomains.length > 0
              ? { allowed_domains: payload.widgetAllowedDomains }
              : {}),
            ...(Array.isArray(payload.widgetAllowedPaths) && payload.widgetAllowedPaths.length > 0
              ? { allowed_paths: payload.widgetAllowedPaths }
              : {}),
          },
        }
      : {}),
    ...(payload.requestDomain ||
    payload.requestOrigin ||
    payload.requestWidgetOrgIdPresent !== undefined ||
    payload.requestWidgetUserIdPresent !== undefined ||
    payload.requestWidgetAgentIdPresent !== undefined ||
    payload.requestWidgetSecretPresent !== undefined
      ? {
          request_meta: {
            ...(payload.requestDomain ? { domain: payload.requestDomain } : {}),
            ...(payload.requestOrigin ? { origin: payload.requestOrigin } : {}),
            ...(payload.requestWidgetOrgIdPresent !== undefined
              ? { widget_org_id_present: payload.requestWidgetOrgIdPresent }
              : {}),
            ...(payload.requestWidgetUserIdPresent !== undefined
              ? { widget_user_id_present: payload.requestWidgetUserIdPresent }
              : {}),
            ...(payload.requestWidgetAgentIdPresent !== undefined
              ? { widget_agent_id_present: payload.requestWidgetAgentIdPresent }
              : {}),
            ...(payload.requestWidgetSecretPresent !== undefined
              ? { widget_secret_present: payload.requestWidgetSecretPresent }
              : {}),
          },
        }
      : {}),
    ...(payload.agentIsActive !== undefined ||
    payload.agentResolvedFromParent !== undefined ||
    Array.isArray(payload.agentMcpToolIdsRaw)
      ? {
          resolved_agent: {
            ...(payload.agentIsActive !== undefined ? { is_active: payload.agentIsActive } : {}),
            ...(payload.agentResolvedFromParent !== undefined
              ? { resolved_from_parent: payload.agentResolvedFromParent }
              : {}),
            ...(Array.isArray(payload.agentMcpToolIdsRaw)
              ? { mcp_tool_ids: payload.agentMcpToolIdsRaw }
              : {}),
          },
        }
      : {}),
    ...(payload.userGroup ||
    Array.isArray(payload.kbAdminApplyGroups) ||
    Array.isArray(payload.kbAdminApplyGroupsMode) ||
    Array.isArray(payload.kbAdminFilterReasons)
      ? {
          kb_resolution: {
            ...(payload.userGroup ? { user_group: payload.userGroup } : {}),
            ...(Array.isArray(payload.kbAdminApplyGroups) ? { admin_kb_apply_groups: payload.kbAdminApplyGroups } : {}),
            ...(Array.isArray(payload.kbAdminApplyGroupsMode)
              ? { admin_kb_apply_groups_mode: payload.kbAdminApplyGroupsMode }
              : {}),
            ...(Array.isArray(payload.kbAdminFilterReasons)
              ? { admin_kb_filter_reasons: payload.kbAdminFilterReasons }
              : {}),
          },
        }
      : {}),
    ...(payload.modelSelectionReason ||
    payload.modelSelectionInputLength !== undefined ||
    payload.modelSelectionLengthRuleHit !== undefined ||
    payload.modelSelectionKeywordRuleHit !== undefined
      ? {
          model_resolution: {
            ...(payload.modelSelectionReason ? { selection_reason: payload.modelSelectionReason } : {}),
            ...(payload.modelSelectionInputLength !== undefined
              ? { input_length: payload.modelSelectionInputLength }
              : {}),
            ...(payload.modelSelectionLengthRuleHit !== undefined
              ? { length_rule_hit: payload.modelSelectionLengthRuleHit }
              : {}),
            ...(payload.modelSelectionKeywordRuleHit !== undefined
              ? { keyword_rule_hit: payload.modelSelectionKeywordRuleHit }
              : {}),
          },
        }
      : {}),
    ...(Array.isArray(payload.allowlistResolvedToolIds) ||
    Array.isArray(payload.allowlistAllowedToolNames) ||
    payload.allowlistAllowedToolCount !== undefined ||
    Array.isArray(payload.allowlistMissingExpectedTools) ||
    payload.allowlistRequestedToolCount !== undefined ||
    payload.allowlistValidToolCount !== undefined ||
    payload.allowlistProviderSelectionCount !== undefined ||
    Array.isArray(payload.allowlistProviderSelections) ||
    payload.allowlistToolsByIdCount !== undefined ||
    payload.allowlistToolsByProviderCount !== undefined ||
    payload.allowlistResolvedToolCount !== undefined ||
    payload.allowlistQueryErrorById ||
    payload.allowlistQueryErrorByProvider
      ? {
          tool_allowlist: {
            ...(Array.isArray(payload.allowlistResolvedToolIds)
              ? { resolved_tool_ids: payload.allowlistResolvedToolIds }
              : {}),
            ...(Array.isArray(payload.allowlistAllowedToolNames)
              ? { allowed_tool_names: payload.allowlistAllowedToolNames }
              : {}),
            ...(payload.allowlistAllowedToolCount !== undefined
              ? { allowed_tool_count: payload.allowlistAllowedToolCount }
              : {}),
            ...(Array.isArray(payload.allowlistMissingExpectedTools)
              ? { missing_tools_expected_by_intent: payload.allowlistMissingExpectedTools }
              : {}),
            ...(payload.allowlistRequestedToolCount !== undefined
              ? { requested_tool_count: payload.allowlistRequestedToolCount }
              : {}),
            ...(payload.allowlistValidToolCount !== undefined ? { valid_tool_count: payload.allowlistValidToolCount } : {}),
            ...(payload.allowlistProviderSelectionCount !== undefined
              ? { provider_selection_count: payload.allowlistProviderSelectionCount }
              : {}),
            ...(Array.isArray(payload.allowlistProviderSelections)
              ? { provider_selections: payload.allowlistProviderSelections }
              : {}),
            ...(payload.allowlistToolsByIdCount !== undefined
              ? { tools_by_id_count: payload.allowlistToolsByIdCount }
              : {}),
            ...(payload.allowlistToolsByProviderCount !== undefined
              ? { tools_by_provider_count: payload.allowlistToolsByProviderCount }
              : {}),
            ...(payload.allowlistResolvedToolCount !== undefined
              ? { resolved_tool_count: payload.allowlistResolvedToolCount }
              : {}),
            ...(payload.allowlistQueryErrorById || payload.allowlistQueryErrorByProvider
              ? {
                  query_error: {
                    ...(payload.allowlistQueryErrorById ? { by_id: payload.allowlistQueryErrorById } : {}),
                    ...(payload.allowlistQueryErrorByProvider ? { by_provider: payload.allowlistQueryErrorByProvider } : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(payload.slotExpectedInputPrev ||
    payload.slotExpectedInputSource ||
    payload.slotDerivedOrderId ||
    payload.slotDerivedPhone ||
    payload.slotDerivedZipcode ||
    payload.slotDerivedAddress
      ? {
          slot_flow: {
            ...(payload.slotExpectedInputPrev ? { expected_input_prev: payload.slotExpectedInputPrev } : {}),
            ...(payload.slotExpectedInputSource ? { expected_input_source: payload.slotExpectedInputSource } : {}),
            ...(payload.slotDerivedOrderId ? { derived_order_id: payload.slotDerivedOrderId } : {}),
            ...(payload.slotDerivedPhone ? { derived_phone: payload.slotDerivedPhone } : {}),
            ...(payload.slotDerivedZipcode ? { derived_zipcode: payload.slotDerivedZipcode } : {}),
            ...(payload.slotDerivedAddress ? { derived_address: payload.slotDerivedAddress } : {}),
          },
        }
      : {}),
    ...(payload.intentScopeMismatchReason
      ? {
          intent_scope: {
            mismatch_reason: payload.intentScopeMismatchReason,
          },
        }
      : {}),
    ...(Array.isArray(payload.policyConflicts) || payload.policyConflictResolution
      ? {
          policy_conflicts: {
            ...(Array.isArray(payload.policyConflicts) ? { conflicts: payload.policyConflicts } : {}),
            ...(payload.policyConflictResolution ? { resolution: payload.policyConflictResolution } : {}),
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
  const build = resolveBuildInfo();
  const normalizedLastFunction = resolveMcpLastFunctionValue(payload);
  const providerConfig = payload.providerConfig || {};
  const configParts = Object.entries(providerConfig)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`);
  return [
    { key: "LLM.model", value: payload.llmModel || "-" },
    { key: "MCP.functions", value: uniq(payload.mcpTools).join(", ") || "-" },
    { key: "MCP.provider", value: uniq(payload.mcpProviders).join(", ") || "-" },
    { key: "MCP.last_function", value: normalizedLastFunction },
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
    { key: "BUILD.tag", value: build.tag || "-" },
    { key: "BUILD.commit", value: build.commit || "-" },
    { key: "BUILD.ref", value: build.ref || "-" },
    { key: "BUILD.build_id", value: build.build_id || "-" },
    { key: "BUILD.build_at", value: build.build_at || "-" },
    { key: "BUILD.deploy_env", value: build.deploy_env || "-" },
    { key: "BUILD.runtime_started_at", value: build.runtime_started_at || "-" },
    { key: "AGENT.id", value: payload.agentId || "-" },
    { key: "AGENT.parent_id", value: payload.agentParentId || "-" },
    { key: "AGENT.name", value: payload.agentName || "-" },
    { key: "AGENT.type", value: payload.agentType || "-" },
    { key: "AGENT.version", value: payload.agentVersion || "-" },
    { key: "AGENT.llm", value: payload.agentLlm || "-" },
    { key: "AGENT.kb_id", value: payload.agentKbId || "-" },
    { key: "KB.primary.id", value: payload.kbId || "-" },
    { key: "KB.primary.title", value: payload.kbTitle || "-" },
    { key: "KB.primary.version", value: payload.kbVersion || "-" },
    { key: "KB.primary.is_admin", value: payload.kbIsAdmin === true ? "true" : payload.kbIsAdmin === false ? "false" : "-" },
    { key: "WIDGET.id", value: payload.widgetId || "-" },
    { key: "WIDGET.name", value: payload.widgetName || "-" },
    { key: "WIDGET.public_key", value: payload.widgetPublicKey || "-" },
    { key: "WIDGET.agent_id", value: payload.widgetAgentId || "-" },
    { key: "WIDGET.org_id", value: payload.widgetOrgId || "-" },
    { key: "REQUEST.domain", value: payload.requestDomain || "-" },
    { key: "REQUEST.origin", value: payload.requestOrigin || "-" },
    {
      key: "REQUEST.widget_org_id_present",
      value:
        payload.requestWidgetOrgIdPresent === undefined
          ? "-"
          : payload.requestWidgetOrgIdPresent
            ? "true"
            : "false",
    },
    {
      key: "REQUEST.widget_user_id_present",
      value:
        payload.requestWidgetUserIdPresent === undefined
          ? "-"
          : payload.requestWidgetUserIdPresent
            ? "true"
            : "false",
    },
    {
      key: "REQUEST.widget_agent_id_present",
      value:
        payload.requestWidgetAgentIdPresent === undefined
          ? "-"
          : payload.requestWidgetAgentIdPresent
            ? "true"
            : "false",
    },
    {
      key: "REQUEST.widget_secret_present",
      value:
        payload.requestWidgetSecretPresent === undefined
          ? "-"
          : payload.requestWidgetSecretPresent
            ? "true"
            : "false",
    },
    { key: "SLOT.expected_input", value: payload.slotExpectedInput || "-" },
    { key: "SLOT.expected_input_prev", value: payload.slotExpectedInputPrev || "-" },
    { key: "SLOT.order_id", value: payload.slotOrderId || "-" },
    { key: "SLOT.phone", value: payload.slotPhone || "-" },
    { key: "SLOT.phone_masked", value: payload.slotPhoneMasked || "-" },
    { key: "SLOT.zipcode", value: payload.slotZipcode || "-" },
    { key: "SLOT.address", value: payload.slotAddress || "-" },
    { key: "SLOT.derived_order_id", value: payload.slotDerivedOrderId || "-" },
    { key: "SLOT.derived_phone", value: payload.slotDerivedPhone || "-" },
    { key: "SLOT.derived_zipcode", value: payload.slotDerivedZipcode || "-" },
    { key: "SLOT.derived_address", value: payload.slotDerivedAddress || "-" },
    { key: "POLICY.input_rules", value: uniq(payload.policyInputRules).join(", ") || "-" },
    { key: "POLICY.tool_rules", value: uniq(payload.policyToolRules).join(", ") || "-" },
    { key: "POLICY.conflict_resolution", value: payload.policyConflictResolution || "-" },
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
    { key: "TOOL_ALLOWLIST.allowed_count", value: payload.allowlistAllowedToolCount ?? "-" },
    { key: "TOOL_ALLOWLIST.allowed_names", value: (payload.allowlistAllowedToolNames || []).join(", ") || "-" },
    { key: "TOOL_ALLOWLIST.requested_count", value: payload.allowlistRequestedToolCount ?? "-" },
    { key: "TOOL_ALLOWLIST.valid_count", value: payload.allowlistValidToolCount ?? "-" },
    { key: "TOOL_ALLOWLIST.provider_selection_count", value: payload.allowlistProviderSelectionCount ?? "-" },
    { key: "TOOL_ALLOWLIST.provider_selections", value: (payload.allowlistProviderSelections || []).join(", ") || "-" },
    { key: "TOOL_ALLOWLIST.tools_by_id_count", value: payload.allowlistToolsByIdCount ?? "-" },
    { key: "TOOL_ALLOWLIST.tools_by_provider_count", value: payload.allowlistToolsByProviderCount ?? "-" },
    { key: "TOOL_ALLOWLIST.resolved_tool_count", value: payload.allowlistResolvedToolCount ?? "-" },
    { key: "TOOL_ALLOWLIST.query_error_by_id", value: payload.allowlistQueryErrorById || "-" },
    { key: "TOOL_ALLOWLIST.query_error_by_provider", value: payload.allowlistQueryErrorByProvider || "-" },
    { key: "MODE", value: payload.conversationMode || "-" },
  ];
}

function resolveMcpLastFunctionValue(payload: DebugPayload) {
  const explicit = String(payload.mcpLastFunction || "").trim();
  if (explicit && explicit.toLowerCase() !== "none") return explicit;
  const skipped = Array.isArray(payload.mcpSkipped) ? payload.mcpSkipped.map((v) => String(v || "").trim()).filter(Boolean) : [];
  if (skipped.length > 0) {
    const first = skipped[0];
    return `SKIPPED:${first.slice(0, 80)}`;
  }
  const lastStatus = String(payload.mcpLastStatus || "").trim();
  const suffix = lastStatus ? `:${lastStatus}` : "";
  return `NO_TOOL_CALLED${suffix}`;
}

export function buildDebugPrefixJson(payload: DebugPayload) {
  return buildStructuredDebugPrefix(payload) as Record<string, any>;
}

export function pushRuntimeTimingStage(
  stages: RuntimeTimingStage[],
  stage: string,
  startedAt: number,
  detail?: Record<string, any>
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

export function extractTemplateIds(rules: Array<{ enforce?: { actions?: Array<Record<string, any>> } }>) {
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

