import { NextRequest, NextResponse } from "next/server";
import { ensureGovernanceReadAccess } from "../_lib/access";
import { readGovernanceConfig } from "../_lib/config";
import { SELF_HEAL_PRINCIPLES } from "../selfHeal/principles";
import {
  SELF_HEAL_RULE_CATALOG,
  buildRuleDrivenScenarioMatrix,
  buildRuleDrivenViolationMap,
} from "../selfHeal/ruleCatalog";

type ProposalStatus = "proposed" | "approved" | "rejected" | "on_hold" | "applied" | "failed";

function readObj(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  if (text === "true" || text === "1") return true;
  if (text === "false" || text === "0") return false;
  return null;
}

function statusLabel(status: ProposalStatus) {
  if (status === "proposed") return "제안";
  if (status === "approved") return "승인";
  if (status === "rejected") return "거절";
  if (status === "on_hold") return "보류";
  if (status === "applied") return "적용";
  return "실패";
}

export async function GET(req: NextRequest) {
  const access = await ensureGovernanceReadAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!access.isAdmin) {
    return NextResponse.json({ error: "ADMIN_ONLY" }, { status: 403 });
  }

  const config = await readGovernanceConfig({
    supabase: access.supabaseAdmin,
    orgId: access.orgId,
  });

  const limit = Math.max(10, Math.min(500, Number(req.nextUrl.searchParams.get("limit") || 100)));
  const { data, error } = await access.supabaseAdmin
    .from("F_audit_events")
    .select("id, session_id, turn_id, event_type, payload, bot_context, created_at")
    .in("event_type", [
      "RUNTIME_PATCH_PROPOSAL_CREATED",
      "RUNTIME_PATCH_PROPOSAL_APPROVED",
      "RUNTIME_PATCH_PROPOSAL_REJECTED",
      "RUNTIME_PATCH_APPLY_RESULT",
      "RUNTIME_PATCH_PROPOSAL_ON_HOLD",
      "RUNTIME_PATCH_PROPOSAL_REOPENED",
      "RUNTIME_PATCH_PROPOSAL_COMPLETED",
      "RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED",
      "PRINCIPLE_VIOLATION_DETECTED",
    ])
    .order("created_at", { ascending: false })
    .limit(limit * 40);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type EventRow = {
    id: string;
    session_id: string | null;
    turn_id: string | null;
    event_type: string;
    payload: Record<string, unknown> | null;
    bot_context: Record<string, unknown> | null;
    created_at: string | null;
  };

  const rows = (data || []) as EventRow[];
  type TurnRow = {
    id: string;
    session_id: string;
    seq: number | null;
    transcript_text: string | null;
    final_answer: string | null;
    answer_text: string | null;
    created_at: string | null;
  };

  const byProposal = new Map<string, {
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
  }>();

  const lifecycleRows = rows.filter((row) => row.event_type !== "PRINCIPLE_VIOLATION_DETECTED");
  const violationRows = rows.filter((row) => row.event_type === "PRINCIPLE_VIOLATION_DETECTED");

  for (const row of [...lifecycleRows].reverse()) {
    const payload = readObj(row.payload);
    const proposalId = String(payload.proposal_id || "");
    if (!proposalId) continue;
    if (!byProposal.has(proposalId) && row.event_type !== "RUNTIME_PATCH_PROPOSAL_CREATED") continue;
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_CREATED") {
      const rawTargetFiles = Array.isArray(payload.target_files) ? payload.target_files : [];
      const rawChangePlan = Array.isArray(payload.change_plan) ? payload.change_plan : [];
      byProposal.set(proposalId, {
        proposal_id: proposalId,
        org_id: String(payload.org_id || "") || null,
        session_id: row.session_id,
        turn_id: row.turn_id,
        created_at: row.created_at,
        violation_id: String(payload.violation_id || "") || null,
        principle_key: String(payload.principle_key || "") || null,
        runtime_scope: String(payload.runtime_scope || "") || null,
        title: String(payload.title || "Self update proposal"),
        why_failed: String(payload.why_failed || "-"),
        how_to_improve: String(payload.how_to_improve || "-"),
        rationale: String(payload.rationale || "") || null,
        target_files: rawTargetFiles.map((v) => String(v)).filter(Boolean),
        change_plan: rawChangePlan.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).filter(Boolean),
        status: "proposed",
        status_label: statusLabel("proposed"),
        latest_event_type: row.event_type,
        suggested_diff: typeof payload.suggested_diff === "string" ? payload.suggested_diff : null,
        event_history: [{ event_type: row.event_type, created_at: row.created_at, payload, bot_context: readObj(row.bot_context) }],
        violation: null,
        conversation: [],
      });
      continue;
    }

    const current = byProposal.get(proposalId);
    if (!current) continue;
    current.event_history.push({
      event_type: row.event_type,
      created_at: row.created_at,
      payload,
      bot_context: readObj(row.bot_context),
    });
    current.latest_event_type = row.event_type;
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_APPROVED") current.status = "approved";
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_ON_HOLD") current.status = "on_hold";
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_REOPENED") current.status = "proposed";
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_COMPLETED") current.status = "applied";
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED") current.status = "failed";
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_REJECTED") current.status = "rejected";
    if (row.event_type === "RUNTIME_PATCH_APPLY_RESULT") {
      const applied = parseBoolean(payload.applied);
      if (applied === true) current.status = "applied";
      if (applied === false) current.status = "failed";
    }
    current.status_label = statusLabel(current.status);
  }

  const proposalList = Array.from(byProposal.values());
  const violationByKey = new Map<string, EventRow>();
  for (const row of violationRows) {
    const payload = readObj(row.payload);
    const violationId = String(payload.violation_id || "").trim();
    if (violationId && !violationByKey.has(`violation:${violationId}`)) {
      violationByKey.set(`violation:${violationId}`, row);
    }
    if (row.turn_id && !violationByKey.has(`turn:${row.turn_id}`)) {
      violationByKey.set(`turn:${row.turn_id}`, row);
    }
  }
  for (const proposal of proposalList) {
    const hit =
      (proposal.violation_id && violationByKey.get(`violation:${proposal.violation_id}`)) ||
      (proposal.turn_id && violationByKey.get(`turn:${proposal.turn_id}`)) ||
      null;
    if (!hit) continue;
    const payload = readObj(hit.payload);
    proposal.violation = {
      summary: String(payload.summary || "") || null,
      severity: String(payload.severity || "") || null,
      evidence: payload.evidence && typeof payload.evidence === "object" ? (payload.evidence as Record<string, unknown>) : null,
    };
    const violationEventKey = `${hit.event_type}::${String(hit.created_at || "")}`;
    const hasViolationEventInHistory = proposal.event_history.some(
      (evt) => `${evt.event_type}::${String(evt.created_at || "")}` === violationEventKey
    );
    if (!hasViolationEventInHistory) {
      proposal.event_history.push({
        event_type: hit.event_type,
        created_at: hit.created_at,
        payload,
        bot_context: readObj(hit.bot_context),
      });
    }
  }

  const proposalTurnIds = Array.from(
    new Set(
      proposalList
        .map((proposal) => String(proposal.turn_id || "").trim())
        .filter(Boolean)
    )
  );
  if (proposalTurnIds.length > 0) {
    const { data: runtimeRows, error: runtimeRowsError } = await access.supabaseAdmin
      .from("F_audit_events")
      .select("id, session_id, turn_id, event_type, payload, bot_context, created_at")
      .in("turn_id", proposalTurnIds)
      .order("created_at", { ascending: true })
      .limit(Math.max(500, proposalTurnIds.length * 30));
    let effectiveRuntimeRows = (runtimeRows || []) as EventRow[];
    if (runtimeRowsError || effectiveRuntimeRows.length === 0) {
      const fallbackRows: EventRow[] = [];
      for (const turnId of proposalTurnIds) {
        const { data: oneTurnRows } = await access.supabaseAdmin
          .from("F_audit_events")
          .select("id, session_id, turn_id, event_type, payload, bot_context, created_at")
          .eq("turn_id", turnId)
          .order("created_at", { ascending: true })
          .limit(60);
        fallbackRows.push(...(((oneTurnRows || []) as EventRow[])));
      }
      effectiveRuntimeRows = fallbackRows;
    }
    const runtimeByTurnId = new Map<string, Array<{
      event_type: string;
      created_at: string | null;
      payload: Record<string, unknown>;
      bot_context?: Record<string, unknown>;
    }>>();
    for (const row of effectiveRuntimeRows) {
      const turnId = String(row.turn_id || "").trim();
      if (!turnId) continue;
      const payload = readObj(row.payload);
      const arr = runtimeByTurnId.get(turnId) || [];
      arr.push({ event_type: row.event_type, created_at: row.created_at, payload, bot_context: readObj(row.bot_context) });
      runtimeByTurnId.set(turnId, arr);
    }
    for (const proposal of proposalList) {
      const turnId = String(proposal.turn_id || "").trim();
      if (!turnId) continue;
      const runtimeEvents = runtimeByTurnId.get(turnId) || [];
      if (runtimeEvents.length === 0) continue;
      const seen = new Set(
        proposal.event_history.map((evt) => `${evt.event_type}::${String(evt.created_at || "")}`)
      );
      for (const evt of runtimeEvents) {
        const key = `${evt.event_type}::${String(evt.created_at || "")}`;
        if (seen.has(key)) continue;
        proposal.event_history.push(evt);
      }
    }
  }

  const sessionIds = Array.from(
    new Set(
      proposalList
        .map((proposal) => String(proposal.session_id || "").trim())
        .filter(Boolean)
    )
  );
  const turnsBySession = new Map<string, TurnRow[]>();
  for (const sessionId of sessionIds) {
    const { data: turnRows } = await access.supabaseAdmin
      .from("D_conv_turns")
      .select("id, session_id, seq, transcript_text, final_answer, answer_text, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(200);
    turnsBySession.set(sessionId, (turnRows || []) as TurnRow[]);
  }
  for (const proposal of proposalList) {
    const sessionId = String(proposal.session_id || "").trim();
    if (!sessionId) continue;
    const turns = turnsBySession.get(sessionId) || [];
    if (turns.length === 0) continue;
    const targetIdx = proposal.turn_id ? turns.findIndex((item) => item.id === proposal.turn_id) : -1;
    const slice =
      targetIdx >= 0
        ? turns.slice(Math.max(0, targetIdx - 2), Math.min(turns.length, targetIdx + 3))
        : turns.slice(Math.max(0, turns.length - 5));
    proposal.conversation = slice.map((item) => ({
      id: item.id,
      seq: item.seq,
      created_at: item.created_at,
      user: item.transcript_text || null,
      bot: item.final_answer || item.answer_text || null,
    }));
    proposal.event_history.sort((a, b) => Date.parse(String(a.created_at || "")) - Date.parse(String(b.created_at || "")));
  }

  const proposals = proposalList
    .sort((a, b) => Date.parse(String(b.created_at || "")) - Date.parse(String(a.created_at || "")))
    .slice(0, limit);

  const catalogPrincipleKeys = new Set(SELF_HEAL_RULE_CATALOG.map((rule) => String(rule.principleKey || "")));
  const principleEntries = Object.entries(SELF_HEAL_PRINCIPLES.principle || {}).filter(([, value]) =>
    catalogPrincipleKeys.has(String(value?.key || ""))
  );
  const catalogPrinciples = Object.fromEntries(principleEntries);

  return NextResponse.json({
    ok: true,
    proposals,
    config,
    viewer: { is_admin: access.isAdmin },
    self_heal_map: {
      registry: SELF_HEAL_PRINCIPLES.registry,
      principle: catalogPrinciples,
      event: SELF_HEAL_PRINCIPLES.event,
      violation: buildRuleDrivenViolationMap(),
      evidenceContract: {},
      scenarioMatrix: buildRuleDrivenScenarioMatrix(),
      ruleCatalog: SELF_HEAL_RULE_CATALOG,
    },
  });
}
