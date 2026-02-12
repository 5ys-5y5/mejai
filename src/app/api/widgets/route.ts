import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

function makePublicKey() {
  return `mw_pk_${crypto.randomBytes(16).toString("hex")}`;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

function readTheme(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

async function ensureAdmin(context: Awaited<ReturnType<typeof getServerContext>>) {
  if ("error" in context) return { ok: false, status: 401, error: context.error };
  const { data: access } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!access?.is_admin) {
    return { ok: false, status: 403, error: "FORBIDDEN" };
  }
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data, error } = await context.supabase
    .from("B_chat_widgets")
    .select("*")
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data || null });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const adminCheck = await ensureAdmin(context);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const name = String(body.name || "").trim() || "Web Widget";
  const agentId = String(body.agent_id || "").trim() || null;
  const allowedDomains = normalizeStringArray(body.allowed_domains);
  const allowedPaths = normalizeStringArray(body.allowed_paths);
  const theme = readTheme(body.theme);
  const isActive = typeof body.is_active === "boolean" ? body.is_active : true;
  const rotateKey = body.rotate_key === true;

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("*")
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (existing?.id) {
    const publicKey = rotateKey ? makePublicKey() : String(existing.public_key || "").trim();
    const { data, error } = await supabaseAdmin
      .from("B_chat_widgets")
      .update({
        name,
        agent_id: agentId,
        allowed_domains: allowedDomains,
        allowed_paths: allowedPaths,
        theme,
        is_active: isActive,
        public_key: publicKey,
        updated_at: nowIso,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ item: data });
  }

  const publicKey = makePublicKey();
  const { data, error } = await supabaseAdmin
    .from("B_chat_widgets")
    .insert({
      org_id: context.orgId,
      name,
      agent_id: agentId,
      allowed_domains: allowedDomains,
      allowed_paths: allowedPaths,
      theme,
      is_active: isActive,
      public_key: publicKey,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}
