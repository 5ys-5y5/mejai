import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { callAdapter } from "@/lib/mcpAdapters";

function normalizePhone(value: string) {
  return String(value || "").replace(/[^\d]/g, "");
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

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch {
    return NextResponse.json({ error: "ADMIN_SUPABASE_INIT_FAILED" }, { status: 500 });
  }

  const result = await callAdapter(
    "solapi",
    { otp_ref: otpRef, code },
    { supabase: supabaseAdmin, orgId: null, userId: null },
    { toolName: "verify_otp_guest" }
  );

  if (result.status !== "success") {
    console.error("[signup_otp_verify] adapter_error", {
      code: result.error?.code || null,
      message: result.error?.message || null,
    });
    return NextResponse.json({ error: "OTP_VERIFY_FAILED" }, { status: 400 });
  }

  const verificationToken = String(result.data?.customer_verification_token || "").trim();
  if (!verificationToken) {
    return NextResponse.json({ error: "VERIFICATION_TOKEN_MISSING" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("H_auth_otp_verifications_guest")
    .select("destination, verified_at")
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
