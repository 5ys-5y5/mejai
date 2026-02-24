import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { callAdapter } from "@/lib/mcpAdapters";

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  const orgId = String(body.org_id || "").trim();
  const phone = String(body.phone || "").trim();
  if (!orgId || !isUuidLike(orgId)) {
    return NextResponse.json({ error: "ORG_ID_REQUIRED" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });
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
    .eq("id", orgId)
    .maybeSingle();
  if (!orgRow) {
    return NextResponse.json({ error: "ORG_NOT_FOUND" }, { status: 404 });
  }
  if (orgRow.owner_id !== context.user.id && orgRow.registrant_id !== context.user.id) {
    return NextResponse.json({ error: "ORG_ACCESS_DENIED" }, { status: 403 });
  }

  const result = await callAdapter(
    "solapi",
    { destination: phone },
    { supabase: supabaseAdmin, orgId, userId: context.user.id },
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
