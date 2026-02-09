import { NextRequest, NextResponse } from "next/server";
import { ensureGovernanceAccess } from "../../_lib/access";
import { fetchProposalById, insertAuditEvent } from "../../_lib/store";
import { notifyAdmins } from "../../_lib/notifier";

type CompleteBody = {
  proposal_id?: string;
  reason?: string;
  reviewer_note?: string;
};

export async function POST(req: NextRequest) {
  const access = await ensureGovernanceAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const body = (await req.json().catch(() => ({}))) as CompleteBody;
  const proposalId = String(body.proposal_id || "").trim();
  if (!proposalId) {
    return NextResponse.json({ error: "proposal_id is required" }, { status: 400 });
  }
  const proposalEvent = await fetchProposalById({
    supabase: access.supabaseAdmin,
    proposalId,
    lookback: 3000,
    orgId: access.orgId,
  });
  if (!proposalEvent) {
    return NextResponse.json({ error: "PROPOSAL_NOT_FOUND" }, { status: 404 });
  }

  const reason = String(body.reason || "").trim() || "MANUAL_APPLY_CONFIRMED";
  const reviewerNote = String(body.reviewer_note || "").trim() || "manual_apply_confirmed_from_settings_proposal_tab";
  const runtimeScope = String((proposalEvent.payload || {}).runtime_scope || "unknown");

  await insertAuditEvent({
    supabase: access.supabaseAdmin,
    sessionId: proposalEvent.session_id,
    turnId: proposalEvent.turn_id,
    eventType: "RUNTIME_PATCH_PROPOSAL_APPROVED",
    payload: {
      proposal_id: proposalId,
      reviewer_note: reviewerNote,
      actor: access.actor,
      apply_requested: false,
      apply_mode: "manual_external_cli",
    },
    botContext: { org_id: access.orgId },
  });

  await insertAuditEvent({
    supabase: access.supabaseAdmin,
    sessionId: proposalEvent.session_id,
    turnId: proposalEvent.turn_id,
    eventType: "RUNTIME_PATCH_APPLY_RESULT",
    payload: {
      proposal_id: proposalId,
      applied: true,
      reason,
      mode: "manual_external_cli",
      actor: access.actor,
    },
    botContext: { org_id: access.orgId },
  });

  await insertAuditEvent({
    supabase: access.supabaseAdmin,
    sessionId: proposalEvent.session_id,
    turnId: proposalEvent.turn_id,
    eventType: "RUNTIME_PATCH_PROPOSAL_COMPLETED",
    payload: {
      proposal_id: proposalId,
      status: "completed",
      apply_result: {
        applied: true,
        reason,
      },
      mode: "manual_external_cli",
      actor: access.actor,
    },
    botContext: { org_id: access.orgId },
  });

  await notifyAdmins({
    type: "RUNTIME_PATCH_PROPOSAL_COMPLETED",
    proposal_id: proposalId,
    runtime_scope: runtimeScope,
    session_id: proposalEvent.session_id || undefined,
    turn_id: proposalEvent.turn_id || undefined,
    summary: "Self update proposal marked completed by manual apply",
    detail: { reason, reviewer_note: reviewerNote },
  });

  return NextResponse.json({ ok: true, proposal_id: proposalId, status: "applied" });
}

