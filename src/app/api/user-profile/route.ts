import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/serverAuth";
import { resolveAccessRoleForUser } from "@/lib/conversation/accessRole";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerUser(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data: profile, error } = await context.supabase
    .from("A_iam_user_profiles")
    .select("plan, is_admin, group")
    .eq("user_id", context.user.id)
    .maybeSingle();

  const { data: agentAccess } = await context.supabase
    .from("B_bot_agent_access")
    .select("agent_id, role")
    .eq("user_id", context.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const accessRole = await resolveAccessRoleForUser({
    supabase: context.supabase,
    userId: context.user.id,
    agentId: context.agentId,
  });

  return NextResponse.json({
    user_id: context.user.id,
    plan: profile?.plan || "starter",
    is_admin: profile?.is_admin || false,
    group: profile?.group || null,
    access_role: accessRole,
    agent_access: (agentAccess || []).map((row) => ({
      agent_id: row.agent_id,
      role: row.role,
    })),
  });
}
