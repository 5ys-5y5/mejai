import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";
import { syncEndUserFromTurn, type EndUserSyncContext } from "@/app/api/runtime/chat/services/endUserRuntime";

type BackfillBody = {
  org_id?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
  turn_limit?: number;
  dry_run?: boolean;
};

function readCronSecret() {
  return String(process.env.CRON_SECRET || "").trim();
}

function readProvidedSecret(req: NextRequest) {
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  return (headerSecret || bearer).trim();
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function resolveAccess(req: NextRequest, body: BackfillBody) {
  const expected = readCronSecret();
  const provided = readProvidedSecret(req);
  if (expected && provided && provided === expected) {
    const headerOrg = String(req.headers.get("x-org-id") || "").trim();
    const orgId = headerOrg || String(body.org_id || "").trim();
    if (!orgId) {
      return { ok: false as const, status: 400, error: "ORG_ID_REQUIRED" };
    }
    return { ok: true as const, orgId };
  }

  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return { ok: false as const, status: 401, error: context.error };
  }

  const { data: access, error } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (error || !access?.is_admin) {
    return { ok: false as const, status: 403, error: "ADMIN_ONLY" };
  }

  return { ok: true as const, orgId: context.orgId };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as BackfillBody;
  const access = await resolveAccess(req, body);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const startedAt = Date.now();

  let supabase;
  try {
    supabase = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SUPABASE_ADMIN_INIT_FAILED" },
      { status: 500 }
    );
  }

  const since = parseDate(body.since);
  const until = parseDate(body.until);
  if (body.since && !since) {
    return NextResponse.json({ error: "INVALID_SINCE" }, { status: 400 });
  }
  if (body.until && !until) {
    return NextResponse.json({ error: "INVALID_UNTIL" }, { status: 400 });
  }

  const limit = Math.min(Number(body.limit || 200), 500);
  const offset = Math.max(Number(body.offset || 0), 0);
  const turnLimit = Math.min(Number(body.turn_limit || 5000), 20000);
  const dryRun = Boolean(body.dry_run);

  let sessionQuery = supabase
    .from("D_conv_sessions")
    .select("id, org_id, started_at, created_at")
    .eq("org_id", access.orgId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (since) sessionQuery = sessionQuery.gte("created_at", since);
  if (until) sessionQuery = sessionQuery.lte("created_at", until);

  const { data: sessions, error: sessionError } = await sessionQuery;
  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 400 });
  }

  const summary = {
    org_id: access.orgId,
    dry_run: dryRun,
    sessions_scanned: sessions?.length || 0,
    sessions_processed: 0,
    sessions_skipped: 0,
    turns_processed: 0,
    errors: [] as Array<{ session_id: string; error: string }>,
    duration_ms: 0,
    sessions_failed: 0,
  };

  const syncContext: EndUserSyncContext = {
    supabase,
    orgId: access.orgId,
    runtimeEndUser: null,
  };

  for (const session of sessions || []) {
    const sessionId = String((session as Record<string, any>).id || "").trim();
    if (!sessionId) {
      summary.sessions_skipped += 1;
      continue;
    }
    const { data: turns, error: turnError } = await supabase
      .from("D_conv_turns")
      .select("*")
      .eq("session_id", sessionId)
      .order("seq", { ascending: true })
      .order("created_at", { ascending: true })
      .range(0, Math.max(turnLimit - 1, 0));

    if (turnError) {
      summary.sessions_skipped += 1;
      if (summary.errors.length < 50) {
        summary.errors.push({ session_id: sessionId, error: turnError.message });
      }
      continue;
    }

    summary.sessions_processed += 1;
    if (dryRun) {
      summary.turns_processed += turns?.length || 0;
      continue;
    }

    for (const turn of turns || []) {
      const turnId = String((turn as Record<string, any>).id || "").trim();
      if (!turnId) continue;
      await syncEndUserFromTurn({
        context: syncContext,
        sessionId,
        turnId,
        turnPayload: turn as Record<string, any>,
      });
      summary.turns_processed += 1;
    }
  }

  summary.duration_ms = Date.now() - startedAt;
  summary.sessions_failed = summary.errors.length;
  try {
    await supabase.from("F_audit_events").insert({
      session_id: null,
      turn_id: null,
      event_type: "END_USER_BACKFILL_SUMMARY",
      payload: summary,
      created_at: new Date().toISOString(),
      bot_context: {
        org_id: access.orgId,
        source: "end_user_backfill",
      },
    });
  } catch (error) {
    console.warn("[end-users/backfill] failed to insert audit summary", {
      org_id: access.orgId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json(summary);
}
