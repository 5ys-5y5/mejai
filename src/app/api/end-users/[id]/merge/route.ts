import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

type MergeBody = {
  target_id?: string;
};

function readString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function pickNonEmpty(primary: unknown, fallback: unknown) {
  return readString(primary) ?? readString(fallback);
}

function mergeTags(primary: string[] | null | undefined, secondary: string[] | null | undefined) {
  const merged = new Set<string>();
  (primary || []).forEach((tag) => {
    const v = String(tag || "").trim();
    if (v) merged.add(v);
  });
  (secondary || []).forEach((tag) => {
    const v = String(tag || "").trim();
    if (v) merged.add(v);
  });
  return Array.from(merged);
}

function mergeAttributes(primary: Record<string, any> | null, secondary: Record<string, any> | null) {
  return { ...(secondary || {}), ...(primary || {}) };
}

function parseTime(value: string | null) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function minTime(a: string | null, b: string | null) {
  const ta = parseTime(a);
  const tb = parseTime(b);
  if (ta === null && tb === null) return null;
  if (ta === null) return b;
  if (tb === null) return a;
  return ta <= tb ? a : b;
}

function maxTime(a: string | null, b: string | null) {
  const ta = parseTime(a);
  const tb = parseTime(b);
  if (ta === null && tb === null) return null;
  if (ta === null) return b;
  if (tb === null) return a;
  return ta >= tb ? a : b;
}

async function requireAdmin(authHeader: string, cookieHeader: string) {
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
  return { ok: true as const, context };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const admin = await requireAdmin(authHeader, cookieHeader);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id: sourceId } = await context.params;
  const body = (await req.json().catch(() => ({}))) as MergeBody;
  const targetId = String(body.target_id || "").trim();

  if (!targetId) {
    return NextResponse.json({ error: "TARGET_ID_REQUIRED" }, { status: 400 });
  }
  if (sourceId === targetId) {
    return NextResponse.json({ error: "SAME_TARGET" }, { status: 400 });
  }

  const supabase = admin.context.supabase;
  const orgId = admin.context.orgId;

  const { data: sourceUser } = await supabase
    .from("A_end_users")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", sourceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!sourceUser) {
    return NextResponse.json({ error: "SOURCE_NOT_FOUND" }, { status: 404 });
  }

  const { data: targetUser } = await supabase
    .from("A_end_users")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", targetId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!targetUser) {
    return NextResponse.json({ error: "TARGET_NOT_FOUND" }, { status: 404 });
  }

  const now = new Date().toISOString();

  await supabase
    .from("A_end_user_sessions")
    .update({ end_user_id: targetId })
    .eq("org_id", orgId)
    .eq("end_user_id", sourceId);
  await supabase
    .from("A_end_user_messages")
    .update({ end_user_id: targetId })
    .eq("org_id", orgId)
    .eq("end_user_id", sourceId);
  await supabase
    .from("A_end_user_memories")
    .update({ end_user_id: targetId })
    .eq("org_id", orgId)
    .eq("end_user_id", sourceId);
  await supabase
    .from("A_end_user_response_materials")
    .update({ end_user_id: targetId })
    .eq("org_id", orgId)
    .eq("end_user_id", sourceId);
  await supabase
    .from("A_end_user_session_resources")
    .update({ end_user_id: targetId })
    .eq("org_id", orgId)
    .eq("end_user_id", sourceId);

  const { data: sourceIdentities } = await supabase
    .from("A_end_user_identities")
    .select("identity_type, identity_value, identity_hash")
    .eq("org_id", orgId)
    .eq("end_user_id", sourceId);
  const { data: targetIdentities } = await supabase
    .from("A_end_user_identities")
    .select("identity_hash")
    .eq("org_id", orgId)
    .eq("end_user_id", targetId);
  const targetHashes = new Set((targetIdentities || []).map((row) => String(row.identity_hash || "")));
  const identityRows = (sourceIdentities || [])
    .filter((row) => row.identity_hash && !targetHashes.has(String(row.identity_hash)))
    .map((row) => ({
      org_id: orgId,
      end_user_id: targetId,
      identity_type: row.identity_type,
      identity_value: row.identity_value,
      identity_hash: row.identity_hash,
      is_primary: false,
      created_at: now,
    }));
  if (identityRows.length > 0) {
    await supabase.from("A_end_user_identities").insert(identityRows);
  }
  await supabase
    .from("A_end_user_identities")
    .delete()
    .eq("org_id", orgId)
    .eq("end_user_id", sourceId);

  const { data: summaries } = await supabase
    .from("A_end_user_summaries")
    .select("end_user_id, summary_text, updated_at, source_session_id")
    .eq("org_id", orgId)
    .in("end_user_id", [sourceId, targetId]);
  const latestSummary = (summaries || [])
    .filter((row) => row.summary_text)
    .sort((a, b) => {
      const aTime = parseTime(a.updated_at) ?? 0;
      const bTime = parseTime(b.updated_at) ?? 0;
      return bTime - aTime;
    })[0];
  if (latestSummary?.summary_text) {
    await supabase.from("A_end_user_summaries").upsert(
      {
        org_id: orgId,
        end_user_id: targetId,
        summary_text: latestSummary.summary_text,
        source_session_id: latestSummary.source_session_id,
        updated_at: latestSummary.updated_at || now,
      },
      { onConflict: "org_id,end_user_id" }
    );
  }
  await supabase
    .from("A_end_user_summaries")
    .delete()
    .eq("org_id", orgId)
    .eq("end_user_id", sourceId);

  const mergedTags = mergeTags(targetUser.tags, sourceUser.tags);
  const mergedAttributes = mergeAttributes(targetUser.attributes || null, sourceUser.attributes || null);
  const mergedFirstSeen = minTime(targetUser.first_seen_at, sourceUser.first_seen_at);
  const mergedLastSeen = maxTime(targetUser.last_seen_at, sourceUser.last_seen_at);

  const { data: latestSession } = await supabase
    .from("A_end_user_sessions")
    .select("session_id, started_at, ended_at")
    .eq("org_id", orgId)
    .eq("end_user_id", targetId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: sessionsCount } = await supabase
    .from("A_end_user_sessions")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("end_user_id", targetId);

  const lastSeen = maxTime(
    latestSession?.ended_at || latestSession?.started_at || null,
    mergedLastSeen
  );

  await supabase
    .from("A_end_users")
    .update({
      display_name: pickNonEmpty(targetUser.display_name, sourceUser.display_name),
      email: pickNonEmpty(targetUser.email, sourceUser.email),
      phone: pickNonEmpty(targetUser.phone, sourceUser.phone),
      member_id: pickNonEmpty(targetUser.member_id, sourceUser.member_id),
      external_user_id: pickNonEmpty(targetUser.external_user_id, sourceUser.external_user_id),
      locale: pickNonEmpty(targetUser.locale, sourceUser.locale),
      time_zone: pickNonEmpty(targetUser.time_zone, sourceUser.time_zone),
      city: pickNonEmpty(targetUser.city, sourceUser.city),
      province: pickNonEmpty(targetUser.province, sourceUser.province),
      country: pickNonEmpty(targetUser.country, sourceUser.country),
      tags: mergedTags,
      attributes: mergedAttributes,
      first_seen_at: mergedFirstSeen,
      last_seen_at: lastSeen,
      last_session_id: latestSession?.session_id || targetUser.last_session_id || null,
      sessions_count: sessionsCount ?? targetUser.sessions_count ?? 0,
      has_chat: (sessionsCount ?? 0) > 0,
      updated_at: now,
    })
    .eq("org_id", orgId)
    .eq("id", targetId);

  await supabase
    .from("A_end_users")
    .update({ deleted_at: now, updated_at: now })
    .eq("org_id", orgId)
    .eq("id", sourceId);

  await supabase.from("F_audit_events").insert({
    session_id: null,
    turn_id: null,
    event_type: "END_USER_MANUAL_MERGE",
    payload: { source_id: sourceId, target_id: targetId },
    created_at: now,
    bot_context: { org_id: orgId },
  });

  return NextResponse.json({ merged: true, source_id: sourceId, target_id: targetId });
}
