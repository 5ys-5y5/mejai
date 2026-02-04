import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import {
  DEFAULT_PERFORMANCE_CONFIG,
  sanitizePerformanceConfig,
  type PerformanceConfig,
} from "@/lib/performanceConfig";

export async function GET(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data, error } = await context.supabase
    .from("A_iam_auth_settings")
    .select("providers, updated_at")
    .eq("org_id", context.orgId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG;
  for (const row of data || []) {
    const providers = (row.providers || {}) as Record<string, unknown>;
    const candidate = providers.performance;
    if (candidate && typeof candidate === "object") {
      config = sanitizePerformanceConfig(candidate);
      break;
    }
  }

  return NextResponse.json({ config });
}
