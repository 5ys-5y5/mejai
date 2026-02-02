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
    { key: "MODE", value: payload.conversationMode || "-" },
  ];
}

function isValidLlm(value?: string | null) {
  return value === "chatgpt" || value === "gemini";
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
  if (/^\d{6,20}$/.test(v)) return true;
  if (/^\d{4,12}-\d{3,12}(?:-\d{1,6})?$/.test(v)) return true;
  if (/^[0-9A-Za-z\-]{6,30}$/.test(v)) return true;
  return false;
}

function extractZipcode(text: string) {
  const match = text.match(/\b\d{5}\b/);
  return match ? match[0] : null;
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

function extractAddress(text: string, orderId: string | null, phone: string | null, zipcode: string | null) {
  const keywordMatch = text.search(/주소|배송지/);
  const hasKoreanAddressToken = /[가-힣]{2,}(시|도|군|구|동|로|길|읍|면)\b/.test(text);
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
  segment = segment.replace(/\s+/g, " ").trim();
  if (segment.length < 8) return null;
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
  await context.supabase.from("F_audit_events").insert({
    session_id: sessionId,
    turn_id: turnId,
    event_type: eventType,
    payload,
    created_at: nowIso(),
    bot_context: botContext,
  });
}

async function upsertDebugLog(
  context: any,
  payload: { sessionId: string; turnId: string; seq?: number | null; prefixJson: Record<string, unknown> | null }
) {
  if (!payload.prefixJson) return;
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
  if (!allowedTools) {
    console.warn("[playground/chat_mk2] allowedTools missing", { tool, sessionId, turnId });
  }
  const allowed = allowedTools ?? new Set<string>();
  if (!allowed.has(tool)) {
    return { ok: false, error: "TOOL_NOT_ALLOWED_FOR_AGENT" };
  }
  const { data: toolRow } = await context.supabase
    .from("C_mcp_tools")
    .select("id, name, version, schema_json")
    .eq("name", tool)
    .eq("is_active", true)
    .maybeSingle();
  if (!toolRow) {
    return { ok: false, error: "TOOL_NOT_FOUND" };
  }
  const policy = await context.supabase
    .from("C_mcp_tool_policies")
    .select("is_allowed, allowed_scopes, rate_limit_per_min, masking_rules, conditions, adapter_key")
    .eq("org_id", context.orgId)
    .eq("tool_id", toolRow.id)
    .maybeSingle();
  if (!policy.data || !policy.data.is_allowed) {
    return { ok: false, error: "POLICY_BLOCK" };
  }
  const { callAdapter } = await import("@/lib/mcpAdapters");
  const { applyMasking, checkPolicyConditions, validateToolParams } = await import("@/lib/mcpPolicy");

  const schema = (toolRow as any).schema_json || {};
  const validation = validateToolParams(schema as Record<string, unknown>, params);
  if (!validation.ok) return { ok: false, error: validation.error };

  const conditionCheck = checkPolicyConditions(policy.data.conditions, params);
  if (!conditionCheck.ok) return { ok: false, error: conditionCheck.error };

  const start = Date.now();
  const adapterKey = policy.data.adapter_key || tool;
  const result = await callAdapter(adapterKey, params, {
    supabase: context.supabase,
    orgId: context.orgId,
    userId: context.user.id,
  });
  const latency = Date.now() - start;
  const responsePayload = result.data ? { ...result.data } : {};
  const masked = applyMasking(responsePayload, policy.data.masking_rules);

  const responsePayloadWithError =
    result.status === "error"
      ? { ...(masked.masked as Record<string, unknown>), error: result.error || null }
      : masked.masked;
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
  if (/주소|배송지|수령인|연락처/.test(text)) return "change";
  if (/조회|확인/.test(text) && /배송|송장|출고|운송장/.test(text)) return "order_lookup";
  if (/배송|송장|출고|운송장|배송조회/.test(text)) return "shipment";
  if (/환불|취소|반품|교환/.test(text)) return "refund";
  return "general";
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

export async function POST(req: NextRequest) {
  const debugEnabled = process.env.DEBUG_PLAYGROUND_CHAT === "1" || process.env.NODE_ENV !== "production";
  let latestTurnId: string | null = null;
  const respond = (payload: Record<string, unknown>, init?: ResponseInit) =>
    NextResponse.json({ ...payload, turn_id: latestTurnId }, init);
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
    if (agent.mcp_tool_ids && agent.mcp_tool_ids.length > 0) {
      const { data: tools } = await context.supabase
        .from("C_mcp_tools")
        .select("id, name")
        .in("id", agent.mcp_tool_ids);
      (tools || []).forEach((t) => allowedToolNames.add(String(t.name)));
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
      if (addressPrompt) return "address";
      if (text.includes("우편번호")) return "zipcode";
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
      derivedZipcode = extractZipcode(message) || message.replace(/[^\d]/g, "").slice(0, 5) || null;
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
      derivedAddress = extractAddress(message, null, null, derivedZipcode) || cleaned || null;
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

    if (prevBotContext.address_pending && prevBotContext.address_stage === "awaiting_zipcode") {
      const pendingAddress = String(prevBotContext.pending_address || "").trim();
      const pendingZip = extractZipcode(message) || message.replace(/[^\d]/g, "").slice(0, 5);
      if (!pendingZip) {
        const prompt = "우편번호를 알려주세요.";
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
            address_stage: "awaiting_zipcode",
            pending_address: pendingAddress || null,
          },
        });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      derivedZipcode = pendingZip || null;
      derivedAddress = pendingAddress || derivedAddress;
    }
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
    let resolvedOrderId =
      derivedOrderId ??
      orderIdFromChoice ??
      safePrevEntityOrderId ??
      safePrevOrderIdFromTranscript ??
      safePrevSelectedOrderId ??
      (safeRecentOrderId || null);

    let policyContext: PolicyEvalContext = {
      input: { text: message },
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
        zipcode:
          derivedZipcode ??
          (typeof prevEntity.zipcode === "string" ? prevEntity.zipcode : null) ??
          prevZipFromTranscript ??
          (recentEntity?.zipcode || null),
      },
      user: { confirmed: true },
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
    const usedToolPolicies: string[] = [];
    const usedProviders: string[] = [];
    const mcpActions: string[] = [];
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
    const toolResults: Array<{ name: string; ok: boolean; data?: Record<string, unknown>; error?: unknown }> = [];
    function makeReply(text: string, llmModel?: string | null, tools?: string[]) {
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
      const debugPayload = {
        llmModel: llmModel || null,
        mcpTools: tools || mcpActions,
        mcpProviders: usedProviders,
        mcpLastFunction: lastMcpFunction,
        mcpLastStatus: lastMcpStatus,
        mcpLastError: lastMcpError,
        mcpLastCount: lastMcpCount,
        mcpLogs: mcpLogLines,
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
        conversationMode: "mk2",
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
          mcpLogs: [],
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
          conversationMode: "mk2",
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
    resolvedIntent = intentFromPolicy === "general" && prevIntent ? prevIntent : intentFromPolicy;
    policyContext = {
      ...policyContext,
      intent: { name: resolvedIntent },
    };

    if (inputGate.actions.forcedResponse) {
      const forcedText = inputGate.actions.forcedResponse;
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
    usedRuleIds.push(...toolGate.matched.map((rule) => rule.id));
    usedTemplateIds.push(...extractTemplateIds(toolGate.matched as any[]));
    const forcedCalls = toolGate.actions.forcedToolCalls || [];
    const denied = new Set(toolGate.actions.denyTools || []);
    const allowed = new Set(toolGate.actions.allowTools || []);
    const canUseTool = (name: string) => {
      if (denied.has("*") || denied.has(name)) return false;
      if (allowed.size > 0 && !allowed.has(name)) return false;
      return true;
    };
    let finalCalls = forcedCalls.filter((call) => {
      if (denied.has("*") || denied.has(call.name)) return false;
      if (allowed.size > 0 && !allowed.has(call.name)) return false;
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
      if (compiledPolicy.toolPolicies[call.name]) {
        usedToolPolicies.push(call.name);
      }
      if (call.name === "list_orders") {
        const hasMember =
          typeof (call.args as any)?.member_id === "string" ||
          typeof (call.args as any)?.memberId === "string";
        const hasPhone = typeof (call.args as any)?.cellphone === "string";
        if (!hasMember && !hasPhone) {
          return false;
        }
      }
      if ((call.name === "lookup_order" || call.name === "update_order_shipping_address") && customerVerificationToken) {
        call.args.customer_verification_token = customerVerificationToken;
      }
      const validation = validateToolArgs(call.name, call.args, compiledPolicy);
      return validation.ok;
    });

    if (toolGate.actions.forcedResponse) {
      const forcedText = toolGate.actions.forcedResponse;
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
        },
      });
      await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "tool" }, { intent_name: resolvedIntent });
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
    }

    let mcpSummary = "";
    let listOrdersCalled = false;
    let listOrdersEmpty = false;
    let listOrdersChoices: Array<{
      index: number;
      order_id: string;
      order_date?: string;
      product_name?: string;
      option_name?: string;
      quantity?: string;
      price?: string;
      label?: string;
    }> = [];
    for (const call of finalCalls) {
      if (!allowedToolNames.has(call.name)) continue;
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
          if (items.length === 1) {
            const onlyId = String(items[0]?.order_id || items[0]?.order_no || "").trim();
            if (onlyId) {
              resolvedOrderId = onlyId;
              policyContext = {
                ...policyContext,
                entity: {
                  ...(policyContext.entity || {}),
                  order_id: resolvedOrderId,
                },
              };
            } else {
              listOrdersEmpty = true;
            }
          } else if (items.length > 1) {
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
                  { order_id: id, customer_verification_token: customerVerificationToken || undefined },
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
                  const order = (detail.data as any)?.order || {};
                  const itemsData =
                    order.order_items ||
                    order.order_item ||
                    order.items ||
                    order.products ||
                    [];
                  const first = Array.isArray(itemsData) ? itemsData[0] : itemsData;
                  const name = first?.product_name || first?.name || "-";
                  const option = first?.option_name || first?.option_value || "-";
                  const qty = first?.quantity || first?.qty || "-";
                  const priceRaw =
                    first?.price ||
                    first?.product_price ||
                    first?.unit_price ||
                    order.order_price_amount ||
                    order.payment_amount ||
                    order.total_amount ||
                    order.total_price ||
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
                const fallbackName = o.first_product_name || o.product_name || "-";
                const detail = detailMap.get(id) || {
                  name: String(fallbackName || "-"),
                  option: "-",
                  qty: "-",
                  price: "-",
                };
                const label = `- ${idx + 1}번 | ${date} | ${detail.name} | ${detail.option} | ${detail.qty} | ${detail.price}`;
                return {
                  index: idx + 1,
                  order_id: id,
                  order_date: date,
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

    const hasToolResult = (name: string) => toolResults.some((tool) => tool.name === name);
    if (resolvedOrderId && canUseTool("lookup_order") && allowedToolNames.has("lookup_order") && !hasToolResult("lookup_order")) {
      const lookup = await callMcpTool(
        context,
        "lookup_order",
        { order_id: resolvedOrderId, customer_verification_token: customerVerificationToken || undefined },
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
    }

    const currentAddress =
      typeof policyContext.entity?.address === "string" ? String(policyContext.entity.address).trim() : "";

    if (
      resolvedIntent === "change" &&
      currentAddress &&
      resolvedOrderId &&
      canUseTool("update_order_shipping_address") &&
      allowedToolNames.has("update_order_shipping_address") &&
      !hasToolResult("update_order_shipping_address")
    ) {
      const { zipcode, address1, address2 } = parseAddressParts(currentAddress);
      if (!zipcode) {
        const prompt = "우편번호를 알려주세요.";
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
            address_stage: "awaiting_zipcode",
            pending_address: currentAddress,
          },
        });
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
      }
      const updatePayload: Record<string, unknown> = {
        order_id: resolvedOrderId,
      };
      if (customerVerificationToken) updatePayload.customer_verification_token = customerVerificationToken;
      if (zipcode) updatePayload.zipcode = zipcode;
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
          const order = (tool.data as any)?.order || {};
          const orderInfo = [
            order.order_id || order.order_no,
            order.order_date,
            order.order_summary?.shipping_status || order.shipping_status,
            order.order_summary?.total_amount_due,
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

    if (listOrdersChoices.length > 0) {
      const prompt =
        compiledPolicy.templates?.order_choices_prompt ||
        "조회된 주문이 여러 건입니다. 변경하실 주문을 번호로 선택해 주세요.";
      const lines = listOrdersChoices.map((o) =>
        o.label
          ? o.label
          : `- ${[
            `${o.index}번`,
            o.order_date,
            o.product_name,
            o.option_name,
            o.quantity,
            o.price,
          ]
            .filter(Boolean)
            .join(" | ")}`.trim()
      );
      const header = "(번호 | 날짜 | 상품명 | 옵션 | 수량 | 가격)";
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
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
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
      let isSoft = outputGate.actions.isSoftForced;
      const reason = outputGate.actions.forceReason;

      // Heuristic: If we successfully called tools (like track_shipment), 
      // the LLM likely has better info than a static template. Treat as soft.
      if (!isSoft && toolResults.some(t => t.ok)) {
        isSoft = true;
        if (debugEnabled) {
          console.log("[playground/chat/mk2] auto-softening template due to successful tools", { reason });
        }
      }

      if (isSoft && finalAnswer && finalAnswer.length > 5) {
        if (debugEnabled) {
          console.log("[playground/chat/mk2] skipping soft template", { reason, original: finalAnswer });
        }
      } else {
        finalAnswer = outputGate.actions.forcedResponse;
        if (debugEnabled) {
          console.log("[playground/chat/mk2] forcing template", { reason });
        }
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
    return respond(
      {
        error: "INTERNAL_ERROR",
        detail: debugEnabled ? { message, stack: err instanceof Error ? err.stack : null } : undefined,
      },
      { status: 500 }
    );
  }
}












