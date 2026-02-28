import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { normalizeConversationFeatureProvider } from "@/lib/conversation/pageFeaturePolicy";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

function makePublicKey() {
  return `mw_pk_${crypto.randomBytes(16).toString("hex")}`;
}



function readTheme(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readChatPolicy(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return {};
  return normalizeConversationFeatureProvider(value as Record<string, unknown>) ?? {};
}


function nowIso() {
  return new Date().toISOString();
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

export async function PATCH(req: NextRequest, context: RouteContext) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const serverContext = await getServerContext(authHeader, cookieHeader);
  if ("error" in serverContext) {
    return NextResponse.json({ error: serverContext.error }, { status: 401 });
  }

  const adminCheck = await ensureAdmin(serverContext);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { id: routeId } = await context.params;
  const id = String(routeId || req.nextUrl.pathname.split("/").pop() || "").trim();
  if (!id) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const payload: Record<string, any> = { updated_at: nowIso() };
  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "INVALID_NAME" }, { status: 400 });
    payload.name = name;
  }
  if (body.agent_id !== undefined) {
    const agentId = String(body.agent_id || "").trim();
    payload.agent_id = agentId || null;
  }
  const theme = readTheme(body.theme);
  if (theme !== undefined) payload.theme = theme;
  const chatPolicy = readChatPolicy(body.chat_policy);
  if (chatPolicy !== undefined) payload.chat_policy = chatPolicy;
  if (body.rotate_key === true) payload.public_key = makePublicKey();

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const { data: existing, error: fetchError } = await serverContext.supabase
    .from("B_chat_widgets")
    .select("id, org_id, name, agent_id, theme, chat_policy")
    .eq("id", id)
    .eq("org_id", serverContext.orgId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("B_chat_widgets")
    .update(payload)
    .eq("id", existing.id)
    .select("id, org_id, name, agent_id, theme, public_key, chat_policy, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const serverContext = await getServerContext(authHeader, cookieHeader);
  if ("error" in serverContext) {
    return NextResponse.json({ error: serverContext.error }, { status: 401 });
  }

  const adminCheck = await ensureAdmin(serverContext);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { id: routeId } = await context.params;
  const id = String(routeId || req.nextUrl.pathname.split("/").pop() || "").trim();
  if (!id) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const { data: existing, error: fetchError } = await serverContext.supabase
    .from("B_chat_widgets")
    .select("id, org_id, name, agent_id, theme, chat_policy")
    .eq("id", id)
    .eq("org_id", serverContext.orgId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("B_chat_widgets")
    .delete()
    .eq("id", existing.id)
    .eq("org_id", serverContext.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
