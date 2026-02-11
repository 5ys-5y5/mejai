import { NextRequest, NextResponse } from "next/server";
import { ensureGovernanceAccess } from "../_lib/access";
import { getPrincipleBaseline } from "../_lib/principleBaseline";
import { detectPrincipleViolations, type RuntimeEvent, type RuntimeMcpAudit, type RuntimeTurn } from "../_lib/detector";
import { buildPatchProposal } from "../_lib/proposer";
import { notifyAdmins } from "../_lib/notifier";
import {
  fetchEventsForSessions,
  fetchExceptionStats,
  fetchMcpForSessions,
  fetchRecentTurns,
  insertAuditEvent,
} from "../_lib/store";
import { readGovernanceConfig } from "../_lib/config";
import { computeExceptionFingerprint } from "../_lib/selfHealGate";

type ReviewBody = {
  session_id?: string;
  limit?: number;
  dry_run?: boolean;
};

function toTurnEventMap(eventsBySession: Map<string, RuntimeEvent[]>) {
  const map = new Map<string, RuntimeEvent[]>();
  for (const events of eventsBySession.values()) {
    for (const event of events) {
      if (!event.turn_id) continue;
      const list = map.get(event.turn_id) || [];
      list.push(event);
      map.set(event.turn_id, list);
    }
  }
  return map;
}

function toTurnMcpMap(rowsBySession: Map<string, RuntimeMcpAudit[]>) {
  const map = new Map<string, RuntimeMcpAudit[]>();
  for (const rows of rowsBySession.values()) {
    for (const row of rows) {
      if (!row.turn_id) continue;
      const list = map.get(row.turn_id) || [];
      list.push(row);
      map.set(row.turn_id, list);
    }
  }
  return map;
}

function nearbyTurns(turns: RuntimeTurn[], sessionId: string, turnId: string) {
  const scoped = turns.filter((turn) => turn.session_id === sessionId).sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));
  const idx = scoped.findIndex((turn) => turn.id === turnId);
  if (idx < 0) return [];
  return scoped.slice(Math.max(0, idx - 1), Math.min(scoped.length, idx + 2));
}

export async function POST(req: NextRequest) {
  const access = await ensureGovernanceAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await req.json().catch(() => ({}))) as ReviewBody;
  const limit = Math.max(10, Math.min(300, Number(body.limit || 120)));
  const dryRun = Boolean(body.dry_run);
  const baseline = getPrincipleBaseline();
  const config = await readGovernanceConfig({
    supabase: access.supabaseAdmin,
    orgId: access.orgId,
  });
  if (!config.enabled) {
    return NextResponse.json({
      ok: true,
      dry_run: dryRun,
      skipped: true,
      reason: "SELF_UPDATE_DISABLED",
      config,
    });
  }

  const turns = await fetchRecentTurns({
    supabase: access.supabaseAdmin,
    orgId: access.orgId,
    sessionId: body.session_id ? String(body.session_id) : null,
    limit,
  });
  const sessionIds = Array.from(new Set(turns.map((turn) => String(turn.session_id || "")).filter(Boolean)));
  const eventsBySession = await fetchEventsForSessions({
    supabase: access.supabaseAdmin,
    sessionIds,
    limitPerSession: 300,
  });
  const mcpBySession = await fetchMcpForSessions({
    supabase: access.supabaseAdmin,
    sessionIds,
    limitPerSession: 300,
  });
  const eventsByTurnId = toTurnEventMap(eventsBySession);
  const mcpByTurnId = toTurnMcpMap(mcpBySession);
  const violations = detectPrincipleViolations({ turns, eventsByTurnId, mcpByTurnId, baseline });

  const createdProposalIds: string[] = [];
  for (const violation of violations) {
    const localTurns = nearbyTurns(turns, violation.session_id, violation.turn_id);
    const localEvents = eventsByTurnId.get(violation.turn_id) || [];
    const fingerprint = computeExceptionFingerprint(violation);
    const exceptionStats = await fetchExceptionStats({
      supabase: access.supabaseAdmin,
      fingerprint,
      orgId: access.orgId,
    });
    const proposal = await buildPatchProposal({
      violation,
      baseline,
      recentTurns: localTurns,
      recentEvents: localEvents,
      exceptionStats,
    });

    if (!dryRun) {
      await insertAuditEvent({
        supabase: access.supabaseAdmin,
        sessionId: violation.session_id,
        turnId: violation.turn_id,
        eventType: "PRINCIPLE_VIOLATION_DETECTED",
        payload: {
          org_id: access.orgId,
          violation_id: violation.violation_id,
          principle_key: violation.principle_key,
          runtime_scope: violation.runtime_scope,
          summary: violation.summary,
          severity: violation.severity,
          evidence: violation.evidence,
          baseline_source: baseline.source,
        },
        botContext: { org_id: access.orgId },
      });
      await insertAuditEvent({
        supabase: access.supabaseAdmin,
        sessionId: violation.session_id,
        turnId: violation.turn_id,
        eventType: "RUNTIME_PATCH_PROPOSAL_CREATED",
        payload: {
          ...(proposal as unknown as Record<string, unknown>),
          org_id: access.orgId,
        },
        botContext: { org_id: access.orgId, actor: access.actor.type },
      });
    }

    createdProposalIds.push(proposal.proposal_id);
    await notifyAdmins({
      type: "RUNTIME_PATCH_PROPOSAL_CREATED",
      proposal_id: proposal.proposal_id,
      violation_id: violation.violation_id,
      runtime_scope: violation.runtime_scope,
      session_id: violation.session_id,
      turn_id: violation.turn_id,
      summary: proposal.title,
      detail: {
        principle_key: violation.principle_key,
        severity: violation.severity,
        dry_run: dryRun,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    config,
    baseline,
    scanned_turns: turns.length,
    scanned_sessions: sessionIds.length,
    violation_count: violations.length,
    proposal_ids: createdProposalIds,
  });
}
