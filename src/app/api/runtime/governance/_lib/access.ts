import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";

type AccessResult =
  | { ok: true; orgId: string; actor: { type: "cron" | "user"; userId: string | null }; supabaseAdmin: SupabaseClient }
  | { ok: false; status: number; error: string };

type ReadAccessResult =
  | {
      ok: true;
      orgId: string;
      actor: { type: "cron" | "user"; userId: string | null };
      isAdmin: boolean;
      supabaseAdmin: SupabaseClient;
    }
  | { ok: false; status: number; error: string };

function readCronSecret() {
  return String(process.env.CRON_SECRET || "").trim();
}

function readProvidedSecret(req: NextRequest) {
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  return (headerSecret || bearer).trim();
}

async function checkIsAdmin(input: { supabase: SupabaseClient; userId: string }) {
  const { data } = await input.supabase
    .from("A_iam_user_access_maps")
    .select("org_id, is_admin")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!data?.org_id) return { ok: false as const };
  return {
    ok: true as const,
    orgId: String(data.org_id),
    isAdmin: Boolean(data.is_admin),
  };
}

export async function ensureGovernanceAccess(req: NextRequest): Promise<AccessResult> {
  const readAccess = await ensureGovernanceReadAccess(req);
  if (!readAccess.ok) return readAccess;
  if (readAccess.actor.type !== "cron" && !readAccess.isAdmin) {
    return { ok: false, status: 403, error: "ADMIN_ONLY" };
  }
  return {
    ok: true,
    orgId: readAccess.orgId,
    actor: readAccess.actor,
    supabaseAdmin: readAccess.supabaseAdmin,
  };
}

export async function ensureGovernanceReadAccess(req: NextRequest): Promise<ReadAccessResult> {
  const expected = readCronSecret();
  const provided = readProvidedSecret(req);
  const supabaseAdmin = createAdminSupabaseClient();

  if (expected && provided && provided === expected) {
    const orgIdHeader = String(req.headers.get("x-org-id") || "").trim();
    if (!orgIdHeader) {
      return { ok: false, status: 400, error: "ORG_ID_REQUIRED_FOR_CRON" };
    }
    return {
      ok: true,
      orgId: orgIdHeader,
      actor: { type: "cron", userId: null },
      isAdmin: true,
      supabaseAdmin,
    };
  }

  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const serverContext = await getServerContext(authHeader, cookieHeader);
  if ("error" in serverContext) {
    return { ok: false, status: 401, error: serverContext.error };
  }
  const adminCheck = await checkIsAdmin({ supabase: serverContext.supabase, userId: serverContext.user.id });
  if (!adminCheck.ok) {
    return { ok: false, status: 403, error: "ORG_NOT_FOUND" };
  }
  return {
    ok: true,
    orgId: adminCheck.orgId,
    actor: { type: "user", userId: serverContext.user.id },
    isAdmin: Boolean(adminCheck.isAdmin),
    supabaseAdmin,
  };
}
