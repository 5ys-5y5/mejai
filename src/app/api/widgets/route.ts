import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { normalizeConversationFeatureProvider } from "@/lib/conversation/pageFeaturePolicy";
import { filterReadable } from "@/lib/ownershipAccess";

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



export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data, error } = await context.supabase
    .from("B_chat_widgets")
    .select("id, org_id, name, agent_id, theme, public_key, chat_policy, created_at, updated_at, created_by, owner_user_ids, allowed_user_ids, is_public")
    .eq("org_id", context.orgId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const visible = filterReadable((Array.isArray(data) ? data : []) as any[], context.user.id);
  const items = visible.map((row: Record<string, any>) => ({
    id: row.id,
    org_id: row.org_id,
    name: row.name,
    agent_id: row.agent_id,
    theme: row.theme,
    public_key: row.public_key,
    chat_policy: row.chat_policy,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_public: row.is_public ?? false,
  }));
  return NextResponse.json({ items, item: items[0] || null });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
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
      created_by: context.user.id,
      is_public: typeof body.is_public === "boolean" ? body.is_public : false,
    })
    .select("id, org_id, name, agent_id, theme, public_key, chat_policy, created_at, updated_at, is_public")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}
