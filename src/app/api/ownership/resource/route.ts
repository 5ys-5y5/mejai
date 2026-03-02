import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { canRead } from "@/lib/ownershipAccess";

type ResourceType = "agents" | "kb" | "widgets" | "mcp";

type OwnershipPayload = {
  id: string;
  created_by: string | null;
  owner_user_ids: string[];
  allowed_user_ids: string[];
  is_public: boolean | null;
};

function resolveTable(resourceType: string | null): string | null {
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

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawAuthHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  let authHeader = rawAuthHeader;
  if (!authHeader) {
    const tokenParam = url.searchParams.get("token") || url.searchParams.get("access_token");
    if (tokenParam) {
      authHeader = `Bearer ${tokenParam}`;
    }
  }
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const resourceType = url.searchParams.get("resource_type");
  const resourceId = url.searchParams.get("resource_id");
  const table = resolveTable(resourceType);

  if (!table || !resourceId) {
    return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
  }

  let query = context.supabase
    .from(table)
    .select("id, created_by, owner_user_ids, allowed_user_ids, is_public")
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

  if (!canRead(data as any, context.user.id)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const payload: OwnershipPayload = {
    id: String((data as any).id || ""),
    created_by: (data as any).created_by ?? null,
    owner_user_ids: normalizeIds((data as any).owner_user_ids),
    allowed_user_ids: normalizeIds((data as any).allowed_user_ids),
    is_public: (data as any).is_public ?? null,
  };

  return NextResponse.json(payload);
}
