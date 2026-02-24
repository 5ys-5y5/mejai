import { NextRequest, NextResponse } from "next/server";
import { verifyWidgetToken } from "@/lib/widgetToken";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";

type VisibilityResult = {
  is_admin_visible: boolean;
  reason?: string;
};

function normalizePhone(value: unknown) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits || null;
}

async function resolveAdminVisibility(input: {
  supabaseAdmin: ReturnType<typeof createAdminSupabaseClient>;
  orgId: string;
  userId?: string | null;
  sessionId: string;
}): Promise<VisibilityResult> {
  const { supabaseAdmin, orgId, userId, sessionId } = input;
  if (!orgId || !sessionId) {
    return { is_admin_visible: false, reason: "MISSING_CONTEXT" };
  }

  const { data: sessionRow } = await supabaseAdmin
    .from("A_end_user_sessions")
    .select("end_user_id")
    .eq("org_id", orgId)
    .eq("session_id", sessionId)
    .maybeSingle();
  const endUserId = String((sessionRow as Record<string, any> | null)?.end_user_id || "").trim();
  if (!endUserId) {
    return { is_admin_visible: false, reason: "END_USER_NOT_FOUND" };
  }

  const { data: endUserRow } = await supabaseAdmin
    .from("A_end_users")
    .select("phone")
    .eq("org_id", orgId)
    .eq("id", endUserId)
    .maybeSingle();
  const endUserPhone = normalizePhone((endUserRow as Record<string, any> | null)?.phone || null);
  const resolvedUserId = String(userId || "").trim();

  if (resolvedUserId) {
    const { data: accessRow } = await supabaseAdmin
      .from("A_iam_user_access_maps")
      .select("is_admin, end_user_id, verified_phone")
      .eq("org_id", orgId)
      .eq("user_id", resolvedUserId)
      .maybeSingle();
    if (!accessRow?.is_admin) {
      return { is_admin_visible: false, reason: "NOT_ADMIN" };
    }
    const linkedEndUserId = String((accessRow as Record<string, any> | null)?.end_user_id || "").trim();
    if (linkedEndUserId && linkedEndUserId === endUserId) {
      return { is_admin_visible: true };
    }
    const accessPhone = normalizePhone((accessRow as Record<string, any> | null)?.verified_phone);
    if (!endUserPhone) {
      return { is_admin_visible: false, reason: "END_USER_PHONE_MISSING" };
    }
    if (!accessPhone) {
      return { is_admin_visible: false, reason: "ACCESS_PHONE_MISSING" };
    }
    if (accessPhone !== endUserPhone) {
      return { is_admin_visible: false, reason: "PHONE_MISMATCH" };
    }
    return { is_admin_visible: true };
  }

  const { data: accessRow } = await supabaseAdmin
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("org_id", orgId)
    .eq("end_user_id", endUserId)
    .maybeSingle();
  if (!accessRow?.is_admin) {
    return { is_admin_visible: false, reason: "NOT_ADMIN" };
  }
  return { is_admin_visible: true };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get("session_id") || "").trim();

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { is_admin_visible: false, reason: error instanceof Error ? error.message : "ADMIN_CLIENT_FAILED" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const widgetPayload = verifyWidgetToken(token);
  if (widgetPayload) {
    const userId = String(widgetPayload.admin_user_id || "").trim();
    const orgId = String(widgetPayload.org_id || "").trim();
    const resolvedSessionId = sessionId || String(widgetPayload.session_id || "").trim();
    const result = await resolveAdminVisibility({
      supabaseAdmin,
      orgId,
      userId,
      sessionId: resolvedSessionId,
    });
    return NextResponse.json(result);
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ is_admin_visible: false, reason: context.error }, { status: 401 });
  }
  const orgId = String(context.orgId || "").trim();
  const userId = String(context.user.id || "").trim();
  const result = await resolveAdminVisibility({
    supabaseAdmin,
    orgId,
    userId,
    sessionId,
  });
  return NextResponse.json(result);
}
