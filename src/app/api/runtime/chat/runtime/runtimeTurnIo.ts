import { readGovernanceConfig } from "../../governance/_lib/config";
import {
  detectPrincipleViolations,
  type RuntimeEvent,
  type RuntimeDebugAudit,
  type RuntimeMcpAudit,
  type RuntimeTurn,
} from "../../governance/_lib/detector";
import { getPrincipleBaseline } from "../../governance/_lib/principleBaseline";
import { buildPatchProposal } from "../../governance/_lib/proposer";
import { computeExceptionFingerprint } from "../../governance/_lib/selfHealGate";
import { fetchExceptionStats } from "../../governance/_lib/store";
import type { SupabaseClient } from "@supabase/supabase-js";

type DebugSnapshot = {
  llmModel: string | null;
  mcpTools: string[];
  mcpProviders: string[];
  mcpLastFunction: string | null;
  mcpLastStatus: string | null;
  mcpLastError: string | null;
  mcpLastCount: number | null;
  mcpLogs: string[];
  providerConfig?: Record<string, any>;
  providerAvailable: string[];
  authSettingsId: string | null;
  userId: string;
  orgId: string | null;
  userPlan: string | null;
  userIsAdmin: boolean | null;
  userRole: string | null;
  kbUserId: string;
  kbAdminIds: string[];
  usedRuleIds: string[];
  usedTemplateIds: string[];
  usedToolPolicies: string[];
  slotExpectedInput: string | null;
  slotOrderId: string | null;
  slotPhone: string | null;
  slotPhoneMasked: string;
  slotZipcode: string | null;
  slotAddress: string | null;
  mcpCandidateCalls: string[];
  mcpSkipped: string[];
  policyInputRules: string[];
  policyToolRules: string[];
  contextContamination: string[];
  conversationMode: string;
};

type MakeReplyParams = {
  text: string;
  llmModel?: string | null;
  tools?: string[];
  toolResults: Array<{ name: string; ok: boolean; data?: Record<string, any>; error?: unknown }>;
  mcpSkipLogs: string[];
  getDebugSnapshot: (llmModel: string | null, tools: string[]) => DebugSnapshot;
  buildDebugPrefixJson: (payload: Record<string, any>) => Record<string, any>;
  currentDebugPrefixJson: Record<string, any> | null;
};

type RuntimeContextAny = any;

type InsertFinalTurnResult = {
  data?: { id?: string | null; session_id?: string | null };
  error?: unknown;
};

function readToolCount(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, any>;
  if (typeof obj.count === "number") return obj.count;
  if (Array.isArray(obj.items)) return obj.items.length;
  if (Array.isArray(obj.orders)) return obj.orders.length;
  if (obj.orders && typeof obj.orders === "object") {
    const orders = obj.orders as Record<string, any>;
    if (Array.isArray(orders.order)) return orders.order.length;
  }
  return null;
}

export function makeReplyWithDebug(params: MakeReplyParams): {
  text: string;
  lastDebugPrefixJson: Record<string, any> | null;
} {
  const {
    text,
    llmModel,
    tools,
    toolResults,
    mcpSkipLogs,
    getDebugSnapshot,
    buildDebugPrefixJson,
    currentDebugPrefixJson,
  } = params;

  let nextDebugPrefixJson = currentDebugPrefixJson;
  try {
    const mcpLogLines = toolResults.map((tool) => {
      const status = tool.ok ? "success" : "error";
      const error = tool.ok ? "" : String(tool.error || "MCP_ERROR");
      const count = tool.ok ? readToolCount(tool.data) : null;
      const countText = count !== null ? ` (count=${count})` : "";
      return error ? `${tool.name}: ${status}${countText} - ${error}` : `${tool.name}: ${status}${countText}`;
    });
    const allMcpLogs = [...mcpLogLines, ...mcpSkipLogs];
    const snapshot = getDebugSnapshot(llmModel || null, tools || []);
    nextDebugPrefixJson = buildDebugPrefixJson({
      ...snapshot,
      mcpLogs: allMcpLogs,
    });
  } catch (error) {
    nextDebugPrefixJson =
      nextDebugPrefixJson ||
      buildDebugPrefixJson({
        llmModel: llmModel || null,
        mcpTools: tools || [],
        mcpProviders: [],
        mcpLastFunction: "NO_TOOL_CALLED:MAKE_REPLY_DEBUG_FALLBACK",
        mcpLastStatus: "skipped",
        mcpLastError: null,
        mcpLastCount: null,
        mcpLogs: [`make_reply_debug_fallback: ${error instanceof Error ? error.message : String(error)}`],
        providerAvailable: [],
      });
  }

  return { text, lastDebugPrefixJson: nextDebugPrefixJson };
}

type InsertTurnParams = {
  payload: Record<string, any>;
  currentDebugPrefixJson: Record<string, any> | null;
  getFallbackSnapshot: () => DebugSnapshot;
  buildDebugPrefixJson: (payload: Record<string, any>) => Record<string, any>;
  pendingIntentQueue: string[];
  insertFinalTurn: (
    context: RuntimeContextAny,
    payload: Record<string, any>,
    debugPrefixJson: Record<string, any>
  ) => Promise<InsertFinalTurnResult>;
  context: RuntimeContextAny;
  orgId?: string | null;
};

const ASK_ADDRESS_REGEX = /(주소|배송지).*(알려|입력|적어)/;
const KOREAN_ADDRESS_REGEX = /(서울|경기|인천|부산|대구|광주|대전|울산|세종|제주|강원|충북|충남|전북|전남|경북|경남).*(구|군|시|동|읍|면|로|길)/;

function nowIso() {
  return new Date().toISOString();
}

function normalizeAnswerText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function looksLikeAddressInput(value: unknown) {
  const text = String(value || "").trim();
  if (text.length < 6) return false;
  return KOREAN_ADDRESS_REGEX.test(text) || /\d{2,}-\d{1,}/.test(text);
}

function toTurnEventMap(events: RuntimeEvent[]) {
  const map = new Map<string, RuntimeEvent[]>();
  for (const event of events) {
    if (!event.turn_id) continue;
    const list = map.get(event.turn_id) || [];
    list.push(event);
    map.set(event.turn_id, list);
  }
  return map;
}

function toTurnMcpMap(rows: RuntimeMcpAudit[]) {
  const map = new Map<string, RuntimeMcpAudit[]>();
  for (const row of rows) {
    if (!row.turn_id) continue;
    const list = map.get(row.turn_id) || [];
    list.push(row);
    map.set(row.turn_id, list);
  }
  return map;
}

function toTurnDebugMap(rows: RuntimeDebugAudit[]) {
  const map = new Map<string, RuntimeDebugAudit[]>();
  for (const row of rows) {
    if (!row.turn_id) continue;
    const list = map.get(row.turn_id) || [];
    list.push(row);
    map.set(row.turn_id, list);
  }
  return map;
}

function nearbyTurns(turns: RuntimeTurn[], turnId: string) {
  const sorted = [...turns].sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));
  const idx = sorted.findIndex((turn) => turn.id === turnId);
  if (idx < 0) return [];
  return sorted.slice(Math.max(0, idx - 1), Math.min(sorted.length, idx + 2));
}

function buildDuplicateAnswerViolation(turns: RuntimeTurn[], turnId: string) {
  const sorted = [...turns].sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));
  const idx = sorted.findIndex((turn) => turn.id === turnId);
  if (idx <= 0) return null;
  const current = sorted[idx];
  const prev = sorted[idx - 1];
  const currentAnswer = normalizeAnswerText(current.final_answer || current.answer_text || "");
  const prevAnswer = normalizeAnswerText(prev.final_answer || prev.answer_text || "");
  if (!currentAnswer || currentAnswer !== prevAnswer) return null;
  const currentUser = String(current.transcript_text || "").trim();
  const askingAddressAgain = ASK_ADDRESS_REGEX.test(currentAnswer);
  const addressProvided = looksLikeAddressInput(currentUser);
  return {
    violation_id: `pv_${String(current.session_id)}_${String(current.id)}_duplicate_answer`.replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 128),
    principle_key: "memory.enforceNoRepeatQuestions",
    runtime_scope: "chat",
    session_id: String(current.session_id || ""),
    turn_id: String(current.id || ""),
    severity: askingAddressAgain && addressProvided ? ("high" as const) : ("medium" as const),
    summary: "Bot repeated the same final answer on consecutive turns.",
    evidence: {
      previous_turn_id: prev.id,
      previous_answer: prevAnswer,
      repeated_answer: currentAnswer,
      current_user_text: currentUser,
      asking_address_again: askingAddressAgain,
      address_like_user_input: addressProvided,
    },
  };
}

function normalizeText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function toSeverityRank(value: string) {
  const raw = String(value || "").toLowerCase();
  if (raw === "high") return 2;
  if (raw === "medium") return 1;
  return 0;
}

function violationFingerprint(input: {
  principle_key?: unknown;
  runtime_scope?: unknown;
  summary?: unknown;
  evidence?: unknown;
}) {
  const evidence = input.evidence && typeof input.evidence === "object" ? (input.evidence as Record<string, any>) : {};
  const coreText =
    normalizeText(evidence.repeated_answer) ||
    normalizeText(evidence.answer) ||
    normalizeText(evidence.current_user_text) ||
    normalizeText(input.summary);
  const flavor = [
    normalizeText(input.summary),
    normalizeText(evidence.asking_address_again),
    normalizeText(evidence.address_like_user_input),
    normalizeText(evidence.expected_input),
    normalizeText(evidence.policy_decision_reason),
  ].join("|");
  return [
    normalizeText(input.principle_key),
    normalizeText(input.runtime_scope),
    coreText,
    flavor,
  ].join("|");
}

function collapseViolationsForTurn(
  violations: Array<{
    violation_id: string;
    principle_key: string;
    runtime_scope: string;
    session_id: string;
    turn_id: string;
    severity: "medium" | "high";
    summary: string;
    evidence: Record<string, any>;
  }>
) {
  if (violations.length <= 1) return violations;
  const sorted = [...violations].sort((a, b) => {
    const sev = toSeverityRank(b.severity) - toSeverityRank(a.severity);
    if (sev !== 0) return sev;
    const hasRepeatedA = normalizeText(a.evidence.repeated_answer) ? 1 : 0;
    const hasRepeatedB = normalizeText(b.evidence.repeated_answer) ? 1 : 0;
    return hasRepeatedB - hasRepeatedA;
  });
  const out: typeof sorted = [];
  const seen = new Set<string>();
  for (const item of sorted) {
    const fp = violationFingerprint(item);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(item);
  }
  return out;
}

async function insertAuditEvent(context: RuntimeContextAny, input: {
  sessionId: string;
  turnId: string;
  eventType: string;
  payload: Record<string, any>;
  botContext?: Record<string, any>;
}) {
  await context.supabase.from("F_audit_events").insert({
    session_id: input.sessionId,
    turn_id: input.turnId,
    event_type: input.eventType,
    payload: input.payload,
    created_at: nowIso(),
    bot_context: input.botContext || {},
  });
}

async function backfillTurnIdForRuntimeTrace(input: {
  context: RuntimeContextAny;
  sessionId: string;
  turnId: string;
}) {
  const { context, sessionId, turnId } = input;
  const requestStartedAt = String(context.runtimeRequestStartedAt || "").trim();
  if (!requestStartedAt) return;
  const targets = ["F_audit_events", "F_audit_mcp_tools"] as const;
  for (const table of targets) {
    const { data, error: fetchError } = await context.supabase
      .from(table)
      .select("id, bot_context")
      .eq("session_id", sessionId)
      .is("turn_id", null)
      .gte("created_at", requestStartedAt);
    if (fetchError) {
      console.warn("[runtime/chat_mk2] failed to backfill turn_id", {
        table,
        session_id: sessionId,
        turn_id: turnId,
        error: fetchError.message,
      });
      continue;
    }
    const ids = ((data || []) as Array<{ id?: string }>)
      .map((row) => String(row.id || "").trim())
      .filter(Boolean);
    if (ids.length === 0) continue;
    const { error: updateError } = await context.supabase
      .from(table)
      .update({ turn_id: turnId })
      .in("id", ids);
    if (updateError) {
      console.warn("[runtime/chat_mk2] failed to backfill turn_id update", {
        table,
        session_id: sessionId,
        turn_id: turnId,
        error: updateError.message,
      });
    }
  }
}

async function runRuntimeSelfUpdateReview(params: {
  context: RuntimeContextAny;
  orgId: string;
  sessionId: string;
  turnId: string;
}) {
  const { context, orgId, sessionId, turnId } = params;
  const config = await readGovernanceConfig({ supabase: context.supabase, orgId });
  if (!config.enabled) return;

  await insertAuditEvent(context, {
    sessionId,
    turnId,
    eventType: "RUNTIME_SELF_UPDATE_REVIEW_STARTED",
    payload: {
      org_id: orgId,
      session_id: sessionId,
      turn_id: turnId,
      config_source: config.source,
    },
    botContext: { org_id: orgId, stage: "runtime_self_update" },
  });

  const [{ data: turnsData }, { data: eventsData }, { data: mcpData }, { data: debugData }] = await Promise.all([
    context.supabase
      .from("D_conv_turns")
      .select("id, session_id, seq, transcript_text, answer_text, final_answer, bot_context, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(30),
    context.supabase
      .from("F_audit_events")
      .select("id, session_id, turn_id, event_type, payload, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(300),
    context.supabase
      .from("F_audit_mcp_tools")
      .select("id, session_id, turn_id, tool_name, status, request_payload, response_payload, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(300),
    context.supabase
      .from("F_audit_turn_specs_view")
      .select("id, session_id, turn_id, seq, prefix_json, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  const turns = ((turnsData || []) as RuntimeTurn[]).reverse();
  const events = (eventsData || []) as RuntimeEvent[];
  const mcpRows = (mcpData || []) as RuntimeMcpAudit[];
  const debugRows = (debugData || []) as RuntimeDebugAudit[];
  const eventsByTurnId = toTurnEventMap(events);
  const mcpByTurnId = toTurnMcpMap(mcpRows);
  const debugByTurnId = toTurnDebugMap(debugRows);
  const baseline = getPrincipleBaseline();
  const detected = detectPrincipleViolations({
    turns,
    eventsByTurnId,
    mcpByTurnId,
    debugByTurnId,
    sessionEvents: events,
    baseline,
  });
  const duplicateViolation = buildDuplicateAnswerViolation(turns, turnId);
  const scoped = detected.filter((item) => String(item.turn_id) === turnId) as Array<{
    violation_id: string;
    principle_key: string;
    runtime_scope: string;
    session_id: string;
    turn_id: string;
    severity: "medium" | "high";
    summary: string;
    evidence: Record<string, any>;
  }>;
  if (duplicateViolation) scoped.push(duplicateViolation);
  const collapsed = collapseViolationsForTurn(scoped);

  const existingViolationIds = new Set(
    events
      .filter((event) => event.event_type === "PRINCIPLE_VIOLATION_DETECTED")
      .map((event) => String(((event.payload || {}) as Record<string, any>).violation_id || ""))
      .filter(Boolean)
  );
  const existingFingerprints = new Set(
    events
      .filter((event) => event.event_type === "PRINCIPLE_VIOLATION_DETECTED")
      .map((event) => {
        const payload = (event.payload || {}) as Record<string, any>;
        const embedded = normalizeText(payload.issue_fingerprint);
        if (embedded) return embedded;
        return violationFingerprint({
          principle_key: payload.principle_key,
          runtime_scope: payload.runtime_scope,
          summary: payload.summary,
          evidence: payload.evidence,
        });
      })
      .filter(Boolean)
  );
  const targets = collapsed.filter((item) => {
    if (existingViolationIds.has(String(item.violation_id || ""))) return false;
    const fp = violationFingerprint(item);
    if (!fp) return true;
    return !existingFingerprints.has(fp);
  });

  if (targets.length === 0) {
    await insertAuditEvent(context, {
      sessionId,
      turnId,
      eventType: "RUNTIME_SELF_UPDATE_REVIEW_COMPLETED",
      payload: {
        org_id: orgId,
        session_id: sessionId,
        turn_id: turnId,
        violation_count: 0,
        deduped_violation_count: collapsed.length - targets.length,
      },
      botContext: { org_id: orgId, stage: "runtime_self_update" },
    });
    return;
  }

  for (const violation of targets) {
    const issueFingerprint = violationFingerprint(violation);
    const localTurns = nearbyTurns(turns, turnId);
    const localEvents = eventsByTurnId.get(turnId) || [];
    const exceptionFingerprint = computeExceptionFingerprint(violation);
    const exceptionStats = await fetchExceptionStats({
      supabase: context.supabase,
      fingerprint: exceptionFingerprint,
      orgId,
    });
    const proposal = await buildPatchProposal({
      violation,
      baseline,
      recentTurns: localTurns,
      recentEvents: localEvents,
      exceptionStats,
    });
    await insertAuditEvent(context, {
      sessionId,
      turnId,
      eventType: "PRINCIPLE_VIOLATION_DETECTED",
      payload: {
        org_id: orgId,
        violation_id: violation.violation_id,
        principle_key: violation.principle_key,
        runtime_scope: violation.runtime_scope,
        summary: violation.summary,
        severity: violation.severity,
        evidence: violation.evidence,
        baseline_source: baseline.source,
        trigger: "runtime_turn_write",
        issue_fingerprint: issueFingerprint,
      },
      botContext: { org_id: orgId, stage: "runtime_self_update" },
    });
    await insertAuditEvent(context, {
      sessionId,
      turnId,
      eventType: "RUNTIME_PATCH_PROPOSAL_CREATED",
      payload: {
        ...(proposal as unknown as Record<string, any>),
        org_id: orgId,
        trigger: "runtime_turn_write",
        issue_fingerprint: issueFingerprint,
      },
      botContext: { org_id: orgId, actor: "runtime_self_update" },
    });
  }

  await insertAuditEvent(context, {
    sessionId,
    turnId,
    eventType: "RUNTIME_SELF_UPDATE_REVIEW_COMPLETED",
    payload: {
      org_id: orgId,
      session_id: sessionId,
      turn_id: turnId,
      violation_count: targets.length,
      proposal_count: targets.length,
      deduped_violation_count: collapsed.length - targets.length,
    },
    botContext: { org_id: orgId, stage: "runtime_self_update" },
  });
}

export async function insertTurnWithDebug(params: InsertTurnParams): Promise<{
  result: InsertFinalTurnResult;
  lastDebugPrefixJson: Record<string, any>;
  latestTurnId: string | null;
}> {
  const {
    payload,
    currentDebugPrefixJson,
    getFallbackSnapshot,
    buildDebugPrefixJson,
    pendingIntentQueue,
    insertFinalTurn,
    context,
    orgId,
  } = params;
  let nextDebugPrefixJson = currentDebugPrefixJson;

  if (!nextDebugPrefixJson) {
    nextDebugPrefixJson = buildDebugPrefixJson(getFallbackSnapshot());
  }

  if (!Object.prototype.hasOwnProperty.call(payload, "failed")) {
    payload.failed = null;
  }
  if (!Object.prototype.hasOwnProperty.call(payload, "id")) {
    const runtimeTurnId = String(context.runtimeTurnId || "").trim();
    if (runtimeTurnId) {
      payload.id = runtimeTurnId;
    }
  }
  if (pendingIntentQueue.length > 0) {
    const currentBotContext =
      payload.bot_context && typeof payload.bot_context === "object"
        ? ({ ...(payload.bot_context as Record<string, any>) } as Record<string, any>)
        : ({} as Record<string, any>);
    payload.bot_context = {
      ...currentBotContext,
      intent_queue: pendingIntentQueue,
      intent_disambiguation_pending: false,
      intent_disambiguation_source_text: null,
    };
  }
  const result = await insertFinalTurn(context, payload, nextDebugPrefixJson);
  const latestTurnId = result.data?.id || null;
  if (!result.error && latestTurnId && result.data?.session_id && orgId) {
    try {
      await backfillTurnIdForRuntimeTrace({
        context,
        sessionId: String(result.data.session_id),
        turnId: String(latestTurnId),
      });
      await runRuntimeSelfUpdateReview({
        context,
        orgId: String(orgId),
        sessionId: String(result.data.session_id),
        turnId: String(latestTurnId),
      });
    } catch (error) {
      console.warn("[runtime/chat_mk2] runtime self update review failed", {
        session_id: result.data?.session_id || null,
        turn_id: latestTurnId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { result, lastDebugPrefixJson: nextDebugPrefixJson, latestTurnId };
}



