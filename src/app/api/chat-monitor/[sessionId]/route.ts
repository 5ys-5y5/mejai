import { NextRequest, NextResponse } from "next/server";
import { loadChatMonitorSessionDetail } from "@/lib/conversation/server/chatMonitoring";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

async function readMonitorAccess(authHeader: string, cookieHeader: string) {
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: context.error },
        { status: context.error === "UNAUTHORIZED" ? 401 : 403 }
      ),
    };
  }

  const { data: accessRow } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();

  return {
    ok: true as const,
    access: {
      userId: context.user.id,
      isAdmin: Boolean(accessRow?.is_admin),
    },
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const accessResult = await readMonitorAccess(
    req.headers.get("authorization") || "",
    req.headers.get("cookie") || ""
  );
  if (!accessResult.ok) return accessResult.response;

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  try {
    const resolvedParams = await params;
    const payload = await loadChatMonitorSessionDetail(
      supabaseAdmin,
      accessResult.access,
      String(resolvedParams.sessionId || "").trim()
    );
    if (!payload) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND_OR_FORBIDDEN" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CHAT_MONITOR_DETAIL_FAILED" },
      { status: 500 }
    );
  }
}
