import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import type { SupabaseClient } from "@supabase/supabase-js";

type RouteContext = { params: Promise<{ id: string }> };

function isUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeId(raw: string) {
  let value = raw;
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep raw if decoding fails
  }
  value = value.trim();
  value = value.split("?")[0]?.split("#")[0] || value;
  return value;
}

function bumpVersion(value?: string | null) {
  if (!value) return "1.0";
  const raw = value.trim();
  const match = raw.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/i);
  if (match) {
    const hasV = raw.toLowerCase().startsWith("v");
    const major = Number(match[1] || 0);
    const minor = match[2] !== undefined ? Number(match[2]) : null;
    const patch = match[3] !== undefined ? Number(match[3]) : null;
    if (patch !== null) {
      return `${hasV ? "v" : ""}${major}.${minor ?? 0}.${patch + 1}`;
    }
    if (minor !== null) {
      return `${hasV ? "v" : ""}${major}.${minor + 1}`;
    }
    return `${hasV ? "v" : ""}${major + 1}`;
  }
  const revMatch = raw.match(/^(.*?)-rev(\d+)$/i);
  if (revMatch) {
    return `${revMatch[1]}-rev${Number(revMatch[2]) + 1}`;
  }
  return `${raw}-rev1`;
}

function buildScopedQuery(client: SupabaseClient, id: string, orgId: string) {
  return client.from("knowledge_base").select("*").eq("id", id).or(`org_id.eq.${orgId},org_id.is.null`);
}

function buildParentQuery(client: SupabaseClient, parentId: string, orgId: string) {
  return client
    .from("knowledge_base")
    .select("*")
    .eq("parent_id", parentId)
    .or(`org_id.eq.${orgId},org_id.is.null`)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id: routeId } = await context.params;
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  if (process.env.NODE_ENV !== "production") {
    console.debug("[api/kb/[id]] GET start", {
      id: routeId,
      hasAuthHeader: Boolean(authHeader),
      hasCookieHeader: Boolean(cookieHeader),
    });
  }
  const serverContext = await getServerContext(authHeader, cookieHeader);
  if ("error" in serverContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[api/kb/[id]] GET auth error", { error: serverContext.error });
    }
    return NextResponse.json({ error: serverContext.error }, { status: 401 });
  }

  const rawId = routeId;
  const urlId = req.nextUrl.pathname.split("/").pop() || "";
  const id = normalizeId(rawId && rawId !== "undefined" ? rawId : urlId);
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[api/kb/[id]] GET invalid id", { rawId, urlId, id });
      return NextResponse.json({ error: "INVALID_ID", rawId, urlId, normalizedId: id }, { status: 400 });
    }
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }
  let { data, error } = await buildScopedQuery(serverContext.supabase, id, serverContext.orgId).maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[api/kb/[id]] GET query error", { id, error });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    const parentResult = await buildParentQuery(serverContext.supabase, id, serverContext.orgId).limit(1).maybeSingle();
    if (parentResult.error) {
      return NextResponse.json({ error: parentResult.error.message }, { status: 400 });
    }
    data = parentResult.data ?? null;
  }

  if (!data) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[api/kb/[id]] GET not found", { id, orgId: serverContext.orgId });
    }
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[api/kb/[id]] GET ok", { id, orgId: serverContext.orgId });
  }
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id: routeId } = await context.params;
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const serverContext = await getServerContext(authHeader, cookieHeader);
  if ("error" in serverContext) {
    return NextResponse.json({ error: serverContext.error }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const payload: {
    title?: string;
    content?: string;
    category?: string | null;
    is_active?: boolean;
  } = {};

  if (typeof body.title === "string") payload.title = body.title;
  if (typeof body.content === "string") payload.content = body.content;
  if (body.category === null || typeof body.category === "string") payload.category = body.category;
  if (typeof body.is_active === "boolean") payload.is_active = body.is_active;

  if (payload.title !== undefined && payload.title.trim().length === 0) {
    return NextResponse.json({ error: "INVALID_TITLE" }, { status: 400 });
  }
  if (payload.content !== undefined && payload.content.trim().length === 0) {
    return NextResponse.json({ error: "INVALID_CONTENT" }, { status: 400 });
  }

  const rawId = routeId;
  const urlId = req.nextUrl.pathname.split("/").pop() || "";
  const id = normalizeId(rawId && rawId !== "undefined" ? rawId : urlId);
  let { data: existing, error: fetchError } = await buildScopedQuery(
    serverContext.supabase,
    id,
    serverContext.orgId
  ).maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  if (!existing) {
    const parentResult = await buildParentQuery(serverContext.supabase, id, serverContext.orgId).limit(1).maybeSingle();
    if (parentResult.error) {
      return NextResponse.json({ error: parentResult.error.message }, { status: 400 });
    }
    existing = parentResult.data ?? null;
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
  }

  const parentId = (existing as { parent_id?: string | null }).parent_id ?? existing.id;
  const nextTitle = payload.title ?? existing.title;
  const nextCategory = payload.category ?? existing.category ?? null;
  const nextContent = payload.content ?? existing.content;
  const nextIsActive = payload.is_active ?? existing.is_active ?? true;
  const contentChanged = nextContent !== (existing.content ?? "");
  const titleChanged = nextTitle !== (existing.title ?? "");
  const categoryChanged = (nextCategory ?? "") !== (existing.category ?? "");

  if (titleChanged || categoryChanged) {
    const { error: updateMetaError } = await serverContext.supabase
      .from("knowledge_base")
      .update({ title: nextTitle, category: nextCategory })
      .eq("parent_id", parentId)
      .or(`org_id.eq.${serverContext.orgId},org_id.is.null`);
    if (updateMetaError) {
      return NextResponse.json({ error: updateMetaError.message }, { status: 400 });
    }
  }

  if (nextIsActive) {
    const { error: deactivateError } = await serverContext.supabase
      .from("knowledge_base")
      .update({ is_active: false })
      .eq("parent_id", parentId)
      .or(`org_id.eq.${serverContext.orgId},org_id.is.null`);
    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 400 });
    }
  }

  let data = existing as typeof existing;
  let error: { message: string } | null = null;

  if (contentChanged) {
    const insertPayload = {
      parent_id: parentId,
      title: nextTitle,
      content: nextContent,
      category: nextCategory,
      version: bumpVersion(existing.version),
      is_active: nextIsActive,
      org_id: existing.org_id ?? serverContext.orgId,
    };

    const { data: inserted, error: insertError } = await serverContext.supabase
      .from("knowledge_base")
      .insert(insertPayload)
      .select("*")
      .single();
    data = inserted as typeof existing;
    error = insertError ? { message: insertError.message } : null;
  } else if (payload.is_active !== undefined || titleChanged || categoryChanged) {
    const { data: updated, error: updateError } = await serverContext.supabase
      .from("knowledge_base")
      .update({
        title: nextTitle,
        category: nextCategory,
        is_active: nextIsActive,
      })
      .eq("id", existing.id)
      .or(`org_id.eq.${serverContext.orgId},org_id.is.null`)
      .select("*")
      .maybeSingle();
    data = updated as typeof existing;
    error = updateError ? { message: updateError.message } : null;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id: routeId } = await context.params;
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const serverContext = await getServerContext(authHeader, cookieHeader);
  if ("error" in serverContext) {
    return NextResponse.json({ error: serverContext.error }, { status: 401 });
  }

  const rawId = routeId;
  const urlId = req.nextUrl.pathname.split("/").pop() || "";
  const id = normalizeId(rawId && rawId !== "undefined" ? rawId : urlId);
  const { data, error } = await serverContext.supabase
    .from("knowledge_base")
    .delete()
    .eq("id", id)
    .or(`org_id.eq.${serverContext.orgId},org_id.is.null`)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
