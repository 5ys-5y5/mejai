import type { PrincipleBaseline } from "./principleBaseline";

export type RuntimeTurn = {
  id: string;
  session_id: string;
  seq: number | null;
  transcript_text: string | null;
  answer_text: string | null;
  final_answer: string | null;
  bot_context: Record<string, unknown> | null;
  created_at: string | null;
};

export type RuntimeEvent = {
  id: string;
  session_id: string | null;
  turn_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string | null;
};

export type PrincipleViolation = {
  violation_id: string;
  principle_key: string;
  runtime_scope: string;
  session_id: string;
  turn_id: string;
  severity: "medium" | "high";
  summary: string;
  evidence: Record<string, unknown>;
};

const PHONE_REGEX = /\b01[016789]-?\d{3,4}-?\d{4}\b/;
const ADDRESS_HINT_REGEX = /(주소|배송지|도로명|지번)/;
const ASK_PHONE_REGEX = /(휴대폰 번호|전화번호).*(알려|입력|적어)/;
const ASK_ADDRESS_REGEX = /(주소|배송지).*(알려|입력|적어)/;
const KOREAN_ADDRESS_REGEX = /(서울|경기|인천|부산|대구|광주|대전|울산|세종|제주|강원|충북|충남|전북|전남|경북|경남).*(구|군|시|동|읍|면|로|길)/;

function normalizeDigits(value: string) {
  return String(value || "").replace(/[^\d]/g, "");
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function looksLikeAddressText(value: string) {
  const text = String(value || "").trim();
  if (text.length < 6) return false;
  return KOREAN_ADDRESS_REGEX.test(text) || /\d{2,}-\d{1,}/.test(text);
}

function inferRuntimeScope(turn: RuntimeTurn) {
  const context = (turn.bot_context || {}) as Record<string, unknown>;
  const decision = (context._decision_turn || context._decision || {}) as Record<string, unknown>;
  const modulePath = String(decision.module_path || "").trim();
  if (modulePath.startsWith("src/app/api/runtime/restock/")) return "restock";
  if (modulePath.startsWith("src/app/api/runtime/chat/")) return "chat";
  return "unknown";
}

function readBotEntity(context: Record<string, unknown> | null) {
  const entity = (context?.entity || {}) as Record<string, unknown>;
  const phone = typeof entity.phone === "string" ? normalizeDigits(entity.phone) : "";
  const address = typeof entity.address === "string" ? String(entity.address).trim() : "";
  return { phone, address };
}

function createViolationId(sessionId: string, turnId: string, principleKey: string) {
  return `pv_${sessionId}_${turnId}_${principleKey}`.replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 128);
}

export function detectPrincipleViolations(input: {
  turns: RuntimeTurn[];
  eventsByTurnId: Map<string, RuntimeEvent[]>;
  baseline: PrincipleBaseline;
}): PrincipleViolation[] {
  const { turns, eventsByTurnId, baseline } = input;
  if (!baseline.memory.enforceNoRepeatQuestions) return [];
  const out: PrincipleViolation[] = [];
  const sorted = [...turns].sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));

  let knownPhones: string[] = [];
  let knownAddresses: string[] = [];
  for (const turn of sorted) {
    const userText = String(turn.transcript_text || "");
    const phoneInUser = (userText.match(PHONE_REGEX) || []).map((v) => normalizeDigits(v)).filter(Boolean);
    if (phoneInUser.length > 0) knownPhones = unique([...knownPhones, ...phoneInUser]);
    if ((ADDRESS_HINT_REGEX.test(userText) && userText.trim().length >= 6) || looksLikeAddressText(userText)) {
      knownAddresses = unique([...knownAddresses, userText.trim()]);
    }

    const botEntity = readBotEntity((turn.bot_context || null) as Record<string, unknown> | null);
    if (botEntity.phone) knownPhones = unique([...knownPhones, botEntity.phone]);
    if (botEntity.address) knownAddresses = unique([...knownAddresses, botEntity.address]);

    const answer = String(turn.final_answer || turn.answer_text || "");
    const turnEvents = eventsByTurnId.get(turn.id) || [];
    const slotExtracted = turnEvents.find((event) => String(event.event_type || "").toUpperCase() === "SLOT_EXTRACTED");
    const slotPayload = ((slotExtracted?.payload || {}) as Record<string, unknown>) || {};
    const slotResolved =
      slotPayload.resolved && typeof slotPayload.resolved === "object"
        ? (slotPayload.resolved as Record<string, unknown>)
        : {};
    const slotResolvedAddress = String(slotResolved.address || "").trim();
    if (slotResolvedAddress) knownAddresses = unique([...knownAddresses, slotResolvedAddress]);
    const mcpFailed = turnEvents.find((event) => String(event.event_type) === "MCP_TOOL_FAILED");
    const mcpFailurePayload = (mcpFailed?.payload || {}) as Record<string, unknown>;
    const mcpError = String(mcpFailurePayload.error || "");

    if (knownPhones.length > 0 && ASK_PHONE_REGEX.test(answer)) {
      const violationId = createViolationId(turn.session_id, turn.id, "memory.no_repeat_phone_question");
      out.push({
        violation_id: violationId,
        principle_key: "memory.enforceNoRepeatQuestions",
        runtime_scope: inferRuntimeScope(turn),
        session_id: turn.session_id,
        turn_id: turn.id,
        severity: mcpError ? "high" : "medium",
        summary: "Phone was already known but the bot asked for phone again.",
        evidence: {
          known_phone_count: knownPhones.length,
          known_phone_masked_tail: knownPhones.map((v) => `***${v.slice(-4)}`),
          answer,
          mcp_failed: Boolean(mcpFailed),
          mcp_error: mcpError || null,
          expected_reuse_order: baseline.memory.entityReuseOrder,
        },
      });
    }

    if (knownAddresses.length > 0 && ASK_ADDRESS_REGEX.test(answer)) {
      const violationId = createViolationId(sessionIdFor(turn), turn.id, "memory.no_repeat_address_question");
      out.push({
        violation_id: violationId,
        principle_key: "memory.enforceNoRepeatQuestions",
        runtime_scope: inferRuntimeScope(turn),
        session_id: turn.session_id,
        turn_id: turn.id,
        severity: "medium",
        summary: "Address was already known but the bot asked for address again.",
        evidence: {
          known_address_count: knownAddresses.length,
          answer,
          expected_reuse_order: baseline.memory.entityReuseOrder,
        },
      });
    }
  }
  return out;
}

function sessionIdFor(turn: RuntimeTurn) {
  return String(turn.session_id || "");
}
