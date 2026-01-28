import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createEmbedding } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Number(body?.limit || 50), 200);

  const { data, error } = await context.supabase
    .from("knowledge_base")
    .select("id, content")
    .eq("org_id", context.orgId)
    .is("embedding", null)
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let updated = 0;
  for (const row of data || []) {
    try {
      const embeddingRes = await createEmbedding(String(row.content || ""));
      const { error: updateError } = await context.supabase
        .from("knowledge_base")
        .update({ embedding: embeddingRes.embedding })
        .eq("id", row.id);
      if (!updateError) {
        updated += 1;
      }
    } catch {
      // skip failed rows
    }
  }

  return NextResponse.json({ ok: true, total: (data || []).length, updated });
}
