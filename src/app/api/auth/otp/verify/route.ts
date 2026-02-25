import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { callAdapter } from "@/lib/mcpAdapters";

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerUser(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const agentId = String(body.agent_id || "").trim();
  const code = String(body.code || "").trim();
  const otpRef = String(body.otp_ref || "").trim();
  if (!agentId || !isUuidLike(agentId)) {
    return NextResponse.json({ error: "ORG_ID_REQUIRED" }, { status: 400 });
  }
  if (!code || !otpRef) {
    return NextResponse.json({ error: "CODE_AND_OTP_REF_REQUIRED" }, { status: 400 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json({ error: "ADMIN_SUPABASE_INIT_FAILED" }, { status: 500 });
  }

  const { data: orgRow } = await supabaseAdmin
    .from("A_iam_organizations")
    .select("id, owner_id, registrant_id")
    .eq("id", agentId)
    .maybeSingle();
  if (!orgRow) {
    return NextResponse.json({ error: "ORG_NOT_FOUND" }, { status: 404 });
  }
  if (orgRow.owner_id !== context.user.id && orgRow.registrant_id !== context.user.id) {
    return NextResponse.json({ error: "ORG_ACCESS_DENIED" }, { status: 403 });
  }

  const result = await callAdapter(
    "solapi",
    { code, otp_ref: otpRef },
    { supabase: supabaseAdmin, agentId, userId: context.user.id },
    { toolName: "verify_otp" }
  );
  if (result.status !== "success") {
    return NextResponse.json({ error: result.error?.message || "OTP_VERIFY_FAILED" }, { status: 400 });
  }

  const verificationToken = String(result.data?.customer_verification_token || "").trim();
  if (!verificationToken) {
    return NextResponse.json({ error: "VERIFICATION_TOKEN_MISSING" }, { status: 400 });
  }
  const { data: row } = await supabaseAdmin
    .from("H_auth_otp_verifications")
    .select("destination, verified_at")
    .eq("user_id", context.user.id)
    .eq("verification_token", verificationToken)
    .maybeSingle();
  if (!row?.verified_at) {
    return NextResponse.json({ error: "OTP_NOT_VERIFIED" }, { status: 400 });
  }
  const verifiedPhone = normalizePhone(String((row as Record<string, any>).destination || ""));
  if (verifiedPhone) {
    try {
      await (supabaseAdmin as any).auth.admin.updateUserById(context.user.id, {
        phone: verifiedPhone,
      });
    } catch (error) {
      return NextResponse.json({ error: "AUTH_PHONE_UPDATE_FAILED" }, { status: 500 });
    }
  }
  return NextResponse.json({
    verified_phone: verifiedPhone || null,
    verification_token: verificationToken,
  });
}
