import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { canWrite } from "@/lib/ownershipAccess";

type PatchBody = {
  is_public?: boolean;
};

export async function PATCH(req: NextRequest, ctx: { params: { id?: string } }) {
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

  const id = ctx.params?.id ? String(ctx.params.id) : "";
  if (!id) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body || typeof body.is_public !== "boolean") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("C_mcp_tools")
    .select("id, created_by, owner_user_ids, allowed_user_ids, is_public")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!canWrite(data as any, context.user.id)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data: updated, error: updateError } = await context.supabase
    .from("C_mcp_tools")
    .update({ is_public: body.is_public })
    .eq("id", id)
    .select("id, is_public")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ item: updated });
}
