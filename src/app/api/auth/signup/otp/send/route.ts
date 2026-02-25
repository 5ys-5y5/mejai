import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { callAdapter } from "@/lib/mcpAdapters";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const phone = String(body.phone || "").trim();
  if (!phone) {
    return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch {
    return NextResponse.json({ error: "ADMIN_SUPABASE_INIT_FAILED" }, { status: 500 });
  }

  const result = await callAdapter(
    "solapi",
    { destination: phone },
    { supabase: supabaseAdmin, orgId: null, userId: null },
    { toolName: "send_otp_guest" }
  );

  if (result.status !== "success") {
    console.error("[signup_otp_send] adapter_error", {
      code: result.error?.code || null,
      message: result.error?.message || null,
    });
    return NextResponse.json({ error: "OTP_SEND_FAILED" }, { status: 400 });
  }

  return NextResponse.json({
    otp_ref: String(result.data?.otp_ref || ""),
    expires_at: String(result.data?.expires_at || ""),
  });
}
