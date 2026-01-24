import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerUser(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data: profile, error } = await context.supabase
    .from("user_access")
    .select("plan, is_admin, org_role, org_id")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    plan: profile?.plan || "starter",
    is_admin: profile?.is_admin || false,
    org_role: profile?.org_role || "operator",
    org_id: profile?.org_id || null,
  });
}
