import { NextRequest, NextResponse } from "next/server";
import { ensureGovernanceAccess } from "../../_lib/access";
import { getPrincipleBaseline } from "../../_lib/principleBaseline";
import type { PrincipleViolation } from "../../_lib/detector";
import { buildPatchProposal } from "../../_lib/proposer";
import { fetchExceptionStats, insertAuditEvent } from "../../_lib/store";
import { SELF_HEAL_PRINCIPLE_KEYS, SELF_HEAL_VIOLATION_KEYS } from "../../selfHeal/principles";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { randomUUID } from "crypto";
import { computeExceptionFingerprint } from "../../_lib/selfHealGate";

type ReproCase = "zero_result_wrong_prompt" | "multiple_without_choice";

type ReproBody = {
  case?: ReproCase;
  persist?: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

async function createReproSessionAndTurn(input: {
  supabaseAdmin: ReturnType<typeof createAdminSupabaseClient>;
  orgId: string;
  reproCase: ReproCase;
}) {
  const startedAt = nowIso();
  const sessionCode = `repro_${input.reproCase}_${Math.random().toString(36).slice(2, 8)}`;
  const { data: session, error: sessionError } = await input.supabaseAdmin
    .from("D_conv_sessions")
    .insert({
      org_id: input.orgId,
      session_code: sessionCode,
      started_at: startedAt,
      channel: "runtime_repro",
      metadata: { source: "governance_repro_address", repro_case: input.reproCase },
    })
    .select("id")
    .single();
  if (sessionError || !session?.id) {
    throw new Error(`repro session create failed: ${sessionError?.message || "SESSION_CREATE_FAILED"}`);
  }

  const transcriptText =
    input.reproCase === "zero_result_wrong_prompt" ? "서울시 없는로 9999" : "서울시 관악구 봉천동";
  const answerText =
    input.reproCase === "zero_result_wrong_prompt"
      ? "입력하신 주소를 찾지 못했습니다. 우편번호를 입력해 주세요."
      : "우편번호를 알려주세요.";
  const { data: turn, error: turnError } = await input.supabaseAdmin
    .from("D_conv_turns")
    .insert({
      id: randomUUID(),
      session_id: String(session.id),
      seq: 1,
      transcript_text: transcriptText,
      answer_text: answerText,
      final_answer: answerText,
      bot_context: {
        source: "governance_repro_address",
        repro_case: input.reproCase,
      },
      created_at: nowIso(),
    })
    .select("id")
    .single();
  if (turnError || !turn?.id) {
    throw new Error(`repro turn create failed: ${turnError?.message || "TURN_CREATE_FAILED"}`);
  }
  return { sessionId: String(session.id), turnId: String(turn.id), transcriptText, answerText };
}

function buildViolation(input: {
  reproCase: ReproCase;
  sessionId: string;
  turnId: string;
}): PrincipleViolation {
  const unique = Date.now().toString(36);
  if (input.reproCase === "zero_result_wrong_prompt") {
    return {
      violation_id: `pv_${input.sessionId}_${input.turnId}_${SELF_HEAL_VIOLATION_KEYS.addressZeroResultWrongPrompt}_${unique}`.slice(
        0,
        128
      ),
      principle_key: SELF_HEAL_PRINCIPLE_KEYS.addressResolveZipcode,
      runtime_scope: "chat",
      session_id: input.sessionId,
      turn_id: input.turnId,
      severity: "high",
      summary: "Address search returned no result, but bot requested zipcode instead of address retry.",
      evidence: {
        search_result_count: 0,
        address_stage: "awaiting_zipcode",
        answer: "입력하신 주소를 찾지 못했습니다. 우편번호를 입력해 주세요.",
      },
    };
  }
  return {
    violation_id: `pv_${input.sessionId}_${input.turnId}_${SELF_HEAL_VIOLATION_KEYS.addressMultipleWithoutChoice}_${unique}`.slice(
      0,
      128
    ),
    principle_key: SELF_HEAL_PRINCIPLE_KEYS.addressResolveZipcode,
    runtime_scope: "chat",
    session_id: input.sessionId,
    turn_id: input.turnId,
    severity: "high",
    summary: "Address search returned multiple candidates, but selection step was skipped.",
    evidence: {
      search_result_count: 3,
      candidate_count: 3,
      address_stage: "awaiting_zipcode_confirm",
      has_candidates_presented: false,
      answer: "우편번호를 알려주세요.",
    },
  };
}

export async function POST(req: NextRequest) {
  const access = await ensureGovernanceAccess(req);
  const body = (await req.json().catch(() => ({}))) as ReproBody;
  const localBypassAllowed =
    !access.ok &&
    process.env.NODE_ENV !== "production" &&
    (req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1");
  if (!access.ok && !localBypassAllowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const orgId = access.ok
    ? access.orgId
    : String(
        (body as Record<string, unknown>).org_id ||
          req.headers.get("x-org-id") ||
          "8ad81b6b-3210-40dd-8e00-9a43a4395923"
      ).trim();
  const supabaseAdmin = access.ok ? access.supabaseAdmin : createAdminSupabaseClient();
  const actorType = access.ok ? access.actor.type : "dev_local_bypass";

  const reproCase = body.case === "zero_result_wrong_prompt" ? "zero_result_wrong_prompt" : "multiple_without_choice";
  const persist = body.persist !== false;
  let reproSession = { sessionId: "repro_session", turnId: "repro_turn", transcriptText: "서울시 관악구 봉천동", answerText: "" };
  if (persist) {
    try {
      reproSession = await createReproSessionAndTurn({
        supabaseAdmin,
        orgId,
        reproCase,
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          repro_case: reproCase,
          persisted: false,
          error: error instanceof Error ? error.message : "REPRO_SESSION_TURN_CREATE_FAILED",
        },
        { status: 500 }
      );
    }
  }
  const violation = buildViolation({
    reproCase,
    sessionId: reproSession.sessionId,
    turnId: reproSession.turnId,
  });
  const baseline = getPrincipleBaseline();
  const exceptionFingerprint = computeExceptionFingerprint(violation);
  const exceptionStats = await fetchExceptionStats({
    supabase: supabaseAdmin,
    fingerprint: exceptionFingerprint,
    orgId,
  });
  const proposal = await buildPatchProposal({
    violation,
    baseline,
    recentTurns: [
      {
        id: violation.turn_id,
        session_id: violation.session_id,
        seq: 1,
        transcript_text: reproSession.transcriptText,
        answer_text: String(violation.evidence.answer || reproSession.answerText || ""),
        final_answer: String(violation.evidence.answer || reproSession.answerText || ""),
        bot_context: { address_stage: violation.evidence.address_stage || null },
        created_at: nowIso(),
      },
    ],
    recentEvents: [],
    exceptionStats,
  });

  if (persist) {
    try {
      await insertAuditEvent({
        supabase: supabaseAdmin,
        sessionId: violation.session_id,
        turnId: violation.turn_id,
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
        },
        botContext: { org_id: orgId, actor: actorType, source: "repro_address" },
      });
      await insertAuditEvent({
        supabase: supabaseAdmin,
        sessionId: violation.session_id,
        turnId: violation.turn_id,
        eventType: "RUNTIME_PATCH_PROPOSAL_CREATED",
        payload: {
          ...(proposal as unknown as Record<string, unknown>),
          org_id: orgId,
          repro_case: reproCase,
        },
        botContext: { org_id: orgId, actor: actorType, source: "repro_address" },
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          repro_case: reproCase,
          persisted: false,
          error: error instanceof Error ? error.message : "PERSIST_FAILED",
          violation,
          proposal,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    repro_case: reproCase,
    persisted: persist,
    violation,
    proposal,
  });
}

export async function GET(req: NextRequest) {
  const access = await ensureGovernanceAccess(req);
  const localBypassAllowed =
    !access.ok &&
    process.env.NODE_ENV !== "production" &&
    (req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1");
  if (!access.ok && !localBypassAllowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const orgId = access.ok
    ? access.orgId
    : String(req.nextUrl.searchParams.get("org_id") || req.headers.get("x-org-id") || "8ad81b6b-3210-40dd-8e00-9a43a4395923").trim();
  const supabaseAdmin = access.ok ? access.supabaseAdmin : createAdminSupabaseClient();
  const limit = Math.max(1, Math.min(200, Number(req.nextUrl.searchParams.get("limit") || 40)));

  const { data, error } = await supabaseAdmin
    .from("F_audit_events")
    .select("id, session_id, turn_id, event_type, payload, created_at, bot_context")
    .eq("event_type", "RUNTIME_PATCH_PROPOSAL_CREATED")
    .order("created_at", { ascending: false })
    .limit(limit * 5);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = Array.isArray(data) ? data : [];
  const reproRows = rows
    .filter((row) => {
      const payload = row && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {};
      const payloadOrg = String(payload.org_id || "");
      return Boolean(payload.repro_case) && (!payloadOrg || payloadOrg === orgId);
    })
    .slice(0, limit)
    .map((row) => {
      const payload = row && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {};
      return {
        id: row.id,
        session_id: row.session_id,
        turn_id: row.turn_id,
        created_at: row.created_at,
        repro_case: payload.repro_case || null,
        proposal_id: payload.proposal_id || null,
        why_failed: payload.why_failed || null,
        rationale: payload.rationale || null,
        how_to_improve: payload.how_to_improve || null,
      };
    });

  return NextResponse.json({
    ok: true,
    org_id: orgId,
    count: reproRows.length,
    rows: reproRows,
  });
}
