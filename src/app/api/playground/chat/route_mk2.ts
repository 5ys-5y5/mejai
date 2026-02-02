import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { runLlm, type ChatMessage } from "@/lib/llm_mk2";
import {
  compilePolicy,
  formatOutputDefault,
  runPolicyStage,
  validateToolArgs,
  type PolicyPack,
  type PolicyEvalContext,
} from "@/lib/policyEngine";

type Body = {
  agent_id?: string;
  message?: string;
  session_id?: string;
  llm?: "chatgpt" | "gemini";
  kb_id?: string;
  admin_kb_ids?: string[];
  mcp_tool_ids?: string[];
  mode?: string;
};

type AgentRow = {
  id: string | null;
  parent_id?: string | null;
  name: string;
  llm: "chatgpt" | "gemini";
  kb_id: string | null;
  mcp_tool_ids?: string[] | null;
};

type KbRow = {
  id: string;
  title: string;
  content: string | null;
  is_active: boolean | null;
  version: string | null;
  is_admin?: boolean | null;
  apply_groups?: Array<{ path: string; values: string[] }> | null;
  apply_groups_mode?: "all" | "any" | null;
  kb_kind?: string | null;
  content_json?: PolicyPack | null;
};

type ProductRuleRow = {
  org_id: string | null;
  product_id: string;
  answerability: "ALLOW" | "DENY" | "UNKNOWN";
  restock_policy: "NO_RESTOCK" | "RESTOCK_AT" | "UNKNOWN";
  restock_at: string | null;
  updated_at: string | null;
  source?: string | null;
};

type ProductAliasRow = {
  org_id: string | null;
  alias: string;
  product_id: string;
  match_type: "exact" | "contains" | "regex";
  priority: number | null;
  is_active: boolean | null;
};

type ProductDecision = {
  product_id: string;
  answerability: ProductRuleRow["answerability"];
  restock_policy: ProductRuleRow["restock_policy"];
  restock_at?: string | null;
  source?: string | null;
};

const EXECUTION_GUARD_RULES = {
  updateAddress: {
    missingZipcodeCode: "MISSING_ZIPCODE",
    askZipcodePrompt: "배송지 변경을 위해 우편번호(5자리)를 알려주세요.",
    fallbackTicketMessage:
      "배송지 변경 자동 처리에 실패하여 상담 요청을 접수했습니다. 담당자가 확인 후 안내드릴게요.",
    fallbackRetryMessage: "배송지 변경 처리 중 오류가 발생했습니다. 다시 시도해 주세요.",
  },
} as const;

function buildDebugPrefix(payload: {
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
}) {
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

function buildDebugEntries(payload: {
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
}) {
  const uniq = (items?: string[]) => Array.from(new Set(items || [])).filter(Boolean);
  const providerConfig = payload.providerConfig || {};
  const configParts = Object.entries(providerConfig)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`);
  return [
    { key: "LLM.model", value: payload.llmModel || "-" },
    { key: "MCP.functions", value: uniq(payload.mcpTools).join(", ") || "-" },
    { key: "MCP.provider", value: uniq(payload.mcpProviders).join(", ") || "-" },
    { key: "MCP.last_function", value: payload.mcpLastFunction || "-" },
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

function isValidLlm(value?: string | null) {
  return value === "chatgpt" || value === "gemini";
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeMatchText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchAliasText(text: string, alias: string, matchType: ProductAliasRow["match_type"]) {
  const hay = normalizeMatchText(text);
  const needle = normalizeMatchText(alias);
  if (!needle) return false;
  if (matchType === "exact") return hay === needle;
  if (matchType === "contains") return hay.includes(needle);
  if (matchType === "regex") {
    try {
      return new RegExp(alias, "i").test(text);
    } catch {
      return false;
    }
  }
  return false;
}

function chooseBestAlias(text: string, aliases: ProductAliasRow[]) {
  const candidates = aliases.filter((row) => matchAliasText(text, row.alias, row.match_type));
  if (candidates.length === 0) return null;
  const scored = candidates.map((row) => ({
    row,
    priority: row.priority ?? 0,
    length: row.alias.length,
  }));
  scored.sort((a, b) => b.priority - a.priority || b.length - a.length);
  return scored[0].row;
}

function extractChannel(text: string) {
  if (/카카오|카톡|kakao/i.test(text)) return "kakao";
  if (/문자|sms/i.test(text)) return "sms";
  if (/이메일|email|메일/i.test(text)) return "email";
  return null;
}

function extractPhone(text: string) {
  const digits = text.replace(/[^\d]/g, "");
  if (digits.length >= 10 && digits.length <= 11) return digits;
  return null;
}

function maskPhone(value: string | null | undefined) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return "-";
  if (digits.length <= 4) return `***${digits}`;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function normalizePhoneDigits(value: string | null | undefined) {
  return String(value || "").replace(/[^\d]/g, "");
}

function extractOtpCode(text: string) {
  const match = text.match(/\b\d{4,8}\b/);
  return match ? match[0] : null;
}

function extractOrderId(text: string) {
  const labeled = text.match(/(?:주문번호|order)[^\dA-Za-z]{0,10}([0-9A-Za-z\-]{6,30})/i);
  if (labeled) return labeled[1];
  const hyphenId = text.match(/\b\d{4,12}-\d{3,12}(?:-\d{1,6})?\b/);
  if (hyphenId) return hyphenId[0];
  const plain = text.match(/\b\d{6,20}\b/);
  if (!plain) return null;
  const digits = plain[0];
  if (/^01\d{8,9}$/.test(digits)) return null;
  return digits;
}

function isLikelyOrderId(value: string | null | undefined) {
  const v = String(value || "").trim();
  if (!v) return false;
  if (/[가-힣\s]/.test(v)) return false;
  if (/^01\d{8,9}$/.test(v)) return false;
  // Guard against OTP/short numeric values being treated as order ids.
  if (/^\d{6,20}$/.test(v)) return v.length >= 12;
  if (/^\d{4,12}-\d{3,12}(?:-\d{1,6})?$/.test(v)) return true;
  if (/^[0-9A-Za-z\-]{6,30}$/.test(v)) return true;
  return false;
}

function isInvalidOrderIdError(errorText: string | null | undefined) {
  const text = String(errorText || "").toLowerCase();
  return text.includes("invalid order number") || text.includes("parameter.order_id");
}

function extractZipcode(text: string) {
  const match = text.match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

function isLikelyZipcode(value: string | null | undefined) {
  return /^\d{5}$/.test(String(value || "").trim());
}

function parseAddressParts(text: string) {
  const zipcode = extractZipcode(text);
  let cleaned = text.replace(/\(\s*\d{5}\s*\)/g, " ").replace(/\b\d{5}\b/g, " ");
  cleaned = cleaned.replace(/^(주소|배송지)\s*[:\-]?\s*/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (!cleaned) return { zipcode, address1: "", address2: "" };
  const tokens = cleaned.split(" ").filter(Boolean);
  if (tokens.length >= 2) {
    const address2 = tokens.pop() || "";
    const address1 = tokens.join(" ");
    return { zipcode, address1, address2 };
  }
  return { zipcode, address1: cleaned, address2: "" };
}

function normalizeAddressText(text: string) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function cleanAddressCandidate(text: string) {
  let v = normalizeAddressText(text);
  if (!v) return "";
  // "배송지를", "주소를" 같은 목적격 조사 제거
  v = v.replace(/^(?:배송지|주소)?\s*(?:를|을)\s*/g, "");
  // "으로/로 바꾸고 싶어요" 류의 의도 표현 제거
  v = v.replace(
    /\s*(?:으로|로)?\s*(?:바꿔|바꾸|변경|수정|고쳐|옮겨)(?:\S*\s*)*(?:주세요|줘요|줘|요|싶어요|싶습니다|원해요|원합니다)?[.!?~]*$/g,
    ""
  );
  v = v.replace(/[,.!?~]+$/g, "").trim();
  return v;
}

function hasKoreanAddressCue(text: string) {
  const v = normalizeAddressText(text);
  if (!v) return false;
  // NOTE: Avoid \b with Korean text; it can miss valid matches in JS.
  return /[가-힣]{2,}(시|도|군|구|동|로|길|읍|면)(\s|$)/.test(v);
}

function isLikelyAddressDetailOnly(text: string) {
  const v = normalizeAddressText(text);
  if (!v) return false;
  // full addresses usually contain one of these location tokens.
  if (hasKoreanAddressCue(v)) return false;
  return /(?:[A-Za-z]?\d{1,5}(?:-[A-Za-z0-9]{1,5})?\s*(?:호|층|실|동)?|\b\d{1,5}\b)/.test(v);
}

function extractAddressDetail(text: string) {
  const v = normalizeAddressText(text);
  if (!v) return "";
  const detailMatch = v.match(
    /((?:\d+\s*동\s*)?(?:[A-Za-z]?\d{1,5}(?:-[A-Za-z0-9]{1,5})?\s*(?:호|층|실)?|\d{1,5}))$/i
  );
  if (detailMatch) return normalizeAddressText(detailMatch[1]);
  const matches = Array.from(
    v.matchAll(/(?:\d+\s*동\s*[A-Za-z]?\d{1,5}(?:-[A-Za-z0-9]{1,5})?\s*호|\d+\s*동|[A-Za-z]?\d{1,5}(?:-[A-Za-z0-9]{1,5})?\s*(?:호|층|실)?|\b\d{1,5}\b)/gi)
  );
  if (matches.length > 0) {
    return normalizeAddressText(matches[matches.length - 1][0]);
  }
  return "";
}

function splitAddressForUpdate(
  rawAddress: string,
  opts?: { baseAddress?: string | null; fallbackBaseAddress?: string | null }
) {
  const raw = normalizeAddressText(rawAddress);
  const parsed = parseAddressParts(raw);
  const baseAddress = normalizeAddressText(opts?.baseAddress || "");
  const fallbackBaseAddress = normalizeAddressText(opts?.fallbackBaseAddress || "");

  if (baseAddress) {
    const detailFromSuffix = raw.startsWith(baseAddress)
      ? normalizeAddressText(raw.slice(baseAddress.length))
      : "";
    const detail = detailFromSuffix || extractAddressDetail(raw) || parsed.address2;
    return {
      zipcode: parsed.zipcode,
      address1: baseAddress,
      address2: detail,
    };
  }

  if (isLikelyAddressDetailOnly(raw) && fallbackBaseAddress) {
    const detail = extractAddressDetail(raw) || raw;
    return {
      zipcode: parsed.zipcode,
      address1: fallbackBaseAddress,
      address2: detail,
    };
  }

  return parsed;
}

function buildLookupOrderArgs(orderId: string, customerVerificationToken: string | null) {
  const args: Record<string, unknown> = { order_id: orderId };
  if (customerVerificationToken) {
    args.customer_verification_token = customerVerificationToken;
  }
  return args;
}

function readLookupOrderView(payload: unknown) {
  const order = payload && typeof payload === "object" ? ((payload as any).order || {}) : {};
  const core = order?.core && typeof order.core === "object" ? order.core : order;
  const summary =
    order?.summary && typeof order.summary === "object"
      ? order.summary
      : (order?.order_summary && typeof order.order_summary === "object" ? order.order_summary : {});
  const items =
    (Array.isArray(order?.items) && order.items) ||
    (Array.isArray(order?.order_items) && order.order_items) ||
    (Array.isArray(order?.order_item) && order.order_item) ||
    (Array.isArray(order?.products) && order.products) ||
    [];
  return { order, core, summary, items };
}

function extractAddress(text: string, orderId: string | null, phone: string | null, zipcode: string | null) {
  const keywordMatch = text.search(/주소|배송지/);
  const hasKoreanAddressToken = hasKoreanAddressCue(text);
  const hasZip = Boolean(zipcode || /\(\s*\d{5}\s*\)/.test(text));
  if (keywordMatch === -1 && !hasKoreanAddressToken && !hasZip) return null;
  let segment = keywordMatch === -1 ? text : text.slice(keywordMatch);
  if (keywordMatch !== -1) {
    segment = segment.replace(/^(주소|배송지)\s*[:\-]?\s*/g, "");
  }
  if (orderId) segment = segment.replace(orderId, " ");
  if (phone) segment = segment.replace(phone, " ");
  if (zipcode) segment = segment.replace(zipcode, " ");
  segment = segment.replace(/주문번호[^\s]*/gi, " ");
  segment = cleanAddressCandidate(segment);
  if (!segment) return null;
  if (!hasKoreanAddressCue(segment) && !isLikelyAddressDetailOnly(segment) && segment.length < 8) return null;
  return segment;
}

function extractChoiceIndex(text: string, max: number) {
  const match = text.match(/(?:^|\s)(\d{1,2})(?:\s*번|\s*번째)?/);
  if (!match) return null;
  const idx = Number(match[1]);
  if (!Number.isFinite(idx) || idx < 1 || idx > max) return null;
  return idx;
}

function nowIso() {
  return new Date().toISOString();
}

function buildDefaultOrderRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const toDate = (d: Date) => d.toISOString().slice(0, 10);
  return { start_date: toDate(start), end_date: toDate(end) };
}

function readGroupValue(group: Record<string, unknown> | null, path: string) {
  if (!group) return null;
  return path.split(".").reduce((acc: unknown, key) => {
    if (!acc || typeof acc !== "object") return null;
    return (acc as Record<string, unknown>)[key];
  }, group as unknown);
}

function matchesAdminGroup(
  applyGroups: Array<{ path: string; values: string[] }> | null | undefined,
  group: Record<string, unknown> | null,
  mode: "all" | "any" | null | undefined
) {
  if (!applyGroups || applyGroups.length === 0) return true;
  const matcher = mode === "any" ? "some" : "every";
  return applyGroups[matcher]((rule) => {
    const value = readGroupValue(group, rule.path);
    if (value === null || value === undefined) return false;
    return rule.values.map(String).includes(String(value));
  });
}

async function resolveProductDecision(context: any, text: string) {
  const aliasRes = await context.supabase
    .from("G_com_product_aliases")
    .select("org_id, alias, product_id, match_type, priority, is_active")
    .eq("is_active", true)
    .or(`org_id.eq.${context.orgId},org_id.is.null`);
  if (aliasRes.error) {
    return { decision: null as ProductDecision | null, alias: null as ProductAliasRow | null, error: aliasRes.error.message };
  }
  const aliases = (aliasRes.data || []) as ProductAliasRow[];
  const matchedAlias = chooseBestAlias(text, aliases);
  if (!matchedAlias) {
    return { decision: null as ProductDecision | null, alias: null as ProductAliasRow | null, error: null as string | null };
  }

  const ruleRes = await context.supabase
    .from("G_com_product_rules")
    .select("org_id, product_id, answerability, restock_policy, restock_at, updated_at, source")
    .eq("product_id", matchedAlias.product_id)
    .or(`org_id.eq.${context.orgId},org_id.is.null`);
  if (ruleRes.error) {
    return { decision: null as ProductDecision | null, alias: matchedAlias, error: ruleRes.error.message };
  }
  const rules = (ruleRes.data || []) as ProductRuleRow[];
  const bestRule =
    rules.find((row) => row.org_id === context.orgId) ||
    rules.find((row) => row.org_id === null) ||
    null;
  const decision: ProductDecision = bestRule
    ? {
      product_id: bestRule.product_id,
      answerability: bestRule.answerability || "UNKNOWN",
      restock_policy: bestRule.restock_policy || "UNKNOWN",
      restock_at: bestRule.restock_at ?? null,
      source: bestRule.source ?? null,
    }
    : {
      product_id: matchedAlias.product_id,
      answerability: "UNKNOWN",
      restock_policy: "UNKNOWN",
      restock_at: null,
    };

  return { decision, alias: matchedAlias, error: null as string | null };
}

async function fetchAgent(context: any, agentId: string) {
  const { data, error } = await context.supabase
    .from("B_bot_agents")
    .select("*")
    .eq("id", agentId)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .maybeSingle();
  if (error) return { error: error.message };
  if (data) return { data: data as AgentRow };

  const { data: parent, error: parentError } = await context.supabase
    .from("B_bot_agents")
    .select("*")
    .eq("parent_id", agentId)
    .eq("is_active", true)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .maybeSingle();
  if (parentError) return { error: parentError.message };
  return { data: parent as AgentRow | null };
}

async function fetchKb(context: any, kbId: string) {
  const { data, error } = await context.supabase
    .from("B_bot_knowledge_bases")
    .select("id, title, content, is_active, version, is_admin, apply_groups, apply_groups_mode, content_json")
    .eq("id", kbId)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .maybeSingle();
  if (error) return { error: error.message };
  return { data: data as KbRow | null };
}

async function fetchAdminKbs(context: any) {
  const { data, error } = await context.supabase
    .from("B_bot_knowledge_bases")
    .select("id, title, content, is_active, version, is_admin, apply_groups, apply_groups_mode, content_json")
    .eq("is_admin", true)
    .eq("is_active", true)
    .or(`org_id.eq.${context.orgId},org_id.is.null`);
  if (error) return { error: error.message };
  return { data: (data || []) as KbRow[] };
}

async function createSession(context: any, agentId: string | null) {
  const sessionCode = `p_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    org_id: context.orgId,
    session_code: sessionCode,
    started_at: nowIso(),
    channel: "playground",
    agent_id: agentId,
  };
  const { data, error } = await context.supabase.from("D_conv_sessions").insert(payload).select("*").single();
  if (error) return { error: error.message };
  return { data };
}

async function getRecentTurns(context: any, sessionId: string, limit = 5) {
  const { data, error } = await context.supabase
    .from("D_conv_turns")
    .select("*")
    .eq("session_id", sessionId)
    .order("seq", { ascending: false })
    .limit(limit);
  if (error) return { error: error.message };
  return { data: data || [] };
}

async function insertEvent(
  context: any,
  sessionId: string,
  turnId: string | null,
  eventType: string,
  payload: Record<string, unknown>,
  botContext: Record<string, unknown>
) {
  try {
    await context.supabase.from("F_audit_events").insert({
      session_id: sessionId,
      turn_id: turnId,
      event_type: eventType,
      payload,
      created_at: nowIso(),
      bot_context: botContext,
    });
  } catch (error) {
    console.warn("[playground/chat_mk2] failed to insert event log", {
      eventType,
      sessionId,
      turnId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function upsertDebugLog(
  context: any,
  payload: { sessionId: string; turnId: string; seq?: number | null; prefixJson: Record<string, unknown> | null }
) {
  if (!payload.prefixJson) return;
  try {
    await context.supabase.from("F_audit_turn_specs").upsert(
      {
        session_id: payload.sessionId,
        turn_id: payload.turnId,
        seq: payload.seq ?? null,
        prefix_json: payload.prefixJson,
        created_at: nowIso(),
      },
      { onConflict: "turn_id" }
    );
  } catch (error) {
    console.warn("[playground/chat_mk2] failed to upsert debug log", {
      sessionId: payload.sessionId,
      turnId: payload.turnId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function insertFinalTurn(
  context: any,
  payload: Record<string, unknown>,
  prefixJson: Record<string, unknown> | null
) {
  const { data, error } = await context.supabase.from("D_conv_turns").insert(payload).select("*").single();
  if (!error && data?.id && data?.session_id) {
    await upsertDebugLog(context, {
      sessionId: data.session_id,
      turnId: data.id,
      seq: data.seq,
      prefixJson,
    });
  }
  return { data, error };
}

function findRecentEntity(turns: Array<Record<string, unknown>>) {
  for (const turn of turns) {
    const botContext = (turn.bot_context || {}) as Record<string, unknown>;
    const entity = (botContext.entity || {}) as Record<string, unknown>;
    const selectedOrderId =
      typeof botContext.selected_order_id === "string" ? botContext.selected_order_id : null;
    const transcript = typeof turn.transcript_text === "string" ? turn.transcript_text : "";
    const orderId = extractOrderId(transcript);
    const phone = extractPhone(transcript);
    const zipcode = extractZipcode(transcript);
    const address = extractAddress(transcript, orderId, phone, zipcode);
    if (selectedOrderId || orderId || phone || address || zipcode) {
      return {
        order_id: selectedOrderId || orderId,
        phone,
        address,
        zipcode,
      };
    }
  }
  return null;
}

async function callMcpTool(
  context: any,
  tool: string,
  params: Record<string, unknown>,
  sessionId: string,
  turnId: string | null,
  botContext: Record<string, unknown>,
  allowedTools: Set<string> | undefined
) {
  const auditBlocked = async (
    status: string,
    reason: string,
    toolId?: string | null,
    responsePayload?: Record<string, unknown> | null
  ) => {
    try {
      await context.supabase.from("F_audit_mcp_tools").insert({
        org_id: context.orgId,
        session_id: sessionId,
        turn_id: turnId,
        tool_id: toolId || null,
        tool_name: tool,
        request_payload: params,
        response_payload: responsePayload || null,
        status,
        latency_ms: 0,
        masked_fields: [],
        policy_decision: { allowed: false, reason },
        created_at: nowIso(),
        bot_context: botContext,
      });
    } catch (error) {
      console.warn("[playground/chat_mk2] failed to audit blocked MCP call", {
        tool,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
  if (!allowedTools) {
    console.warn("[playground/chat_mk2] allowedTools missing", { tool, sessionId, turnId });
  }
  const allowed = allowedTools ?? new Set<string>();
  if (!allowed.has(tool)) {
    await auditBlocked("blocked", "TOOL_NOT_ALLOWED_FOR_AGENT");
    return { ok: false, error: "TOOL_NOT_ALLOWED_FOR_AGENT" };
  }
  const { data: toolRow } = await context.supabase
    .from("C_mcp_tools")
    .select("id, name, version, schema_json")
    .eq("name", tool)
    .eq("is_active", true)
    .maybeSingle();
  if (!toolRow) {
    await auditBlocked("blocked", "TOOL_NOT_FOUND");
    return { ok: false, error: "TOOL_NOT_FOUND" };
  }
  const policy = await context.supabase
    .from("C_mcp_tool_policies")
    .select("is_allowed, allowed_scopes, rate_limit_per_min, masking_rules, conditions, adapter_key")
    .eq("org_id", context.orgId)
    .eq("tool_id", toolRow.id)
    .maybeSingle();
  if (!policy.data || !policy.data.is_allowed) {
    await auditBlocked("blocked", "POLICY_BLOCK", toolRow.id);
    return { ok: false, error: "POLICY_BLOCK" };
  }
  const { callAdapter } = await import("@/lib/mcpAdapters");
  const { applyMasking, checkPolicyConditions, validateToolParams } = await import("@/lib/mcpPolicy");

  const schema = (toolRow as any).schema_json || {};
  const validation = validateToolParams(schema as Record<string, unknown>, params);
  if (!validation.ok) {
    await auditBlocked("invalid_params", "INVALID_PARAMS", toolRow.id, {
      error: validation.error || "INVALID_PARAMS",
    });
    return { ok: false, error: validation.error };
  }

  const conditionCheck = checkPolicyConditions(policy.data.conditions, params);
  if (!conditionCheck.ok) {
    await auditBlocked("blocked", String(conditionCheck.error || "POLICY_CONDITION_BLOCK"), toolRow.id);
    return { ok: false, error: conditionCheck.error };
  }

  const start = Date.now();
  const adapterKey = policy.data.adapter_key || tool;
  let result: any;
  let latency = 0;
  try {
    result = await callAdapter(adapterKey, params, {
      supabase: context.supabase,
      orgId: context.orgId,
      userId: context.user.id,
    });
    latency = Date.now() - start;
  } catch (error) {
    latency = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    try {
      await context.supabase.from("F_audit_mcp_tools").insert({
        org_id: context.orgId,
        session_id: sessionId,
        turn_id: turnId,
        tool_id: toolRow.id,
        tool_name: tool,
        request_payload: params,
        response_payload: { error: message },
        status: "error",
        latency_ms: latency,
        masked_fields: [],
        policy_decision: { allowed: true, reason: "ADAPTER_THROWN_ERROR" },
        created_at: nowIso(),
        bot_context: botContext,
      });
    } catch (auditError) {
      console.warn("[playground/chat_mk2] failed to audit MCP adapter error", {
        tool,
        error: auditError instanceof Error ? auditError.message : String(auditError),
      });
    }
    return { ok: false, error: `ADAPTER_ERROR: ${message}` };
  }
  const responsePayload = result.data ? { ...result.data } : {};
  const masked = applyMasking(responsePayload, policy.data.masking_rules);

  const responsePayloadWithError =
    result.status === "error"
      ? { ...(masked.masked as Record<string, unknown>), error: result.error || null }
      : masked.masked;
  try {
    await context.supabase.from("F_audit_mcp_tools").insert({
      org_id: context.orgId,
      session_id: sessionId,
      turn_id: turnId,
      tool_id: toolRow.id,
      tool_name: toolRow.name,
      request_payload: params,
      response_payload: responsePayloadWithError,
      status: result.status,
      latency_ms: latency,
      masked_fields: masked.maskedFields,
      policy_decision: { allowed: true },
      created_at: nowIso(),
      bot_context: botContext,
    });
  } catch (auditError) {
    console.warn("[playground/chat_mk2] failed to audit MCP result", {
      tool,
      status: result.status,
      error: auditError instanceof Error ? auditError.message : String(auditError),
    });
  }

  if (result.status !== "success") {
    const err = result.error as { code?: string; message?: string } | string | null | undefined;
    if (err && typeof err === "object") {
      const code = err.code ? String(err.code) : "MCP_ERROR";
      const message = err.message ? String(err.message) : "UNKNOWN";
      return { ok: false, error: `${code}: ${message}` };
    }
    return { ok: false, error: typeof err === "string" && err ? err : "MCP_ERROR" };
  }
  return { ok: true, data: masked.masked };
}

const RESTOCK_KEYWORDS = /재입고|입고|재고|품절|다시\s*입고|다시\s*들어|재판매/;

function isRestockSubscribe(text: string) {
  return (
    RESTOCK_KEYWORDS.test(text) &&
    /(알림|알려|입고되면|재입고되면|문자|카카오|카톡|이메일|메일)/.test(text)
  );
}

function isRestockInquiry(text: string) {
  return RESTOCK_KEYWORDS.test(text) && !isRestockSubscribe(text);
}

function detectIntent(text: string) {
  if (isRestockSubscribe(text)) return "restock_subscribe";
  if (isRestockInquiry(text)) return "restock_inquiry";
  if (/주소|배송지|수령인|연락처/.test(text)) return "order_change";
  if (/조회|확인/.test(text) && /배송|송장|출고|운송장/.test(text)) return "shipping_inquiry";
  if (/배송|송장|출고|운송장|배송조회/.test(text)) return "shipping_inquiry";
  if (/환불|취소|반품|교환/.test(text)) return "refund_request";
  return "general";
}

function isAddressChangeUtterance(text: string) {
  const v = String(text || "");
  return /(주소|배송지|수령지|받는\s*곳).*(바꿔|바꾸|변경|수정|고쳐|옮겨)|(?:바꿔|바꾸|변경|수정|고쳐|옮겨).*(주소|배송지|수령지|받는\s*곳)/.test(
    v
  );
}

function toOrderDateShort(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    const hh = String(parsed.getHours()).padStart(2, "0");
    const mi = String(parsed.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
  }
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) return `${m[2]}/${m[3]} ${m[4]}:${m[5]}`;
  return raw;
}

function toMoneyText(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return "-";
  const num = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(num)) return raw;
  return num.toLocaleString("ko-KR");
}

function isYesText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /^(네|네요|예|예요|응|응응|맞아|맞아요|맞습니다|yes|y)$/.test(v);
}

function isNoText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /^(아니|아니오|아니요|아뇨|no|n)$/.test(v);
}

function buildAddressSearchKeywords(raw: string) {
  const cleaned = String(raw || "")
    .replace(/^(주소|배송지)\s*[:\-]?\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const out: string[] = [cleaned];
  const tokens = cleaned.split(" ").filter(Boolean);
  const isDetailToken = (token: string) =>
    /^\d{1,5}$/.test(token) ||
    /^\d{1,5}(호|층|동|실)$/.test(token) ||
    /^[A-Za-z]?\d{1,5}$/.test(token);
  // JUSO는 상세 동/호수까지 붙으면 매칭 실패가 잦아서 뒤 토큰을 단계적으로 제거하며 재시도한다.
  if (tokens.length >= 2) {
    let end = tokens.length;
    while (end > 1) {
      const last = tokens[end - 1];
      if (!isDetailToken(last)) break;
      end -= 1;
      const trimmed = tokens.slice(0, end).join(" ").trim();
      if (trimmed && !out.includes(trimmed)) out.push(trimmed);
    }
  }
  return out;
}

function normalizeOrderChangeAddressPrompt(intent: string, text: string) {
  if (intent !== "order_change") return text;
  if (!/우편번호/.test(text)) return text;
  return "배송지 변경을 위해 새 주소를 알려주세요. 예) 주소: 서울시 ...";
}

function isOrderChangeZipcodeTemplateText(text: string) {
  const v = normalizeAddressText(text);
  if (!v) return false;
  if (!/배송지\s*변경/.test(v)) return false;
  return /우편번호/.test(v) || /새\s*주소/.test(v);
}

async function extractEntitiesWithLlm(text: string, model: "chatgpt" | "gemini") {
  const prompt = `Extract entities from the text. Return JSON only.
Text: "${text}"
Output Schema: { "order_id": string | null, "phone": string | null, "address": string | null, "intent": string | null }`;

  try {
    const res = await runLlm(model, [
      { role: "system", content: "You are a precise entity extractor. Return valid JSON only. do not use markdown code block." },
      { role: "user", content: prompt },
    ]);
    const cleanJson = res.text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    return null;
  }
}

async function callAddressSearchWithAudit(
  context: any,
  keyword: string,
  sessionId: string,
  turnId: string | null,
  botContext: Record<string, unknown>
) {
  const { callAdapter } = await import("@/lib/mcpAdapters");
  const start = Date.now();
  const keywords = buildAddressSearchKeywords(keyword);
  let result: any = {
    status: "error",
    error: { code: "INVALID_INPUT", message: "keyword is required" },
    data: {},
  };
  const attempts: Array<{ keyword: string; status: string; total_count?: number | string; error?: string }> = [];
  let latency = 0;
  if (keywords.length > 0) {
    for (const kw of keywords) {
      try {
        const current = await callAdapter(
          "search_address",
          { keyword: kw },
          { supabase: context.supabase, orgId: context.orgId, userId: context.user.id }
        );
        attempts.push({
          keyword: kw,
          status: current?.status || "error",
          total_count: (current as any)?.data?.totalCount,
          error:
            current?.status === "error"
              ? String((current as any)?.error?.message || (current as any)?.error || "ADDRESS_SEARCH_FAILED")
              : undefined,
        });
        result = current;
        const rows = Array.isArray((current as any)?.data?.results) ? (current as any).data.results : [];
        if (current?.status === "success" && rows.length > 0) {
          break;
        }
      } catch (error) {
        attempts.push({
          keyword: kw,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
        result = {
          status: "error",
          error: { code: "ADDRESS_SEARCH_THROWN", message: error instanceof Error ? error.message : String(error) },
          data: {},
        };
      }
    }
  }
  latency = Date.now() - start;
  if (result?.data && typeof result.data === "object") {
    result.data = {
      ...(result.data as Record<string, unknown>),
      _search_attempts: attempts,
      _search_keywords: keywords,
    };
  }
  try {
    await context.supabase.from("F_audit_mcp_tools").insert({
      org_id: context.orgId,
      session_id: sessionId,
      turn_id: turnId,
      tool_id: null,
      tool_name: "search_address",
      request_payload: { keyword, search_keywords: keywords },
      response_payload: result.status === "success" ? result.data || {} : { error: result.error || null },
      status: result.status,
      latency_ms: latency,
      masked_fields: [],
      policy_decision: { allowed: true, reason: "INTERNAL_FALLBACK" },
      created_at: nowIso(),
      bot_context: botContext,
    });
  } catch {
    // noop: address search audit insert failure should not block response
  }
  return result;
}

export async function POST(req: NextRequest) {
  const debugEnabled = process.env.DEBUG_PLAYGROUND_CHAT === "1" || process.env.NODE_ENV !== "production";
  let latestTurnId: string | null = null;
  const deriveQuickReplies = (message?: unknown) => {
    const text = typeof message === "string" ? message : "";
    if (!text) return [] as Array<{ label: string; value: string }>;
    if (text.includes("맞으면 '네', 아니면 '아니오'")) {
      return [
        { label: "네", value: "네" },
        { label: "아니오", value: "아니오" },
      ];
    }
    const numberMatches = Array.from(text.matchAll(/-\s*(\d{1,2})번\s*\|/g))
      .map((m) => Number(m[1]))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (numberMatches.length > 0) {
      const uniq = Array.from(new Set(numberMatches)).slice(0, 9);
      return uniq.map((n) => ({ label: `${n}번`, value: String(n) }));
    }
    return [] as Array<{ label: string; value: string }>;
  };
  const respond = (payload: Record<string, unknown>, init?: ResponseInit) => {
    const quickReplies =
      Array.isArray(payload.quick_replies) && payload.quick_replies.length > 0
        ? payload.quick_replies
        : deriveQuickReplies(payload.message);
    return NextResponse.json(
      { ...payload, turn_id: latestTurnId, ...(quickReplies.length > 0 ? { quick_replies: quickReplies } : {}) },
      init
    );
  };
  try {
    const authHeader = req.headers.get("authorization") || "";
    const cookieHeader = req.headers.get("cookie") || "";
    const context = await getServerContext(authHeader, cookieHeader);
    if ("error" in context) {
      if (debugEnabled) {
        console.debug("[playground/chat/mk2] auth error", context.error);
      }
      return respond({ error: context.error }, { status: 401 });
    }
    const authContext = context;

    const body = (await req.json().catch(() => null)) as Body | null;
    const agentId = String(body?.agent_id || "").trim();
    const message = String(body?.message || "").trim();
    const conversationMode = String(body?.mode || "").trim().toLowerCase() === "natural" ? "natural" : "mk2";
    const overrideLlm = body?.llm;
    const overrideKbId = body?.kb_id;
    const overrideAdminKbIds = Array.isArray(body?.admin_kb_ids)
      ? body?.admin_kb_ids.map((id) => String(id)).filter(Boolean)
      : null;
    const overrideMcpToolIds = Array.isArray(body?.mcp_tool_ids)
      ? body?.mcp_tool_ids.map((id) => String(id)).filter(Boolean)
      : [];
    if (!message) {
      return respond({ error: "INVALID_BODY" }, { status: 400 });
    }

    let agent: AgentRow | null = null;
    if (agentId) {
      const agentRes = await fetchAgent(context, agentId);
      if (!agentRes.data) {
        return respond({ error: agentRes.error || "AGENT_NOT_FOUND" }, { status: 404 });
      }
      agent = agentRes.data;
    } else {
      if (!isValidLlm(overrideLlm) || !overrideKbId) {
        return respond({ error: "INVALID_BODY" }, { status: 400 });
      }
      agent = {
        id: null,
        name: "Labolatory",
        llm: overrideLlm,
        kb_id: overrideKbId,
        mcp_tool_ids: overrideMcpToolIds,
      };
    }
    if (!agent) {
      return respond({ error: "AGENT_NOT_FOUND" }, { status: 404 });
    }
    if (!agent.kb_id) {
      return respond({ error: "AGENT_KB_MISSING" }, { status: 400 });
    }

    const kbRes = await fetchKb(context, agent.kb_id);
    if (!kbRes.data) {
      return respond({ error: kbRes.error || "KB_NOT_FOUND" }, { status: 404 });
    }
    const kb = kbRes.data;

    const { data: accessRow } = await context.supabase
      .from("A_iam_user_access_maps")
      .select("group, plan, is_admin, org_role, org_id")
      .eq("user_id", authContext.user.id)
      .maybeSingle();
    const userGroup = (accessRow?.group as Record<string, unknown> | null) ?? null;
    const userPlan = (accessRow?.plan as string | null) ?? null;
    const userIsAdmin = typeof accessRow?.is_admin === "boolean" ? accessRow.is_admin : null;
    const userRole = (accessRow?.org_role as string | null) ?? null;
    const userOrgId = (accessRow?.org_id as string | null) ?? null;

    const { data: authSettings } = await context.supabase
      .from("A_iam_auth_settings")
      .select("id, providers")
      .eq("org_id", authContext.orgId)
      .eq("user_id", authContext.user.id)
      .maybeSingle();
    const providers = (authSettings?.providers || {}) as Record<string, Record<string, unknown> | undefined>;
    const providerAvailable = Object.keys(providers || {}).filter((key) => {
      const value = providers[key];
      return value && Object.keys(value).length > 0;
    });
    const cafe24Provider = providers.cafe24 || {};
    const providerConfig = {
      mall_id: (cafe24Provider as any)?.mall_id ? String((cafe24Provider as any).mall_id) : null,
      shop_no: (cafe24Provider as any)?.shop_no ? String((cafe24Provider as any).shop_no) : null,
      board_no: (cafe24Provider as any)?.board_no ? String((cafe24Provider as any).board_no) : null,
    };

    const adminKbRes = await fetchAdminKbs(context);
    let adminKbs = adminKbRes.data || [];
    if (overrideAdminKbIds !== null) {
      const allowed = new Set(overrideAdminKbIds);
      adminKbs = adminKbs.filter((item) => allowed.has(item.id));
    } else {
      adminKbs = adminKbs.filter((item) =>
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

    const allowedToolNames = new Set<string>();
    const allowedToolIdByName = new Map<string, string>();
    if (agent.mcp_tool_ids && agent.mcp_tool_ids.length > 0) {
      const requestedToolIds = agent.mcp_tool_ids.map((id) => String(id)).filter(Boolean);
      const validToolIds = requestedToolIds.filter((id) => isUuidLike(id));
      const { data: tools } = validToolIds.length
        ? await context.supabase
          .from("C_mcp_tools")
          .select("id, name")
          .in("id", validToolIds)
        : { data: [] as Array<{ id: string; name: string }> };
      (tools || []).forEach((t) => {
        const name = String(t.name || "").trim();
        const id = String((t as any).id || "").trim();
        if (!name) return;
        allowedToolNames.add(name);
        if (id) allowedToolIdByName.set(name, id);
      });
    }

    let sessionId = String(body?.session_id || "").trim();
    if (!sessionId) {
      const sessionRes = await createSession(context, agent.id);
      if (!sessionRes.data) {
        return respond({ error: sessionRes.error || "SESSION_CREATE_FAILED" }, { status: 400 });
      }
      sessionId = sessionRes.data.id;
    }

    const recentTurnsRes = await getRecentTurns(context, sessionId, 15);
    const recentTurns = (recentTurnsRes.data || []) as any[];
    const lastTurn = recentTurns[0] as any;
    const nextSeq = lastTurn?.seq ? Number(lastTurn.seq) + 1 : 1;
    const prevBotContext = (lastTurn?.bot_context || {}) as Record<string, unknown>;
    const prevIntent =
      typeof prevBotContext.intent_name === "string" ? String(prevBotContext.intent_name) : null;
    let resolvedIntent = prevIntent || "general";
    let lastDebugPrefixJson: Record<string, unknown> | null = null;
    const prevEntity = (prevBotContext.entity || {}) as Record<string, unknown>;
    const prevSelectedOrderId =
      typeof prevBotContext.selected_order_id === "string" ? prevBotContext.selected_order_id : null;
    const prevChoicesRaw = prevBotContext.order_choices;
    const prevChoices = Array.isArray(prevChoicesRaw)
      ? (prevChoicesRaw as Array<{ order_id?: string }>)
      : [];
    const prevTranscript = typeof lastTurn?.transcript_text === "string" ? lastTurn.transcript_text : "";
    const prevOrderIdFromTranscript = extractOrderId(prevTranscript);
    const prevPhoneFromTranscript = extractPhone(prevTranscript);
    const prevZipFromTranscript = extractZipcode(prevTranscript);
    const prevAddressFromTranscript = extractAddress(
      prevTranscript,
      prevOrderIdFromTranscript,
      prevPhoneFromTranscript,
      prevZipFromTranscript
    );
    const recentEntity = findRecentEntity(recentTurns);
    const lastTokenTurn = recentTurns.find((turn) => turn?.bot_context?.customer_verification_token);
    let customerVerificationToken =
      (typeof lastTokenTurn?.bot_context?.customer_verification_token === "string"
        ? lastTokenTurn?.bot_context?.customer_verification_token
        : null) ||
      (typeof prevBotContext.customer_verification_token === "string"
        ? prevBotContext.customer_verification_token
        : null);

    const derivedChannel = extractChannel(message);
    let derivedOrderId = extractOrderId(message);
    let derivedPhone = extractPhone(message);
    let derivedZipcode = extractZipcode(message);
    let derivedAddress = extractAddress(message, derivedOrderId, derivedPhone, derivedZipcode);
    let updateConfirmAcceptedThisTurn = false;
    const lastAnswer =
      typeof lastTurn?.final_answer === "string"
        ? lastTurn?.final_answer
        : typeof lastTurn?.answer_text === "string"
          ? lastTurn?.answer_text
          : "";
    const expectedInput = (() => {
      const text = String(lastAnswer || "");
      if (text.includes("인증번호")) return "otp_code";
      const addressPrompt = text.includes("주소") || text.includes("배송지");
      const zipcodeOnlyPrompt =
        text.includes("우편번호") &&
        !addressPrompt &&
        /(알려|입력|필요)/.test(text);
      if (zipcodeOnlyPrompt) return "zipcode";
      if (addressPrompt) return "address";
      if (text.includes("휴대폰 번호")) {
        if (text.includes("주문번호") && text.includes("또는")) return "order_id_or_phone";
        return "phone";
      }
      if (text.includes("주문번호") && text.includes("또는") && text.includes("휴대폰")) return "order_id_or_phone";
      if (text.includes("주문번호")) return "order_id";
      return null;
    })();
    if (expectedInput === "otp_code") {
      derivedOrderId = null;
      derivedPhone = null;
      derivedZipcode = null;
      derivedAddress = null;
    } else if (expectedInput === "zipcode") {
      derivedOrderId = null;
      derivedPhone = null;
      derivedAddress = null;
      const rawDigits = message.replace(/[^\d]/g, "");
      const strictFive = /^\d{5}$/.test(rawDigits) ? rawDigits : null;
      derivedZipcode = extractZipcode(message) || strictFive || null;
    } else if (expectedInput === "phone") {
      derivedOrderId = null;
      derivedZipcode = null;
      derivedAddress = null;
      derivedPhone = extractPhone(message);
    } else if (expectedInput === "order_id") {
      derivedPhone = null;
      derivedZipcode = null;
      derivedAddress = null;
      derivedOrderId = extractOrderId(message);
    } else if (expectedInput === "address") {
      derivedOrderId = null;
      derivedPhone = null;
      derivedZipcode = extractZipcode(message);
      const cleaned = message.replace(/^(주소|배송지)\s*[:\-]?\s*/g, "").trim();
      const extractedAddress = extractAddress(message, null, null, derivedZipcode) || cleaned || null;
      if (extractedAddress && isLikelyAddressDetailOnly(extractedAddress)) {
        derivedAddress = extractAddressDetail(extractedAddress) || extractedAddress;
      } else {
        derivedAddress = extractedAddress;
      }
    } else if (expectedInput === "order_id_or_phone") {
      derivedZipcode = null;
      derivedAddress = null;
      const phone = extractPhone(message);
      if (phone) {
        derivedPhone = phone;
        derivedOrderId = null;
      } else {
        derivedOrderId = extractOrderId(message);
        derivedPhone = null;
      }
    }

    // [Hybrid Extraction] If regex failed to find key entities, try LLM extraction
    if ((!derivedOrderId && !derivedPhone) && message.length > 8 && !expectedInput) {
      // Only run if we are not in a specific input mode (expectedInput) 
      // or if we are, and regex failed?
      // Actually, expectedInput logic (lines 830-867) sets derivedXXX = null explicitly for specific modes.
      // So we should only run this if expectedInput is null (General conversation).
      // Or if expectedInput matched but regex failed?
      // Let's run it if expectedInput is null.
      const llmExt = await extractEntitiesWithLlm(message, agent.llm);
      if (llmExt) {
        if (llmExt.order_id && !derivedOrderId) derivedOrderId = String(llmExt.order_id).trim();
        if (llmExt.phone && !derivedPhone) derivedPhone = String(llmExt.phone).trim();
        if (llmExt.address && !derivedAddress) derivedAddress = String(llmExt.address).trim();
        // Intent augmentation
        if (resolvedIntent === "general" && llmExt.intent) {
          const mappedIntent = detectIntent(llmExt.intent) === "general" ? llmExt.intent : detectIntent(llmExt.intent);
          // safe mapping?
          // detectIntent maps Korean to keys. If LLM returns English key, good.
          // If LLM returns Korean '배송조회', detectIntent handles it.
          // But detectIntent logic is simple regex.
          // Let's trust LLM intent if current is general.
          if (["change", "order_lookup", "shipment", "refund", "restock_subscribe", "restock_inquiry"].includes(llmExt.intent)) {
            resolvedIntent = llmExt.intent;
          }
        }
      }
    }

    if (prevBotContext.address_pending && prevBotContext.address_stage === "awaiting_zipcode_confirm") {
      const pendingAddress = String(prevBotContext.pending_address || "").trim();
      const pendingZipcode = String(prevBotContext.pending_zipcode || "").trim();
      const candidateRoad = String(prevBotContext.pending_road_addr || "").trim();
      const candidateJibun = String(prevBotContext.pending_jibun_addr || "").trim();
      const pendingOrderId = String(prevBotContext.pending_order_id || "").trim();
      if (isYesText(message) && pendingZipcode) {
        derivedZipcode = pendingZipcode;
        derivedAddress = pendingAddress || derivedAddress;
        if (isLikelyOrderId(pendingOrderId)) {
          derivedOrderId = pendingOrderId;
        }
      } else if (isNoText(message)) {
        const prompt = "주소를 다시 입력해 주세요. 입력하신 주소로 우편번호를 다시 찾아볼게요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: prevEntity,
              selected_order_id: prevSelectedOrderId,
              address_pending: true,
              address_stage: "awaiting_address",
              pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
            },
          });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      } else {
        const prompt = `검색된 주소가 맞는지 확인해 주세요.\n- 지번주소: ${candidateJibun || pendingAddress || "-"}\n- 도로명주소: ${candidateRoad || "-"}\n- 우편번호: ${pendingZipcode || "-"}\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.`;
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: prevEntity,
            selected_order_id: prevSelectedOrderId,
            address_pending: true,
              address_stage: "awaiting_zipcode_confirm",
              pending_address: pendingAddress || null,
              pending_zipcode: pendingZipcode || null,
              pending_road_addr: candidateRoad || null,
              pending_jibun_addr: candidateJibun || null,
              pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
            },
          });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
    }
    if (prevBotContext.address_pending && prevBotContext.address_stage === "awaiting_zipcode") {
      const pendingAddress = String(prevBotContext.pending_address || "").trim();
      const pendingDigits = message.replace(/[^\d]/g, "");
      const pendingStrictFive = /^\d{5}$/.test(pendingDigits) ? pendingDigits : "";
      const pendingZip = extractZipcode(message) || pendingStrictFive;
      if (!pendingZip) {
        if (pendingAddress) {
          const search = await callAddressSearchWithAudit(
            context,
            pendingAddress,
            sessionId,
            latestTurnId,
            { intent_name: resolvedIntent, entity: prevEntity as Record<string, unknown> }
          );
          if (search.status === "success") {
            const rows = Array.isArray((search.data as any)?.results) ? (search.data as any).results : [];
            const first = rows[0];
            const candidateZip = String(first?.zipNo || "").trim();
            const roadAddr = String(first?.roadAddr || first?.roadAddrPart1 || "").trim();
            const jibunAddr = String(first?.jibunAddr || "").trim();
            if (candidateZip) {
              const prompt = `입력하신 주소로 우편번호를 찾았습니다.\n- 지번주소: ${jibunAddr || pendingAddress}\n- 도로명주소: ${roadAddr || "-"}\n- 우편번호: ${candidateZip}\n위 정보가 맞으면 '네', 아니면 '아니오'를 입력해 주세요.`;
              const reply = makeReply(prompt);
              await insertTurn({
                session_id: sessionId,
                seq: nextSeq,
                transcript_text: message,
                answer_text: reply,
                final_answer: reply,
                bot_context: {
                  intent_name: resolvedIntent,
                  entity: prevEntity,
                  selected_order_id: prevSelectedOrderId,
                  address_pending: true,
                  address_stage: "awaiting_zipcode_confirm",
                  pending_address: pendingAddress || null,
                  pending_zipcode: candidateZip,
                  pending_road_addr: roadAddr || null,
                  pending_jibun_addr: jibunAddr || null,
                },
              });
              return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
            }
          } else {
            await insertEvent(
              context,
              sessionId,
              latestTurnId,
              "MCP_TOOL_FAILED",
              { tool: "search_address", error: (search as any).error || "ADDRESS_SEARCH_FAILED" },
              { intent_name: resolvedIntent }
            );
          }
        }
        const prompt = "입력하신 주소를 확인할 수 없습니다. 도로명/지번 포함 주소를 다시 입력해 주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: prevEntity,
              selected_order_id: prevSelectedOrderId,
              address_pending: true,
              address_stage: "awaiting_address",
              pending_order_id: isLikelyOrderId(prevSelectedOrderId) ? prevSelectedOrderId : null,
            },
          });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      derivedZipcode = pendingZip || null;
      derivedAddress = pendingAddress || derivedAddress;
    }
    if (prevBotContext.address_pending && prevBotContext.address_stage === "awaiting_address") {
      const nextAddress = extractAddress(message, null, null, extractZipcode(message)) || message.trim();
      if (!nextAddress) {
        const prompt = "변경할 주소를 다시 입력해 주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: prevEntity,
            selected_order_id: prevSelectedOrderId,
            address_pending: true,
            address_stage: "awaiting_address",
          },
        });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      if (isLikelyAddressDetailOnly(nextAddress)) {
        derivedAddress = extractAddressDetail(nextAddress) || nextAddress;
      } else {
        derivedAddress = nextAddress;
      }
    }
    if (prevBotContext.change_pending && prevBotContext.change_stage === "awaiting_update_confirm") {
      const pendingOrderId = String(prevBotContext.pending_order_id || "").trim();
      const pendingAddress = String(prevBotContext.pending_address || "").trim();
      const pendingZipcode = String(prevBotContext.pending_zipcode || "").trim();
      const beforeAddress = String(prevBotContext.pending_before_address || "").trim();
      if (isYesText(message)) {
        updateConfirmAcceptedThisTurn = true;
        if (isLikelyOrderId(pendingOrderId)) derivedOrderId = pendingOrderId;
        if (pendingAddress) derivedAddress = pendingAddress;
        if (isLikelyZipcode(pendingZipcode)) derivedZipcode = pendingZipcode;
      } else if (isNoText(message)) {
        const reply = makeReply("변경할 주소를 다시 입력해 주세요. (예: 서울시 ...)");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: prevEntity,
            selected_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : prevSelectedOrderId,
            address_pending: true,
            address_stage: "awaiting_address",
            customer_verification_token:
              typeof prevBotContext.customer_verification_token === "string"
                ? prevBotContext.customer_verification_token
                : null,
          },
        });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      } else {
        const reply = makeReply(
          `아래 내용으로 변경할까요?\n- 주문번호: ${pendingOrderId || "-"}\n- 현재 배송지: ${beforeAddress || "-"}\n- 변경 배송지: ${pendingAddress || "-"}\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.`
        );
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: prevEntity,
            selected_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : prevSelectedOrderId,
            change_pending: true,
            change_stage: "awaiting_update_confirm",
            pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
            pending_address: pendingAddress || null,
            pending_zipcode: isLikelyZipcode(pendingZipcode) ? pendingZipcode : null,
            pending_before_address: beforeAddress || null,
            customer_verification_token:
              typeof prevBotContext.customer_verification_token === "string"
                ? prevBotContext.customer_verification_token
                : null,
          },
        });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
    }
    const contaminationSummaries: string[] = [];
    const noteContamination = (info: {
      slot: string;
      reason: string;
      action: string;
      candidate?: string | null;
    }) => {
      const candidate = String(info.candidate || "").trim();
      const summary = [
        info.slot,
        info.reason,
        info.action,
        candidate ? `candidate=${candidate}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      contaminationSummaries.push(summary);
      if (contaminationSummaries.length > 10) {
        contaminationSummaries.splice(0, contaminationSummaries.length - 10);
      }
    };
    const orderChoiceIndex =
      !derivedOrderId && prevChoices.length > 0 ? extractChoiceIndex(message, prevChoices.length) : null;
    const orderIdFromChoice =
      orderChoiceIndex && prevChoices[orderChoiceIndex - 1]?.order_id
        ? String(prevChoices[orderChoiceIndex - 1]?.order_id)
        : null;
    const safePrevEntityOrderId =
      typeof prevEntity.order_id === "string" && isLikelyOrderId(prevEntity.order_id)
        ? prevEntity.order_id
        : null;
    const safePrevOrderIdFromTranscript =
      prevOrderIdFromTranscript && isLikelyOrderId(prevOrderIdFromTranscript)
        ? prevOrderIdFromTranscript
        : null;
    const safePrevSelectedOrderId =
      prevSelectedOrderId && isLikelyOrderId(prevSelectedOrderId) ? prevSelectedOrderId : null;
    const safeRecentOrderId =
      recentEntity?.order_id && isLikelyOrderId(recentEntity.order_id) ? recentEntity.order_id : null;
    // Keep explicit user choice(selected_order_id) above loose history fallbacks.
    let resolvedOrderId =
      derivedOrderId ??
      orderIdFromChoice ??
      safePrevSelectedOrderId ??
      safePrevEntityOrderId ??
      safePrevOrderIdFromTranscript ??
      (safeRecentOrderId || null);

    if (resolvedOrderId && !isLikelyOrderId(resolvedOrderId)) {
      noteContamination({
        slot: "order_id",
        candidate: resolvedOrderId,
        reason: "ORDER_ID_FAILED_LIKELIHOOD_CHECK",
        action: "CLEARED",
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "CONTEXT_CONTAMINATION_DETECTED",
        {
          slot: "order_id",
          candidate: resolvedOrderId,
          reason: "ORDER_ID_FAILED_LIKELIHOOD_CHECK",
          action: "CLEARED",
        },
        { intent_name: resolvedIntent, entity: prevEntity as Record<string, unknown> }
      );
      resolvedOrderId = null;
    }

    // Guard against stale/contaminated order_id overriding an explicitly listed choice set.
    if (resolvedOrderId && prevChoices.length > 0) {
      const listedOrderIds = new Set(
        prevChoices
          .map((choice) => String(choice.order_id || "").trim())
          .filter((value) => isLikelyOrderId(value))
      );
      if (listedOrderIds.size > 0 && !listedOrderIds.has(resolvedOrderId)) {
        noteContamination({
          slot: "order_id",
          candidate: resolvedOrderId,
          reason: "ORDER_ID_NOT_IN_ACTIVE_CHOICES",
          action: listedOrderIds.size === 1 ? "REPLACED_WITH_SINGLE_CHOICE" : "CLEARED",
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "CONTEXT_CONTAMINATION_DETECTED",
          {
            slot: "order_id",
            candidate: resolvedOrderId,
            reason: "ORDER_ID_NOT_IN_ACTIVE_CHOICES",
            action: listedOrderIds.size === 1 ? "REPLACED_WITH_SINGLE_CHOICE" : "CLEARED",
          },
          { intent_name: resolvedIntent, entity: prevEntity as Record<string, unknown> }
        );
        resolvedOrderId = listedOrderIds.size === 1 ? Array.from(listedOrderIds)[0] : null;
      }
    }

    const safePrevEntityZipcode =
      typeof prevEntity.zipcode === "string" && isLikelyZipcode(prevEntity.zipcode)
        ? String(prevEntity.zipcode).trim()
        : null;
    const safePrevZipFromTranscript =
      prevZipFromTranscript && isLikelyZipcode(prevZipFromTranscript)
        ? prevZipFromTranscript
        : null;
    const safeRecentZipcode =
      recentEntity?.zipcode && isLikelyZipcode(recentEntity.zipcode)
        ? String(recentEntity.zipcode).trim()
        : null;
    const addressStage = String(prevBotContext.address_stage || "").trim();
    const hasActiveAddressPending =
      Boolean(prevBotContext.address_pending) &&
      ["awaiting_address", "awaiting_zipcode", "awaiting_zipcode_confirm"].includes(addressStage);
    const pendingZipFromContextRaw =
      prevBotContext.address_pending && isLikelyZipcode(String(prevBotContext.pending_zipcode || ""))
        ? String(prevBotContext.pending_zipcode || "").trim()
        : null;
    const allowPendingZipCarry =
      hasActiveAddressPending &&
      (
        expectedInput === "address" ||
        expectedInput === "zipcode" ||
        (addressStage === "awaiting_zipcode_confirm" && (isYesText(message) || isNoText(message)))
      );
    const pendingZipFromContext = allowPendingZipCarry ? pendingZipFromContextRaw : null;
    if (pendingZipFromContextRaw && !pendingZipFromContext) {
      noteContamination({
        slot: "zipcode",
        candidate: pendingZipFromContextRaw,
        reason: "ZIPCODE_PENDING_CONTEXT_BLOCKED_BY_EXPECTED_INPUT",
        action: "CLEARED",
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "CONTEXT_CONTAMINATION_DETECTED",
        {
          slot: "zipcode",
          candidate: pendingZipFromContextRaw,
          reason: "ZIPCODE_PENDING_CONTEXT_BLOCKED_BY_EXPECTED_INPUT",
          action: "CLEARED",
          expected_input: expectedInput,
          address_stage: addressStage || null,
        },
        { intent_name: resolvedIntent, entity: prevEntity as Record<string, unknown> }
      );
    }
    const allowZipHistoryFallback =
      expectedInput === null || expectedInput === "address" || expectedInput === "zipcode";
    const blockedZipFallback =
      !allowZipHistoryFallback && !derivedZipcode
        ? safePrevEntityZipcode || safePrevZipFromTranscript || safeRecentZipcode
        : null;
    if (blockedZipFallback) {
      noteContamination({
        slot: "zipcode",
        candidate: blockedZipFallback,
        reason: "ZIPCODE_CARRYOVER_BLOCKED_BY_EXPECTED_INPUT",
        action: "CLEARED",
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "CONTEXT_CONTAMINATION_DETECTED",
        {
          slot: "zipcode",
          candidate: blockedZipFallback,
          reason: "ZIPCODE_CARRYOVER_BLOCKED_BY_EXPECTED_INPUT",
          action: "CLEARED",
          expected_input: expectedInput,
        },
        { intent_name: resolvedIntent, entity: prevEntity as Record<string, unknown> }
      );
    }
    let resolvedZipcode =
      derivedZipcode ??
      pendingZipFromContext ??
      (allowZipHistoryFallback
        ? safePrevEntityZipcode ?? safePrevZipFromTranscript ?? (safeRecentZipcode || null)
        : null);
    if (resolvedZipcode && !isLikelyZipcode(resolvedZipcode)) {
      noteContamination({
        slot: "zipcode",
        candidate: resolvedZipcode,
        reason: "ZIPCODE_FAILED_LIKELIHOOD_CHECK",
        action: "CLEARED",
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "CONTEXT_CONTAMINATION_DETECTED",
        {
          slot: "zipcode",
          candidate: resolvedZipcode,
          reason: "ZIPCODE_FAILED_LIKELIHOOD_CHECK",
          action: "CLEARED",
        },
        { intent_name: resolvedIntent, entity: prevEntity as Record<string, unknown> }
      );
      resolvedZipcode = null;
    }

    const explicitUserConfirmed = isYesText(message);
    const detectedIntent = detectIntent(message);
    const hasAddressSignal =
      Boolean(derivedAddress) ||
      (typeof prevEntity.address === "string" && Boolean(prevEntity.address.trim())) ||
      Boolean(prevBotContext.address_pending);
    let seededIntent = detectedIntent === "general" ? (prevIntent || "general") : detectedIntent;
    if (seededIntent === "shipping_inquiry" && hasAddressSignal && isAddressChangeUtterance(message)) {
      seededIntent = "order_change";
    }
    resolvedIntent = seededIntent;
    let policyContext: PolicyEvalContext = {
      input: { text: message },
      intent: { name: resolvedIntent },
      entity: {
        channel:
          derivedChannel ?? (typeof prevEntity.channel === "string" ? prevEntity.channel : null),
        order_id: resolvedOrderId,
        phone:
          derivedPhone ??
          (typeof prevEntity.phone === "string" ? prevEntity.phone : null) ??
          prevPhoneFromTranscript ??
          (recentEntity?.phone || null),
        address:
          derivedAddress ??
          (typeof prevEntity.address === "string" ? prevEntity.address : null) ??
          prevAddressFromTranscript ??
          (recentEntity?.address || null),
        zipcode: resolvedZipcode,
      },
      user: { confirmed: explicitUserConfirmed },
      conversation: { repeat_count: 0, flags: {} },
    };

    const inputGate = runPolicyStage(compiledPolicy, "input", policyContext);
    const extractTemplateIds = (rules: Array<{ enforce?: { actions?: Array<Record<string, unknown>> } }>) => {
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
    };
    const matchedRuleIds = inputGate.matched.map((rule) => rule.id);
    const matchedTemplateIds = extractTemplateIds(inputGate.matched as any[]);
    let usedRuleIds = [...matchedRuleIds];
    let usedTemplateIds = [...matchedTemplateIds];
    const inputRuleIds = [...matchedRuleIds];
    let toolRuleIds: string[] = [];
    const usedToolPolicies: string[] = [];
    const usedProviders: string[] = [];
    const mcpActions: string[] = [];
    let mcpCandidateCalls: string[] = [];
    const mcpSkipLogs: string[] = [];
    const mcpSkipQueue: Array<{
      tool: string;
      reason: string;
      args?: Record<string, unknown>;
      detail?: Record<string, unknown>;
    }> = [];
    const slotDebug = {
      expectedInput,
      orderId: resolvedOrderId,
      phone: typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null,
      zipcode: typeof policyContext.entity?.zipcode === "string" ? policyContext.entity.zipcode : null,
      address: typeof policyContext.entity?.address === "string" ? policyContext.entity.address : null,
    };
    let lastMcpFunction: string | null = null;
    let lastMcpStatus: string | null = null;
    let lastMcpError: string | null = null;
    let lastMcpCount: number | null = null;
    const toolProviderMap: Record<string, string> = {
      find_customer_by_phone: "cafe24",
      lookup_order: "cafe24",
      track_shipment: "cafe24",
      create_ticket: "cafe24",
      list_orders: "cafe24",
      send_otp: "solapi",
      verify_otp: "solapi",
      update_order_shipping_address: "cafe24",
    };
    const noteMcp = (name: string, result: { ok: boolean; error?: string; data?: Record<string, unknown> }) => {
      lastMcpFunction = name;
      lastMcpStatus = result.ok ? "success" : "error";
      lastMcpError = result.ok ? null : result.error || "MCP_ERROR";
      if (result.ok) {
        const data = result.data as any;
        if (Array.isArray(data)) {
          lastMcpCount = data.length;
        } else if (data && typeof data === "object") {
          if (typeof data.count === "number") lastMcpCount = data.count;
          else if (Array.isArray(data.items)) lastMcpCount = data.items.length;
          else lastMcpCount = Object.keys(data).length;
        } else {
          lastMcpCount = null;
        }
      } else {
        lastMcpCount = null;
      }
      const provider = toolProviderMap[name];
      if (provider) usedProviders.push(provider);
    };
    const noteMcpSkip = (
      name: string,
      reason: string,
      detail?: Record<string, unknown>,
      args?: Record<string, unknown>
    ) => {
      lastMcpFunction = name;
      lastMcpStatus = "skipped";
      lastMcpError = reason;
      lastMcpCount = null;
      const provider = toolProviderMap[name];
      if (provider) usedProviders.push(provider);
      const detailText = detail ? ` (${JSON.stringify(detail)})` : "";
      mcpSkipLogs.push(`${name}: skipped - ${reason}${detailText}`);
      mcpSkipQueue.push({ tool: name, reason, args, detail });
    };
    const flushMcpSkipLogs = async () => {
      for (const skip of mcpSkipQueue) {
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "MCP_CALL_SKIPPED",
          {
            tool: skip.tool,
            reason: skip.reason,
            args: skip.args || {},
            detail: skip.detail || null,
          },
          { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
        );
        const toolId = allowedToolIdByName.get(skip.tool);
        if (toolId) {
          try {
            await context.supabase.from("F_audit_mcp_tools").insert({
              org_id: context.orgId,
              session_id: sessionId,
              turn_id: latestTurnId,
              tool_id: toolId,
              tool_name: skip.tool,
              request_payload: skip.args || {},
              response_payload: { skipped: true, reason: skip.reason, detail: skip.detail || null },
              status: "skipped",
              latency_ms: 0,
              masked_fields: [],
              policy_decision: { allowed: false, reason: skip.reason },
              created_at: nowIso(),
              bot_context: { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
            });
          } catch (error) {
            console.warn("[playground/chat_mk2] failed to insert MCP skip audit", {
              tool: skip.tool,
              reason: skip.reason,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
      mcpSkipQueue.length = 0;
    };
    const toolResults: Array<{ name: string; ok: boolean; data?: Record<string, unknown>; error?: unknown }> = [];
    function makeReply(text: string, llmModel?: string | null, tools?: string[]) {
      slotDebug.orderId = resolvedOrderId;
      slotDebug.phone = typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null;
      slotDebug.zipcode = typeof policyContext.entity?.zipcode === "string" ? policyContext.entity.zipcode : null;
      slotDebug.address = typeof policyContext.entity?.address === "string" ? policyContext.entity.address : null;
      const mcpLogLines = toolResults.map((tool) => {
        const status = tool.ok ? "success" : "error";
        const error = tool.ok ? "" : String(tool.error || "MCP_ERROR");
        let count: number | null = null;
        if (tool.ok && tool.data) {
          const data = tool.data as any;
          if (Array.isArray(data)) count = data.length;
          else if (data && typeof data === "object") {
            if (typeof data.count === "number") count = data.count;
            else if (Array.isArray(data.items)) count = data.items.length;
            else if (Array.isArray(data.orders)) count = data.orders.length;
            else if (data.orders && Array.isArray(data.orders.order)) count = data.orders.order.length;
          }
        }
        const countText = count !== null ? ` (count=${count})` : "";
        return error
          ? `${tool.name}: ${status}${countText} - ${error}`
          : `${tool.name}: ${status}${countText}`;
      });
      const allMcpLogs = [...mcpLogLines, ...mcpSkipLogs];
      const debugPayload = {
        llmModel: llmModel || null,
        mcpTools: tools || mcpActions,
        mcpProviders: usedProviders,
        mcpLastFunction: lastMcpFunction,
        mcpLastStatus: lastMcpStatus,
        mcpLastError: lastMcpError,
        mcpLastCount: lastMcpCount,
        mcpLogs: allMcpLogs,
        providerConfig: usedProviders.includes("cafe24") ? providerConfig : {},
        providerAvailable,
        authSettingsId: authSettings?.id || null,
        userId: authContext.user.id,
        orgId: userOrgId || authContext.orgId,
        userPlan,
        userIsAdmin,
        userRole,
        kbUserId: kb.id,
        kbAdminIds: adminKbs.map((item) => item.id),
        usedRuleIds,
        usedTemplateIds,
        usedToolPolicies,
        slotExpectedInput: slotDebug.expectedInput,
        slotOrderId: slotDebug.orderId,
        slotPhone: slotDebug.phone,
        slotPhoneMasked: maskPhone(slotDebug.phone),
        slotZipcode: slotDebug.zipcode,
        slotAddress: slotDebug.address,
        mcpCandidateCalls,
        mcpSkipped: mcpSkipLogs,
        policyInputRules: inputRuleIds,
        policyToolRules: toolRuleIds,
        contextContamination: contaminationSummaries,
        conversationMode,
      };
      lastDebugPrefixJson = { entries: buildDebugEntries(debugPayload) };
      return text;
    }
    async function insertTurn(payload: Record<string, unknown>) {
      if (!lastDebugPrefixJson) {
        const debugPayload = {
          llmModel: null,
          mcpTools: mcpActions,
          mcpProviders: usedProviders,
          mcpLastFunction: lastMcpFunction,
          mcpLastStatus: lastMcpStatus,
          mcpLastError: lastMcpError,
          mcpLastCount: lastMcpCount,
          mcpLogs: mcpSkipLogs,
          providerConfig: usedProviders.includes("cafe24") ? providerConfig : {},
          providerAvailable,
          authSettingsId: authSettings?.id || null,
          userId: authContext.user.id,
          orgId: userOrgId || authContext.orgId,
          userPlan,
          userIsAdmin,
          userRole,
          kbUserId: kb.id,
          kbAdminIds: adminKbs.map((item) => item.id),
          usedRuleIds,
          usedTemplateIds,
          usedToolPolicies,
          slotExpectedInput: slotDebug.expectedInput,
          slotOrderId: slotDebug.orderId,
          slotPhone: slotDebug.phone,
          slotPhoneMasked: maskPhone(slotDebug.phone),
          slotZipcode: slotDebug.zipcode,
          slotAddress: slotDebug.address,
          mcpCandidateCalls,
          mcpSkipped: mcpSkipLogs,
          policyInputRules: inputRuleIds,
          policyToolRules: toolRuleIds,
          contextContamination: contaminationSummaries,
          conversationMode,
        };
        lastDebugPrefixJson = { entries: buildDebugEntries(debugPayload) };
      }
      const result = await insertFinalTurn(context, payload, lastDebugPrefixJson);
      latestTurnId = result.data?.id || null;
      return result;
    }
    const intentFromPolicy = inputGate.actions.flags?.intent_name
      ? String(inputGate.actions.flags.intent_name)
      : "general";
    if (intentFromPolicy !== "general") {
      if (intentFromPolicy === "shipping_inquiry" && resolvedIntent === "order_change" && hasAddressSignal) {
        // 주소 변경 문맥을 배송조회로 덮어써서 파이프라인이 튀는 현상 방지
        resolvedIntent = "order_change";
      } else {
        resolvedIntent = intentFromPolicy;
      }
    }
    policyContext = {
      ...policyContext,
      intent: { name: resolvedIntent },
    };
    const activePolicyConflicts = (compiledPolicy.conflicts || []).filter((c) => {
      if (c.intentScope === "*") return true;
      return c.intentScope.split(",").map((v) => v.trim()).includes(resolvedIntent);
    });
    if (activePolicyConflicts.length > 0) {
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_STATIC_CONFLICT",
        {
          intent: resolvedIntent,
          conflicts: activePolicyConflicts,
          resolution: "tool_stage_force_response_precedence",
        },
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
      );
    }
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "SLOT_EXTRACTED",
      {
        expected_input: expectedInput || null,
        derived: {
          order_id: derivedOrderId || null,
          phone: derivedPhone || null,
          phone_masked: maskPhone(derivedPhone),
          zipcode: derivedZipcode || null,
          address: derivedAddress || null,
        },
        resolved: {
          intent: resolvedIntent,
          order_id: resolvedOrderId || null,
          phone: typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null,
          phone_masked:
            typeof policyContext.entity?.phone === "string" ? maskPhone(policyContext.entity.phone) : "-",
          zipcode: typeof policyContext.entity?.zipcode === "string" ? policyContext.entity.zipcode : null,
          address: typeof policyContext.entity?.address === "string" ? policyContext.entity.address : null,
        },
      },
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
    );

    if (inputGate.actions.forcedResponse) {
      const forcedText = normalizeOrderChangeAddressPrompt(resolvedIntent, inputGate.actions.forcedResponse);
      const reply = makeReply(forcedText);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          selected_order_id: resolvedOrderId,
        },
      });
      await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "input" }, { intent_name: resolvedIntent });
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
    }

    let otpVerifiedThisTurn = false;
    const otpPending = Boolean(lastTurn?.bot_context?.otp_pending);
    if (otpPending) {
      const otpStage = String(lastTurn?.bot_context?.otp_stage || "awaiting_code");
      const otpDestination = String(lastTurn?.bot_context?.otp_destination || "").trim();
      const otpRef = String(lastTurn?.bot_context?.otp_ref || "").trim();
      const otpCode = extractOtpCode(message);
      if (otpStage === "awaiting_phone") {
        const phone = extractPhone(message);
        if (!phone) {
          const prompt = "주문 조회/변경을 위해 본인인증이 필요합니다. 휴대폰 번호를 알려주세요.";
          const reply = makeReply(prompt);
          await insertTurn({
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            answer_text: reply,
            final_answer: reply,
            bot_context: {
              intent_name: resolvedIntent,
              entity: policyContext.entity,
              selected_order_id: resolvedOrderId,
              otp_pending: true,
              otp_stage: "awaiting_phone",
            },
          });
          return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
        }
        if (!allowedToolNames.has("send_otp")) {
          const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
          await insertTurn({
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            answer_text: reply,
            final_answer: reply,
            bot_context: {
              intent_name: resolvedIntent,
              entity: policyContext.entity,
              selected_order_id: resolvedOrderId,
            },
          });
          return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
        }
        const sendResult = await callMcpTool(
          context,
          "send_otp",
          { destination: phone },
          sessionId,
          latestTurnId,
          { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
          allowedToolNames
        );
        noteMcp("send_otp", sendResult);
        mcpActions.push("send_otp");
        if (!sendResult.ok) {
          const reply = makeReply("인증번호 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
          await insertTurn({
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            answer_text: reply,
            final_answer: reply,
            bot_context: {
              intent_name: resolvedIntent,
              entity: policyContext.entity,
              selected_order_id: resolvedOrderId,
            },
          });
          return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
        }
        const otpRefValue = String((sendResult.data as any)?.otp_ref || "").trim();
        const prompt = "문자로 전송된 인증번호를 입력해 주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
            otp_pending: true,
            otp_stage: "awaiting_code",
            otp_destination: phone,
            otp_ref: otpRefValue || null,
          },
        });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      if (!otpCode) {
        const prompt = "인증번호를 다시 입력해 주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
            otp_pending: true,
            otp_stage: "awaiting_code",
            otp_destination: otpDestination || null,
            otp_ref: otpRef || null,
          },
        });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      if (!allowedToolNames.has("verify_otp")) {
        const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
          },
        });
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
      }
      const verifyResult = await callMcpTool(
        context,
        "verify_otp",
        { code: otpCode, otp_ref: otpRef || undefined },
        sessionId,
        latestTurnId,
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
        allowedToolNames
      );
      noteMcp("verify_otp", verifyResult);
      mcpActions.push("verify_otp");
      if (!verifyResult.ok) {
        const prompt = "인증번호가 올바르지 않습니다. 다시 입력해 주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
            otp_pending: true,
            otp_stage: "awaiting_code",
            otp_destination: otpDestination || null,
            otp_ref: otpRef || null,
          },
        });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      const tokenValue = String((verifyResult.data as any)?.customer_verification_token || "").trim();
      customerVerificationToken = tokenValue || null;
      policyContext = {
        ...policyContext,
        user: { ...(policyContext.user || {}), confirmed: true },
      };
      await context.supabase.from("D_conv_turns").update({
        confirmation_response: message,
        user_confirmed: true,
        correction_text: message,
        bot_context: {
          ...prevBotContext,
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          selected_order_id: resolvedOrderId,
          otp_pending: false,
          otp_stage: null,
          customer_verification_token: customerVerificationToken,
        },
      }).eq("id", lastTurn.id);
      otpVerifiedThisTurn = true;
    }

    if (resolvedOrderId && !customerVerificationToken && !otpVerifiedThisTurn && !otpPending) {
      const otpDestination =
        derivedPhone ||
        (typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null) ||
        prevPhoneFromTranscript ||
        String(lastTurn?.bot_context?.otp_destination || "");
      if (!otpDestination) {
        const prompt = "주문 조회/변경을 위해 본인인증이 필요합니다. 휴대폰 번호를 알려주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
            otp_pending: true,
            otp_stage: "awaiting_phone",
          },
        });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      if (!allowedToolNames.has("send_otp")) {
        const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
          },
        });
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
      }
      const sendResult = await callMcpTool(
        context,
        "send_otp",
        { destination: otpDestination },
        sessionId,
        latestTurnId,
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
        allowedToolNames
      );
      noteMcp("send_otp", sendResult);
      mcpActions.push("send_otp");
      if (!sendResult.ok) {
        const reply = makeReply("인증번호 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
          },
        });
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
      }
      const otpRefValue = String((sendResult.data as any)?.otp_ref || "").trim();
      const prompt = "문자로 전송된 인증번호를 입력해 주세요.";
      const reply = makeReply(prompt);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          selected_order_id: resolvedOrderId,
          otp_pending: true,
          otp_stage: "awaiting_code",
          otp_destination: otpDestination,
          otp_ref: otpRefValue || null,
        },
      });
      return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
    }

    const productDecisionRes = await resolveProductDecision(context, message);
    if (productDecisionRes.decision) {
      const decision = productDecisionRes.decision;
      policyContext = {
        ...policyContext,
        product: {
          id: decision.product_id,
          answerable: decision.answerability === "ALLOW",
          restock_known: decision.restock_policy !== "UNKNOWN",
          restock_policy: decision.restock_policy,
          restock_at: decision.restock_at ?? null,
        },
      };
    }

    const toolGate = runPolicyStage(compiledPolicy, "tool", policyContext);
    toolRuleIds = toolGate.matched.map((rule) => rule.id);
    usedRuleIds.push(...toolRuleIds);
    usedTemplateIds.push(...extractTemplateIds(toolGate.matched as any[]));
    const forcedCalls = toolGate.actions.forcedToolCalls || [];
    mcpCandidateCalls = forcedCalls.map((call) => String(call.name || "")).filter(Boolean);
    const denied = new Set(toolGate.actions.denyTools || []);
    const allowed = new Set(toolGate.actions.allowTools || []);
    const canUseTool = (name: string) => {
      if (denied.has("*") || denied.has(name)) return false;
      if (allowed.size > 0 && !allowed.has(name)) return false;
      return true;
    };
    let finalCalls = forcedCalls.filter((call) => {
      if (denied.has("*") || denied.has(call.name)) {
        noteMcpSkip(call.name, "DENY_RULE", { denied: true }, call.args as Record<string, unknown>);
        return false;
      }
      if (allowed.size > 0 && !allowed.has(call.name)) {
        noteMcpSkip(call.name, "ALLOWLIST_MISMATCH", { allowed: Array.from(allowed) }, call.args as Record<string, unknown>);
        return false;
      }
      return true;
    });

    finalCalls = finalCalls.map((call) => {
      if (call.name === "list_orders") {
        const nextArgs = { ...call.args };
        if (!nextArgs.start_date || !nextArgs.end_date) {
          Object.assign(nextArgs, buildDefaultOrderRange());
        }
        const phone =
          typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null;
        const memberId =
          typeof (policyContext.entity as any)?.member_id === "string"
            ? String((policyContext.entity as any).member_id)
            : null;
        if (!nextArgs.member_id && !nextArgs.memberId && memberId) {
          nextArgs.member_id = memberId;
        }
        if (!nextArgs.member_id && !nextArgs.memberId && phone && !nextArgs.cellphone) {
          nextArgs.cellphone = phone;
        }
        return { ...call, args: nextArgs };
      }
      return call;
    });

    finalCalls = finalCalls.filter((call) => {
      if (resolvedIntent === "order_change" && call.name === "update_order_shipping_address") {
        noteMcpSkip(
          call.name,
          "DEFERRED_TO_DETERMINISTIC_UPDATE",
          { intent: resolvedIntent },
          call.args as Record<string, unknown>
        );
        return false;
      }
      if (compiledPolicy.toolPolicies[call.name]) {
        usedToolPolicies.push(call.name);
      }
      if (call.name === "list_orders") {
        const hasMember =
          typeof (call.args as any)?.member_id === "string" ||
          typeof (call.args as any)?.memberId === "string";
        const hasPhone = typeof (call.args as any)?.cellphone === "string";
        if (!hasMember && !hasPhone) {
          noteMcpSkip(call.name, "MISSING_MEMBER_OR_PHONE", { hasMember, hasPhone }, call.args as Record<string, unknown>);
          return false;
        }
      }
      if ((call.name === "lookup_order" || call.name === "update_order_shipping_address") && customerVerificationToken) {
        call.args.customer_verification_token = customerVerificationToken;
      }
      if (call.name === "lookup_order" || call.name === "update_order_shipping_address") {
        const candidateOrderId = String((call.args as any)?.order_id || "").trim();
        if (candidateOrderId && !isLikelyOrderId(candidateOrderId)) {
          noteContamination({
            slot: "order_id",
            candidate: candidateOrderId,
            reason: "FORCED_CALL_INVALID_ORDER_ID",
            action: "CALL_SKIPPED",
          });
          noteMcpSkip(
            call.name,
            "CONTEXT_CONTAMINATION_ORDER_ID",
            { candidate_order_id: candidateOrderId },
            call.args as Record<string, unknown>
          );
          void insertEvent(
            context,
            sessionId,
            latestTurnId,
            "CONTEXT_CONTAMINATION_DETECTED",
            {
              slot: "order_id",
              candidate: candidateOrderId,
              reason: "FORCED_CALL_INVALID_ORDER_ID",
              action: "CALL_SKIPPED",
            },
            { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
          );
          return false;
        }
      }
      const validation = validateToolArgs(call.name, call.args, compiledPolicy);
      if (!validation.ok) {
        noteMcpSkip(
          call.name,
          "INVALID_TOOL_ARGS",
          { validation_error: validation.error || "INVALID_TOOL_ARGS" },
          call.args as Record<string, unknown>
        );
      }
      return validation.ok;
    });

    const piiSensitiveIntents = new Set(["order_change", "shipping_inquiry", "refund_request"]);
    const piiSensitiveTools = new Set([
      "find_customer_by_phone",
      "list_orders",
      "lookup_order",
      "track_shipment",
      "update_order_shipping_address",
    ]);
    const hasSensitivePlannedCall = finalCalls.some((call) => piiSensitiveTools.has(call.name));
    if (
      piiSensitiveIntents.has(resolvedIntent) &&
      hasSensitivePlannedCall &&
      !customerVerificationToken &&
      !otpVerifiedThisTurn &&
      !otpPending
    ) {
      const otpDestination =
        derivedPhone ||
        (typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null) ||
        prevPhoneFromTranscript ||
        String(lastTurn?.bot_context?.otp_destination || "");
      if (!otpDestination) {
        const prompt = "개인정보 보호를 위해 먼저 본인확인이 필요합니다. 휴대폰 번호를 알려주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
            otp_pending: true,
            otp_stage: "awaiting_phone",
          },
        });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      if (!allowedToolNames.has("send_otp")) {
        const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
          },
        });
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
      }
      const sendResult = await callMcpTool(
        context,
        "send_otp",
        { destination: otpDestination },
        sessionId,
        latestTurnId,
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
        allowedToolNames
      );
      noteMcp("send_otp", sendResult);
      mcpActions.push("send_otp");
      if (!sendResult.ok) {
        const reply = makeReply("인증번호 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
          },
        });
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
      }
      const otpRefValue = String((sendResult.data as any)?.otp_ref || "").trim();
      const prompt = "문자로 전송된 인증번호를 입력해 주세요.";
      const reply = makeReply(prompt);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          selected_order_id: resolvedOrderId,
          otp_pending: true,
          otp_stage: "awaiting_code",
          otp_destination: otpDestination,
          otp_ref: otpRefValue || null,
        },
      });
      return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: ["send_otp"] });
    }

    if (
      finalCalls.length === 0 &&
      mcpCandidateCalls.length === 0 &&
      !resolvedOrderId &&
      (resolvedIntent === "order_change" ||
        resolvedIntent === "shipping_inquiry" ||
        resolvedIntent === "refund_request")
    ) {
      const phone = typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null;
      const hasListOrdersPolicy = Boolean(compiledPolicy.toolPolicies?.list_orders);
      if (phone && hasListOrdersPolicy && allowedToolNames.has("list_orders") && canUseTool("list_orders")) {
        noteMcpSkip(
          "list_orders",
          "NO_FORCED_TOOL_CALLS",
          { intent: resolvedIntent, phone_masked: maskPhone(phone) },
          { cellphone: phone, ...buildDefaultOrderRange() }
        );
      }
    }

    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "PRE_MCP_DECISION",
      {
        intent: resolvedIntent,
        forced_calls: forcedCalls.map((call) => ({ name: call.name, args: call.args })),
        final_calls: finalCalls.map((call) => ({ name: call.name, args: call.args })),
        denied: Array.from(denied),
        allowed: Array.from(allowed),
        allowed_tool_names: Array.from(allowedToolNames),
        policy_conflicts: activePolicyConflicts,
        entity: {
          order_id: resolvedOrderId || null,
          phone_masked:
            typeof policyContext.entity?.phone === "string" ? maskPhone(policyContext.entity.phone) : "-",
          has_address: Boolean(policyContext.entity?.address),
        },
      },
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
    );
    await flushMcpSkipLogs();

    const toolGateHasForcedResponse = toolGate.matched.some((rule) =>
      (rule.enforce?.actions || []).some((action) => String(action.type || "") === "force_response_template")
    );
    const toolGateHasForcedTool = toolGate.matched.some((rule) =>
      (rule.enforce?.actions || []).some((action) => String(action.type || "") === "force_tool_call")
    );
    if (toolGateHasForcedResponse && toolGateHasForcedTool) {
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_CONFLICT_DETECTED",
        {
          stage: "tool",
          matched_rule_ids: toolGate.matched.map((rule) => rule.id),
          conflict: "force_response_template vs force_tool_call",
          resolution: "force_response_template_precedence",
        },
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
      );
    }

    if (toolGate.actions.forcedResponse) {
      if (conversationMode === "natural" && resolvedIntent === "order_change") {
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          {
            stage: "tool",
            action: "DEFER_FORCE_RESPONSE_TEMPLATE",
            reason: "NATURAL_MODE_ORDER_CHANGE",
          },
          { intent_name: resolvedIntent }
        );
      } else {
      const rawForcedText = String(toolGate.actions.forcedResponse || "");
      const forcedText = normalizeOrderChangeAddressPrompt(resolvedIntent, rawForcedText);
      const isNeedZipcodeTemplate =
        rawForcedText === (compiledPolicy.templates?.order_change_need_zipcode || "") ||
        forcedText === (compiledPolicy.templates?.order_change_need_zipcode || "") ||
        usedTemplateIds.includes("order_change_need_zipcode") ||
        isOrderChangeZipcodeTemplateText(rawForcedText) ||
        isOrderChangeZipcodeTemplateText(forcedText);
      const currentAddress =
        typeof policyContext.entity?.address === "string" ? String(policyContext.entity.address).trim() : "";
      const shouldDeferZipcodeTemplate =
        isNeedZipcodeTemplate &&
        resolvedIntent === "order_change" &&
        Boolean(currentAddress);
      if (shouldDeferZipcodeTemplate) {
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          {
            stage: "tool",
            action: "DEFER_FORCE_RESPONSE_TEMPLATE",
            reason: "ORDER_AND_ADDRESS_ALREADY_AVAILABLE",
            template: "order_change_need_zipcode",
          },
          { intent_name: resolvedIntent }
        );
      }
      if (isNeedZipcodeTemplate && !shouldDeferZipcodeTemplate) {
        if (!currentAddress) {
          const prompt = "배송지 변경을 위해 새 주소를 알려주세요. 예) 서울시 ...";
          const reply = makeReply(prompt);
          await insertTurn({
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            answer_text: reply,
            final_answer: reply,
            bot_context: {
              intent_name: resolvedIntent,
              entity: policyContext.entity,
              selected_order_id: resolvedOrderId,
              product_decision: productDecisionRes.decision || null,
              policy_matched: toolGate.matched.map((rule) => rule.id),
              address_pending: true,
              address_stage: "awaiting_address",
            },
          });
          await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "tool" }, { intent_name: resolvedIntent });
          return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
        }
        const search = await callAddressSearchWithAudit(
          context,
          currentAddress,
          sessionId,
          latestTurnId,
          { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
        );
        if (search.status === "success") {
          const rows = Array.isArray((search.data as any)?.results) ? (search.data as any).results : [];
          const first = rows[0];
          const candidateZip = String(first?.zipNo || "").trim();
          const roadAddr = String(first?.roadAddr || first?.roadAddrPart1 || "").trim();
          const jibunAddr = String(first?.jibunAddr || "").trim();
          if (candidateZip) {
            const prompt = `입력하신 주소를 확인했습니다.\n- 지번주소: ${jibunAddr || currentAddress}\n- 도로명주소: ${roadAddr || "-"}\n- 우편번호: ${candidateZip}\n위 정보가 맞으면 '네', 아니면 '아니오'를 입력해 주세요.`;
            const reply = makeReply(prompt);
            await insertTurn({
              session_id: sessionId,
              seq: nextSeq,
              transcript_text: message,
              answer_text: reply,
              final_answer: reply,
              bot_context: {
                intent_name: resolvedIntent,
                entity: policyContext.entity,
                selected_order_id: resolvedOrderId,
                product_decision: productDecisionRes.decision || null,
                policy_matched: toolGate.matched.map((rule) => rule.id),
                address_pending: true,
                address_stage: "awaiting_zipcode_confirm",
                pending_address: currentAddress || null,
                pending_zipcode: candidateZip || null,
                pending_road_addr: roadAddr || null,
                pending_jibun_addr: jibunAddr || null,
                customer_verification_token: customerVerificationToken || null,
              },
            });
            await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "tool" }, { intent_name: resolvedIntent });
            return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
          }
        }
        const prompt = "입력하신 주소를 확인할 수 없습니다. 도로명/지번 포함 주소를 다시 입력해 주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
            product_decision: productDecisionRes.decision || null,
            policy_matched: toolGate.matched.map((rule) => rule.id),
            address_pending: true,
            address_stage: "awaiting_address",
            customer_verification_token: customerVerificationToken || null,
          },
        });
        await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "tool" }, { intent_name: resolvedIntent });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      if (!shouldDeferZipcodeTemplate) {
        const reply = makeReply(forcedText);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
            product_decision: productDecisionRes.decision || null,
            policy_matched: toolGate.matched.map((rule) => rule.id),
            address_pending: isNeedZipcodeTemplate ? true : undefined,
            address_stage: isNeedZipcodeTemplate ? "awaiting_zipcode" : undefined,
            pending_address: isNeedZipcodeTemplate ? currentAddress || null : undefined,
            customer_verification_token: isNeedZipcodeTemplate ? customerVerificationToken : undefined,
          },
        });
        await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "tool" }, { intent_name: resolvedIntent });
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
      }
      }
    }

    let mcpSummary = "";
    let listOrdersCalled = false;
    let listOrdersEmpty = false;
    let listOrdersChoices: Array<{
      index: number;
      order_id: string;
      order_date?: string;
      order_date_short?: string;
      product_name?: string;
      option_name?: string;
      quantity?: string;
      price?: string;
      label?: string;
    }> = [];
    for (const call of finalCalls) {
      if (!allowedToolNames.has(call.name)) {
        noteMcpSkip(
          call.name,
          "TOOL_NOT_ALLOWED_FOR_AGENT",
          { allowed_tool_names: Array.from(allowedToolNames) },
          call.args as Record<string, unknown>
        );
        continue;
      }
      const result = await callMcpTool(
        context,
        call.name,
        call.args,
        sessionId,
        latestTurnId,
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
        allowedToolNames
      );
      noteMcp(call.name, result);
      toolResults.push({ name: call.name, ok: result.ok, data: result.ok ? (result.data as Record<string, unknown>) : undefined, error: result.ok ? undefined : result.error });
      if (call.name === "list_orders") {
        listOrdersCalled = true;
        if (result.ok) {
          const orders = (result.data as any)?.orders || (result.data as any)?.orders?.order || [];
          const items = Array.isArray(orders) ? orders : [];
          if (items.length > 0) {
            const slice = items.slice(0, 3);
            const detailMap = new Map<
              string,
              { name: string; option: string; qty: string; price: string }
            >();
            if (canUseTool("lookup_order") && allowedToolNames.has("lookup_order")) {
              for (const item of slice) {
                const id = String(item?.order_id || item?.order_no || "").trim();
                if (!id || detailMap.has(id)) continue;
                const detail = await callMcpTool(
                  context,
                  "lookup_order",
                  buildLookupOrderArgs(id, customerVerificationToken),
                  sessionId,
                  latestTurnId,
                  { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
                  allowedToolNames
                );
                noteMcp("lookup_order", detail);
                toolResults.push({
                  name: "lookup_order",
                  ok: detail.ok,
                  data: detail.ok ? (detail.data as Record<string, unknown>) : undefined,
                  error: detail.ok ? undefined : detail.error,
                });
                mcpActions.push("lookup_order");
                if (detail.ok) {
                  const parsed = readLookupOrderView(detail.data);
                  const core = parsed.core || {};
                  const itemsData = parsed.items;
                  const first = Array.isArray(itemsData) ? itemsData[0] : itemsData;
                  const name = first?.product_name || first?.name || first?.product_name_default || "상품 정보 확인 필요";
                  const option = first?.option_name || first?.option_value || first?.option_value_default || "기본 옵션";
                  const qty = first?.quantity || first?.qty || "1";
                  const priceRaw =
                    first?.price ||
                    first?.product_price ||
                    first?.unit_price ||
                    first?.supply_price ||
                    core.order_price_amount ||
                    core.payment_amount ||
                    core.total_amount ||
                    core.total_price ||
                    "-";
                  detailMap.set(id, {
                    name: String(name),
                    option: String(option),
                    qty: String(qty),
                    price: String(priceRaw),
                  });
                }
              }
            }
            listOrdersChoices = slice
              .map((o: any, idx: number) => {
                const id = String(o.order_id || o.order_no || "").trim();
                if (!id) return null;
                const date = o.order_date || "";
                const fallbackName = o.first_product_name || o.product_name || "상품 정보 확인 필요";
                const fallbackPrice =
                  o?.actual_order_amount?.order_price_amount ||
                  o?.actual_order_amount?.payment_amount ||
                  o?.payment_amount ||
                  o?.total_supply_price ||
                  "-";
                const detail = detailMap.get(id) || {
                  name: String(fallbackName || "상품 정보 확인 필요"),
                  option: "확인 필요",
                  qty: "확인 필요",
                  price: String(fallbackPrice),
                };
                const label = `${idx + 1}번 주문
  주문일시: ${toOrderDateShort(date)}
  주문번호: ${id}
  상품명: ${detail.name}
  옵션: ${detail.option}
  수량: ${detail.qty}
  금액: ${toMoneyText(detail.price)}원`;
                return {
                  index: idx + 1,
                  order_id: id,
                  order_date: date,
                  order_date_short: toOrderDateShort(date),
                  product_name: detail.name,
                  option_name: detail.option,
                  quantity: detail.qty,
                  price: detail.price,
                  label,
                };
              })
              .filter(Boolean) as Array<{
                index: number;
                order_id: string;
                order_date?: string;
                order_date_short?: string;
                product_name?: string;
                option_name?: string;
                quantity?: string;
                price?: string;
                label?: string;
              }>;
          } else {
            listOrdersEmpty = true;
          }
        }
      }
      if (result.ok) {
        mcpSummary += `${call.name}: success. `;
      } else {
        mcpSummary += `${call.name}: error ${String(result.error)}. `;
      }
      mcpActions.push(call.name);
    }
    await flushMcpSkipLogs();

    const hasToolResult = (name: string) => toolResults.some((tool) => tool.name === name);
    if (resolvedOrderId && canUseTool("lookup_order") && allowedToolNames.has("lookup_order") && !hasToolResult("lookup_order")) {
      const lookup = await callMcpTool(
        context,
        "lookup_order",
        buildLookupOrderArgs(resolvedOrderId, customerVerificationToken),
        sessionId,
        latestTurnId,
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
        allowedToolNames
      );
      noteMcp("lookup_order", lookup);
      toolResults.push({
        name: "lookup_order",
        ok: lookup.ok,
        data: lookup.ok ? (lookup.data as Record<string, unknown>) : undefined,
        error: lookup.ok ? undefined : lookup.error,
      });
      mcpActions.push("lookup_order");
      if (!lookup.ok && isInvalidOrderIdError(String(lookup.error || ""))) {
        noteContamination({
          slot: "order_id",
          candidate: resolvedOrderId,
          reason: "LOOKUP_ORDER_INVALID_ORDER_ID",
          action: "CLEARED",
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "CONTEXT_CONTAMINATION_DETECTED",
          {
            slot: "order_id",
            candidate: resolvedOrderId,
            reason: "LOOKUP_ORDER_INVALID_ORDER_ID",
            action: "CLEARED",
          },
          { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
        );
        resolvedOrderId = null;
        policyContext = {
          ...policyContext,
          entity: {
            ...(policyContext.entity || {}),
            order_id: null,
          },
        };
      }
    }

    const currentAddress =
      typeof policyContext.entity?.address === "string" ? String(policyContext.entity.address).trim() : "";
    const phoneFromSlotForUpdate =
      typeof policyContext.entity?.phone === "string" ? normalizePhoneDigits(policyContext.entity.phone) : "";

    if (
      resolvedIntent === "order_change" &&
      currentAddress &&
      resolvedOrderId &&
      canUseTool("update_order_shipping_address") &&
      allowedToolNames.has("update_order_shipping_address") &&
      !hasToolResult("update_order_shipping_address")
    ) {
      const lookupTool = toolResults.find((tool) => tool.name === "lookup_order" && tool.ok);
      const lookupOrder = lookupTool && lookupTool.data && typeof lookupTool.data === "object"
        ? ((lookupTool.data as any).order || {})
        : {};
      const lookupReceivers = Array.isArray((lookupOrder as any)?.receivers) ? (lookupOrder as any).receivers : [];
      const receiver = lookupReceivers[0] || {};
      const receiverPhoneForUpdate = normalizePhoneDigits(String(receiver?.cellphone || receiver?.phone || ""));
      const phoneOrderMismatch =
        Boolean(phoneFromSlotForUpdate) &&
        Boolean(receiverPhoneForUpdate) &&
        phoneFromSlotForUpdate !== receiverPhoneForUpdate;
      if (phoneOrderMismatch) {
        const reply = makeReply("인증한 휴대폰 번호와 주문 수신자 정보가 달라서 변경을 진행할 수 없습니다. 주문번호를 다시 확인해 주세요.");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: null,
            order_choices: listOrdersChoices,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "MCP_CALL_SKIPPED",
          {
            tool: "update_order_shipping_address",
            reason: "PHONE_ORDER_MISMATCH",
            detail: {
              phone_masked: maskPhone(phoneFromSlotForUpdate),
              receiver_phone_masked: maskPhone(receiverPhoneForUpdate),
              order_id: resolvedOrderId,
            },
          },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
      }
      const receiverAddress1 = normalizeAddressText(String(receiver?.address1 || ""));
      const receiverZipcode = isLikelyZipcode(String(receiver?.zipcode || ""))
        ? String(receiver?.zipcode || "").trim()
        : "";
      const pendingJibun = normalizeAddressText(String(prevBotContext.pending_jibun_addr || ""));
      const pendingRoad = normalizeAddressText(String(prevBotContext.pending_road_addr || ""));
      const pendingZipFromContext = isLikelyZipcode(String(prevBotContext.pending_zipcode || ""))
        ? String(prevBotContext.pending_zipcode || "").trim()
        : "";
      const pendingAddressFromContext = normalizeAddressText(String(prevBotContext.pending_address || ""));
      const pendingBaseJibun = normalizeAddressText(String(prevBotContext.pending_jibun_addr || ""));
      const pendingBaseRoad = normalizeAddressText(String(prevBotContext.pending_road_addr || ""));
      const addressLooksDetailOnly = isLikelyAddressDetailOnly(currentAddress);
      const baseAddressCandidate = addressLooksDetailOnly ? (pendingJibun || pendingRoad || receiverAddress1) : "";

      const { zipcode, address1, address2 } = splitAddressForUpdate(currentAddress, {
        baseAddress: baseAddressCandidate || null,
        fallbackBaseAddress: receiverAddress1 || null,
      });
      const suspiciousFallbackToReceiver =
        Boolean(receiverAddress1) &&
        !addressLooksDetailOnly &&
        normalizeAddressText(address1 || "") === receiverAddress1 &&
        normalizeAddressText(currentAddress) !== receiverAddress1 &&
        !normalizeAddressText(currentAddress).startsWith(receiverAddress1);
      if (suspiciousFallbackToReceiver) {
        const prompt = "입력하신 주소를 현재 배송지와 다르게 인식하지 못했습니다. 도로명/지번을 포함해 주소를 다시 입력해 주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
            address_pending: true,
            address_stage: "awaiting_address",
            pending_order_id: isLikelyOrderId(resolvedOrderId) ? resolvedOrderId : null,
            customer_verification_token: customerVerificationToken || null,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          {
            stage: "tool",
            action: "ASK_ADDRESS_RETRY",
            reason: "ADDRESS_PARSE_SUSPICIOUS_FALLBACK",
            order_id: resolvedOrderId,
          },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
      }
      const normalizedCurrentAddress = normalizeAddressText(currentAddress);
      const normalizedAddress1 = normalizeAddressText(address1 || "");
      const canTrustPendingZip =
        Boolean(pendingZipFromContext) &&
        (
          (pendingAddressFromContext && pendingAddressFromContext === normalizedCurrentAddress) ||
          (pendingBaseJibun && pendingBaseJibun === normalizedAddress1) ||
          (pendingBaseRoad && pendingBaseRoad === normalizedAddress1)
        );
      if (pendingZipFromContext && !canTrustPendingZip) {
        noteContamination({
          slot: "zipcode",
          candidate: pendingZipFromContext,
          reason: "ZIPCODE_PENDING_CONTEXT_NOT_MATCHING_CURRENT_ADDRESS",
          action: "CLEARED",
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "CONTEXT_CONTAMINATION_DETECTED",
          {
            slot: "zipcode",
            candidate: pendingZipFromContext,
            reason: "ZIPCODE_PENDING_CONTEXT_NOT_MATCHING_CURRENT_ADDRESS",
            action: "CLEARED",
            current_address: normalizedCurrentAddress || null,
            pending_address: pendingAddressFromContext || null,
          },
          { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
        );
      }
      const effectiveZipcode =
        zipcode || (canTrustPendingZip ? pendingZipFromContext : "") || (addressLooksDetailOnly ? receiverZipcode : "");
      if (!effectiveZipcode) {
        const search = await callAddressSearchWithAudit(
          context,
          currentAddress,
          sessionId,
          latestTurnId,
          { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
        );
        if (search.status === "success") {
          const rows = Array.isArray((search.data as any)?.results) ? (search.data as any).results : [];
          const first = rows[0];
          const candidateZip = String(first?.zipNo || "").trim();
          const roadAddr = String(first?.roadAddr || first?.roadAddrPart1 || "").trim();
          const jibunAddr = String(first?.jibunAddr || "").trim();
          if (candidateZip) {
            const prompt = `입력하신 주소를 확인했습니다.\n- 지번주소: ${jibunAddr || currentAddress}\n- 도로명주소: ${roadAddr || "-"}\n- 우편번호: ${candidateZip}\n위 정보가 맞으면 '네', 아니면 '아니오'를 입력해 주세요.`;
            const reply = makeReply(prompt);
            await insertTurn({
              session_id: sessionId,
              seq: nextSeq,
              transcript_text: message,
              answer_text: reply,
              final_answer: reply,
                bot_context: {
                  intent_name: resolvedIntent,
                  entity: policyContext.entity,
                  selected_order_id: resolvedOrderId,
                  address_pending: true,
                  address_stage: "awaiting_zipcode_confirm",
                  pending_address: currentAddress,
                  pending_zipcode: candidateZip || null,
                  pending_road_addr: roadAddr || null,
                  pending_jibun_addr: jibunAddr || null,
                  pending_order_id: isLikelyOrderId(resolvedOrderId) ? resolvedOrderId : null,
                  customer_verification_token: customerVerificationToken || null,
                },
              });
            return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
          }
        }
        const prompt = "입력하신 주소를 확인할 수 없습니다. 도로명/지번 포함 주소를 다시 입력해 주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
            bot_context: {
              intent_name: resolvedIntent,
              entity: policyContext.entity,
              selected_order_id: resolvedOrderId,
              address_pending: true,
              address_stage: "awaiting_address",
              pending_order_id: isLikelyOrderId(resolvedOrderId) ? resolvedOrderId : null,
              customer_verification_token: customerVerificationToken || null,
            },
          });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      const beforeAddress = normalizeAddressText(
        String(receiver?.address_full || [receiver?.address1, receiver?.address2].filter(Boolean).join(" "))
      );
      const receiverName = normalizeAddressText(String(receiver?.name || ""));
      const receiverPhoneMasked = maskPhone(receiverPhoneForUpdate);
      if (!updateConfirmAcceptedThisTurn) {
        const confirmPrompt = `아래 내용으로 배송지를 변경할까요?\n- 주문번호: ${resolvedOrderId}\n- 수령인: ${receiverName || "-"} / 연락처: ${receiverPhoneMasked}\n- 현재 배송지: ${beforeAddress || "-"}\n- 변경 배송지: ${normalizeAddressText([address1, address2].filter(Boolean).join(" ")) || currentAddress}\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.`;
        const reply = makeReply(confirmPrompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
            change_pending: true,
            change_stage: "awaiting_update_confirm",
            pending_order_id: resolvedOrderId,
            pending_address: currentAddress,
            pending_zipcode: effectiveZipcode,
            pending_before_address: beforeAddress || null,
            customer_verification_token: customerVerificationToken || null,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          { stage: "tool", action: "ASK_UPDATE_CONFIRM", order_id: resolvedOrderId },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      const updatePayload: Record<string, unknown> = {
        order_id: resolvedOrderId,
      };
      if (customerVerificationToken) updatePayload.customer_verification_token = customerVerificationToken;
      if (effectiveZipcode) updatePayload.zipcode = effectiveZipcode;
      if (address1) updatePayload.address1 = address1;
      if (address2) updatePayload.address2 = address2;
      if (!updatePayload.address1 && currentAddress) {
        updatePayload.address_full = currentAddress;
      }
      const update = await callMcpTool(
        context,
        "update_order_shipping_address",
        updatePayload,
        sessionId,
        latestTurnId,
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
        allowedToolNames
      );
      noteMcp("update_order_shipping_address", update);
      toolResults.push({
        name: "update_order_shipping_address",
        ok: update.ok,
        data: update.ok ? (update.data as Record<string, unknown>) : undefined,
        error: update.ok ? undefined : update.error,
      });
      mcpActions.push("update_order_shipping_address");
      if (!update.ok) {
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "MCP_TOOL_FAILED",
          { tool: "update_order_shipping_address", error: update.error },
          { intent_name: resolvedIntent }
        );
        if (canUseTool("create_ticket") && allowedToolNames.has("create_ticket") && !hasToolResult("create_ticket")) {
          const fallback = await callMcpTool(
            context,
            "create_ticket",
            {
              title: `배송지 변경 요청 - ${resolvedOrderId}`,
              summary: `배송지 변경 요청 - ${resolvedOrderId}`,
              content: `배송지 변경 요청: ${currentAddress}\n주문번호: ${resolvedOrderId}`,
            },
            sessionId,
            latestTurnId,
            { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
            allowedToolNames
          );
          noteMcp("create_ticket", fallback);
          toolResults.push({
            name: "create_ticket",
            ok: fallback.ok,
            data: fallback.ok ? (fallback.data as Record<string, unknown>) : undefined,
            error: fallback.ok ? undefined : fallback.error,
          });
          mcpActions.push("create_ticket");
          if (!fallback.ok) {
            await insertEvent(
              context,
              sessionId,
              latestTurnId,
              "MCP_TOOL_FAILED",
              { tool: "create_ticket", error: fallback.error },
              { intent_name: resolvedIntent }
            );
          }
        }
      }
    }

    if (toolResults.length > 0) {
      toolResults.forEach((tool) => {
        if (tool.ok) return;
        if (tool.name === "lookup_order" || tool.name === "update_order_shipping_address" || tool.name === "create_ticket") {
          insertEvent(context, sessionId, latestTurnId, "MCP_TOOL_FAILED", { tool: tool.name, error: tool.error }, { intent_name: resolvedIntent });
        }
      });
      const summaries: string[] = [];
      toolResults.forEach((tool) => {
        if (!tool.ok) {
          summaries.push(`${tool.name}: 실패`);
          return;
        }
        if (tool.name === "lookup_order") {
          const parsed = readLookupOrderView(tool.data);
          const core = parsed.core || {};
          const summary = parsed.summary || {};
          const orderInfo = [
            core.order_id || core.order_no,
            core.order_date || summary.order_date,
            summary.shipping_status || core.shipping_status,
            summary.total_amount_due ?? core.total_amount_due ?? core.payment_amount,
          ].filter(Boolean).join(", ");
          summaries.push(`lookup_order: ${orderInfo || "성공"}`);
          return;
        }
        if (tool.name === "track_shipment") {
          const shipments = (tool.data as any)?.shipments || (tool.data as any)?.shipments?.shipment || [];
          const count = Array.isArray(shipments) ? shipments.length : 0;
          summaries.push(`track_shipment: ${count}건`);
          return;
        }
        if (tool.name === "create_ticket") {
          const ticketId = (tool.data as any)?.ticket_id || (tool.data as any)?.id || "";
          summaries.push(`create_ticket: ${ticketId || "성공"}`);
          return;
        }
        if (tool.name === "update_order_shipping_address") {
          const resultOrderId = (tool.data as any)?.order_id || (tool.data as any)?.order_no || "";
          summaries.push(`update_order_shipping_address: ${resultOrderId || "성공"}`);
          return;
        }
        if (tool.name === "list_orders") {
          const orders = (tool.data as any)?.orders || (tool.data as any)?.orders?.order || [];
          const count = Array.isArray(orders) ? orders.length : 0;
          summaries.push(`list_orders: ${count}건`);
          return;
        }
        summaries.push(`${tool.name}: 성공`);
      });
      mcpSummary = summaries.join(" | ");
    }

    if (!resolvedOrderId && listOrdersChoices.length === 1) {
      const selected = listOrdersChoices[0];
      const phoneFromSlot =
        typeof policyContext.entity?.phone === "string" ? normalizePhoneDigits(policyContext.entity.phone) : "";
      const lookupForSelected = toolResults.find((tool) => {
        if (tool.name !== "lookup_order" || !tool.ok || !tool.data) return false;
        const parsed = readLookupOrderView(tool.data);
        const core = parsed.core || {};
        return String(core.order_id || core.order_no || "").trim() === selected.order_id;
      });
      const receiverPhoneFromLookup = (() => {
        if (!lookupForSelected?.data) return "";
        const parsed = readLookupOrderView(lookupForSelected.data);
        const receivers = Array.isArray((parsed.order as any)?.receivers) ? (parsed.order as any).receivers : [];
        const first = receivers[0] || {};
        return normalizePhoneDigits(
          String(first?.cellphone || first?.phone || "")
        );
      })();
      const mismatch =
        Boolean(phoneFromSlot) &&
        Boolean(receiverPhoneFromLookup) &&
        phoneFromSlot !== receiverPhoneFromLookup;
      if (mismatch) {
        const reply = makeReply("인증한 번호와 주문 수신자 정보가 달라 주문번호 확인이 필요합니다. 주문번호를 입력해 주세요.");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: null,
            order_choices: listOrdersChoices,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "MCP_CALL_SKIPPED",
          {
            tool: "auto_select_order",
            reason: "PHONE_ORDER_MISMATCH",
            detail: {
              phone_masked: maskPhone(phoneFromSlot),
              receiver_phone_masked: maskPhone(receiverPhoneFromLookup),
            },
          },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
      }

      resolvedOrderId = selected.order_id;
      policyContext = {
        ...policyContext,
        entity: {
          ...(policyContext.entity || {}),
          order_id: selected.order_id,
        },
      };
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "ORDER_CHOICES_PRESENTED",
        { choices: listOrdersChoices, auto_selected: true, selected_order_id: selected.order_id },
        { intent_name: resolvedIntent }
      );
    }

    if (listOrdersChoices.length > 1) {
      const prompt =
        compiledPolicy.templates?.order_choices_prompt ||
        "조회된 주문이 여러 건입니다. 변경하실 주문을 번호로 선택해 주세요.";
      const lines = listOrdersChoices.map((o) => (o.label ? o.label : `${o.index}번 주문`));
      const header = "아래 주문 중 번호를 선택해 주세요.";
      const replyText = `${prompt}\n${header}\n${lines.join("\n")}`.trim();
      const reply = makeReply(replyText);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          selected_order_id: resolvedOrderId,
          order_choices: listOrdersChoices,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "ORDER_CHOICES_PRESENTED",
        { choices: listOrdersChoices },
        { intent_name: resolvedIntent }
      );
      const quickReplies = listOrdersChoices
        .slice(0, 9)
        .map((item) => ({ label: `${item.index}번`, value: String(item.index) }));
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions, quick_replies: quickReplies });
    }

    if (listOrdersCalled && listOrdersEmpty) {
      const reply = makeReply("주문 내역을 찾지 못했습니다. 주문번호를 알려주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          selected_order_id: resolvedOrderId,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(context, sessionId, latestTurnId, "ORDER_CHOICES_EMPTY", {}, { intent_name: resolvedIntent });
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
    }

    const updateFailures = toolResults.filter(
      (tool) => tool.name === "update_order_shipping_address" && !tool.ok
    );
    if (resolvedIntent === "order_change" && updateFailures.length > 0) {
      const firstUpdateError = String(updateFailures[0].error || "UPDATE_ORDER_SHIPPING_ADDRESS_FAILED");
      const missingZipcode = firstUpdateError.includes(EXECUTION_GUARD_RULES.updateAddress.missingZipcodeCode);
      if (missingZipcode) {
        const search = await callAddressSearchWithAudit(
          context,
          currentAddress || "",
          sessionId,
          latestTurnId,
          { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
        );
        if (search.status === "success") {
          const rows = Array.isArray((search.data as any)?.results) ? (search.data as any).results : [];
          const first = rows[0];
          const candidateZip = String(first?.zipNo || "").trim();
          const roadAddr = String(first?.roadAddr || first?.roadAddrPart1 || "").trim();
          const jibunAddr = String(first?.jibunAddr || "").trim();
          if (candidateZip) {
            const prompt = `입력하신 주소를 확인했습니다.\n- 지번주소: ${jibunAddr || currentAddress}\n- 도로명주소: ${roadAddr || "-"}\n- 우편번호: ${candidateZip}\n위 정보가 맞으면 '네', 아니면 '아니오'를 입력해 주세요.`;
            const reply = makeReply(prompt);
            await insertTurn({
              session_id: sessionId,
              seq: nextSeq,
              transcript_text: message,
              answer_text: reply,
              final_answer: reply,
              bot_context: {
                intent_name: resolvedIntent,
                entity: policyContext.entity,
                selected_order_id: resolvedOrderId,
                address_pending: true,
                address_stage: "awaiting_zipcode_confirm",
                pending_address: currentAddress || null,
                pending_zipcode: candidateZip || null,
                pending_road_addr: roadAddr || null,
                pending_jibun_addr: jibunAddr || null,
                customer_verification_token: customerVerificationToken,
                mcp_actions: mcpActions,
              },
            });
            await insertEvent(
              context,
              sessionId,
              latestTurnId,
              "EXECUTION_GUARD_TRIGGERED",
              { reason: "MISSING_ZIPCODE", tool: "update_order_shipping_address", error: firstUpdateError },
              { intent_name: resolvedIntent }
            );
            return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
          }
        }
        const prompt = "입력하신 주소를 확인할 수 없습니다. 도로명/지번 포함 주소를 다시 입력해 주세요.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            selected_order_id: resolvedOrderId,
            address_pending: true,
            address_stage: "awaiting_address",
            customer_verification_token: customerVerificationToken,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "EXECUTION_GUARD_TRIGGERED",
          { reason: "MISSING_ZIPCODE", tool: "update_order_shipping_address", error: firstUpdateError },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
      }

      const ticketSuccess = toolResults.some((tool) => tool.name === "create_ticket" && tool.ok);
      const fallbackReply = ticketSuccess
        ? EXECUTION_GUARD_RULES.updateAddress.fallbackTicketMessage
        : EXECUTION_GUARD_RULES.updateAddress.fallbackRetryMessage;
      const reply = makeReply(fallbackReply);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          selected_order_id: resolvedOrderId,
          customer_verification_token: customerVerificationToken,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "EXECUTION_GUARD_TRIGGERED",
        { reason: "UPDATE_FAILED", tool: "update_order_shipping_address", error: firstUpdateError, ticket_success: ticketSuccess },
        { intent_name: resolvedIntent }
      );
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
    }

    const updateSuccess = toolResults.find(
      (tool) => tool.name === "update_order_shipping_address" && tool.ok
    );
    if (resolvedIntent === "order_change" && updateSuccess) {
      const finalAddress =
        typeof policyContext.entity?.address === "string" ? String(policyContext.entity.address).trim() : "";
      const finalZip =
        typeof policyContext.entity?.zipcode === "string" ? String(policyContext.entity.zipcode).trim() : "";
      const lines = [
        "요약: 배송지 변경이 완료되었습니다.",
        `상세: 주문번호 ${resolvedOrderId || "-"}의 배송지 변경 요청이 정상 처리되었습니다.${finalAddress ? ` (${finalAddress}${finalZip ? `, ${finalZip}` : ""})` : ""}`,
        "다음 액션: 추가 변경이 필요하면 주소를 다시 알려주세요.",
      ];
      const reply = makeReply(lines.join("\n"));
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          selected_order_id: resolvedOrderId,
          customer_verification_token: customerVerificationToken,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_order_change_success" },
        { intent_name: resolvedIntent }
      );
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
    }

    const productDecisionJson = productDecisionRes.decision ? JSON.stringify(productDecisionRes.decision) : "null";
    const systemPrompt = `당신은 고객 상담봇입니다.
규칙:
- KB에 있는 내용만 근거로 답합니다.
- KB에 없는 내용은 추측하지 않습니다.
- 상품 판정 JSON을 우선으로 따릅니다.`;

    const userPrompt = `고객 질문: ${message}
의도: ${resolvedIntent}
채널: ${derivedChannel || "없음"}
확인된 정보:
- 주문번호: ${resolvedOrderId || "없음"}
- 휴대폰: ${policyContext.entity?.phone || "없음"}
- 주소: ${policyContext.entity?.address || "없음"}
출력 형식:
요약: ...
근거: ...
상세: ...
다음 액션: ...
상품판정: ${productDecisionJson}
KB 제목: ${kb.title}
KB 내용:
${kb.content || ""}
관리자 공통 KB:
${adminKbs.map((item) => `[ADMIN KB] ${item.title}\n${item.content || ""}`).join("\n\n") || "(없음)"}
도구 결과:
${mcpSummary || "(없음)"}`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];
    // recentTurns is DESC (latest first), so reverse it
    [...recentTurns].reverse().forEach((turn) => {
      if (turn.transcript_text) {
        messages.push({ role: "user", content: turn.transcript_text });
      }
      if (turn.final_answer || turn.answer_text) {
        messages.push({ role: "assistant", content: turn.final_answer || turn.answer_text });
      }
    });
    messages.push({ role: "user", content: userPrompt });

    const answerRes = await runLlm(agent.llm, messages);
    let finalAnswer = answerRes.text.trim();

    const outputGate = runPolicyStage(compiledPolicy, "output", policyContext);
    usedRuleIds.push(...outputGate.matched.map((rule) => rule.id));
    usedTemplateIds.push(...extractTemplateIds(outputGate.matched as any[]));
    if (outputGate.actions.outputFormat) {
      finalAnswer = formatOutputDefault(finalAnswer);
    }
    if (outputGate.actions.forcedResponse) {
      finalAnswer = normalizeOrderChangeAddressPrompt(resolvedIntent, outputGate.actions.forcedResponse);
      if (debugEnabled) {
        console.log("[playground/chat/mk2] forcing template", { reason: outputGate.actions.forceReason });
      }
    }

    const reply = makeReply(finalAnswer, answerRes.model, mcpActions);
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      kb_references: [
        { kb_id: kb.id, title: kb.title, version: kb.version },
        ...adminKbs.map((adminKb) => ({
          kb_id: adminKb.id,
          title: adminKb.title,
          version: adminKb.version,
        })),
      ],
      bot_context: {
        intent_name: resolvedIntent,
        entity: policyContext.entity,
        selected_order_id: resolvedOrderId,
        customer_verification_token: customerVerificationToken,
        product_decision: productDecisionRes.decision || null,
        product_alias: productDecisionRes.alias ? {
          product_id: productDecisionRes.alias.product_id,
          alias: productDecisionRes.alias.alias,
          match_type: productDecisionRes.alias.match_type,
        } : null,
        mcp_actions: mcpActions,
      },
    });

    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "FINAL_ANSWER_READY",
      { answer: reply, model: answerRes.model },
      { intent_name: resolvedIntent }
    );

    return respond({
      session_id: sessionId,
      step: "final",
      message: reply,
      mcp_actions: mcpActions,
    });
  } catch (err) {
    if (debugEnabled) {
      console.error("[playground/chat/mk2] unhandled error", err);
    }
    const message = err instanceof Error ? err.message : "INTERNAL_ERROR";
    const fallback = "처리 중 오류가 발생했습니다. 같은 내용을 한 번 더 보내주세요.";
    return respond({
      step: "final",
      message: fallback,
      mcp_actions: [],
      error: "INTERNAL_ERROR",
      detail: debugEnabled ? { message, stack: err instanceof Error ? err.stack : null } : undefined,
    });
  }
}












