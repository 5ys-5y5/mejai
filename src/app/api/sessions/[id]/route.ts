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

  const { data, error } = await contextAuth.supabase
    .from("D_conv_sessions")
    .select("*")
    .eq("id", id)
    .eq("org_id", contextAuth.orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
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

  const { data: session, error: sessionError } = await contextAuth.supabase
    .from("D_conv_sessions")
    .select("id, org_id")
    .eq("id", id)
    .eq("org_id", contextAuth.orgId)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 400 });
  }
  if (!session) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { error: turnsError } = await contextAuth.supabase
    .from("D_conv_turns")
    .delete()
    .eq("session_id", id);

  if (turnsError) {
    return NextResponse.json({ error: turnsError.message }, { status: 400 });
  }

  const { error: deleteError } = await contextAuth.supabase
    .from("D_conv_sessions")
    .delete()
    .eq("id", id)
    .eq("org_id", contextAuth.orgId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
