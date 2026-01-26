import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

type MetricRow = {
  kb_id: string;
  call_count: number | null;
  call_duration_sec: number | null;
  satisfaction_avg: number | null;
  success_rate: number | null;
  escalation_rate: number | null;
  updated_at?: string | null;
};

function normalizeIds(raw: string | null) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const ids = normalizeIds(url.searchParams.get("ids"));
  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const base = ids.map((id) => ({
    kb_id: id,
    call_count: 0,
    call_duration_sec: 0,
    satisfaction_avg: 0,
    success_rate: 0,
    escalation_rate: 0,
    updated_at: null,
  }));

  const { data, error } = await context.supabase
    .from("kb_version_metrics")
    .select("kb_id, call_count, call_duration_sec, satisfaction_avg, success_rate, escalation_rate, updated_at")
    .in("kb_id", ids)
    .or(`org_id.eq.${context.orgId},org_id.is.null`);

  if (error) {
    // If metrics table is not ready, return zeros to keep UI functional.
    return NextResponse.json({ items: base });
  }

  const map = new Map<string, MetricRow>();
  (data as MetricRow[] | null)?.forEach((row) => {
    map.set(row.kb_id, row);
  });

  const merged = base.map((row) => {
    const found = map.get(row.kb_id);
    return found
      ? {
          ...row,
          call_count: found.call_count ?? row.call_count,
          call_duration_sec: found.call_duration_sec ?? row.call_duration_sec,
          satisfaction_avg: found.satisfaction_avg ?? row.satisfaction_avg,
          success_rate: found.success_rate ?? row.success_rate,
          escalation_rate: found.escalation_rate ?? row.escalation_rate,
          updated_at: found.updated_at ?? row.updated_at,
        }
      : row;
  });

  return NextResponse.json({ items: merged });
}
