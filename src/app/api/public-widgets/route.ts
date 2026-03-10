import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
type TemplateRow = {
  id: string;
  name?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  public_key?: string | null;
};

function mapTemplateItem(template: TemplateRow) {
  return {
    id: template.id,
    name: template.name || "Web Widget",
    widget_id: template.id,
    public_key: template.public_key || null,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = String(url.searchParams.get("name") || "").trim();
  const widgetId = String(url.searchParams.get("widget_id") || "").trim();

  if (!widgetId && !name) {
    return NextResponse.json({ error: "WIDGET_ID_REQUIRED" }, { status: 400 });
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

  const baseQuery = supabaseAdmin
    .from("B_chat_widgets")
    .select("*")
    .eq("is_active", true)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  let template: TemplateRow | null = null;

  if (widgetId) {
    const { data, error } = await baseQuery.eq("id", widgetId).limit(1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    template = (data?.[0] as TemplateRow | undefined) || null;
  }

  if (!template && name) {
    const { data, error } = await baseQuery.eq("name", name).limit(1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    template = (data?.[0] as TemplateRow | undefined) || null;
  }

  if (!template) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ item: mapTemplateItem(template) });
}
