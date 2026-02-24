import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessRole } from "@/lib/conversation/pageFeaturePolicy";

function normalizeAccessRole(row: { is_admin?: boolean } | null | undefined): AccessRole {
  if (!row) return "public";
  return row.is_admin ? "admin" : "user";
}

export async function resolveAccessRoleForUser(input: {
  supabase: SupabaseClient;
  userId: string;
  orgId?: string | null;
}): Promise<AccessRole> {
  const { supabase, userId, orgId } = input;
  if (!userId) return "public";
  let query = supabase.from("A_iam_user_access_maps").select("is_admin").eq("user_id", userId);
  if (orgId) {
    query = query.eq("org_id", orgId);
  }
  const { data } = await query.maybeSingle();
  return normalizeAccessRole(data as { is_admin?: boolean } | null);
}

export async function resolveAccessRoleForSession(input: {
  supabase: SupabaseClient;
  orgId: string;
  sessionId: string;
  adminUserId?: string | null;
}): Promise<AccessRole> {
  const { supabase, orgId, sessionId, adminUserId } = input;
  if (!orgId || !sessionId) return "public";

  const resolvedAdminUserId = String(adminUserId || "").trim();
  if (resolvedAdminUserId) {
    const { data: adminRow } = await supabase
      .from("A_iam_user_access_maps")
      .select("is_admin")
      .eq("org_id", orgId)
      .eq("user_id", resolvedAdminUserId)
      .maybeSingle();
    if (adminRow) {
      return normalizeAccessRole(adminRow as { is_admin?: boolean } | null);
    }
  }

  const { data: sessionRow } = await supabase
    .from("A_end_user_sessions")
    .select("end_user_id")
    .eq("org_id", orgId)
    .eq("session_id", sessionId)
    .maybeSingle();
  const endUserId = String((sessionRow as Record<string, any> | null)?.end_user_id || "").trim();
  if (!endUserId) return "public";

  const { data: accessRow } = await supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("org_id", orgId)
    .eq("end_user_id", endUserId)
    .maybeSingle();
  return normalizeAccessRole(accessRow as { is_admin?: boolean } | null);
}
