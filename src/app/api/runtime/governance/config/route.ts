import { NextRequest, NextResponse } from "next/server";
import { ensureGovernanceAccess, ensureGovernanceReadAccess } from "../_lib/access";
import { readGovernanceConfig, writeGovernanceConfig } from "../_lib/config";

type Body = { enabled?: boolean; visibility_mode?: "user" | "admin" };

export async function GET(req: NextRequest) {
  const access = await ensureGovernanceReadAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const config = await readGovernanceConfig({
    supabase: access.supabaseAdmin,
    orgId: access.orgId,
  });
  return NextResponse.json({ ok: true, config, viewer: { is_admin: access.isAdmin } });
}

export async function POST(req: NextRequest) {
  const access = await ensureGovernanceAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled(boolean) is required" }, { status: 400 });
  }
  if (body.visibility_mode && body.visibility_mode !== "user" && body.visibility_mode !== "admin") {
    return NextResponse.json({ error: "visibility_mode must be user|admin" }, { status: 400 });
  }
  const current = await readGovernanceConfig({
    supabase: access.supabaseAdmin,
    orgId: access.orgId,
  });
  await writeGovernanceConfig({
    supabase: access.supabaseAdmin,
    orgId: access.orgId,
    enabled: body.enabled,
    visibilityMode: body.visibility_mode || current.visibility_mode,
    updatedBy: access.actor.userId,
  });
  const config = await readGovernanceConfig({
    supabase: access.supabaseAdmin,
    orgId: access.orgId,
  });
  return NextResponse.json({ ok: true, config });
}
