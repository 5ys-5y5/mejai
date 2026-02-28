import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { normalizeConversationFeatureProvider } from "@/lib/conversation/pageFeaturePolicy";

function makePublicKey() {
  return `mw_pk_${crypto.randomBytes(16).toString("hex")}`;
}

function readTheme(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readChatPolicy(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return {};
  return normalizeConversationFeatureProvider(value as Record<string, unknown>) ?? {};
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
    .select("id, org_id, name, agent_id, theme, public_key, chat_policy, created_at, updated_at")
    .eq("org_id", context.orgId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items = Array.isArray(data) ? data : [];
  return NextResponse.json({ items, item: items[0] || null });
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
  const theme = readTheme(body.theme);
  const chatPolicy = readChatPolicy(body.chat_policy);
  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const publicKey = makePublicKey();
  const { data, error } = await supabaseAdmin
    .from("B_chat_widgets")
    .insert({
      org_id: context.orgId,
      name,
      agent_id: agentId,
      theme,
      chat_policy: chatPolicy ?? null,
      public_key: publicKey,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id, org_id, name, agent_id, theme, public_key, chat_policy, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}
