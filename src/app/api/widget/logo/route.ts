import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";

function parseDataUri(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
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
  const url = new URL(req.url);
  const id = String(url.searchParams.get("id") || "").trim();
  if (!id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
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

  const { data, error } = await supabaseAdmin
    .from("z_etc_user_logo")
    .select("id, mime_type, content_base64, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data || data.is_active === false) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const rawContent = String(data.content_base64 || "");
  const parsed = parseDataUri(rawContent);
  const mimeType = parsed?.mime || String(data.mime_type || "image/png");
  const base64 = parsed?.base64 || rawContent;
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
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

  const fileName = String(body.file_name || "").trim();
  const mimeType = String(body.mime_type || "").trim() || "image/png";
  const contentBase64 = String(body.content_base64 || "").trim();
  const widgetId = String(body.widget_id || "").trim() || null;

  if (!fileName || !contentBase64) {
    return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
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

  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("z_etc_user_logo")
    .insert({
      widget_id: widgetId,
      file_name: fileName,
      mime_type: mimeType,
      content_base64: contentBase64,
      created_user_id: context.user.id,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data?.id });
}
