import { NextRequest, NextResponse } from "next/server";
import { ensureGovernanceAccess } from "../../_lib/access";
import { fetchProposalById, insertAuditEvent } from "../../_lib/store";
import { notifyAdmins } from "../../_lib/notifier";
import { applyApprovedPatch } from "../../_lib/apply";

type ApproveBody = {
  proposal_id?: string;
  approve?: boolean;
  apply?: boolean;
  reviewer_note?: string;
};

type ApplyResult = {
  applied: boolean;
  reason?: string;
};

function readPayloadObject(payload: unknown) {
  if (!payload || typeof payload !== "object") return {} as Record<string, unknown>;
  return payload as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const access = await ensureGovernanceAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await req.json().catch(() => ({}))) as ApproveBody;
  const proposalId = String(body.proposal_id || "").trim();
  const approve = body.approve !== false;
  const apply = Boolean(body.apply);
  const reviewerNote = String(body.reviewer_note || "").trim();
  if (!proposalId) {
    return NextResponse.json({ error: "proposal_id is required" }, { status: 400 });
  }

  const proposalEvent = await fetchProposalById({
    supabase: access.supabaseAdmin,
    proposalId,
    lookback: 2000,
    orgId: access.orgId,
  });
  if (!proposalEvent) {
    return NextResponse.json({ error: "PROPOSAL_NOT_FOUND" }, { status: 404 });
  }
  const payload = readPayloadObject(proposalEvent.payload);
  const runtimeScope = String(payload.runtime_scope || "unknown");
  const turnId = proposalEvent.turn_id;
  const sessionId = proposalEvent.session_id;

  if (!approve) {
    await insertAuditEvent({
      supabase: access.supabaseAdmin,
      sessionId,
      turnId,
      eventType: "RUNTIME_PATCH_PROPOSAL_REJECTED",
      payload: {
        proposal_id: proposalId,
        reviewer_note: reviewerNote || null,
        actor: access.actor,
      },
      botContext: { org_id: access.orgId },
    });
    await notifyAdmins({
      type: "RUNTIME_PATCH_PROPOSAL_REJECTED",
      proposal_id: proposalId,
      runtime_scope: runtimeScope,
      session_id: sessionId || undefined,
      turn_id: turnId || undefined,
      summary: "Proposal rejected",
      detail: { reviewer_note: reviewerNote || null },
    });
    return NextResponse.json({ ok: true, proposal_id: proposalId, status: "rejected" });
  }

  await insertAuditEvent({
    supabase: access.supabaseAdmin,
    sessionId,
    turnId,
    eventType: "RUNTIME_PATCH_PROPOSAL_APPROVED",
    payload: {
      proposal_id: proposalId,
      reviewer_note: reviewerNote || null,
      actor: access.actor,
      apply_requested: apply,
    },
    botContext: { org_id: access.orgId },
  });

  let applyResult: ApplyResult = { applied: false, reason: "APPLY_NOT_REQUESTED" };
  if (apply) {
    const suggestedDiff = typeof payload.suggested_diff === "string" ? payload.suggested_diff : null;
    const result = await applyApprovedPatch({
      repositoryRoot: process.cwd(),
      unifiedDiff: suggestedDiff,
    });
    applyResult = result;
    await insertAuditEvent({
      supabase: access.supabaseAdmin,
      sessionId,
      turnId,
      eventType: "RUNTIME_PATCH_APPLY_RESULT",
      payload: {
        proposal_id: proposalId,
        ...applyResult,
      },
      botContext: { org_id: access.orgId },
    });
    const applied = Boolean(applyResult.applied);
    await insertAuditEvent({
      supabase: access.supabaseAdmin,
      sessionId,
      turnId,
      eventType: applied ? "RUNTIME_PATCH_PROPOSAL_COMPLETED" : "RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED",
      payload: {
        proposal_id: proposalId,
        status: applied ? "completed" : "execution_failed",
        apply_result: applyResult,
      },
      botContext: { org_id: access.orgId },
    });
  }

  await notifyAdmins({
    type: "RUNTIME_PATCH_PROPOSAL_APPROVED",
    proposal_id: proposalId,
    runtime_scope: runtimeScope,
    session_id: sessionId || undefined,
    turn_id: turnId || undefined,
    summary: "Proposal approved",
    detail: {
      apply_requested: apply,
      apply_result: applyResult,
      reviewer_note: reviewerNote || null,
    },
  });

  return NextResponse.json({
    ok: true,
    proposal_id: proposalId,
    status: "approved",
    apply_result: applyResult,
  });
}
