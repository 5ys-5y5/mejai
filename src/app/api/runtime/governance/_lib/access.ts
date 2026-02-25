import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";

type AccessResult =
  | { ok: true; agentId: string; actor: { type: "cron" | "user"; userId: string | null }; supabaseAdmin: SupabaseClient }
  | { ok: false; status: number; error: string };

type ReadAccessResult =
  | {
      ok: true;
      agentId: string;
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

export async function ensureGovernanceAccess(req: NextRequest): Promise<AccessResult> {
  const readAccess = await ensureGovernanceReadAccess(req);
  if (!readAccess.ok) return readAccess;
  if (readAccess.actor.type !== "cron" && !readAccess.isAdmin) {
    return { ok: false, status: 403, error: "ADMIN_ONLY" };
  }
  return {
    ok: true,
    agentId: readAccess.agentId,
    actor: readAccess.actor,
    supabaseAdmin: readAccess.supabaseAdmin,
  };
}

export async function ensureGovernanceReadAccess(req: NextRequest): Promise<ReadAccessResult> {
  const expected = readCronSecret();
  const provided = readProvidedSecret(req);
  const supabaseAdmin = createAdminSupabaseClient();

  if (expected && provided && provided === expected) {
    const agentIdHeader = String(req.headers.get("x-agent-id") || "").trim();
    if (!agentIdHeader) {
      return { ok: false, status: 400, error: "AGENT_ID_REQUIRED_FOR_CRON" };
    }
    return {
      ok: true,
      agentId: agentIdHeader,
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
  return {
    ok: true,
    agentId: serverContext.agentId,
    actor: { type: "user", userId: serverContext.user.id },
    isAdmin: Boolean(serverContext.isAdmin),
    supabaseAdmin,
  };
}
