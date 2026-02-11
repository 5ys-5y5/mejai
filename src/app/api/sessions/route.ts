import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getServerContext } from "@/lib/serverAuth";

function makeSessionCode() {
  return `s_${Math.random().toString(36).slice(2, 8)}`;
}

function parseOrder(orderParam: string | null) {
  if (!orderParam) return { field: "created_at", ascending: false };
  const [field, dir] = orderParam.split(".");
  return { field: field || "created_at", ascending: dir === "asc" };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const orderParam = url.searchParams.get("order");
  const { field, ascending } = parseOrder(orderParam);

  const { data, error, count } = await context.supabase
    .from("D_conv_sessions")
    .select("*", { count: "exact" })
    .eq("org_id", context.orgId)
    .order(field, { ascending })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data || [], total: count || 0 });
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

  const now = new Date().toISOString();
  const payload = {
    org_id: context.orgId,
    session_code: body.session_code ?? makeSessionCode(),
    started_at: body.started_at ?? now,
    ended_at: body.ended_at ?? null,
    duration_sec: body.duration_sec ?? null,
    channel: body.channel ?? null,
    caller_masked: body.caller_masked ?? null,
    agent_id: body.agent_id ?? null,
    outcome: body.outcome ?? null,
    sentiment: body.sentiment ?? null,
    escalation_reason: body.escalation_reason ?? null,
    satisfaction: body.satisfaction ?? null,
    recording_url: body.recording_url ?? null,
    metadata: body.metadata ?? {},
  };

  const { data, error } = await context.supabase
    .from("D_conv_sessions")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
