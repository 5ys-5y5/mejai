import { NextRequest, NextResponse } from "next/server";
import { ensureGovernanceAccess } from "../../_lib/access";
import { fetchExceptionStats, fetchProposalById, insertAuditEvent } from "../../_lib/store";
import { buildPatchProposal } from "../../_lib/proposer";
import { getPrincipleBaseline } from "../../_lib/principleBaseline";
import type { PrincipleViolation, RuntimeEvent, RuntimeTurn } from "../../_lib/detector";
import { computeExceptionFingerprint } from "../../_lib/selfHealGate";

type ReassessBody = {
  proposal_id?: string;
};

function readObj(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeSeverity(value: unknown): "medium" | "high" {
  const raw = String(value || "").trim().toLowerCase();
  return raw === "high" ? "high" : "medium";
}

export async function POST(req: NextRequest) {
  const access = await ensureGovernanceAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const body = (await req.json().catch(() => ({}))) as ReassessBody;
  const proposalId = String(body.proposal_id || "").trim();
  if (!proposalId) {
    return NextResponse.json({ error: "proposal_id is required" }, { status: 400 });
  }

  const sourceProposal = await fetchProposalById({
    supabase: access.supabaseAdmin,
    proposalId,
    lookback: 5000,
    orgId: access.orgId,
  });
  if (!sourceProposal) {
    return NextResponse.json({ error: "PROPOSAL_NOT_FOUND" }, { status: 404 });
  }

  const sourcePayload = readObj(sourceProposal.payload);
  const sessionId = String(sourceProposal.session_id || sourcePayload.session_id || "").trim();
  const turnId = String(sourceProposal.turn_id || sourcePayload.turn_id || "").trim();
  const violationId = String(sourcePayload.violation_id || "").trim();
  if (!sessionId || !turnId) {
    return NextResponse.json({ error: "INVALID_SOURCE_PROPOSAL_CONTEXT" }, { status: 400 });
  }

  const { data: eventRows, error: eventError } = await access.supabaseAdmin
    .from("F_audit_events")
    .select("id, session_id, turn_id, event_type, payload, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(600);
  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  const allEvents = (eventRows || []) as RuntimeEvent[];
  const localEvents = allEvents.filter((row) => String(row.turn_id || "") === turnId);

  const violationEvent =
    allEvents.find((row) => {
      if (String(row.event_type || "").toUpperCase() !== "PRINCIPLE_VIOLATION_DETECTED") return false;
      const payload = readObj(row.payload);
      if (violationId && String(payload.violation_id || "") === violationId) return true;
      return String(row.turn_id || "") === turnId;
    }) || null;
  if (!violationEvent) {
    return NextResponse.json({ error: "VIOLATION_NOT_FOUND" }, { status: 404 });
  }

  const violationPayload = readObj(violationEvent.payload);
  const violation: PrincipleViolation = {
    violation_id: String(violationPayload.violation_id || violationId || `pv_${sessionId}_${turnId}_manual_reassess`),
    principle_key: String(violationPayload.principle_key || "memory.enforceNoRepeatQuestions"),
    runtime_scope: String(violationPayload.runtime_scope || "chat"),
    session_id: sessionId,
    turn_id: turnId,
    severity: normalizeSeverity(violationPayload.severity),
    summary: String(violationPayload.summary || "Principle violation detected"),
    evidence: readObj(violationPayload.evidence),
  };

  const { data: turnRows, error: turnError } = await access.supabaseAdmin
    .from("D_conv_turns")
    .select("id, session_id, seq, transcript_text, answer_text, final_answer, bot_context, created_at")
    .eq("session_id", sessionId)
    .order("seq", { ascending: true })
    .limit(80);
  if (turnError) {
    return NextResponse.json({ error: turnError.message }, { status: 500 });
  }
  const turns = (turnRows || []) as RuntimeTurn[];
  const targetIdx = turns.findIndex((row) => row.id === turnId);
  const recentTurns =
    targetIdx >= 0 ? turns.slice(Math.max(0, targetIdx - 2), Math.min(turns.length, targetIdx + 3)) : turns.slice(-5);

  const baseline = getPrincipleBaseline();
  const exceptionFingerprint = computeExceptionFingerprint(violation);
  const exceptionStats = await fetchExceptionStats({
    supabase: access.supabaseAdmin,
    fingerprint: exceptionFingerprint,
    orgId: access.orgId,
  });
  const proposal = await buildPatchProposal({
    violation,
    baseline,
    recentTurns,
    recentEvents: localEvents,
    exceptionStats,
  });

  await insertAuditEvent({
    supabase: access.supabaseAdmin,
    sessionId,
    turnId,
    eventType: "RUNTIME_PATCH_PROPOSAL_CREATED",
    payload: {
      ...(proposal as unknown as Record<string, unknown>),
      org_id: access.orgId,
      trigger: "manual_reassess",
      source_proposal_id: proposalId,
    },
    botContext: { org_id: access.orgId, actor: "runtime_self_update_manual_reassess" },
  });

  return NextResponse.json({
    ok: true,
    source_proposal_id: proposalId,
    proposal_id: proposal.proposal_id,
    status: "proposed",
  });
}

