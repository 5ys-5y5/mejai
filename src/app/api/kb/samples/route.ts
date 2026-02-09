import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data, error } = await context.supabase
    .from("B_bot_knowledge_bases")
    .select("id, title, content, is_active, created_at")
    .eq("is_sample", true)
    .eq("is_active", true)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .order("created_at", { ascending: false });

  if (error) {
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
