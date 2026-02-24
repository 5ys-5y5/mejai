import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { callAdapter } from "@/lib/mcpAdapters";

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readSignupOtpOrgId() {
  return String(process.env.SIGNUP_OTP_ORG_ID || "").trim();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const phone = String(body.phone || "").trim();
  if (!phone) {
    return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });
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

  const { data: orgRow } = await supabaseAdmin
    .from("A_iam_organizations")
    .select("id, owner_id, registrant_id")
    .eq("id", orgId)
    .maybeSingle();
  if (!orgRow) {
    return NextResponse.json({ error: "ORG_NOT_FOUND" }, { status: 404 });
  }
  const userId = String(orgRow.owner_id || orgRow.registrant_id || "").trim();
  if (!isUuidLike(userId)) {
    return NextResponse.json({ error: "ORG_USER_MISSING" }, { status: 500 });
  }

  const result = await callAdapter(
    "solapi",
    { destination: phone },
    { supabase: supabaseAdmin, orgId, userId },
    { toolName: "send_otp" }
  );

  if (result.status !== "success") {
    return NextResponse.json({ error: result.error?.message || "OTP_SEND_FAILED" }, { status: 400 });
  }

  return NextResponse.json({
    otp_ref: String(result.data?.otp_ref || ""),
    expires_at: String(result.data?.expires_at || ""),
  });
}
