import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import crypto from "crypto";
import { createEmbedding } from "@/lib/embeddings";

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
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const category = url.searchParams.get("category");
  const isActive = url.searchParams.get("is_active");
  const orderParam = url.searchParams.get("order");
  const { field, ascending } = parseOrder(orderParam);

  let query = context.supabase
    .from("knowledge_base")
    .select("*", { count: "exact" })
    .order(field, { ascending })
    .range(offset, offset + limit - 1)
    .or(`org_id.eq.${context.orgId},org_id.is.null`);

  if (category) {
    query = query.eq("category", category);
  }

  if (isActive !== null) {
    if (isActive === "true") query = query.eq("is_active", true);
    if (isActive === "false") query = query.eq("is_active", false);
  }

  const { data, error, count } = await query;

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
  if (!body || !body.title || !body.content) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const llmValue = typeof body.llm === "string" ? body.llm : "chatgpt";
  if (llmValue !== "chatgpt" && llmValue !== "gemini") {
    return NextResponse.json({ error: "INVALID_LLM" }, { status: 400 });
  }

  const newId = crypto.randomUUID();
  const payload = {
    id: newId,
    parent_id: newId,
    title: body.title,
    content: body.content,
    category: body.category ?? null,
    version: body.version ?? "1.0",
    is_active: body.is_active ?? true,
    llm: llmValue,
    org_id: context.orgId,
    embedding: null as number[] | null,
  };

  try {
    const embeddingRes = await createEmbedding(String(body.content || ""));
    payload.embedding = embeddingRes.embedding as number[];
  } catch (err) {
    return NextResponse.json({ error: "EMBEDDING_FAILED" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("knowledge_base")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
