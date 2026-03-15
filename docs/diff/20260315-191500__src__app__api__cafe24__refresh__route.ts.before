import { NextRequest, NextResponse } from "next/server";
import { refreshCafe24Token } from "@/lib/cafe24Tokens";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

type AuthSettingsRow = {
  id: string;
  org_id?: string;
  user_id?: string;
  providers?: Record<string, Record<string, unknown> | undefined>;
};

function readCronSecret() {
  return (process.env.CRON_SECRET || "").trim();
}

function readProvidedSecret(req: NextRequest) {
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  return (headerSecret || bearer).trim();
}

export async function GET(req: NextRequest) {
  const expected = readCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET_NOT_CONFIGURED" }, { status: 500 });
  }
  const provided = readProvidedSecret(req);
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SUPABASE_ADMIN_INIT_FAILED" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase.from("A_iam_auth_settings").select("id, org_id, user_id, providers");
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "AUTH_SETTINGS_NOT_FOUND" }, { status: 500 });
  }

  const summary = {
    scanned: data.length,
    eligible: 0,
    refreshed: 0,
    skipped: 0,
    failed: 0,
    failures: [] as Array<{ id: string; reason: string }>,
  };

  for (const row of data as AuthSettingsRow[]) {
    const cafe24 = (row.providers?.cafe24 || {}) as Record<string, unknown>;
    if (!cafe24 || Object.keys(cafe24).length === 0) {
      summary.skipped += 1;
      continue;
    }
    const mallId = String(cafe24.mall_id || "");
    const refreshToken = String(cafe24.refresh_token || "");
    if (!mallId || !refreshToken) {
      summary.skipped += 1;
      continue;
    }

    summary.eligible += 1;
    const refreshed = await refreshCafe24Token({
      settingsId: row.id,
      mallId,
      refreshToken,
      supabase,
    });
    if (refreshed.ok) {
      summary.refreshed += 1;
      continue;
    }
    summary.failed += 1;
    if (summary.failures.length < 50) {
      summary.failures.push({ id: row.id, reason: refreshed.error });
    }
  }

  return NextResponse.json(summary);
}
