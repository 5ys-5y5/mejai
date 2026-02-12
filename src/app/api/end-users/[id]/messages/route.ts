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

  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get("session_id") || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "SESSION_ID_REQUIRED" }, { status: 400 });
  }
  const limit = Math.min(Number(url.searchParams.get("limit") || 200), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

  const { data, error, count } = await contextAuth.supabase
    .from("A_end_user_messages")
    .select("*", { count: "exact" })
    .eq("org_id", contextAuth.orgId)
    .eq("end_user_id", id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data || [], total: count || 0 });
}
