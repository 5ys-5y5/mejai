const AUTH_KEY = "mejai_auth_v1";

interface AuthData {
  email: string;
  avatarUrl?: string;
}

export function getAuth(): AuthData | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setAuth(val: AuthData) {
  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_KEY, JSON.stringify(val));
  }
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY);
  }
}