"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  authToken: string;
};

type ProposalStatus = "proposed" | "approved" | "rejected" | "on_hold" | "applied" | "failed";
type ProposalAction = "apply" | "reject" | "hold" | "repropose";

type ProposalItem = {
  proposal_id: string;
  org_id: string | null;
  session_id: string | null;
  turn_id: string | null;
  created_at: string | null;
  violation_id: string | null;
  principle_key: string | null;
  runtime_scope: string | null;
  title: string;
  why_failed: string;
  how_to_improve: string;
  rationale: string | null;
  target_files: string[];
  change_plan: string[];
  status: ProposalStatus;
  status_label: string;
  latest_event_type: string;
  suggested_diff: string | null;
  event_history: Array<{
    event_type: string;
    created_at: string | null;
    payload: Record<string, unknown>;
    bot_context?: Record<string, unknown>;
  }>;
  violation: {
    summary: string | null;
    severity: string | null;
    evidence: Record<string, unknown> | null;
  } | null;
  conversation: Array<{
    id: string;
    seq: number | null;
    created_at: string | null;
    user: string | null;
    bot: string | null;
  }>;
};

type ProposalListResponse = {
  ok: boolean;
  proposals: ProposalItem[];
  self_heal_map?: {
    registry?: { source?: string; scope?: string };
    principle?: Record<string, { key?: string; summary?: string; ownerModules?: Record<string, string> }>;
    event?: Record<string, string>;
    violation?: Record<string, { key?: string; summary?: string; severityDefault?: string }>;
    evidenceContract?: {
      requiredAddressEvidence?: string[];
      requiredMemoryEvidence?: string[];
    };
    scenarioMatrix?: Array<{
      key?: string;
      when?: string;
      expectedAction?: string;
      expectedPrompt?: string;
      expectedEvents?: string[];
    }>;
    ruleCatalog?: Array<{
      id?: string;
      principleKey?: string;
      violationKey?: string;
      summary?: string;
      severityDefault?: string;
      scope?: string;
      domains?: string[];
      triggerSignals?: Array<{ name?: string; description?: string }>;
      evidenceFields?: string[];
    }>;
  };
  error?: string;
};

const STATUS_FILTERS: Array<{ value: "all" | ProposalStatus; label: string }> = [
  { value: "all", label: "전체" },
  { value: "proposed", label: "제안" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "거절" },
  { value: "on_hold", label: "보류" },
  { value: "applied", label: "적용" },
  { value: "failed", label: "실패" },
];

function formatTime(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR");
}

async function parseJsonBody<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  const v = String(value ?? "").trim();
  return v.length > 0 ? v : null;
}

function hasAnyObjectKeys(value: unknown) {
  return Boolean(asObject(value) && Object.keys(value as Record<string, unknown>).length > 0);
}

function toMissingMarker(reason: string) {
  return `UNAVAILABLE:${reason}`;
}

function firstNonEmptyObject(candidates: unknown[]): Record<string, unknown> | null {
  for (const candidate of candidates) {
    const obj = asObject(candidate);
    if (obj && Object.keys(obj).length > 0) return obj;
  }
  return null;
}

function firstNonEmptyString(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const v = asNonEmptyString(candidate);
    if (v) return v;
  }
  return null;
}

function firstEventPayload(events: ProposalItem["event_history"], eventType: string): Record<string, unknown> | null {
  const hit = [...(events || [])].reverse().find((evt) => String(evt.event_type || "").trim() === eventType);
  return asObject(hit?.payload);
}

function extractDecisionCodePaths(events: ProposalItem["event_history"]) {
  const paths: string[] = [];
  const collectDecisionNodes = (value: unknown, out: Record<string, unknown>[], seen: Set<unknown>) => {
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    const obj = value as Record<string, unknown>;
    const direct = obj._decision;
    if (direct && typeof direct === "object") {
      out.push(direct as Record<string, unknown>);
    }
    for (const child of Object.values(obj)) {
      if (child && typeof child === "object") {
        collectDecisionNodes(child, out, seen);
      }
    }
  };
  for (const event of events || []) {
    const payload = (event.payload || {}) as Record<string, unknown>;
    const botContext =
      event.bot_context && typeof event.bot_context === "object"
        ? (event.bot_context as Record<string, unknown>)
        : {};
    const decisions: Record<string, unknown>[] = [];
    collectDecisionNodes(payload, decisions, new Set<unknown>());
    collectDecisionNodes(botContext, decisions, new Set<unknown>());
    for (const decision of decisions) {
      const modulePath = String(decision.module_path || "").trim();
      const functionName = String(decision.function_name || "").trim();
      if (modulePath || functionName) {
        paths.push(`${event.event_type}: ${modulePath || "unknown"}#${functionName || "unknown"}`);
      }
    }
  }
  return Array.from(new Set(paths));
}

function deriveRootCauseEvidence(proposal: ProposalItem) {
  const evidence = (proposal.violation?.evidence || {}) as Record<string, unknown>;
  const preMcpPayload = firstEventPayload(proposal.event_history || [], "PRE_MCP_DECISION") || {};
  const finalPayload = firstEventPayload(proposal.event_history || [], "FINAL_ANSWER_READY") || {};
  const completionPayload = firstEventPayload(proposal.event_history || [], "RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED") || {};
  const violationSummary = String(proposal.violation?.summary || "").trim().toLowerCase();
  const finalCalls = Array.isArray(preMcpPayload.final_calls) ? preMcpPayload.final_calls : [];
  const forcedCalls = Array.isArray(preMcpPayload.forced_calls) ? preMcpPayload.forced_calls : [];
  const candidateCalls = [...finalCalls, ...forcedCalls].map((item) => asObject(item)).filter(Boolean) as Record<
    string,
    unknown
  >[];
  const callNames = candidateCalls.map((call) => firstNonEmptyString([call.function, call.tool, call.name])).filter(Boolean);
  const inferredToolName = firstNonEmptyString([
    evidence.tool_name,
    ...(callNames.length > 0 ? [callNames.join(", ")] : []),
    asNonEmptyString(completionPayload.external_action_name),
    violationSummary.includes("delivery") || violationSummary.includes("dispatch") ? "restock_sms_dispatch" : null,
  ]);
  const inferredMismatch = firstNonEmptyString([
    evidence.mismatch_type,
    evidence.loop_detected ? "slot_state_regression_loop" : null,
    evidence.repeated_slot ? "repeated_scope_slot_ask" : null,
    evidence.external_ack_missing_count ? "external_response_not_received" : null,
    violationSummary.includes("without deterministic delivery")
      ? "external_response_not_received"
      : null,
  ]);
  const inferredPolicyReason = firstNonEmptyString([
    evidence.policy_decision_reason,
    asObject(finalPayload.quick_reply_config)?.criteria,
    preMcpPayload.blocked_by_missing_slots ? "blocked_by_missing_slots" : null,
  ]);
  const inferredSkipReason = firstNonEmptyString([
    evidence.mcp_skipped_reason,
    preMcpPayload.blocked_by_missing_slots ? "MCP_BLOCKED_BY_MISSING_SLOTS" : null,
    preMcpPayload.final_calls && Array.isArray(preMcpPayload.final_calls) && preMcpPayload.final_calls.length === 0
      ? "NO_FINAL_CALLS"
      : null,
  ]);
  const inferredForcedTemplate = firstNonEmptyString([
    evidence.final_response_forced_template_applied,
    asObject(finalPayload.quick_reply_config)?.criteria,
  ]);
  const mismatchType = String(evidence.mismatch_type || "").trim();
  const policyReason = String(evidence.policy_decision_reason || "").trim();
  const skipReason = String(evidence.mcp_skipped_reason || "").trim();
  const forcedTemplate = String(evidence.final_response_forced_template_applied || "").trim();
  return {
    mismatch_type: mismatchType || inferredMismatch || toMissingMarker("evidence.mismatch_type"),
    policy_decision_reason: policyReason || inferredPolicyReason || toMissingMarker("evidence.policy_decision_reason"),
    mcp_skipped_reason: skipReason || inferredSkipReason || toMissingMarker("evidence.mcp_skipped_reason"),
    final_response_forced_template_applied:
      forcedTemplate || inferredForcedTemplate || toMissingMarker("evidence.final_response_forced_template_applied"),
    tool_name: firstNonEmptyString([evidence.tool_name, inferredToolName]) || toMissingMarker("evidence.tool_name"),
  };
}

function deriveBeforeAfterEvidence(proposal: ProposalItem) {
  const evidence = (proposal.violation?.evidence || {}) as Record<string, unknown>;
  const conversation = proposal.conversation || [];
  const lastTurn = conversation.length > 0 ? conversation[conversation.length - 1] : null;
  const finalAnswerEvent = [...(proposal.event_history || [])]
    .reverse()
    .find((evt) => String(evt.event_type || "").trim() === "FINAL_ANSWER_READY");
  const finalPayload =
    finalAnswerEvent?.payload && typeof finalAnswerEvent.payload === "object"
      ? (finalAnswerEvent.payload as Record<string, unknown>)
      : {};
  const changeAudit =
    finalPayload.change_audit && typeof finalPayload.change_audit === "object"
      ? (finalPayload.change_audit as Record<string, unknown>)
      : null;
  const beforeFromAudit =
    changeAudit?.before && typeof changeAudit.before === "object"
      ? (changeAudit.before as Record<string, unknown>)
      : null;
  const requestFromAudit =
    changeAudit?.request && typeof changeAudit.request === "object"
      ? (changeAudit.request as Record<string, unknown>)
      : null;
  const afterFromAudit =
    changeAudit?.after && typeof changeAudit.after === "object"
      ? (changeAudit.after as Record<string, unknown>)
      : null;
  const before = {
    resolved_fields: beforeFromAudit || (
      evidence.resolved_fields && typeof evidence.resolved_fields === "object"
        ? evidence.resolved_fields
        : null
    ),
    request_fields: requestFromAudit || (
      evidence.request_fields && typeof evidence.request_fields === "object"
        ? evidence.request_fields
        : null
    ),
    previous_answer: evidence.previous_answer ?? null,
  };
  const after = {
    response_fields: afterFromAudit || (
      evidence.response_fields && typeof evidence.response_fields === "object"
        ? evidence.response_fields
        : null
    ),
    final_answer: lastTurn?.bot || null,
    repeated_answer: evidence.repeated_answer ?? null,
  };
  return { before, after };
}

function hasObjectKeys(value: unknown) {
  return Boolean(value && typeof value === "object" && Object.keys(value as Record<string, unknown>).length > 0);
}

function deriveEvidenceEnvelope(
  proposal: ProposalItem,
  beforeAfter: {
    before: { resolved_fields: unknown; request_fields: unknown; previous_answer: unknown };
    after: { response_fields: unknown; final_answer: unknown; repeated_answer: unknown };
  },
  fallbackContractExpectation: string
) {
  const events = proposal.event_history || [];
  const evidence = (proposal.violation?.evidence || {}) as Record<string, unknown>;
  const preMcpPayload = firstEventPayload(events, "PRE_MCP_DECISION") || {};
  const finalAnswerPayload = firstEventPayload(events, "FINAL_ANSWER_READY") || {};
  const violationPayload = firstEventPayload(events, "PRINCIPLE_VIOLATION_DETECTED") || {};
  const changeAudit = asObject(finalAnswerPayload.change_audit) || {};
  const inferredRequestFields = firstNonEmptyObject([
    evidence.request_fields,
    beforeAfter.before.request_fields,
    changeAudit.request,
    asObject(preMcpPayload.resolved_slots),
    asObject(preMcpPayload.entity),
  ]);
  const inferredResponseFields = firstNonEmptyObject([
    evidence.response_fields,
    beforeAfter.after.response_fields,
    changeAudit.after,
    asObject(finalAnswerPayload.response_fields),
    {
      answer: finalAnswerPayload.answer ?? beforeAfter.after.final_answer ?? null,
      model: finalAnswerPayload.model ?? null,
      quick_reply_config: finalAnswerPayload.quick_reply_config ?? null,
    },
  ]);
  const inferredBeforeSnapshot = firstNonEmptyObject([
    asObject(beforeAfter.before.resolved_fields),
    asObject(changeAudit.before),
    asObject(violationPayload.evidence),
    asObject(preMcpPayload.resolved_slots),
  ]);
  const contractExpectation = firstNonEmptyString([
    evidence.contract_expectation,
    asNonEmptyString(fallbackContractExpectation),
  ]);
  return {
    request_fields: inferredRequestFields || { __missing__: toMissingMarker("evidence.request_fields") },
    response_fields: inferredResponseFields || { __missing__: toMissingMarker("evidence.response_fields") },
    contract_expectation: contractExpectation || toMissingMarker("evidence.contract_expectation"),
    before_snapshot: inferredBeforeSnapshot || { __missing__: toMissingMarker("before_snapshot") },
    final_answer_ready_present: Boolean(finalAnswerPayload && Object.keys(finalAnswerPayload).length > 0),
  };
}

function summarizeKeyEvents(events: ProposalItem["event_history"]) {
  const lines: string[] = [];
  const collectDecisionNodes = (value: unknown, out: Record<string, unknown>[], seen: Set<unknown>) => {
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    const obj = value as Record<string, unknown>;
    const direct = obj._decision;
    if (direct && typeof direct === "object") out.push(direct as Record<string, unknown>);
    for (const child of Object.values(obj)) {
      if (child && typeof child === "object") collectDecisionNodes(child, out, seen);
    }
  };
  for (const event of events || []) {
    const payload = (event.payload || {}) as Record<string, unknown>;
    const botContext =
      event.bot_context && typeof event.bot_context === "object"
        ? (event.bot_context as Record<string, unknown>)
        : {};
    const nodes: Record<string, unknown>[] = [];
    collectDecisionNodes(payload, nodes, new Set<unknown>());
    collectDecisionNodes(botContext, nodes, new Set<unknown>());
    const first = nodes[0] || {};
    const modulePath = String(first.module_path || "").trim();
    const functionName = String(first.function_name || "").trim();
    const when = event.created_at || "-";
    const tail = modulePath || functionName ? ` / ${modulePath || "unknown"}#${functionName || "unknown"}` : "";
    lines.push(`- ${when} / ${event.event_type}${tail}`);
  }
  return lines;
}

function buildCriticalEventPayloadDump(events: ProposalItem["event_history"]) {
  const criticalTypes = new Set([
    "PRINCIPLE_VIOLATION_DETECTED",
    "RUNTIME_PATCH_PROPOSAL_CREATED",
    "PRE_MCP_DECISION",
    "FINAL_ANSWER_READY",
    "POLICY_DECISION",
    "EXECUTION_GUARD_TRIGGERED",
  ]);
  const rows = (events || []).filter((evt) => criticalTypes.has(String(evt.event_type || "").trim()));
  if (rows.length === 0) return ["-"];
  return rows.map((evt) => {
    const payload = evt.payload && typeof evt.payload === "object" ? evt.payload : {};
    return `- ${evt.created_at || "-"} / ${evt.event_type}\n${prettyJson(payload)}`;
  });
}

function deriveReadinessReport(
  proposal: ProposalItem,
  codePaths: string[],
  beforeAfter: {
    before: { resolved_fields: unknown; request_fields: unknown; previous_answer: unknown };
    after: { response_fields: unknown; final_answer: unknown; repeated_answer: unknown };
  },
  envelope: {
    request_fields: Record<string, unknown>;
    response_fields: Record<string, unknown>;
    contract_expectation: string;
    before_snapshot: Record<string, unknown>;
    final_answer_ready_present: boolean;
  }
) {
  const events = proposal.event_history || [];
  const eventSet = new Set(events.map((evt) => String(evt.event_type || "").trim()));
  const evidence = (proposal.violation?.evidence || {}) as Record<string, unknown>;
  const mustEvents = [
    "PRE_MCP_DECISION",
    "FINAL_ANSWER_READY",
    "RUNTIME_PATCH_PROPOSAL_CREATED",
    "PRINCIPLE_VIOLATION_DETECTED",
  ];
  const report = {
    has_violation_evidence: hasObjectKeys(evidence),
    has_tool_name: Boolean(String(evidence.tool_name || "").trim()),
    has_mismatch_type: Boolean(String(evidence.mismatch_type || "").trim()),
    has_request_fields: hasAnyObjectKeys(envelope.request_fields) && !String(envelope.request_fields.__missing__ || "").startsWith("UNAVAILABLE:"),
    has_response_fields:
      hasAnyObjectKeys(envelope.response_fields) && !String(envelope.response_fields.__missing__ || "").startsWith("UNAVAILABLE:"),
    has_contract_expectation:
      Boolean(String(envelope.contract_expectation || "").trim()) &&
      !String(envelope.contract_expectation || "").startsWith("UNAVAILABLE:"),
    has_decision_code_paths: codePaths.length > 0,
    has_before_snapshot:
      (hasAnyObjectKeys(envelope.before_snapshot) && !String(envelope.before_snapshot.__missing__ || "").startsWith("UNAVAILABLE:")) ||
      hasObjectKeys(beforeAfter.before.resolved_fields) ||
      hasObjectKeys(beforeAfter.before.request_fields),
    has_after_snapshot: hasObjectKeys(beforeAfter.after.response_fields) || Boolean(beforeAfter.after.final_answer),
    required_events_present: mustEvents.filter((eventType) => eventSet.has(eventType)),
    required_events_missing: mustEvents.filter((eventType) => !eventSet.has(eventType)),
  };
  const missingFactors: string[] = [];
  if (!report.has_violation_evidence) missingFactors.push("violation.evidence");
  if (!report.has_tool_name) missingFactors.push("violation.evidence.tool_name");
  if (!report.has_mismatch_type) missingFactors.push("violation.evidence.mismatch_type");
  if (!report.has_request_fields) missingFactors.push("violation.evidence.request_fields");
  if (!report.has_response_fields) missingFactors.push("violation.evidence.response_fields");
  if (!report.has_contract_expectation) missingFactors.push("violation.evidence.contract_expectation");
  if (!report.has_decision_code_paths) missingFactors.push("decision_code_paths");
  if (!report.has_before_snapshot) missingFactors.push("before_snapshot");
  if (!report.has_after_snapshot) missingFactors.push("after_snapshot");
  for (const eventType of report.required_events_missing) {
    missingFactors.push(`event:${eventType}`);
  }
  const missingReasons: Record<string, string> = {};
  for (const factor of missingFactors) {
    if (factor.startsWith("event:")) {
      const eventType = factor.slice("event:".length);
      missingReasons[factor] = `event_history에 ${eventType}가 없습니다.`;
      continue;
    }
    if (factor === "violation.evidence.tool_name") {
      missingReasons[factor] = "violation evidence 및 PRE_MCP_DECISION(final_calls/forced_calls)에서 tool 식별 불가";
      continue;
    }
    if (factor === "before_snapshot") {
      missingReasons[factor] = "change_audit.before / resolved snapshot 근거가 없습니다.";
      continue;
    }
    missingReasons[factor] = "핵심 증거 필드가 기록되지 않았습니다.";
  }
  return { report, missingFactors, missingReasons };
}

function badgeClass(status: ProposalStatus) {
  if (status === "applied") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "failed") return "bg-rose-100 text-rose-700 border-rose-200";
  if (status === "rejected") return "bg-zinc-200 text-zinc-700 border-zinc-300";
  if (status === "on_hold") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "approved") return "bg-sky-100 text-sky-700 border-sky-200";
  return "bg-violet-100 text-violet-700 border-violet-200";
}

function cardClass(status: ProposalStatus) {
  if (status === "applied") return "border-emerald-200 bg-emerald-50";
  if (status === "failed") return "border-rose-200 bg-rose-50";
  if (status === "rejected") return "border-zinc-300 bg-zinc-100";
  if (status === "on_hold") return "border-amber-200 bg-amber-50";
  if (status === "approved") return "border-sky-200 bg-sky-50";
  return "border-violet-200 bg-violet-50";
}

function actionButtonClass(action: ProposalAction) {
  if (action === "apply") return "bg-emerald-600 text-white hover:bg-emerald-700";
  if (action === "reject") return "bg-rose-600 text-white hover:bg-rose-700";
  if (action === "hold") return "bg-amber-500 text-white hover:bg-amber-600";
  return "bg-indigo-600 text-white hover:bg-indigo-700";
}

function actionLabel(action: ProposalAction) {
  if (action === "apply") return "적용 처리";
  if (action === "reject") return "거절";
  if (action === "hold") return "보류";
  return "제안";
}

function allowedActions(status: ProposalStatus): ProposalAction[] {
  if (status === "proposed") return ["reject", "apply", "hold"];
  if (status === "rejected") return ["apply", "hold", "repropose"];
  if (status === "approved") return ["apply", "hold", "reject"];
  if (status === "on_hold") return ["apply", "reject", "repropose"];
  if (status === "failed") return ["apply", "hold", "repropose"];
  if (status === "applied") return ["repropose"];
  return [];
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-copy h-[10px] w-[10px] shrink-0"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

const COPY_BUTTON_CLASS =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-left text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

export function ProposalSettingsPanel({ authToken }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [selfHealMap, setSelfHealMap] = useState<ProposalListResponse["self_heal_map"] | null>(null);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [busyBulk, setBusyBulk] = useState(false);
  const [statusNote, setStatusNote] = useState<string>("");

  const [statusFilter, setStatusFilter] = useState<"all" | ProposalStatus>("all");
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<ProposalAction>("apply");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) next.Authorization = `Bearer ${authToken}`;
    return next;
  }, [authToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/runtime/governance/proposals?limit=200", {
        headers,
        cache: "no-store",
      });
      const body = await parseJsonBody<ProposalListResponse>(res);
      if (!res.ok || !body?.ok) {
        setError(body?.error || "proposal 목록 조회에 실패했습니다.");
        setProposals([]);
        setSelfHealMap(null);
        return;
      }
      setProposals(body.proposals || []);
      setSelfHealMap(body.self_heal_map || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "proposal 목록 조회에 실패했습니다.");
      setProposals([]);
      setSelfHealMap(null);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const principleRows = useMemo(
    () =>
      Object.values(selfHealMap?.principle || {}).filter(
        (item): item is { key: string; summary?: string; ownerModules?: Record<string, string> } => Boolean(item?.key)
      ),
    [selfHealMap]
  );
  const violationRows = useMemo(
    () =>
      Object.values(selfHealMap?.violation || {}).filter(
        (item): item is { key: string; summary?: string; severityDefault?: string } => Boolean(item?.key)
      ),
    [selfHealMap]
  );
  const eventRows = useMemo(() => Object.values(selfHealMap?.event || {}).filter(Boolean), [selfHealMap]);
  const scenarioRows = useMemo(() => selfHealMap?.scenarioMatrix || [], [selfHealMap]);
  const ruleRows = useMemo(() => selfHealMap?.ruleCatalog || [], [selfHealMap]);

  const principleSummaryByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of principleRows) {
      map.set(String(row.key), String(row.summary || "-"));
    }
    return map;
  }, [principleRows]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (proposalId: string, action: ProposalAction) => {
      if (action === "apply") {
        const res = await fetch("/api/runtime/governance/proposals/complete", {
          method: "POST",
          headers,
          body: JSON.stringify({
            proposal_id: proposalId,
            reason: "MANUAL_APPLY_CONFIRMED",
            reviewer_note: "manual_apply_confirmed_from_settings_proposal_tab",
          }),
        });
        const body = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || !body?.ok) throw new Error(body?.error || "적용 처리에 실패했습니다.");
        return;
      }
      if (action === "reject") {
        const res = await fetch("/api/runtime/governance/proposals/approve", {
          method: "POST",
          headers,
          body: JSON.stringify({
            proposal_id: proposalId,
            approve: false,
            reviewer_note: "rejected_from_settings_proposal_tab",
          }),
        });
        const body = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || !body?.ok) throw new Error(body?.error || "제안 거절에 실패했습니다.");
        return;
      }
      if (action === "hold") {
        const res = await fetch("/api/runtime/governance/proposals/hold", {
          method: "POST",
          headers,
          body: JSON.stringify({ proposal_id: proposalId, reason: "on_hold_from_settings_proposal_tab" }),
        });
        const body = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || !body?.ok) throw new Error(body?.error || "제안 보류에 실패했습니다.");
        return;
      }
      const res = await fetch("/api/runtime/governance/proposals/reopen", {
        method: "POST",
        headers,
        body: JSON.stringify({ proposal_id: proposalId, reason: "reopen_from_settings_proposal_tab" }),
      });
      const body = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !body?.ok) throw new Error(body?.error || "제안 상태 변경에 실패했습니다.");
    },
    [headers]
  );

  const buildProposalClipboardText = useCallback((proposal: ProposalItem) => {
    const extractedCodePaths = extractDecisionCodePaths(proposal.event_history || []);
    const codePaths =
      extractedCodePaths.length > 0
        ? extractedCodePaths
        : (proposal.target_files || [])
            .filter(Boolean)
            .map((file) => `[inferred] ${file}`);
    const beforeAfter = deriveBeforeAfterEvidence(proposal);
    const evidence = (proposal.violation?.evidence || {}) as Record<string, unknown>;
    const failingInvariant =
      String(evidence.contract_expectation || "").trim() ||
      "deterministic runtime invariant required (slot->request->response semantic consistency)";
    const envelope = deriveEvidenceEnvelope(proposal, beforeAfter, failingInvariant);
    const rootCauseEvidence = {
      ...deriveRootCauseEvidence(proposal),
      contract_expectation: envelope.contract_expectation,
      request_fields: envelope.request_fields,
      response_fields: envelope.response_fields,
    };
    const validationChecklist = [
      "1) 동일 입력 재현 시 violation_id가 동일 원인군으로 생성되는지 확인",
      "2) 실패 경계 직전/직후 이벤트(PRE_MCP_DECISION, MCP/FINAL_ANSWER_READY)가 모두 저장되는지 확인",
      "3) 변경 전/후 값(before/request/after/diff)이 payload에 남는지 확인",
      "4) 적용 후 동일 시나리오 재실행 시 PRINCIPLE_VIOLATION_DETECTED가 0인지 확인",
    ];
    const readiness = deriveReadinessReport(proposal, codePaths, beforeAfter, envelope);
    const eventTimeline = summarizeKeyEvents(proposal.event_history || []);
    const criticalEventPayloads = buildCriticalEventPayloadDump(proposal.event_history || []);
    const lines: string[] = [
      "[Runtime Proposal]",
      `proposal_id: ${proposal.proposal_id}`,
      `status: ${proposal.status} (${proposal.status_label})`,
      `org_id: ${proposal.org_id || "-"}`,
      `session_id: ${proposal.session_id || "-"}`,
      `turn_id: ${proposal.turn_id || "-"}`,
      `principle_key: ${proposal.principle_key || "-"}`,
      `runtime_scope: ${proposal.runtime_scope || "-"}`,
      `violation_id: ${proposal.violation_id || "-"}`,
      `created_at: ${proposal.created_at || "-"}`,
      "",
      "[Root Cause Hypothesis]",
      prettyJson(rootCauseEvidence),
      "",
      "[Failing Invariant]",
      failingInvariant,
      "",
      "[Decision Code Paths]",
      codePaths.length > 0 ? codePaths.map((v) => `- ${v}`).join("\n") : "- (no _decision paths found)",
      "",
      "[Self-Heal Readiness]",
      prettyJson(readiness.report),
      `[Missing Critical Factors] ${readiness.missingFactors.length > 0 ? readiness.missingFactors.join(", ") : "-"}`,
      `[Missing Critical Factor Reasons] ${
        Object.keys(readiness.missingReasons).length > 0 ? prettyJson(readiness.missingReasons) : "-"
      }`,
      "",
      "[Why Failed]",
      proposal.why_failed || "-",
      "",
      "[How To Improve]",
      proposal.how_to_improve || "-",
      "",
      `[Rationale] ${proposal.rationale || "-"}`,
      `[Target Files] ${proposal.target_files.join(", ") || "-"}`,
      `[Change Plan] ${proposal.change_plan.join(" | ") || "-"}`,
      "",
      `[Violation Summary] ${proposal.violation?.summary || "-"}`,
      `[Violation Severity] ${proposal.violation?.severity || "-"}`,
      `[Violation Evidence] ${JSON.stringify(proposal.violation?.evidence || {}, null, 2)}`,
      "",
      "[Before/After Snapshot]",
      prettyJson({
        before: {
          ...beforeAfter.before,
          envelope_before_snapshot: envelope.before_snapshot,
        },
        after: {
          ...beforeAfter.after,
          envelope_response_fields: envelope.response_fields,
          final_answer_ready_present: envelope.final_answer_ready_present,
        },
      }),
      "",
      "[Implementation Checklist]",
      ...validationChecklist,
      "",
      "[Key Event Timeline]",
      ...(eventTimeline.length > 0 ? eventTimeline : ["-"]),
      "",
      "[Critical Event Payloads]",
      ...criticalEventPayloads,
      "",
      "[Conversation Snippet]",
      ...proposal.conversation.map(
        (turn) =>
          `- turn_id=${turn.id}, seq=${turn.seq ?? "-"}, created_at=${turn.created_at || "-"}\n  USER: ${
            turn.user || "-"
          }\n  BOT: ${turn.bot || "-"}`
      ),
    ];
    return lines.join("\n");
  }, []);

  const copyProposalForCli = useCallback(
    async (proposal: ProposalItem) => {
      setError(null);
      setStatusNote("");
      const text = buildProposalClipboardText(proposal);
      try {
        await navigator.clipboard.writeText(text);
        setStatusNote(`제안 복사 완료: ${proposal.proposal_id}`);
      } catch {
        setError("제안 복사에 실패했습니다.");
      }
    },
    [buildProposalClipboardText]
  );

  const reassessProposal = useCallback(
    async (proposalId: string) => {
      setError(null);
      setStatusNote("");
      const res = await fetch("/api/runtime/governance/proposals/reassess", {
        method: "POST",
        headers,
        body: JSON.stringify({ proposal_id: proposalId }),
      });
      const body = await parseJsonBody<{ ok?: boolean; proposal_id?: string; error?: string }>(res);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "제안 재평가에 실패했습니다.");
      }
      setStatusNote(`제안 재평가 완료: ${proposalId} -> ${body.proposal_id || "-"}`);
      await load();
    },
    [headers, load]
  );

  const handleSingleAction = useCallback(
    async (proposalId: string, action: ProposalAction) => {
      setBusyProposalId(proposalId);
      setStatusNote("");
      setError(null);
      try {
        await runAction(proposalId, action);
        setStatusNote(`${actionLabel(action)} 처리: ${proposalId}`);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
      } finally {
        setBusyProposalId(null);
      }
    },
    [load, runAction]
  );

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return proposals.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        item.proposal_id,
        item.session_id || "",
        item.turn_id || "",
        item.title,
        item.why_failed,
        item.how_to_improve,
        item.violation?.summary || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [keyword, proposals, statusFilter]);

  useEffect(() => {
    const allowed = new Set(filtered.map((item) => item.proposal_id));
    setSelectedIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [filtered]);

  const selectableFiltered = useMemo(() => filtered.filter((item) => allowedActions(item.status).length > 0), [filtered]);

  const toggleSelected = useCallback((proposalId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(proposalId)) return prev;
        return [...prev, proposalId];
      }
      return prev.filter((id) => id !== proposalId);
    });
  }, []);

  const toggleAllFiltered = useCallback((checked: boolean) => {
    setSelectedIds((prev) => {
      const targetIds = selectableFiltered.map((item) => item.proposal_id);
      if (checked) {
        return Array.from(new Set([...prev, ...targetIds]));
      }
      const target = new Set(targetIds);
      return prev.filter((id) => !target.has(id));
    });
  }, [selectableFiltered]);

  const runBulkChange = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setBusyBulk(true);
    setStatusNote("");
    setError(null);
    try {
      const selectedMap = new Map(proposals.map((item) => [item.proposal_id, item]));
      const notAllowed = selectedIds.filter((id) => {
        const item = selectedMap.get(id);
        if (!item) return true;
        return !allowedActions(item.status).includes(bulkAction);
      });
      if (notAllowed.length > 0) {
        throw new Error(
          `선택 항목 중 ${notAllowed.length}건은 '${actionLabel(bulkAction)}' 상태 변경이 불가능합니다.`
        );
      }
      for (const proposalId of selectedIds) {
        await runAction(proposalId, bulkAction);
      }
      setStatusNote(`선택 항목 일괄 ${actionLabel(bulkAction)} 완료: ${selectedIds.length}건`);
      setSelectedIds([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "일괄 상태 변경에 실패했습니다.");
    } finally {
      setBusyBulk(false);
    }
  }, [bulkAction, load, proposals, runAction, selectedIds]);

  const allFilteredChecked =
    selectableFiltered.length > 0 && selectableFiltered.every((item) => selectedIds.includes(item.proposal_id));

  const copyText = useCallback(async (key: string, value: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1200);
    } catch {
      setError("클립보드 복사에 실패했습니다.");
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Runtime Proposal 목록</div>
            <div className="mt-1 text-xs text-slate-500">
              proposal_id 기준으로 위반 대화와 상태를 관리합니다. (관리자 전용)
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            새로고침
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[180px_1fr_auto]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | ProposalStatus)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="proposal_id / session_id / 제목 / 내용 검색"
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700"
          />
          <div />
        </div>

        {statusNote ? <div className="mt-3 text-xs text-emerald-700">{statusNote}</div> : null}
        {error ? <div className="mt-3 text-xs text-rose-700">{error}</div> : null}
      </div>

      {selfHealMap ? (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
            자가 회복 기준 맵
          </summary>
          <div className="border-t border-slate-200 px-4 py-3">
            <div className="text-xs text-slate-600">
              source: <span className="font-mono">{selfHealMap.registry?.source || "-"}</span> / scope:{" "}
              <span className="font-mono">{selfHealMap.registry?.scope || "-"}</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">Principles</div>
                <div className="mt-2 space-y-2">
                  {principleRows.map((row) => (
                    <div key={row.key} className="rounded border border-slate-200 bg-white p-2">
                      <div className="text-[11px] font-mono text-slate-800">{row.key}</div>
                      <div className="mt-1 text-[11px] text-slate-600">{row.summary || "-"}</div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        owners:{" "}
                        {row.ownerModules ? Object.values(row.ownerModules).join(" | ") : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">Violations</div>
                <div className="mt-2 space-y-2">
                  {violationRows.map((row) => (
                    <div key={row.key} className="rounded border border-slate-200 bg-white p-2">
                      <div className="text-[11px] font-mono text-slate-800">{row.key}</div>
                      <div className="mt-1 text-[11px] text-slate-600">{row.summary || "-"}</div>
                      <div className="mt-1 text-[10px] text-slate-500">default severity: {row.severityDefault || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">Events / Evidence</div>
                <div className="mt-2 space-y-1 text-[11px] text-slate-700">
                  {eventRows.map((eventType) => (
                    <div key={eventType} className="font-mono">
                      {eventType}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-slate-600">
                  이벤트 기반 공통 근거는 아래 <span className="font-semibold">Rule Triggers (Auto)</span>에서 규칙별로 확인합니다.
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700">Rule Triggers (Auto)</div>
              <div className="mt-2 space-y-2">
                {ruleRows.length === 0 ? (
                  <div className="text-[11px] text-slate-500">-</div>
                ) : (
                  ruleRows.map((row, idx) => (
                    <div key={`${row.id || "rule"}_${idx}`} className="rounded border border-slate-200 bg-white p-2">
                      <div className="text-[11px] font-mono text-slate-800">{row.id || "-"}</div>
                      <div className="mt-1 text-[11px] text-slate-600">
                        principle: <span className="font-mono">{row.principleKey || "-"}</span> / violation:{" "}
                        <span className="font-mono">{row.violationKey || "-"}</span> / scope:{" "}
                        <span className="font-mono">{row.scope || "-"}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600">{row.summary || "-"}</div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        domains: {(row.domains || []).join(", ") || "-"} / evidence:{" "}
                        {(row.evidenceFields || []).join(", ") || "-"}
                      </div>
                      <div className="mt-1 space-y-1">
                        {(row.triggerSignals || []).map((signal, signalIdx) => (
                          <div key={`${row.id || "rule"}_signal_${signalIdx}`} className="text-[10px] text-slate-600">
                            <span className="font-mono">{signal.name || "-"}</span>: {signal.description || "-"}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700">Scenario Matrix</div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-[11px] text-slate-700">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-2 py-1 font-medium">key</th>
                      <th className="px-2 py-1 font-medium">when</th>
                      <th className="px-2 py-1 font-medium">expected_action</th>
                      <th className="px-2 py-1 font-medium">expected_prompt</th>
                      <th className="px-2 py-1 font-medium">expected_events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioRows.map((row, idx) => (
                      <tr key={`${row.key || "scenario"}_${idx}`} className="border-t border-slate-200">
                        <td className="px-2 py-1 font-mono">{row.key || "-"}</td>
                        <td className="px-2 py-1">{row.when || "-"}</td>
                        <td className="px-2 py-1 font-mono">{row.expectedAction || "-"}</td>
                        <td className="px-2 py-1">{row.expectedPrompt || "-"}</td>
                        <td className="px-2 py-1 font-mono">{(row.expectedEvents || []).join(", ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </details>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={allFilteredChecked}
              onChange={(e) => toggleAllFiltered(e.target.checked)}
              className="h-4 w-4"
            />
            필터 결과 전체 선택
          </label>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as ProposalAction)}
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
          >
            <option value="apply">적용 처리</option>
            <option value="reject">거절</option>
            <option value="hold">보류</option>
            <option value="repropose">제안</option>
          </select>
          <button
            type="button"
            onClick={() => void runBulkChange()}
            disabled={selectedIds.length === 0 || busyBulk}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${actionButtonClass(bulkAction)}`}
          >
            선택 항목 일괄 {actionLabel(bulkAction)}
          </button>
          <span className="text-xs text-slate-600">선택 {selectedIds.length}건 / 결과 {filtered.length}건</span>
        </div>
      </div>

      {loading ? <div className="text-sm text-slate-500">불러오는 중...</div> : null}
      {!loading && filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">조건에 맞는 proposal이 없습니다.</div>
      ) : null}

      {filtered.map((proposal) => {
        const actions = allowedActions(proposal.status);
        const selectable = actions.length > 0;
        return (
          <div key={proposal.proposal_id} className={`rounded-xl border p-4 ${cardClass(proposal.status)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedIds.includes(proposal.proposal_id)}
                  disabled={!selectable || busyBulk}
                  onChange={(e) => toggleSelected(proposal.proposal_id, e.target.checked)}
                />
                <div className="text-sm font-semibold text-slate-900">{proposal.title}</div>
              </div>
              <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${badgeClass(proposal.status)}`}>
                {proposal.status_label}
              </span>
            </div>

            <div className="mt-2 text-xs text-slate-600">
              proposal_id:{" "}
              <button
                type="button"
                onClick={() => void copyText(`proposal_id:${proposal.proposal_id}`, proposal.proposal_id)}
                className={`${COPY_BUTTON_CLASS} group font-mono`}
                title="클릭하여 복사"
                aria-label="proposal ID 복사"
              >
                <span>{proposal.proposal_id}</span>
                <span className="text-slate-400 group-hover:text-slate-700">
                  <CopyIcon />
                </span>
                {copiedKey === `proposal_id:${proposal.proposal_id}` ? (
                  <span className="text-[10px] text-emerald-700">복사됨</span>
                ) : null}
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-600">
              org_id:{" "}
              {proposal.org_id ? (
                <button
                  type="button"
                  onClick={() => void copyText(`org_id:${proposal.proposal_id}`, proposal.org_id)}
                  className={`${COPY_BUTTON_CLASS} group font-mono`}
                  title="클릭하여 복사"
                  aria-label="org ID 복사"
                >
                  <span>{proposal.org_id}</span>
                  <span className="text-slate-400 group-hover:text-slate-700">
                    <CopyIcon />
                  </span>
                  {copiedKey === `org_id:${proposal.proposal_id}` ? (
                    <span className="text-[10px] text-emerald-700">복사됨</span>
                  ) : null}
                </button>
              ) : (
                <span className="font-mono">-</span>
              )}{" "}
              / session_id:{" "}
              {proposal.session_id ? (
                <button
                  type="button"
                  onClick={() => void copyText(`session_id:${proposal.proposal_id}`, proposal.session_id)}
                  className={`${COPY_BUTTON_CLASS} group font-mono`}
                  title="클릭하여 복사"
                  aria-label="세션 ID 복사"
                >
                  <span>{proposal.session_id}</span>
                  <span className="text-slate-400 group-hover:text-slate-700">
                    <CopyIcon />
                  </span>
                  {copiedKey === `session_id:${proposal.proposal_id}` ? (
                    <span className="text-[10px] text-emerald-700">복사됨</span>
                  ) : null}
                </button>
              ) : (
                <span className="font-mono">-</span>
              )}{" "}
              / turn_id:{" "}
              {proposal.turn_id ? (
                <button
                  type="button"
                  onClick={() => void copyText(`turn_id:${proposal.proposal_id}`, proposal.turn_id)}
                  className={`${COPY_BUTTON_CLASS} group font-mono`}
                  title="클릭하여 복사"
                  aria-label="턴 ID 복사"
                >
                  <span>{proposal.turn_id}</span>
                  <span className="text-slate-400 group-hover:text-slate-700">
                    <CopyIcon />
                  </span>
                  {copiedKey === `turn_id:${proposal.proposal_id}` ? (
                    <span className="text-[10px] text-emerald-700">복사됨</span>
                  ) : null}
                </button>
              ) : (
                <span className="font-mono">-</span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              생성시각: {formatTime(proposal.created_at)} / latest_event: <span className="font-mono">{proposal.latest_event_type}</span>
            </div>

            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">왜 실패했는지</div>
                <div className="mt-1 whitespace-pre-wrap text-slate-900">{proposal.why_failed || "-"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">어떻게 개선할지</div>
                <div className="mt-1 whitespace-pre-wrap text-slate-900">{proposal.how_to_improve || "-"}</div>
              </div>
            </div>

            <details className="mt-3 rounded-lg border border-slate-200">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-slate-700">대화 내용 / 제안 상세 / 이벤트 이력 보기</summary>
              <div className="border-t border-slate-200 p-3">
                <div className="text-xs text-slate-700">
                  principle_key: <span className="font-mono">{proposal.principle_key || "-"}</span> / runtime_scope:{" "}
                  <span className="font-mono">{proposal.runtime_scope || "-"}</span> / violation_id:{" "}
                  {proposal.violation_id ? (
                    <button
                      type="button"
                      onClick={() => void copyText(`violation_id:${proposal.proposal_id}`, proposal.violation_id)}
                      className={`${COPY_BUTTON_CLASS} group font-mono`}
                      title="클릭하여 복사"
                      aria-label="violation ID 복사"
                    >
                      <span>{proposal.violation_id}</span>
                      <span className="text-slate-400 group-hover:text-slate-700">
                        <CopyIcon />
                      </span>
                      {copiedKey === `violation_id:${proposal.proposal_id}` ? (
                        <span className="text-[10px] text-emerald-700">복사됨</span>
                      ) : null}
                    </button>
                  ) : (
                    <span className="font-mono">-</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-700">
                  principle_summary:{" "}
                  {proposal.principle_key ? principleSummaryByKey.get(proposal.principle_key) || "-" : "-"}
                </div>
                <div className="mt-2 text-xs text-slate-700">target_files: {proposal.target_files.length > 0 ? proposal.target_files.join(", ") : "-"}</div>
                <div className="mt-1 text-xs text-slate-700">change_plan: {proposal.change_plan.length > 0 ? proposal.change_plan.join(" | ") : "-"}</div>
                <div className="mt-1 text-xs text-slate-700">rationale: {proposal.rationale || "-"}</div>

                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">Violation</div>
                  <div className="mt-1 text-xs text-slate-700">summary: {proposal.violation?.summary || "-"}</div>
                  <div className="mt-1 text-xs text-slate-700">severity: {proposal.violation?.severity || "-"}</div>
                  <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px] text-slate-700">{JSON.stringify(proposal.violation?.evidence || {}, null, 2)}</pre>
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">Conversation (session snippet)</div>
                  {proposal.conversation.length === 0 ? (
                    <div className="mt-1 text-xs text-slate-500">-</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {proposal.conversation.map((turn) => (
                        <div key={turn.id} className="rounded border border-slate-200 bg-white p-2">
                          <div className="text-[11px] text-slate-500">
                            turn_id:{" "}
                            <button
                              type="button"
                              onClick={() => void copyText(`conversation_turn_id:${proposal.proposal_id}:${turn.id}`, turn.id)}
                              className={`${COPY_BUTTON_CLASS} group font-mono`}
                              title="클릭하여 복사"
                              aria-label="대화 턴 ID 복사"
                            >
                              <span>{turn.id}</span>
                              <span className="text-slate-400 group-hover:text-slate-700">
                                <CopyIcon />
                              </span>
                              {copiedKey === `conversation_turn_id:${proposal.proposal_id}:${turn.id}` ? (
                                <span className="text-[10px] text-emerald-700">복사됨</span>
                              ) : null}
                            </button>{" "}
                            / seq: {turn.seq ?? "-"} / {formatTime(turn.created_at)}
                          </div>
                          <div className="mt-1 text-xs text-slate-700">USER: {turn.user || "-"}</div>
                          <div className="mt-1 text-xs text-slate-700">BOT: {turn.bot || "-"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">Event History</div>
                  <div className="mt-2 space-y-1">
                    {proposal.event_history.map((event, idx) => (
                      <div key={`${proposal.proposal_id}_${idx}`} className="text-[11px] text-slate-700">
                        {formatTime(event.created_at)} / <span className="font-mono">{event.event_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </details>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => void copyProposalForCli(proposal)}
                disabled={busyProposalId === proposal.proposal_id || busyBulk}
              >
                제안 복사
              </button>
              <button
                type="button"
                className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                onClick={() => void reassessProposal(proposal.proposal_id).catch((err) => setError(err instanceof Error ? err.message : "제안 재평가에 실패했습니다."))}
                disabled={busyProposalId === proposal.proposal_id || busyBulk}
              >
                제안 재평가
              </button>
              {actions.length === 0 ? <span className="text-xs text-slate-400">변경 가능한 상태 액션이 없습니다.</span> : null}
              {actions.map((action) => (
                <button
                  key={`${proposal.proposal_id}_${action}`}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${actionButtonClass(action)}`}
                  onClick={() => void handleSingleAction(proposal.proposal_id, action)}
                  disabled={busyProposalId === proposal.proposal_id || busyBulk}
                >
                  {actionLabel(action)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
