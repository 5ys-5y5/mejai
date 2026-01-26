import { getSupabaseClient } from "@/lib/supabaseClient";

export async function getAccessToken() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[apiFetch] missing access token", { path });
    }
    throw new Error("UNAUTHORIZED");
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[apiFetch] request", {
      path,
      method: init?.method || "GET",
      hasBody: Boolean(init?.body),
    });
  }

  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (process.env.NODE_ENV !== "production") {
      console.error("[apiFetch] response error", {
        path,
        status: res.status,
        statusText: res.statusText,
        body: text,
      });
      console.error("[apiFetch] response error body", text);
    }
    const message = text || res.statusText || "REQUEST_FAILED";
    throw new Error(message);
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[apiFetch] response ok", { path, status: res.status });
  }
  return res.json();
}
