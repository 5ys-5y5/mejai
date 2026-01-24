import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type ServerUserError = { error: "UNAUTHORIZED" };

type ServerUserSuccess = { supabase: SupabaseClient; user: User };

type ServerContextError =
  | ServerUserError
  | { error: "ORG_LOOKUP_FAILED" }
  | { error: "ORG_NOT_FOUND" }
  | { error: "ORG_PENDING" };

type ServerContextSuccess = ServerUserSuccess & { orgId: string; orgRole: string };


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
  for (const [key, value] of cookies.entries()) {
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
  cookieHeader?: string
): Promise<ServerContextSuccess | ServerContextError> {
  const userContext = await getServerUser(authHeader, cookieHeader);
  if ("error" in userContext) {
    return userContext;
  }

  const { supabase, user } = userContext;

  const { data: access, error: accessError } = await supabase
    .from("user_access")
    .select("org_id, org_role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accessError) {
    return { error: "ORG_LOOKUP_FAILED" as const };
  }

  if (!access?.org_id) {
    return { error: "ORG_NOT_FOUND" as const };
  }

  if (access.org_role === "pending") {
    return { error: "ORG_PENDING" as const };
  }

  return {
    supabase,
    user,
    orgId: access.org_id,
    orgRole: access.org_role || "operator",
  };
}
