"use client";

import { useEffect, useState } from "react";

type AdminVisibilityState = {
  isAdminVisible: boolean;
  reason: string;
  loading: boolean;
};

const DEFAULT_STATE: AdminVisibilityState = {
  isAdminVisible: false,
  reason: "",
  loading: false,
};

export function useConversationAdminVisibility(input: {
  sessionId: string | null | undefined;
  widgetToken?: string | null;
}) {
  const { sessionId, widgetToken } = input;
  const [state, setState] = useState<AdminVisibilityState>(DEFAULT_STATE);

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
    fetch(`/api/conversation/admin-visibility?session_id=${encodeURIComponent(resolvedSessionId)}`, {
      method: "GET",
      headers,
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as Record<string, any>;
        if (!active) return;
        setState({
          isAdminVisible: Boolean(data?.is_admin_visible),
          reason: String(data?.reason || ""),
          loading: false,
        });
      })
      .catch(() => {
        if (!active) return;
        setState({ isAdminVisible: false, reason: "FETCH_FAILED", loading: false });
      });
    return () => {
      active = false;
    };
  }, [sessionId, widgetToken]);

  return state;
}
