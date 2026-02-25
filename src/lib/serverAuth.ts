import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { applyManagedEnvOverrides } from "@/lib/managedEnv";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type ServerUserError = { error: "UNAUTHORIZED" };

type ServerUserSuccess = { supabase: SupabaseClient; user: User };

type ServerContextError =
  | ServerUserError
  | { error: "AGENT_LOOKUP_FAILED" }
  | { error: "AGENT_NOT_FOUND" };

export type ServerContextSuccess = ServerUserSuccess & {
  agentId: string;
  agentRole: string | null;
  isAdmin: boolean;
  plan: string;
  group: Record<string, unknown> | null;
};

export type ServerContextSuccessOptionalAgent = ServerUserSuccess & {
  agentId: string | null;
  agentRole: string | null;
  isAdmin: boolean;
  plan: string;
  group: Record<string, unknown> | null;
};

function isUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}


function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) return new Map<string, string>();
  const map = new Map<string, string>();
  cookieHeader.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    map.set(key, value);
  });
  return map;
}

function extractTokenFromCookie(cookieHeader?: string) {
  const cookies = parseCookies(cookieHeader);
  if (cookies.size === 0) return null;

  // handle chunked cookies: sb-<ref>-auth-token.0, .1, ...
  for (const key of cookies.keys()) {
    if (key.includes("auth-token.") && key.startsWith("sb-")) {
      const prefix = key.split(".")[0];
      const parts: string[] = [];
      let idx = 0;
      while (cookies.has(`${prefix}.${idx}`)) {
        parts.push(cookies.get(`${prefix}.${idx}`) || "");
        idx += 1;
      }
      const joined = parts.join("");
      const token = decodeSupabaseToken(joined);
      if (token) return token;
    }
  }

  for (const [key, value] of cookies.entries()) {
    if (key.endsWith("-auth-token")) {
      const token = decodeSupabaseToken(value);
      if (token) return token;
    }
  }

  const directToken =
    cookies.get("sb-access-token") ||
    cookies.get("supabase-access-token") ||
    cookies.get("access_token");
  return directToken || null;
}

function decodeSupabaseToken(raw: string) {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    return (
      parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token || null
    );
  } catch {
    try {
      // base64-encoded JSON
      const buff = Buffer.from(raw, "base64");
      const parsed = JSON.parse(buff.toString("utf-8"));
      return (
        parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token || null
      );
    } catch {
      return null;
    }
  }
}

export function resolveAuthHeader(authHeader?: string, cookieHeader?: string) {
  if (authHeader) return authHeader;
  const token = extractTokenFromCookie(cookieHeader);
  return token ? `Bearer ${token}` : "";
}

export async function getServerUser(
  authHeader: string,
  cookieHeader?: string
): Promise<ServerUserSuccess | ServerUserError> {
  const header = resolveAuthHeader(authHeader, cookieHeader);

  if (!header) {
    return { error: "UNAUTHORIZED" as const };
  }

  const supabase = createServerSupabaseClient(header);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "UNAUTHORIZED" as const };
  }

  return {
    supabase,
    user: userData.user,
  };
}

export async function getServerContext(
  authHeader: string,
  cookieHeader?: string,
  agentId?: string | null,
  options?: { requireAgent?: true }
): Promise<ServerContextSuccess | ServerContextError>;
export async function getServerContext(
  authHeader: string,
  cookieHeader: string | undefined,
  agentId: string | null | undefined,
  options: { requireAgent: false }
): Promise<ServerContextSuccessOptionalAgent | ServerContextError>;
export async function getServerContext(
  authHeader: string,
  cookieHeader?: string,
  agentId?: string | null,
  options?: { requireAgent?: boolean }
): Promise<ServerContextSuccess | ServerContextSuccessOptionalAgent | ServerContextError> {
  const userContext = await getServerUser(authHeader, cookieHeader);
  if ("error" in userContext) {
    return userContext;
  }

  const { supabase, user } = userContext;

  const { data: profile, error: profileError } = await supabase
    .from("A_iam_user_profiles")
    .select("plan, is_admin, group")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: "AGENT_LOOKUP_FAILED" as const };
  }

  let resolvedAgentId = agentId || null;
  let resolvedAgentRole: string | null = null;
  const isAdmin = Boolean(profile?.is_admin);

  if (resolvedAgentId && !isUuid(resolvedAgentId)) {
    resolvedAgentId = null;
  }

  if (resolvedAgentId) {
    const { data: accessRow } = await supabase
      .from("B_bot_agent_access")
      .select("role")
      .eq("user_id", user.id)
      .eq("agent_id", resolvedAgentId)
      .maybeSingle();
    if (accessRow?.role) {
      resolvedAgentRole = accessRow.role;
    } else {
      const { data: agentRow } = await supabase
        .from("B_bot_agents")
        .select("is_public")
        .eq("id", resolvedAgentId)
        .maybeSingle();
      if (agentRow?.is_public) {
        resolvedAgentRole = "viewer";
      }
    }
  } else {
    const { data: accessRow } = await supabase
      .from("B_bot_agent_access")
      .select("agent_id, role")
      .eq("user_id", user.id)
      .order("role", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (accessRow?.agent_id && isUuid(accessRow.agent_id)) {
      resolvedAgentId = accessRow.agent_id;
      resolvedAgentRole = accessRow.role || null;
    }
  }

  const requireAgent = options?.requireAgent !== false;

  if (!resolvedAgentId && isAdmin) {
    const { data: anyAgent } = await supabase
      .from("B_bot_agents")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (anyAgent?.id && isUuid(anyAgent.id)) {
      resolvedAgentId = anyAgent.id;
      resolvedAgentRole = "owner";
    }
  }

  if (!resolvedAgentId) {
    if (requireAgent) {
      return { error: "AGENT_NOT_FOUND" as const };
    }
    return {
      supabase,
      user,
      agentId: null,
      agentRole: null,
      isAdmin,
      plan: profile?.plan || "starter",
      group: (profile?.group as Record<string, unknown> | null) || null,
    };
  }

  try {
    await applyManagedEnvOverrides(resolvedAgentId);
  } catch {
    // Ignore managed env failures; fall back to process.env.
  }

  return {
    supabase,
    user,
    agentId: resolvedAgentId,
    agentRole: resolvedAgentRole,
    isAdmin,
    plan: profile?.plan || "starter",
    group: (profile?.group as Record<string, unknown> | null) || null,
  };
}
