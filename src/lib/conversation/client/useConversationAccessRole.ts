"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { AccessRole } from "@/lib/conversation/pageFeaturePolicy";

type AccessRoleState = {
  accessRole: AccessRole;
  reason: string;
  loading: boolean;
};

const DEFAULT_STATE: AccessRoleState = {
  accessRole: "public",
  reason: "",
  loading: false,
};

export function useConversationAccessRole(input: {
  sessionId: string | null | undefined;
  widgetToken?: string | null;
}) {
  const { sessionId, widgetToken } = input;
  const [state, setState] = useState<AccessRoleState>(DEFAULT_STATE);

  useEffect(() => {
    const resolvedSessionId = String(sessionId || "").trim();
    if (!resolvedSessionId) {
      setState(DEFAULT_STATE);
      return;
    }
    let active = true;
    setState((prev) => ({ ...prev, loading: true }));
    const headers: Record<string, string> = {};
    if (widgetToken) {
      headers.Authorization = `Bearer ${widgetToken}`;
    }
    fetch(`/api/conversation/access-role?session_id=${encodeURIComponent(resolvedSessionId)}`, {
      method: "GET",
      headers,
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as Record<string, any>;
        if (!active) return;
        setState({
          accessRole: (data?.access_role as AccessRole) || "public",
          reason: String(data?.reason || ""),
          loading: false,
        });
      })
      .catch(() => {
        if (!active) return;
        setState({ accessRole: "public", reason: "FETCH_FAILED", loading: false });
      });
    return () => {
      active = false;
    };
  }, [sessionId, widgetToken]);

  return state;
}

export function useConversationAccessRoleFromProfile() {
  const [role, setRole] = useState<AccessRole>("public");

  useEffect(() => {
    let active = true;
    apiFetch<{ access_role?: AccessRole }>("/api/user-profile")
      .then((res) => {
        if (!active) return;
        const next = (res?.access_role as AccessRole) || "public";
        setRole(next);
      })
      .catch(() => {
        if (!active) return;
        setRole("public");
      });
    return () => {
      active = false;
    };
  }, []);

  return role;
}
