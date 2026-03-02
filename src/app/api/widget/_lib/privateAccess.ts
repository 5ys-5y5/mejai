import type { NextRequest } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

export async function canAccessPrivateWidget(req: NextRequest, widgetOrgId: string | null | undefined) {
  const orgId = String(widgetOrgId || "").trim();
  if (!orgId) return false;
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) return false;
  return String(context.orgId) === orgId;
}
