import { getSupabaseClient } from "@/lib/supabaseClient";

export type RuntimeEndUserPayload = {
  end_user?: Record<string, any>;
  visitor?: Record<string, any>;
};

const SERVICE_VISITOR_STORAGE_KEY = "mejai_service_visitor_id";
let cachedAuthEndUser: Record<string, any> | null = null;
let cachedAuthChecked = false;

function readQueryParam(keys: string[]) {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  for (const key of keys) {
    const value = String(params.get(key) || "").trim();
    if (value) return value;
  }
  return null;
}

function buildRandomId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    const uuid = (crypto as Crypto).randomUUID();
    return `${prefix}_${uuid}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateVisitorId() {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(SERVICE_VISITOR_STORAGE_KEY);
    if (existing) return existing;
    const next = buildRandomId("visitor");
    window.localStorage.setItem(SERVICE_VISITOR_STORAGE_KEY, next);
    return next;
  } catch {
    return buildRandomId("visitor");
  }
}

async function resolveAuthEndUser() {
  if (cachedAuthChecked) return cachedAuthEndUser;
  cachedAuthChecked = true;
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user?.id) return null;
    const name =
      (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || null;
    cachedAuthEndUser = {
      id: user.id,
      external_user_id: user.id,
      email: user.email || null,
      name,
      source: "auth_user",
    };
    return cachedAuthEndUser;
  } catch {
    return null;
  }
}

export async function resolveServiceEndUserPayload(): Promise<RuntimeEndUserPayload | null> {
  if (typeof window === "undefined") return null;

  const endUserOverride = readQueryParam(["end_user_id", "endUserId"]);
  if (endUserOverride) {
    return {
      end_user: {
        id: endUserOverride,
        external_user_id: endUserOverride,
        source: "query",
      },
    };
  }

  const visitorOverride = readQueryParam(["visitor_id", "visitorId"]);
  if (visitorOverride) {
    return {
      visitor: {
        id: visitorOverride,
        visitor_id: visitorOverride,
        source: "query",
      },
    };
  }

  const authEndUser = await resolveAuthEndUser();
  if (authEndUser) {
    return { end_user: authEndUser };
  }

  const visitorId = getOrCreateVisitorId();
  if (!visitorId) return null;
  return {
    visitor: {
      id: visitorId,
      visitor_id: visitorId,
      source: "local",
    },
  };
}
