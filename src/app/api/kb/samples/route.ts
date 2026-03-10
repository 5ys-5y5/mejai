import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  const querySamples = async (supabase: ReturnType<typeof createAdminSupabaseClient>, orgId?: string) => {
    let query = supabase
      .from("B_bot_knowledge_bases")
      .select("id, title, content, is_active, created_at")
      .eq("is_sample", true)
      .order("created_at", { ascending: false });
    if (orgId) {
      query = query.or(`org_id.eq.${orgId},org_id.is.null`);
    }
    return query;
  };

  let data;
  let error;
  if ("error" in context) {
    try {
      const supabaseAdmin = createAdminSupabaseClient();
      ({ data, error } = await querySamples(supabaseAdmin));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "ADMIN_SUPABASE_INIT_FAILED" }, { status: 500 });
    }
  } else {
    ({ data, error } = await querySamples(context.supabase, context.orgId));
  }

  if (error) {
    if (error.message.includes("is_sample") && error.message.includes("does not exist")) {
      return NextResponse.json({ items: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items = (data || [])
    .map((row: Record<string, unknown>) => ({
      id: String(row.id || ""),
      title: String(row.title || "샘플"),
      content: String(row.content || ""),
      created_at: row.created_at ?? null,
    }))
    .filter((row) => row.id && row.content.trim().length > 0);

  return NextResponse.json({ items });
}
