import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

type GroupValue = string | number | boolean | null;

function collectPaths(
  value: unknown,
  prefix: string,
  acc: Map<string, Set<string>>
) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectPaths(entry, prefix, acc));
    return;
  }
  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const next = prefix ? `${prefix}.${key}` : key;
      collectPaths(child, next, acc);
    });
    return;
  }
  const key = prefix || "value";
  const existing = acc.get(key) || new Set<string>();
  existing.add(String(value as GroupValue));
  acc.set(key, existing);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data: access, error: accessError } = await context.supabase
    .from("user_access")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (accessError || !access?.is_admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data, error } = await context.supabase
    .from("user_access")
    .select("group")
    .eq("org_id", context.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const map = new Map<string, Set<string>>();
  (data || []).forEach((row) => {
    if (!row?.group) return;
    collectPaths(row.group, "", map);
  });

  const items = Array.from(map.entries())
    .map(([path, values]) => ({
      path,
      values: Array.from(values.values()).sort(),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return NextResponse.json({ items });
}
