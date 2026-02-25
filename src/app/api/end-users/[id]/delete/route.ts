import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

async function requireAdmin(authHeader: string, cookieHeader: string) {
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return { ok: false as const, status: 401, error: context.error };
  }
  if (!context.isAdmin) {
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

  const { id } = await context.params;
  const agentId = admin.context.agentId;
  const now = new Date().toISOString();

  const { data: user } = await admin.context.supabase
    .from("A_end_users")
    .select("id")
    .eq("agent_id", agentId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await admin.context.supabase
    .from("A_end_users")
    .update({ deleted_at: now, updated_at: now })
    .eq("agent_id", agentId)
    .eq("id", id);

  await admin.context.supabase.from("F_audit_events").insert({
    session_id: null,
    turn_id: null,
    event_type: "END_USER_MANUAL_DELETE",
    payload: { end_user_id: id },
    created_at: now,
    bot_context: { agent_id: agentId },
  });

  return NextResponse.json({ deleted: true, end_user_id: id });
}
