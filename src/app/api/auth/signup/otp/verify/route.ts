import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { callAdapter } from "@/lib/mcpAdapters";

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePhone(value: string) {
  return String(value || "").replace(/[^\d]/g, "");
}

function readSignupOtpOrgId() {
  return String(process.env.SIGNUP_OTP_ORG_ID || "").trim();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const otpRef = String(body.otp_ref || "").trim();
  const code = String(body.code || "").trim();
  if (!otpRef || !code) {
    return NextResponse.json({ error: "CODE_AND_OTP_REF_REQUIRED" }, { status: 400 });
  }

  const orgId = readSignupOtpOrgId();
  if (!orgId || !isUuidLike(orgId)) {
    return NextResponse.json({ error: "SIGNUP_OTP_ORG_ID_MISSING" }, { status: 500 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch {
    return NextResponse.json({ error: "ADMIN_SUPABASE_INIT_FAILED" }, { status: 500 });
  }

  const result = await callAdapter(
    "solapi",
    { otp_ref: otpRef, code },
    { supabase: supabaseAdmin, orgId, userId: null },
    { toolName: "verify_otp" }
  );

  if (result.status !== "success") {
    return NextResponse.json({ error: result.error?.message || "OTP_VERIFY_FAILED" }, { status: 400 });
  }

  const verificationToken = String(result.data?.customer_verification_token || "").trim();
  if (!verificationToken) {
    return NextResponse.json({ error: "VERIFICATION_TOKEN_MISSING" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("H_auth_otp_verifications")
    .select("destination, verified_at")
    .eq("org_id", orgId)
    .eq("verification_token", verificationToken)
    .maybeSingle();

  if (error || !data || !data.verified_at) {
    return NextResponse.json({ error: "OTP_NOT_VERIFIED" }, { status: 400 });
  }

  const verifiedPhone = normalizePhone(String((data as Record<string, unknown>).destination || ""));
  return NextResponse.json({
    verification_token: verificationToken,
    verified_phone: verifiedPhone || null,
  });
}
