import { NextRequest, NextResponse } from "next/server";
import { ensureGovernanceAccess } from "../../_lib/access";
import { fetchProposalById, insertAuditEvent } from "../../_lib/store";
import { notifyAdmins } from "../../_lib/notifier";

type ReopenBody = {
  proposal_id?: string;
  reason?: string;
};

export async function POST(req: NextRequest) {
  const access = await ensureGovernanceAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const body = (await req.json().catch(() => ({}))) as ReopenBody;
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

  const reason = String(body.reason || "").trim() || "REOPEN_BY_ADMIN";
  await insertAuditEvent({
    supabase: access.supabaseAdmin,
    sessionId: proposalEvent.session_id,
    turnId: proposalEvent.turn_id,
    eventType: "RUNTIME_PATCH_PROPOSAL_REOPENED",
    payload: {
      proposal_id: proposalId,
      reason,
      status: "proposed",
      actor: access.actor,
    },
    botContext: { org_id: access.orgId },
  });
  await notifyAdmins({
    type: "RUNTIME_PATCH_PROPOSAL_ON_HOLD",
    proposal_id: proposalId,
    runtime_scope: String((proposalEvent.payload || {}).runtime_scope || "unknown"),
    session_id: proposalEvent.session_id || undefined,
    turn_id: proposalEvent.turn_id || undefined,
    summary: "Self update proposal reopened",
    detail: { reason },
  });
  return NextResponse.json({ ok: true, proposal_id: proposalId, status: "proposed" });
}

