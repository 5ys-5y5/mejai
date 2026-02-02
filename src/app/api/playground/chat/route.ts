import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { runLlm } from "@/lib/llm";
import { compilePolicy, formatOutputDefault, runPolicyStage, validateToolArgs, type PolicyPack, type PolicyEvalContext } from "@/lib/policyEngine";

type Body = {
  agent_id?: string;
  message?: string;
  session_id?: string;
  mode?: "guided" | "natural";
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

const YES_PATTERNS = [/^네/, /^예/, /^맞/, /^응/, /^확인/, /^yes/i, /^y$/i];

function isValidLlm(value?: string | null) {
  return value === "chatgpt" || value === "gemini";
}

function isYes(text: string) {
  const trimmed = text.trim();
  return YES_PATTERNS.some((p) => p.test(trimmed));
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

function isOrderOnlyMessage(text: string) {
  const trimmed = text.trim();
  const extracted = extractOrderId(trimmed);
  if (!extracted) return false;
  const cleaned = trimmed.replace(extracted, "").replace(/[^\p{L}\p{N}]/gu, "").trim();
  return cleaned.length <= 6;
}

function needsShipmentAction(text: string) {
  return /배송|송장|출고|운송장|배송조회/.test(text);
}

function needsTicketAction(text: string) {
  return /문의|접수|요청|처리|환불|취소|반품|교환/.test(text);
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

function extractAddress(text: string) {
  const match = text.match(/(\d+\s*호)/);
  if (match) return match[1].replace(/\s+/g, "");
  if (/주소/.test(text)) {
    const trimmed = text.trim();
    if (/\d/.test(trimmed)) return trimmed;
  }
  if (/배송지/.test(text)) {
    const trimmed = text.trim();
    if (/\d/.test(trimmed)) return trimmed;
  }
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

function parseAddressParts(text: string) {
  const zipcodeMatch = text.match(/\b\d{5}\b/);
  const zipcode = zipcodeMatch ? zipcodeMatch[0] : null;
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

function extractChannel(text: string) {
  if (/카카오|카톡|kakao/i.test(text)) return "kakao";
  if (/문자|sms/i.test(text)) return "sms";
  if (/이메일|email|메일/i.test(text)) return "email";
  return null;
}

function readCustomerList(payload: unknown) {
  if (!payload || typeof payload !== "object") return [];
  const asObj = payload as { customers?: unknown; customersprivacy?: unknown };
  if (Array.isArray(asObj.customers)) return asObj.customers;
  if (Array.isArray(asObj.customersprivacy)) return asObj.customersprivacy;
  return [];
}

  function buildDebugPrefix(payload: {
    llmModel?: string | null;
    mcpTools?: string[];
    mcpProviders?: string[];
    mcpLastFunction?: string | null;
  mcpLastStatus?: string | null;
  mcpLastError?: string | null;
  mcpLastCount?: number | null;
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

function sanitizeConfirmPrompt(prompt: string, fallback: string) {
  const trimmed = (prompt || "").trim();
  if (!trimmed) return fallback;
  if (/^\d+\./.test(trimmed)) return fallback;
  if (/고객/.test(trimmed)) return fallback;
  return trimmed;
}

function inferExpectedSlot(prompt?: string | null) {
  const text = (prompt || "").trim();
  if (!text) return null;
  if (/아이디|이름|회원|고객/.test(text) && /맞|확인/.test(text)) return "identity";
  if (/휴대폰|핸드폰|전화번호/.test(text)) return "phone";
  if (/인증번호|인증\s*코드|otp/i.test(text)) return "otp";
  if (/주소|배송지|수령지/.test(text)) return "address";
  if (/주문번호|주문\s*번호|order/.test(text)) return "order_id";
  if (/번호로 선택|주문을 번호/.test(text)) return "order_id";
  return null;
}

function extractChoiceIndex(text: string, max: number) {
  const match = text.match(/(?:^|\s)(\d{1,2})(?:\s*번|\s*번째)?/);
  if (!match) return null;
  const idx = Number(match[1]);
  if (!Number.isFinite(idx) || idx < 1 || idx > max) return null;
  return idx;
}

function sanitizeSummary(summary: string, fallback: string) {
  const trimmed = (summary || "").trim();
  if (!trimmed) return fallback;
  let cleaned = trimmed.replace(/^\d+\.\s*/, "");
  if (/고객/.test(cleaned) && cleaned.length <= fallback.length) {
    cleaned = fallback;
  }
  return cleaned;
}

function isRepeatRequest(prev?: string | null, next?: string | null) {
  if (!prev || !next) return false;
  const p = prev.replace(/\s+/g, " ").trim();
  const n = next.replace(/\s+/g, " ").trim();
  if (!p || !n) return false;
  if (p === n) return true;
  const token = n.replace(/[^\p{L}\p{N}]/gu, "");
  return token.length > 4 && p.includes(token);
}

function nowIso() {
  return new Date().toISOString();
}

function isAbusive(text: string) {
  return /(미친|병신|새끼|욕|꺼져|좆)/.test(text);
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

function isRestockQuestion(text: string) {
  return RESTOCK_KEYWORDS.test(text);
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

async function getLastTurn(context: any, sessionId: string) {
  const { data, error } = await context.supabase
    .from("D_conv_turns")
    .select("*")
    .eq("session_id", sessionId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { error: error.message };
  return { data };
}

async function getRecentTurns(context: any, sessionId: string) {
  const { data, error } = await context.supabase
    .from("D_conv_turns")
    .select("id, transcript_text, summary_text, correction_text, confirmation_response, confirm_prompt, user_confirmed, answer_text, seq, bot_context")
    .eq("session_id", sessionId)
    .order("seq", { ascending: true })
    .limit(20);
  if (error) return { error: error.message };
  return { data: data || [] };
}

function deriveContext(turns: any[], currentMessage: string) {
  let orderId: string | null = null;
  let address: string | null = null;
  let phone: string | null = null;
  let channel: string | null = null;
  let intent = "general";
  for (const turn of [...turns].reverse()) {
    const stored = turn?.bot_context?.intent_name;
    if (stored) {
      intent = String(stored);
      break;
    }
  }
  for (const turn of turns) {
    const extracted = turn?.bot_context?.extracted_entities;
    if (!extracted || typeof extracted !== "object") continue;
    if (!orderId && extracted.order_id) orderId = String(extracted.order_id);
    if (!address && extracted.address) address = String(extracted.address);
    if (!phone && extracted.phone) phone = String(extracted.phone);
    if (!channel && extracted.channel) channel = String(extracted.channel);
    if (orderId && address && phone && channel) break;
  }
  const candidates = [
    currentMessage,
    ...turns.map((t) => t.confirmation_response || t.correction_text || t.transcript_text || t.summary_text || ""),
  ].filter(Boolean);
  for (const text of candidates) {
    if (!orderId) orderId = extractOrderId(text);
    if (!address) address = extractAddress(text);
    if (!phone) phone = extractPhone(text);
    if (!channel) channel = extractChannel(text);
    if (intent === "general") intent = detectIntent(text);
    if (orderId && address && phone && channel && intent !== "general") break;
  }
  return { orderId, address, phone, channel, intent };
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
    console.warn("[playground/chat] allowedTools missing", { tool, sessionId, turnId });
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
  const rawResponsePayload = result.data ? { ...result.data } : {};
  const masked = applyMasking(rawResponsePayload, policy.data.masking_rules);

  const responsePayload =
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
    response_payload: responsePayload,
    status: result.status,
    latency_ms: latency,
    masked_fields: masked.maskedFields,
    policy_decision: { allowed: true },
    created_at: nowIso(),
    bot_context: botContext,
  });

  if (result.status !== "success") {
    return { ok: false, error: result.error?.message || "MCP_ERROR" };
  }
  return { ok: true, data: masked.masked };
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
        console.debug("[playground/chat] auth error", context.error);
      }
      return respond({ error: context.error }, { status: 401 });
    }

  const body = (await req.json().catch(() => null)) as Body | null;
  const agentId = String(body?.agent_id || "").trim();
  const message = String(body?.message || "").trim();
  const mode = body?.mode === "natural" ? "natural" : "guided";
  const overrideLlm = body?.llm;
  const overrideKbId = body?.kb_id;
  const overrideAdminKbIds = Array.isArray(body?.admin_kb_ids)
    ? body?.admin_kb_ids.map((id) => String(id)).filter(Boolean)
    : null;
  const overrideMcpToolIds = Array.isArray(body?.mcp_tool_ids)
    ? body?.mcp_tool_ids.map((id) => String(id)).filter(Boolean)
    : [];
  if (debugEnabled) {
    console.debug("[playground/chat] request", {
      agentId,
      hasMessage: Boolean(message),
      sessionId: body?.session_id || null,
      mode,
      hasOverrides: Boolean(!agentId && overrideLlm && overrideKbId),
    });
  }
  if (!message) {
    if (debugEnabled) {
      console.debug("[playground/chat] invalid body", { agentId, messageLength: message.length });
    }
    return respond({ error: "INVALID_BODY" }, { status: 400 });
  }

  let agent: AgentRow | null = null;
  if (agentId) {
    const agentRes = await fetchAgent(context, agentId);
    if (!agentRes.data) {
      if (debugEnabled) {
        console.debug("[playground/chat] agent not found", { agentId, error: agentRes.error || null });
      }
      return respond(
        {
          error: agentRes.error || "AGENT_NOT_FOUND",
          ...(debugEnabled
            ? { detail: { agent_id: agentId, org_id: context.orgId, reason: agentRes.error || "NOT_FOUND" } }
            : {}),
        },
        { status: 404 }
      );
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
    if (debugEnabled) {
      console.debug("[playground/chat] agent kb missing", { agentId: agent.id });
    }
    return respond(
      {
        error: "AGENT_KB_MISSING",
        ...(debugEnabled ? { detail: { agent_id: agent.id, org_id: context.orgId } } : {}),
      },
      { status: 400 }
    );
  }

  const kbRes = await fetchKb(context, agent.kb_id);
  if (!kbRes.data) {
    if (debugEnabled) {
      console.debug("[playground/chat] kb not found", {
        kbId: agent.kb_id,
        orgId: context.orgId,
        error: kbRes.error || null,
      });
    }
    return respond(
      {
        error: "KB_NOT_FOUND",
        ...(debugEnabled
          ? {
              detail: {
                agent_id: agent.id,
                kb_id: agent.kb_id,
                org_id: context.orgId,
                reason: kbRes.error || "NOT_FOUND",
              },
            }
          : {}),
      },
      { status: 404 }
    );
  }
  const kb = kbRes.data;
  if (debugEnabled) {
    console.debug("[playground/chat] kb resolved", {
      kbId: kb.id,
      kbTitle: kb.title,
      kbVersion: kb.version,
      kbIsActive: kb.is_active,
    });
  }
  const { data: accessRow } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("group, plan, is_admin, org_role, org_id")
    .eq("user_id", context.user.id)
    .maybeSingle();
  const userGroup = (accessRow?.group as Record<string, unknown> | null) ?? null;
  const userPlan = (accessRow?.plan as string | null) ?? null;
  const userIsAdmin = typeof accessRow?.is_admin === "boolean" ? accessRow.is_admin : null;
  const userRole = (accessRow?.org_role as string | null) ?? null;
  const userOrgId = (accessRow?.org_id as string | null) ?? null;
  const { data: authSettings } = await context.supabase
    .from("A_iam_auth_settings")
    .select("id, providers")
    .eq("org_id", context.orgId)
    .eq("user_id", context.user.id)
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
  const adminKbText = adminKbs
    .map((item) => `[ADMIN KB] ${item.title}\n${item.content || ""}`)
    .join("\n\n");

  const botContext = {
    agent_version_id: agent.id,
    kb_version_id: kb.id,
    kb_version: kb.version,
    kb_is_active: kb.is_active ?? null,
    admin_kb_ids: adminKbs.map((item) => item.id),
    llm_provider: agent.llm,
    mcp_tool_ids: agent.mcp_tool_ids ?? [],
    ts: nowIso(),
    user_env: {
      user_id: context.user.id,
      org_id: userOrgId || context.orgId,
      plan: userPlan,
      is_admin: userIsAdmin,
      org_role: userRole,
    },
    provider_env: {
      auth_settings_id: authSettings?.id || null,
      providers: providerAvailable,
      cafe24: providerConfig,
    },
    ...(agent.id
      ? {}
      : {
          lab_overrides: {
            llm: agent.llm,
            kb_id: agent.kb_id,
            mcp_tool_ids: agent.mcp_tool_ids ?? [],
          },
        }),
  };

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
    await context.supabase.from("D_conv_sessions").update({ bot_context: botContext }).eq("id", sessionId);
  } else {
    await context.supabase.from("D_conv_sessions").update({ bot_context: botContext }).eq("id", sessionId);
  }

  const lastTurnRes = await getLastTurn(context, sessionId);
  const lastTurn = lastTurnRes.data as any;
  const nextSeq = lastTurn?.seq ? Number(lastTurn.seq) + 1 : 1;
  const recentTurnsRes = await getRecentTurns(context, sessionId);
  const recentTurns = (recentTurnsRes.data as any[]) || [];
  const derived = deriveContext(recentTurns, message);
  let derivedOrderId = derived.orderId;
  const derivedAddress = derived.address;
  const derivedPhone = derived.phone;
  const derivedChannel = derived.channel;
  const derivedIntent = derived.intent;
  const repeatCount = recentTurns.filter((turn) =>
    isRepeatRequest(turn?.transcript_text || "", message)
  ).length;
  const lastVerified = [...recentTurns].reverse().find((turn) => turn?.bot_context?.customer_verified);
  const customerVerified = Boolean(lastVerified?.bot_context?.customer_verified);
  const customerRef = lastVerified?.bot_context?.customer_ref || null;
  const lastVerifiedToken = [...recentTurns].reverse().find((turn) => turn?.bot_context?.customer_verification_token);
  const customerVerificationToken = lastVerifiedToken?.bot_context?.customer_verification_token || null;
  let runtimeBotContext: Record<string, unknown> = {
    ...botContext,
    customer_verified: customerVerified,
    customer_ref: customerRef,
    customer_verification_token: customerVerificationToken,
    intent_name: derivedIntent,
  };

  const hasPendingConfirm =
    mode === "guided" && lastTurn && lastTurn.confirm_prompt && lastTurn.confirmation_response === null && !lastTurn.final_answer;
  const expectedSlot = inferExpectedSlot(lastTurn?.confirm_prompt);

  let policyContext: PolicyEvalContext = {
    input: { text: message },
    intent: { name: derivedIntent },
    entity: {
      order_id: expectedSlot === "order_id" ? derivedOrderId : null,
      address: expectedSlot === "address" ? derivedAddress : null,
      phone: expectedSlot === "phone" ? derivedPhone : null,
      channel: derivedChannel,
    },
    user: { confirmed: Boolean(lastTurn?.user_confirmed) },
    conversation: { repeat_count: repeatCount, flags: {} },
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
  const executedTools: string[] = [];
  const usedProviders: string[] = [];
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
  };
  let lastDebugPrefixJson: Record<string, unknown> | null = null;
  const makeReply = (text: string, llmModel?: string | null, mcpTools?: string[]) => {
    const debugPayload = {
      llmModel: llmModel || null,
      mcpTools: mcpTools || executedTools,
      mcpProviders: usedProviders,
      mcpLastFunction: lastMcpFunction,
      mcpLastStatus: lastMcpStatus,
      mcpLastError: lastMcpError,
      mcpLastCount: lastMcpCount,
      providerConfig: usedProviders.includes("cafe24") ? providerConfig : {},
      providerAvailable,
      authSettingsId: authSettings?.id || null,
      userId: context.user.id,
      orgId: userOrgId || context.orgId,
      userPlan,
      userIsAdmin,
      userRole,
      kbUserId: kb.id,
      kbAdminIds: adminKbs.map((item) => item.id),
      usedRuleIds,
      usedTemplateIds,
      usedToolPolicies,
      conversationMode: mode,
    };
    lastDebugPrefixJson = { entries: buildDebugEntries(debugPayload) };
    return text;
  };
  const insertTurn = async (payload: Record<string, unknown>) => {
    if (!lastDebugPrefixJson) {
      const debugPayload = {
        llmModel: null,
        mcpTools: executedTools,
        mcpProviders: usedProviders,
        mcpLastFunction: lastMcpFunction,
        mcpLastStatus: lastMcpStatus,
        mcpLastError: lastMcpError,
        mcpLastCount: lastMcpCount,
        providerConfig: usedProviders.includes("cafe24") ? providerConfig : {},
        providerAvailable,
        authSettingsId: authSettings?.id || null,
        userId: context.user.id,
        orgId: userOrgId || context.orgId,
        userPlan,
        userIsAdmin,
        userRole,
        kbUserId: kb.id,
        kbAdminIds: adminKbs.map((item) => item.id),
        usedRuleIds,
        usedTemplateIds,
        usedToolPolicies,
        conversationMode: mode,
      };
      lastDebugPrefixJson = { entries: buildDebugEntries(debugPayload) };
    }
    const result = await insertFinalTurn(context, payload, lastDebugPrefixJson);
    latestTurnId = result.data?.id || null;
    return result;
  };
  if (inputGate.actions.forcedResponse) {
    const reply = makeReply(inputGate.actions.forcedResponse);
    await insertFinalTurn(context, {
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        ...botContext,
        policy_matched: inputGate.matched.map((rule) => rule.id),
      },
    }, lastDebugPrefixJson);
    await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "input", matched: inputGate.matched.map((r) => r.id) }, botContext);
    return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
  }

  let otpVerifiedThisTurn = false;
  if (hasPendingConfirm) {
    const pendingOtp = Boolean(lastTurn?.bot_context?.otp_pending);
    if (pendingOtp) {
      const otpStage = String(lastTurn?.bot_context?.otp_stage || "awaiting_code");
      const otpDestination = String(lastTurn?.bot_context?.otp_destination || "").trim();
      const otpRef = String(lastTurn?.bot_context?.otp_ref || "").trim();
      const otpCode = extractOtpCode(message);
      if (otpStage === "awaiting_phone") {
        const phone = extractPhone(message);
        if (!phone) {
          const prompt = "주문 조회/변경을 위해 본인인증이 필요합니다. 휴대폰 번호를 알려주세요.";
          await insertTurn({
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            summary_text: message,
            confirm_prompt: prompt,
            bot_context: {
              ...runtimeBotContext,
              otp_pending: true,
              otp_stage: "awaiting_phone",
            },
          });
          await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
          return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
        }
        if (!allowedToolNames.has("send_otp")) {
          const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
          await insertFinalTurn(context, {
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            answer_text: reply,
            final_answer: reply,
            bot_context: runtimeBotContext,
          }, lastDebugPrefixJson);
          await insertEvent(context, sessionId, latestTurnId, "FINAL_ANSWER_READY", { answer: reply }, botContext);
          return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
        }
        const sendResult = await callMcpTool(
          context,
          "send_otp",
          { destination: phone },
          sessionId,
          latestTurnId,
          botContext,
          allowedToolNames
        );
        if (!sendResult.ok) {
          const reply = makeReply("인증번호 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
          await insertFinalTurn(context, {
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            answer_text: reply,
            final_answer: reply,
            bot_context: runtimeBotContext,
          }, lastDebugPrefixJson);
          await insertEvent(context, sessionId, latestTurnId, "FINAL_ANSWER_READY", { answer: reply }, botContext);
          return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
        }
        const otpRefValue = String((sendResult.data as any)?.otp_ref || "").trim();
        const prompt = "문자로 전송된 인증번호를 입력해 주세요.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: {
            ...runtimeBotContext,
            otp_pending: true,
            otp_stage: "awaiting_code",
            otp_destination: phone,
            otp_ref: otpRefValue || null,
          },
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
      if (!otpCode) {
        const prompt = "인증번호를 다시 입력해 주세요.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: {
            ...runtimeBotContext,
            otp_pending: true,
            otp_stage: "awaiting_code",
            otp_destination: otpDestination || null,
            otp_ref: otpRef || null,
          },
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
      if (!allowedToolNames.has("verify_otp")) {
        const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        await insertFinalTurn(context, {
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: runtimeBotContext,
        }, lastDebugPrefixJson);
        await insertEvent(context, sessionId, latestTurnId, "FINAL_ANSWER_READY", { answer: reply }, botContext);
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
      }
      const verifyResult = await callMcpTool(
        context,
        "verify_otp",
        { code: otpCode, otp_ref: otpRef || undefined },
        sessionId,
        latestTurnId,
        botContext,
        allowedToolNames
      );
      if (!verifyResult.ok) {
        const prompt = "인증번호가 올바르지 않습니다. 다시 입력해 주세요.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: {
            ...runtimeBotContext,
            otp_pending: true,
            otp_stage: "awaiting_code",
            otp_destination: otpDestination || null,
            otp_ref: otpRef || null,
          },
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
      const verificationToken = String((verifyResult.data as any)?.customer_verification_token || "").trim();
      runtimeBotContext = {
        ...runtimeBotContext,
        customer_verified: true,
        customer_verification_token: verificationToken || null,
      };
      await context.supabase.from("D_conv_turns").update({
        confirmation_response: message,
        user_confirmed: true,
        correction_text: message,
        bot_context: {
          ...(lastTurn?.bot_context || {}),
          ...runtimeBotContext,
          otp_pending: false,
          otp_stage: null,
        },
      }).eq("id", lastTurn.id);
      otpVerifiedThisTurn = true;
    }
  }

  if (hasPendingConfirm && !otpVerifiedThisTurn) {
    const slotPhone = extractPhone(message);
    const slotAddress = extractAddress(message);
    const slotOrder = extractOrderId(message);
    const choiceIndex =
      expectedSlot === "order_id"
        ? extractChoiceIndex(message, Array.isArray(lastTurn?.bot_context?.order_choices) ? lastTurn?.bot_context?.order_choices.length : 0)
        : null;
    const slotConfirmed =
      expectedSlot === "phone"
        ? Boolean(slotPhone)
        : expectedSlot === "address"
          ? Boolean(slotAddress)
          : expectedSlot === "order_id"
            ? Boolean(slotOrder || choiceIndex)
            : false;
    const confirmed = isYes(message) || isOrderOnlyMessage(message) || slotConfirmed;
    const pendingVerification = Boolean(lastTurn?.bot_context?.pending_verification);
    const entityCandidates = [
      message,
      lastTurn?.summary_text || "",
      lastTurn?.transcript_text || "",
      lastTurn?.correction_text || "",
    ].filter(Boolean);
    const extractedEntities = {
      order_id: null as string | null,
      phone:
        (expectedSlot === "phone" ? slotPhone : null) ||
        extractPhone(entityCandidates.join(" ")) ||
        lastTurn?.bot_context?.extracted_entities?.phone ||
        null,
      address:
        (expectedSlot === "address" ? slotAddress : null) ||
        extractAddress(entityCandidates.join(" ")) ||
        lastTurn?.bot_context?.extracted_entities?.address ||
        null,
      channel:
        extractChannel(entityCandidates.join(" ")) ||
        lastTurn?.bot_context?.extracted_entities?.channel ||
        null,
    };
    if (expectedSlot === "order_id") {
      const choices = Array.isArray(lastTurn?.bot_context?.order_choices)
        ? lastTurn?.bot_context?.order_choices
        : [];
      const idx = extractChoiceIndex(message, choices.length);
      if (idx) {
        const selected = choices[idx - 1];
        extractedEntities.order_id = selected?.order_id || null;
      } else {
        extractedEntities.order_id = slotOrder;
      }
    } else {
      extractedEntities.order_id =
        extractOrderId(entityCandidates.join(" ")) ||
        lastTurn?.bot_context?.extracted_entities?.order_id ||
        null;
    }
    const confirmUpdate = {
      confirmation_response: message,
      user_confirmed: confirmed,
      correction_text: confirmed ? message : message,
      bot_context: {
        ...(lastTurn?.bot_context || {}),
        ...runtimeBotContext,
        extracted_entities: extractedEntities,
        pending_verification: pendingVerification ? true : undefined,
      },
    };
    await context.supabase.from("D_conv_turns").update(confirmUpdate).eq("id", lastTurn.id);

    if (pendingVerification && confirmed) {
      usedProviders.push(toolProviderMap.find_customer_by_phone);
      executedTools.push("find_customer_by_phone");
      lastMcpFunction = "find_customer_by_phone";
      const verify = await callMcpTool(
        context,
        "find_customer_by_phone",
        { cellphone: extractPhone(message) || message },
        sessionId,
        latestTurnId,
        botContext,
        allowedToolNames
      );
      lastMcpStatus = verify.ok ? "success" : "error";
      lastMcpError = verify.ok ? null : String(verify.error || "MCP_ERROR");
      const customers = verify.ok ? readCustomerList(verify.data) : [];
      lastMcpCount = customers.length;
      if (verify.ok && customers.length === 0) {
        lastMcpStatus = "success_empty";
        lastMcpError = "NO_CUSTOMER";
      }
      if (verify.ok && customers.length > 0) {
        const picked = customers[0] as Record<string, unknown>;
        runtimeBotContext = {
          ...runtimeBotContext,
          customer_verified: true,
          customer_ref: {
            customer_no: picked.customer_no || picked.customer_id || null,
            member_id: picked.member_id || null,
            name: picked.name || picked.customer_name || null,
            cellphone: picked.cellphone || picked.mobile || null,
          },
        };
        await context.supabase.from("D_conv_turns").update({
          bot_context: {
            ...(lastTurn?.bot_context || {}),
            ...botContext,
            extracted_entities: extractedEntities,
            pending_verification: false,
            customer_verified: true,
            customer_ref: runtimeBotContext.customer_ref,
          },
        }).eq("id", lastTurn.id);
        const customerRef = runtimeBotContext.customer_ref as
          | { name?: string | null; member_id?: string | null }
          | null
          | undefined;
        const name = customerRef?.name || "-";
        const memberId = customerRef?.member_id || "-";
        const prompt = `확인된 고객 정보입니다. 이름: ${name}, 아이디: ${memberId}. 본인이 맞으신가요?`;
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: {
            ...runtimeBotContext,
            identity_pending: true,
          },
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      } else {
        const prompt = "일치하는 고객이 없습니다. 가입하신 휴대폰 번호를 다시 알려주세요.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: {
            ...runtimeBotContext,
            pending_verification: true,
            customer_verified: false,
          },
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
    }

    if (pendingVerification && expectedSlot === "phone" && !slotPhone) {
      const prompt = "가입하신 휴대폰 번호를 알려주시면 확인 후 도와드리겠습니다.";
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        summary_text: message,
        confirm_prompt: prompt,
        bot_context: {
          ...runtimeBotContext,
          pending_verification: true,
          customer_verified: false,
        },
      });
      await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
      return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
    }

    if (expectedSlot === "identity" && confirmed) {
      const intentName = derivedIntent === "general" ? String(lastTurn?.bot_context?.intent_name || "general") : derivedIntent;
      if (intentName === "shipment" || intentName === "order_lookup") {
        const prompt = "주문 조회를 위해 주문번호를 알려주세요.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: runtimeBotContext,
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
      if (intentName === "change") {
        const customerRef = runtimeBotContext.customer_ref as
          | { member_id?: string | null; cellphone?: string | null }
          | null
          | undefined;
        const start = new Date();
        const end = new Date();
        start.setDate(end.getDate() - 30);
        const toDate = (d: Date) => d.toISOString().slice(0, 10);
        const list = await callMcpTool(
          context,
          "list_orders",
          {
            start_date: toDate(start),
            end_date: toDate(end),
            limit: 5,
            member_id: customerRef?.member_id || undefined,
            cellphone: customerRef?.cellphone || undefined,
          },
          sessionId,
          latestTurnId,
          botContext,
          allowedToolNames
        );
        lastMcpFunction = "list_orders";
        lastMcpStatus = list.ok ? "success" : "error";
        lastMcpError = list.ok ? null : String(list.error || "MCP_ERROR");
        usedProviders.push(toolProviderMap.list_orders);
        executedTools.push("list_orders");
        let orders = list.ok ? ((list.data as any)?.orders || (list.data as any)?.orders?.order || []) : [];
        const memberId = customerRef?.member_id;
        if (memberId && Array.isArray(orders)) {
          orders = orders.filter((o: any) => !o.member_id || o.member_id === memberId);
        }
        const items = Array.isArray(orders) ? orders : [];
        lastMcpCount = items.length;
        if (items.length > 0) {
          const slice = items.slice(0, 5);
          const detailMap = new Map<string, { name: string; option: string; qty: string }>();
          for (const item of slice) {
            const id = item.order_id || item.order_no || "";
            if (!id) continue;
            const detail = await callMcpTool(
              context,
              "lookup_order",
              { order_id: id },
              sessionId,
              latestTurnId,
              botContext,
              allowedToolNames
            );
            executedTools.push("lookup_order");
            usedProviders.push(toolProviderMap.lookup_order);
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
              detailMap.set(id, { name: String(name), option: String(option), qty: String(qty) });
            }
          }
          const choices = slice.map((o: any, i: number) => {
            const id = o.order_id || o.order_no || "";
            const date = o.order_date || "";
            const detail = detailMap.get(id) || { name: "-", option: "-", qty: "-" };
            return {
              index: i + 1,
              order_id: id,
              label: `- ${i + 1}번 | ${date} | ${detail.name} | ${detail.option} | ${detail.qty}`,
            };
          });
          const prompt = `확인된 주문입니다. 변경하실 주문을 번호로 선택해 주세요.\n(번호 | 날짜 | 상품명 | 옵션 | 수량)\n${choices.map((c) => c.label).join("\n")}`;
          await insertTurn({
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            summary_text: message,
            confirm_prompt: prompt,
            bot_context: {
              ...runtimeBotContext,
              order_choices: choices.map((c) => ({ index: c.index, order_id: c.order_id })),
            },
          });
          await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
          return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
        }
        const prompt = "최근 주문 내역을 찾지 못했습니다. 주문번호를 알려주시면 확인 후 도와드리겠습니다.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: runtimeBotContext,
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
    }

    if (expectedSlot === "identity" && !confirmed) {
      const prompt = "가입하신 휴대폰 번호를 다시 알려주세요.";
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        summary_text: message,
        confirm_prompt: prompt,
        bot_context: {
          ...runtimeBotContext,
          pending_verification: true,
          customer_verified: false,
        },
      });
      await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
      return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
    }

    if (expectedSlot === "phone" && confirmed) {
      const intentName = derivedIntent === "general" ? String(lastTurn?.bot_context?.intent_name || "general") : derivedIntent;
      if (intentName === "shipment" || intentName === "order_lookup") {
        const prompt = "주문 조회를 위해 주문번호를 알려주세요.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: runtimeBotContext,
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
      if (intentName === "change" && !derivedAddress) {
        const prompt = "변경하실 새 배송지 주소를 알려주세요.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: runtimeBotContext,
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
    }

    if (expectedSlot === "order_id" && confirmed) {
      const intentName = derivedIntent === "general" ? String(lastTurn?.bot_context?.intent_name || "general") : derivedIntent;
      if (intentName === "change" && !derivedAddress) {
        const prompt = "변경하실 새 배송지 주소를 알려주세요.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: runtimeBotContext,
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
    }

    if (!confirmed) {
      const autoProceed =
        extractOrderId(message) ||
        isRepeatRequest(lastTurn?.transcript_text, message);
      if (autoProceed) {
        const confirmUpdateAuto = {
          confirmation_response: message,
          user_confirmed: true,
          correction_text: message,
          bot_context: {
            ...(lastTurn?.bot_context || {}),
            ...runtimeBotContext,
            extracted_entities: extractedEntities,
          },
        };
        await context.supabase.from("D_conv_turns").update(confirmUpdateAuto).eq("id", lastTurn.id);
      } else {
      const summaryPrompt = `아래 고객 정정 내용을 반영해 요약과 확인 질문을 만들어 주세요.
- 요약: 한 문장, 자연스러운 한국어, 숫자/목록/고객 단어 금지
- 확인질문: 한 문장, 자연스러운 한국어, 숫자/목록/고객 단어 금지
형식:
요약: ...
확인질문: ...`;
      const summaryRes = await runLlm(
        agent.llm,
        summaryPrompt,
        `기존 요약: ${lastTurn?.summary_text || lastTurn?.transcript_text || ""}
고객 정정: ${message}`
      );
      const [summaryLine, confirmLine] = summaryRes.text.split("\n").filter(Boolean);
      const rawSummary = summaryLine?.replace("요약:", "").trim() || message;
      const summaryText = sanitizeSummary(rawSummary, message);
      const orderId = extractOrderId(lastTurn?.transcript_text || "");
      const address = extractAddress(message);
      const fallbackConfirm = orderId && address
        ? `주문번호 ${orderId}의 배송 주소를 ${address}로 변경해 드리면 되나요?`
        : "정리한 내용이 맞나요?";
      const confirmPrompt = sanitizeConfirmPrompt(
        confirmLine?.replace("확인질문:", "").trim() || "",
        fallbackConfirm
      );

      const { data: turnRow } = await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        summary_text: summaryText,
        confirm_prompt: confirmPrompt,
        bot_context: botContext,
      });

      await insertEvent(context, sessionId, latestTurnId, "SUMMARY_GENERATED", { summary: summaryText, seq: nextSeq }, botContext);
      await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: confirmPrompt, seq: nextSeq }, botContext);

        return respond({
        session_id: sessionId,
        step: "confirm",
        message: makeReply(confirmPrompt, summaryRes.model),
        turn_id: turnRow?.id || null,
        });
      }
    }
  }

  if (isAbusive(message) && compiledPolicy.rules.length === 0) {
    const reply = makeReply("불편을 드려 죄송합니다. 주문번호나 휴대폰 번호를 알려주시면 바로 확인해 도와드리겠습니다.");
    await insertFinalTurn(context, {
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: botContext,
    }, lastDebugPrefixJson);
    return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
  }

  if (!hasPendingConfirm && mode === "guided") {
    if (!customerVerified && derivedIntent !== "general") {
      if (!derivedPhone) {
        const prompt = "가입하신 휴대폰 번호를 알려주시면 확인 후 도와드리겠습니다.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: {
            ...runtimeBotContext,
            pending_verification: true,
            customer_verified: false,
          },
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
      const verify = await callMcpTool(
        context,
        "find_customer_by_phone",
        { cellphone: derivedPhone },
        sessionId,
        latestTurnId,
        botContext,
        allowedToolNames
      );
      lastMcpFunction = "find_customer_by_phone";
      lastMcpStatus = verify.ok ? "success" : "error";
      lastMcpError = verify.ok ? null : String(verify.error || "MCP_ERROR");
      usedProviders.push(toolProviderMap.find_customer_by_phone);
      executedTools.push("find_customer_by_phone");
      const customers = verify.ok ? readCustomerList(verify.data) : [];
      lastMcpCount = customers.length;
      if (verify.ok && customers.length === 0) {
        lastMcpStatus = "success_empty";
        lastMcpError = "NO_CUSTOMER";
      }
      if (verify.ok && customers.length > 0) {
        const picked = customers[0] as Record<string, unknown>;
        runtimeBotContext = {
          ...runtimeBotContext,
          customer_verified: true,
          customer_ref: {
            customer_no: picked.customer_no || picked.customer_id || null,
            member_id: picked.member_id || null,
            name: picked.name || picked.customer_name || null,
            cellphone: picked.cellphone || picked.mobile || null,
          },
        };
      } else {
        const prompt = "일치하는 고객이 없습니다. 가입하신 휴대폰 번호를 다시 알려주세요.";
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        summary_text: message,
        confirm_prompt: prompt,
        bot_context: {
          ...runtimeBotContext,
          pending_verification: true,
          customer_verified: false,
        },
      });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
    }
    if (!derivedOrderId && !derivedPhone && derivedIntent !== "general") {
      const prompt = "주문번호 또는 휴대폰 번호를 알려주시면 확인 후 도와드리겠습니다.";
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        summary_text: message,
        confirm_prompt: prompt,
        bot_context: runtimeBotContext,
      });
      await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
      return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
    }

    if (derivedOrderId && derivedIntent === "change" && !derivedAddress) {
      const prompt = `주문번호 ${derivedOrderId}의 배송지 변경을 위해 새 주소를 알려 주세요.`;
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        summary_text: message,
        confirm_prompt: prompt,
        bot_context: runtimeBotContext,
      });
      await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
      return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
    }

    if (!derivedOrderId && derivedPhone) {
      const start = new Date();
      const end = new Date();
      start.setDate(end.getDate() - 30);
      const toDate = (d: Date) => d.toISOString().slice(0, 10);
      const list = await callMcpTool(
        context,
        "list_orders",
        { start_date: toDate(start), end_date: toDate(end), limit: 5 },
        sessionId,
        latestTurnId,
        botContext,
        allowedToolNames
      );
      lastMcpCount = list.ok ? ((list.data as any)?.orders?.length ?? (list.data as any)?.orders?.order?.length ?? 0) : null;
      lastMcpFunction = "list_orders";
      lastMcpStatus = list.ok ? "success" : "error";
      lastMcpError = list.ok ? null : String(list.error || "MCP_ERROR");
      usedProviders.push(toolProviderMap.list_orders);
      executedTools.push("list_orders");
      if (list.ok) {
        const orders = (list.data as any)?.orders || (list.data as any)?.orders?.order || [];
        const items = Array.isArray(orders) ? orders : [];
        if (items.length > 0) {
          if (items.length === 1) {
            const onlyId = String(items[0]?.order_id || items[0]?.order_no || "").trim();
            if (onlyId) {
              derivedOrderId = onlyId;
              const existingEntities = (runtimeBotContext.extracted_entities || {}) as Record<string, unknown>;
              runtimeBotContext = {
                ...runtimeBotContext,
                extracted_entities: { ...existingEntities, order_id: onlyId },
              };
            }
          }
          if (items.length > 1 || !derivedOrderId) {
          const lines = items.slice(0, 3).map((o: any) => {
            const id = o.order_id || o.order_no || "";
            const date = o.order_date || "";
            const name = o.first_product_name || o.product_name || "";
            return `- ${id} ${date} ${name}`.trim();
          });
          const prompt = `확인된 주문입니다. 원하시는 주문번호를 알려 주세요.\n${lines.join("\n")}`;
          await insertTurn({
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            summary_text: message,
            confirm_prompt: prompt,
            bot_context: runtimeBotContext,
          });
          await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
          return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
          }
        }
      }
    }

    if (derivedOrderId && derivedAddress && derivedIntent === "change") {
      if (!runtimeBotContext.customer_verification_token) {
        const prompt = "주문 조회/변경을 위해 본인인증이 필요합니다. 휴대폰 번호를 알려주세요.";
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          summary_text: message,
          confirm_prompt: prompt,
          bot_context: {
            ...runtimeBotContext,
            otp_pending: true,
            otp_stage: "awaiting_phone",
            customer_verified: false,
          },
        });
        await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
        return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
      }
      const prompt = `주문번호 ${derivedOrderId}의 배송지를 ${derivedAddress}로 변경해 드리면 되나요?`;
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        summary_text: message,
        confirm_prompt: prompt,
        bot_context: runtimeBotContext,
      });
      await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
      return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
    }

    const summaryPrompt = `아래 고객 발화를 요약하고 확인 질문을 만들어 주세요.
- 요약: 한 문장, 자연스러운 한국어, 숫자/목록/고객 단어 금지
- 확인질문: 한 문장, 자연스러운 한국어, 숫자/목록/고객 단어 금지
형식:
요약: ...
확인질문: ...`;
    const summaryRes = await runLlm(agent.llm, summaryPrompt, message);
    const [summaryLine, confirmLine] = summaryRes.text.split("\n").filter(Boolean);
    const rawSummary = summaryLine?.replace("요약:", "").trim() || message;
    const summaryText = sanitizeSummary(rawSummary, message);
    const orderId = extractOrderId(message);
    const address = extractAddress(message);
    const fallbackConfirm = orderId && address
      ? `주문번호 ${orderId}의 배송 주소를 ${address}로 변경해 드리면 되나요?`
      : "정리한 내용이 맞나요?";
    const confirmPrompt = sanitizeConfirmPrompt(
      confirmLine?.replace("확인질문:", "").trim() || "",
      fallbackConfirm
    );

    const { data: turnRow } = await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      summary_text: summaryText,
      confirm_prompt: confirmPrompt,
      bot_context: runtimeBotContext,
    });

    await insertEvent(context, sessionId, latestTurnId, "SUMMARY_GENERATED", { summary: summaryText, seq: nextSeq }, botContext);
    await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: confirmPrompt, seq: nextSeq }, botContext);

    return respond({
      session_id: sessionId,
      step: "confirm",
      message: makeReply(confirmPrompt, summaryRes.model),
      turn_id: turnRow?.id || null,
    });
  }

  const questionText = hasPendingConfirm
    ? String(lastTurn?.summary_text || lastTurn?.transcript_text || message)
    : message;
  const productDecisionRes = await resolveProductDecision(context, questionText);
  if (productDecisionRes.alias || productDecisionRes.decision) {
    runtimeBotContext = {
      ...runtimeBotContext,
      product_alias: productDecisionRes.alias
        ? {
            product_id: productDecisionRes.alias.product_id,
            alias: productDecisionRes.alias.alias,
            match_type: productDecisionRes.alias.match_type,
          }
        : null,
      product_decision: productDecisionRes.decision || null,
    };
  }
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
  if (productDecisionRes.decision) {
    const decision = productDecisionRes.decision;
    const needsRestock = isRestockQuestion(questionText);
    const shouldForce =
      decision.answerability === "DENY" ||
      decision.answerability === "UNKNOWN" ||
      (needsRestock && decision.restock_policy === "UNKNOWN");
    if (shouldForce) {
      const forcedText =
        decision.answerability === "DENY"
          ? "해당 상품은 안내할 수 없습니다."
          : "해당 상품의 재입고 정보를 확인할 수 없습니다. 담당자 확인 후 안내드리겠습니다.";
      const reply = makeReply(forcedText);
      await insertFinalTurn(context, {
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...runtimeBotContext,
          decision_forced: true,
        },
      }, lastDebugPrefixJson);
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "PRODUCT_DECISION_FORCED",
        { decision, needs_restock: needsRestock },
        botContext
      );
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
    }
  }
  const productDecisionJson = productDecisionRes.decision ? JSON.stringify(productDecisionRes.decision) : "null";
  const orderIdCandidate = derivedOrderId || extractOrderId(questionText);
  const otpPending = Boolean(lastTurn?.bot_context?.otp_pending);
  if (orderIdCandidate && !runtimeBotContext.customer_verification_token && !otpVerifiedThisTurn && !otpPending) {
    const otpDestination =
      derivedPhone ||
      (runtimeBotContext.customer_ref as { cellphone?: string } | null)?.cellphone ||
      String(lastTurn?.bot_context?.otp_destination || "");
    if (!otpDestination) {
      const prompt = "주문 조회/변경을 위해 본인인증이 필요합니다. 휴대폰 번호를 알려주세요.";
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        summary_text: message,
        confirm_prompt: prompt,
        bot_context: {
          ...runtimeBotContext,
          otp_pending: true,
          otp_stage: "awaiting_phone",
        },
      });
      await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
      return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
    }
    if (!allowedToolNames.has("send_otp")) {
      const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      await insertFinalTurn(context, {
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: runtimeBotContext,
      }, lastDebugPrefixJson);
      await insertEvent(context, sessionId, latestTurnId, "FINAL_ANSWER_READY", { answer: reply }, botContext);
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
    }
    const sendResult = await callMcpTool(
      context,
      "send_otp",
      { destination: otpDestination },
      sessionId,
      latestTurnId,
      botContext,
      allowedToolNames
    );
    if (!sendResult.ok) {
      const reply = makeReply("인증번호 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      await insertFinalTurn(context, {
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: runtimeBotContext,
      }, lastDebugPrefixJson);
      await insertEvent(context, sessionId, latestTurnId, "FINAL_ANSWER_READY", { answer: reply }, botContext);
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
    }
    const otpRefValue = String((sendResult.data as any)?.otp_ref || "").trim();
    const prompt = "문자로 전송된 인증번호를 입력해 주세요.";
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      summary_text: message,
      confirm_prompt: prompt,
      bot_context: {
        ...runtimeBotContext,
        otp_pending: true,
        otp_stage: "awaiting_code",
        otp_destination: otpDestination,
        otp_ref: otpRefValue || null,
      },
    });
    await insertEvent(context, sessionId, latestTurnId, "CONFIRMATION_REQUESTED", { confirm_prompt: prompt, seq: nextSeq }, botContext);
    return respond({ session_id: sessionId, step: "confirm", message: makeReply(prompt), turn_id: null });
  }
  const orderId = runtimeBotContext.customer_verification_token ? orderIdCandidate : null;
  let mcpSummary = "";
  const mcpActions: string[] = [];
  const candidateCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  if (orderId) {
    const verificationToken = runtimeBotContext.customer_verification_token as string | null;
    candidateCalls.push({
      name: "lookup_order",
      args: { order_id: orderId, customer_verification_token: verificationToken || undefined },
    });
    if (needsShipmentAction(questionText)) {
      candidateCalls.push({ name: "track_shipment", args: { order_id: orderId } });
    }
    if (derivedIntent === "change" && derivedAddress) {
      if (allowedToolNames.has("update_order_shipping_address")) {
        const { zipcode, address1, address2 } = parseAddressParts(derivedAddress);
        const updatePayload: Record<string, unknown> = {
          order_id: orderId,
        };
        if (verificationToken) updatePayload.customer_verification_token = verificationToken;
        if (zipcode) updatePayload.zipcode = zipcode;
        if (address1) updatePayload.address1 = address1;
        if (address2) updatePayload.address2 = address2;
        if (!updatePayload.address1 && derivedAddress) {
          updatePayload.address_full = derivedAddress;
        }
        candidateCalls.push({
          name: "update_order_shipping_address",
          args: updatePayload,
        });
      } else {
        candidateCalls.push({
          name: "create_ticket",
          args: {
            title: `배송지 변경 요청 - ${orderId}`,
            summary: `배송지 변경 요청 - ${orderId}`,
            content: `배송지 변경 요청: ${derivedAddress}\n주문번호: ${orderId}`,
          },
        });
      }
    } else if (needsTicketAction(questionText)) {
      candidateCalls.push({
        name: "create_ticket",
        args: { title: `주문 ${orderId} 문의`, summary: `주문 ${orderId} 문의`, content: questionText },
      });
    }
  }

  const toolGate = runPolicyStage(compiledPolicy, "tool", policyContext);
  usedRuleIds.push(...toolGate.matched.map((rule) => rule.id));
  usedTemplateIds.push(...extractTemplateIds(toolGate.matched as any[]));
  const denied = new Set(toolGate.actions.denyTools || []);
  const allowed = new Set(toolGate.actions.allowTools || []);
  const forcedCalls = toolGate.actions.forcedToolCalls || [];
  let finalCalls = [...candidateCalls, ...forcedCalls].filter((call) => {
    if (denied.has("*") || denied.has(call.name)) return false;
    if (allowed.size > 0 && !allowed.has(call.name)) return false;
    return true;
  });

  finalCalls = finalCalls.filter((call) => {
    if (compiledPolicy.toolPolicies[call.name]) {
      usedToolPolicies.push(call.name);
    }
    if (call.name === "create_ticket" && !call.args.summary) {
      const title = String(call.args.title || "");
      const content = String(call.args.content || "");
      call.args.summary = title || content || "문의 접수";
    }
    if ((call.name === "lookup_order" || call.name === "update_order_shipping_address") && runtimeBotContext.customer_verification_token) {
      call.args.customer_verification_token = runtimeBotContext.customer_verification_token;
    }
    const validation = validateToolArgs(call.name, call.args, compiledPolicy);
    return validation.ok;
  });

  if (toolGate.actions.forcedResponse) {
    const reply = makeReply(toolGate.actions.forcedResponse);
    await insertFinalTurn(context, {
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        ...botContext,
        policy_matched: toolGate.matched.map((rule) => rule.id),
      },
    }, lastDebugPrefixJson);
    await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "tool", matched: toolGate.matched.map((r) => r.id) }, botContext);
    return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
  }

  for (const call of finalCalls) {
    if (!allowedToolNames.has(call.name)) continue;
    executedTools.push(call.name);
    if (toolProviderMap[call.name]) {
      usedProviders.push(toolProviderMap[call.name]);
    }
    lastMcpFunction = call.name;
    const result = await callMcpTool(
      context,
      call.name,
      call.args,
      sessionId,
      latestTurnId,
      botContext,
      allowedToolNames
    );
    if (result.ok) {
      if (call.name === "lookup_order") lastMcpCount = (result.data as any)?.order ? 1 : 0;
      if (call.name === "track_shipment") {
        const shipments = (result.data as any)?.shipments || (result.data as any)?.shipments?.shipment || [];
        lastMcpCount = Array.isArray(shipments) ? shipments.length : 0;
      }
      if (call.name === "update_order_shipping_address") lastMcpCount = 1;
      if (call.name === "create_ticket") lastMcpCount = 1;
    } else {
      lastMcpCount = null;
    }
    lastMcpStatus = result.ok ? "success" : "error";
    lastMcpError = result.ok ? null : String(result.error || "MCP_ERROR");
    if (call.name === "lookup_order") {
      if (result.ok) {
        const order = (result.data as any)?.order || {};
        const orderInfo = [
          order.order_id || order.order_no || orderId,
          order.order_date,
          order.order_summary?.total_amount_due,
          order.order_summary?.shipping_status,
        ].filter(Boolean).join(", ");
        mcpSummary += `주문 조회 성공 (${orderInfo || orderId}). `;
      } else {
        mcpSummary += `주문 조회 실패: ${result.error || "UNKNOWN"}. `;
        await insertEvent(context, sessionId, latestTurnId, "MCP_TOOL_FAILED", { tool: "lookup_order", error: result.error }, botContext);
      }
    }
    if (call.name === "track_shipment" && result.ok) {
      mcpActions.push("배송 조회");
    }
    if (call.name === "update_order_shipping_address") {
      if (result.ok) {
        mcpActions.push("배송지 변경");
        mcpSummary += `배송지 변경 성공 (${orderId}). `;
      } else {
        mcpActions.push("배송지 변경 실패");
        mcpSummary += `배송지 변경 실패: ${result.error || "UNKNOWN"}. `;
        await insertEvent(context, sessionId, latestTurnId, "MCP_TOOL_FAILED", { tool: "update_order_shipping_address", error: result.error }, botContext);
        if (allowedToolNames.has("create_ticket")) {
          const fallback = await callMcpTool(
            context,
            "create_ticket",
            {
              title: `배송지 변경 요청 - ${orderId}`,
              summary: `배송지 변경 요청 - ${orderId}`,
              content: `배송지 변경 요청: ${derivedAddress}\n주문번호: ${orderId}`,
            },
            sessionId,
            latestTurnId,
            botContext,
            allowedToolNames
          );
          if (fallback.ok) {
            mcpActions.push("배송지 변경 문의 티켓 생성");
          } else {
            mcpActions.push("배송지 변경 티켓 생성 실패");
            await insertEvent(context, sessionId, latestTurnId, "MCP_TOOL_FAILED", { tool: "create_ticket", error: fallback.error }, botContext);
          }
        }
      }
    }
    if (call.name === "create_ticket") {
      if (result.ok) {
        mcpActions.push(derivedIntent === "change" ? "배송지 변경 문의 티켓 생성" : "문의 티켓 생성");
      } else {
        mcpActions.push("문의 티켓 생성 실패");
      }
    }
  }

  if (mcpActions.includes("문의 티켓 생성 실패")) {
    const reply = makeReply("문의 티켓 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    await insertFinalTurn(context, {
      session_id: sessionId,
      seq: nextSeq + 1,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        ...runtimeBotContext,
        mcp_actions: mcpActions,
      },
    }, lastDebugPrefixJson);
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "FINAL_ANSWER_READY",
      { answer: reply },
      botContext
    );
    return respond({
      session_id: sessionId,
      step: "final",
      message: reply,
      mcp_actions: mcpActions,
    });
  }

  const systemPrompt = `당신은 고객 상담봇입니다.
규칙:
- KB에 있는 내용만 근거로 답합니다.
- KB에 없는 내용은 추측하지 않습니다.
- 주문 조치가 수행되면 사실대로 안내합니다.
답변 형식: 요약 -> 근거 -> 상세 -> 다음 액션`;

  const userPrompt = `고객 질문: ${questionText}
추출 정보:
- 주문번호: ${orderId || "없음"}
- 배송지: ${derivedAddress || "없음"}
- 휴대폰: ${derivedPhone || "없음"}
- 의도: ${derivedIntent}
- 상품판정: ${productDecisionJson}
관리자 공통 KB:
${adminKbText || "(없음)"}
KB 제목: ${kb.title}
KB 내용:
${kb.content || ""}
MCP 결과:
${mcpSummary}
조치:
${mcpActions.length ? mcpActions.join(", ") : "없음"}`;

  const answerRes = await runLlm(agent.llm, systemPrompt, userPrompt);
  let finalAnswer = answerRes.text.trim();

  const outputGate = runPolicyStage(compiledPolicy, "output", policyContext);
  usedRuleIds.push(...outputGate.matched.map((rule) => rule.id));
  usedTemplateIds.push(...extractTemplateIds(outputGate.matched as any[]));
  if (outputGate.actions.outputFormat) {
    finalAnswer = formatOutputDefault(finalAnswer);
  }
  if (outputGate.actions.forcedResponse) {
    finalAnswer = outputGate.actions.forcedResponse;
  }
  if (outputGate.matched.length > 0) {
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "POLICY_DECISION",
      { stage: "output", matched: outputGate.matched.map((rule) => rule.id) },
      botContext
    );
  }
  finalAnswer = makeReply(finalAnswer, answerRes.model, executedTools);

  await insertFinalTurn(context, {
    session_id: sessionId,
    seq: nextSeq + 1,
    answer_text: finalAnswer,
    final_answer: finalAnswer,
    kb_references: [
      {
        kb_id: kb.id,
        title: kb.title,
        version: kb.version,
      },
      ...adminKbs.map((adminKb) => ({
        kb_id: adminKb.id,
        title: adminKb.title,
        version: adminKb.version,
      })),
    ],
    bot_context: {
      ...runtimeBotContext,
      llm_model: answerRes.model,
      mcp_actions: mcpActions,
    },
  }, lastDebugPrefixJson);

  await insertEvent(
    context,
    sessionId,
    latestTurnId,
    "FINAL_ANSWER_READY",
    { answer: finalAnswer, model: answerRes.model },
    botContext
  );

    return respond({
      session_id: sessionId,
      step: "final",
      message: finalAnswer,
      mcp_actions: mcpActions,
    });
  } catch (err) {
    if (debugEnabled) {
      console.error("[playground/chat] unhandled error", err);
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












