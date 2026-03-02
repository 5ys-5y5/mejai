import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

type InviteBody = {
  resource_type?: "agents" | "kb" | "widgets" | "mcp";
  resource_id?: string;
  role?: "owner" | "viewer";
  action?: "add" | "remove";
  user_ids?: string[];
};

function normalizeIds(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((value) => String(value || "").trim()).filter(Boolean);
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

function isUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function resolveTable(resourceType: InviteBody["resource_type"]) {
  switch (resourceType) {
    case "agents":
      return "B_bot_agents";
    case "kb":
      return "B_bot_knowledge_bases";
    case "widgets":
      return "B_chat_widgets";
    case "mcp":
      return "C_mcp_tools";
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as InviteBody | null;
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const table = resolveTable(body.resource_type);
  const resourceId = String(body.resource_id || "").trim();
  const role = body.role === "owner" ? "owner" : body.role === "viewer" ? "viewer" : null;
  const action = body.action === "remove" ? "remove" : "add";
  const userIds = uniqueIds(normalizeIds(body.user_ids)).filter(isUuid);

  if (!table || !resourceId || !role || userIds.length === 0) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  let query = context.supabase
    .from(table)
    .select("id, created_by, owner_user_ids, allowed_user_ids")
    .eq("id", resourceId);
  if (table !== "C_mcp_tools") {
    query = query.or(`org_id.eq.${context.orgId},org_id.is.null`);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const createdBy = String((data as any).created_by || "").trim();
  if (!createdBy || createdBy !== context.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const owners = normalizeIds((data as any).owner_user_ids);
  const allowed = normalizeIds((data as any).allowed_user_ids);

  let nextOwners = owners;
  let nextAllowed = allowed;

  if (role === "owner") {
    if (action === "add") {
      nextOwners = uniqueIds([...owners, ...userIds]);
      nextAllowed = uniqueIds([...allowed, ...userIds, ...nextOwners]);
    } else {
      nextOwners = owners.filter((id) => !userIds.includes(id));
      nextAllowed = uniqueIds([...allowed, ...nextOwners]).filter((id) => !userIds.includes(id));
    }
  } else {
    if (action === "add") {
      nextAllowed = uniqueIds([...allowed, ...userIds, ...owners]);
    } else {
      nextAllowed = allowed.filter((id) => !userIds.includes(id));
    }
  }

  const { error: updateError } = await context.supabase
    .from(table)
    .update({
      owner_user_ids: nextOwners,
      allowed_user_ids: nextAllowed,
    })
    .eq("id", resourceId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    owner_user_ids: nextOwners,
    allowed_user_ids: nextAllowed,
  });
}
