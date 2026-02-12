import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const contextAuth = await getServerContext(authHeader, cookieHeader);
  if ("error" in contextAuth) {
    return NextResponse.json({ error: contextAuth.error }, { status: 401 });
  }
  const { id } = await context.params;

  const { data: user, error } = await contextAuth.supabase
    .from("A_end_users")
    .select("*")
    .eq("id", id)
    .eq("org_id", contextAuth.orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { data: summary } = await contextAuth.supabase
    .from("A_end_user_summaries")
    .select("summary_text, updated_at, source_session_id")
    .eq("org_id", contextAuth.orgId)
    .eq("end_user_id", user.id)
    .maybeSingle();

  const { data: identities } = await contextAuth.supabase
    .from("A_end_user_identities")
    .select("id, identity_type, identity_value, identity_hash, is_primary, created_at")
    .eq("org_id", contextAuth.orgId)
    .eq("end_user_id", user.id);

  return NextResponse.json({
    profile: user,
    summary: summary || null,
    identities: identities || [],
  });
}
