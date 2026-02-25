import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessRole } from "@/lib/conversation/pageFeaturePolicy";

function normalizeAccessRole(row: { is_admin?: boolean } | null | undefined): AccessRole {
  if (!row) return "public";
  return row.is_admin ? "admin" : "user";
}

export async function resolveAccessRoleForUser(input: {
  supabase: SupabaseClient;
  userId: string;
  agentId?: string | null;
}): Promise<AccessRole> {
  const { supabase, userId } = input;
  if (!userId) return "public";
  const { data } = await supabase
    .from("A_iam_user_profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();
  return normalizeAccessRole(data as { is_admin?: boolean } | null);
}

export async function resolveAccessRoleForSession(input: {
  supabase: SupabaseClient;
  agentId: string;
  sessionId: string;
  adminUserId?: string | null;
}): Promise<AccessRole> {
  const { supabase, agentId, sessionId, adminUserId } = input;
  if (!agentId || !sessionId) return "public";

  const resolvedAdminUserId = String(adminUserId || "").trim();
  if (resolvedAdminUserId) {
    const { data: adminRow } = await supabase
      .from("A_iam_user_profiles")
      .select("is_admin")
      .eq("user_id", resolvedAdminUserId)
      .maybeSingle();
    if (adminRow) {
      return normalizeAccessRole(adminRow as { is_admin?: boolean } | null);
    }
  }

  const { data: sessionRow } = await supabase
    .from("A_end_user_sessions")
    .select("end_user_id")
    .eq("agent_id", agentId)
    .eq("session_id", sessionId)
    .maybeSingle();
  const endUserId = String((sessionRow as Record<string, any> | null)?.end_user_id || "").trim();
  if (!endUserId) return "public";

  return "user";
}
