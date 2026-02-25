import { NextRequest, NextResponse } from "next/server";
import { verifyWidgetToken } from "@/lib/widgetToken";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";
import { resolveAccessRoleForSession, resolveAccessRoleForUser } from "@/lib/conversation/accessRole";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get("session_id") || "").trim();
  if (!sessionId) {
    return NextResponse.json({ access_role: "public", reason: "SESSION_ID_REQUIRED" }, { status: 400 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { access_role: "public", reason: error instanceof Error ? error.message : "ADMIN_CLIENT_FAILED" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const widgetPayload = verifyWidgetToken(token);
  if (widgetPayload) {
    const adminUserId = String(widgetPayload.admin_user_id || "").trim();
    const agentId = String(widgetPayload.agent_id || "").trim();
    const resolvedSessionId = sessionId || String(widgetPayload.session_id || "").trim();
    const accessRole = await resolveAccessRoleForSession({
      supabase: supabaseAdmin,
      agentId,
      sessionId: resolvedSessionId,
      adminUserId,
    });
    return NextResponse.json({ access_role: accessRole });
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ access_role: "public", reason: context.error }, { status: 401 });
  }
  const accessRole = await resolveAccessRoleForUser({
    supabase: context.supabase,
    userId: context.user.id,
    agentId: context.agentId,
  });
  return NextResponse.json({ access_role: accessRole });
}
