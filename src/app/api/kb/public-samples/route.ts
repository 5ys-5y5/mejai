import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function GET() {
  let supabase;
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    supabase = createServerSupabaseClient();
  }
  const { data, error } = await supabase
    .from("B_bot_knowledge_bases")
    .select("id, title, content, is_active, created_at")
    .eq("is_public", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items = (data || [])
    .map((row: Record<string, unknown>) => ({
      id: String(row.id || ""),
      title: String(row.title || "Sample"),
      content: String(row.content || ""),
      created_at: row.created_at ?? null,
    }))
    .filter((row) => row.id && row.content.trim().length > 0);

  return NextResponse.json({ items });
}
