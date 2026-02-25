import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";

type AggregateBody = {
  agent_id?: string;
  limit?: number;
  offset?: number;
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

async function resolveAccess(req: NextRequest, body: AggregateBody) {
  const expected = readCronSecret();
  const provided = readProvidedSecret(req);
  if (expected && provided && provided === expected) {
    const headerOrg = String(req.headers.get("x-agent-id") || "").trim();
    const agentId = headerOrg || String(body.agent_id || "").trim();
    if (!agentId) {
      return { ok: false as const, status: 400, error: "AGENT_ID_REQUIRED" };
    }
    return { ok: true as const, agentId };
  }

  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return { ok: false as const, status: 401, error: context.error };
  }

  if (!context.isAdmin) {
    return { ok: false as const, status: 403, error: "ADMIN_ONLY" };
  }

  return { ok: true as const, agentId: context.agentId };
}

function parseTime(value: string | null) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as AggregateBody;
  const access = await resolveAccess(req, body);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let supabase;
  try {
    supabase = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SUPABASE_ADMIN_INIT_FAILED" },
      { status: 500 }
    );
  }

  const limit = Math.min(Number(body.limit || 200), 500);
  const offset = Math.max(Number(body.offset || 0), 0);
  const dryRun = Boolean(body.dry_run);
  const startedAt = Date.now();

  const { data: users, error: userError } = await supabase
    .from("A_end_users")
    .select("id, agent_id")
    .eq("agent_id", access.agentId)
    .is("deleted_at", null)
    .order("last_seen_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 });
  }

  const summary = {
    agent_id: access.agentId,
    dry_run: dryRun,
    users_scanned: users?.length || 0,
    users_processed: 0,
    users_failed: 0,
    summaries_updated: 0,
    duration_ms: 0,
    errors: [] as Array<{ end_user_id: string; error: string }>,
  };

  for (const user of users || []) {
    const endUserId = String((user as Record<string, any>).id || "").trim();
    if (!endUserId) continue;
    try {
      const { data: latestSession } = await supabase
        .from("A_end_user_sessions")
        .select("session_id, started_at, ended_at, summary_text")
        .eq("agent_id", access.agentId)
        .eq("end_user_id", endUserId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: sessionsCount } = await supabase
        .from("A_end_user_sessions")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", access.agentId)
        .eq("end_user_id", endUserId);

      const lastSeenTime = parseTime(latestSession?.ended_at || null) ?? parseTime(latestSession?.started_at || null);
      const lastSeen = lastSeenTime ? new Date(lastSeenTime).toISOString() : null;
      if (!dryRun) {
        await supabase
          .from("A_end_users")
          .update({
            sessions_count: sessionsCount ?? 0,
            has_chat: (sessionsCount ?? 0) > 0,
            last_seen_at: lastSeen,
            last_session_id: latestSession?.session_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("agent_id", access.agentId)
          .eq("id", endUserId);

        if (latestSession?.summary_text) {
          await supabase.from("A_end_user_summaries").upsert(
            {
              agent_id: access.agentId,
              end_user_id: endUserId,
              summary_text: latestSession.summary_text,
              source_session_id: latestSession.session_id || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "agent_id,end_user_id" }
          );
          summary.summaries_updated += 1;
        }
      }
      summary.users_processed += 1;
    } catch (error) {
      summary.users_failed += 1;
      if (summary.errors.length < 50) {
        summary.errors.push({
          end_user_id: endUserId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  summary.duration_ms = Date.now() - startedAt;
  try {
    await supabase.from("F_audit_events").insert({
      session_id: null,
      turn_id: null,
      event_type: "END_USER_AGGREGATE_SUMMARY",
      payload: summary,
      created_at: new Date().toISOString(),
      bot_context: { agent_id: access.agentId, source: "end_user_aggregate" },
    });
  } catch (error) {
    console.warn("[end-users/aggregate] failed to insert audit summary", {
      agent_id: access.agentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json(summary);
}
