import { NextRequest, NextResponse } from "next/server";
import { loadChatMonitorOverview, resolveChatMonitorFilters } from "@/lib/conversation/server/chatMonitoring";
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

export async function GET(req: NextRequest) {
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
    const filters = resolveChatMonitorFilters(new URL(req.url).searchParams);
    const payload = await loadChatMonitorOverview(supabaseAdmin, accessResult.access, filters);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CHAT_MONITOR_OVERVIEW_FAILED" },
      { status: 500 }
    );
  }
}
