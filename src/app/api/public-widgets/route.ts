import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { normalizeWidgetChatPolicyProvider } from "@/lib/widgetChatPolicyShape";
import { getPolicyWidgetAccess } from "@/lib/widgetPolicyUtils";
import { ensureTemplateSharedInstance } from "@/lib/widgetSharedInstance";

type TemplateRow = {
  id: string;
  name?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  chat_policy?: Record<string, unknown> | null;
};

function mapTemplateItem(template: TemplateRow, publicKey: string) {
  return {
    id: template.id,
    name: template.name || "Web Widget",
    template_id: template.id,
    public_key: publicKey,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pageKey = String(url.searchParams.get("page_key") || "").trim();
  const name = String(url.searchParams.get("name") || "").trim();

  if (!pageKey && !name) {
    return NextResponse.json({ error: "PAGE_KEY_REQUIRED" }, { status: 400 });
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

  if (pageKey) {
    const { data, error } = await baseQuery.contains("page_keys", [pageKey]).limit(1);
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

  const policy = normalizeWidgetChatPolicyProvider(template.chat_policy || null);
  const access = getPolicyWidgetAccess(policy);

  try {
    const shared = await ensureTemplateSharedInstance(supabaseAdmin, template, access);
    return NextResponse.json({ item: mapTemplateItem(template, shared.public_key) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "INSTANCE_CREATE_FAILED" },
      { status: 400 }
    );
  }
}
