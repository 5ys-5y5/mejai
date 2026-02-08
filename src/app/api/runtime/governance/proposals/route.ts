import { NextRequest, NextResponse } from "next/server";
import { ensureGovernanceReadAccess } from "../_lib/access";
import { readGovernanceConfig } from "../_lib/config";

type ProposalStatus = "pending" | "completed" | "failed" | "on_hold";

function readObj(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export async function GET(req: NextRequest) {
  const access = await ensureGovernanceReadAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const config = await readGovernanceConfig({
    supabase: access.supabaseAdmin,
    orgId: access.orgId,
  });
  if (config.visibility_mode === "admin" && !access.isAdmin) {
    return NextResponse.json({ ok: true, hidden: true, proposals: [], config });
  }
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
      "RUNTIME_PATCH_PROPOSAL_COMPLETED",
      "RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED",
    ])
    .order("created_at", { ascending: false })
    .limit(limit * 10);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as Array<{
    id: string;
    session_id: string | null;
    turn_id: string | null;
    event_type: string;
    payload: Record<string, unknown> | null;
    bot_context: Record<string, unknown> | null;
    created_at: string | null;
  }>;

  const byProposal = new Map<string, {
    proposal_id: string;
    session_id: string | null;
    turn_id: string | null;
    created_at: string | null;
    title: string;
    why_failed: string;
    how_to_improve: string;
    status: ProposalStatus;
    latest_event_type: string;
    suggested_diff: string | null;
  }>();

  for (const row of [...rows].reverse()) {
    const payload = readObj(row.payload);
    const botContext = readObj(row.bot_context);
    const payloadOrgId = String(payload.org_id || "");
    const contextOrgId = String(botContext.org_id || "");
    if (payloadOrgId && payloadOrgId !== access.orgId) continue;
    if (!payloadOrgId && contextOrgId && contextOrgId !== access.orgId) continue;
    const proposalId = String(payload.proposal_id || "");
    if (!proposalId) continue;
    if (!byProposal.has(proposalId) && row.event_type !== "RUNTIME_PATCH_PROPOSAL_CREATED") continue;
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_CREATED") {
      byProposal.set(proposalId, {
        proposal_id: proposalId,
        session_id: row.session_id,
        turn_id: row.turn_id,
        created_at: row.created_at,
        title: String(payload.title || "Self update proposal"),
        why_failed: String(payload.why_failed || "-"),
        how_to_improve: String(payload.how_to_improve || "-"),
        status: "pending",
        latest_event_type: row.event_type,
        suggested_diff: typeof payload.suggested_diff === "string" ? payload.suggested_diff : null,
      });
      continue;
    }
    const current = byProposal.get(proposalId);
    if (!current) continue;
    current.latest_event_type = row.event_type;
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_ON_HOLD") current.status = "on_hold";
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_COMPLETED") current.status = "completed";
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED") current.status = "failed";
    if (row.event_type === "RUNTIME_PATCH_PROPOSAL_REJECTED") current.status = "on_hold";
    if (row.event_type === "RUNTIME_PATCH_APPLY_RESULT") {
      const applied = Boolean(payload.applied);
      current.status = applied ? "completed" : "failed";
    }
  }

  const proposals = Array.from(byProposal.values())
    .sort((a, b) => Date.parse(String(b.created_at || "")) - Date.parse(String(a.created_at || "")))
    .slice(0, limit);

  return NextResponse.json({ ok: true, proposals, config, viewer: { is_admin: access.isAdmin } });
}
