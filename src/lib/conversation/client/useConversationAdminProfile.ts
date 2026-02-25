"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type AdminProfile = {
  is_admin?: boolean;
  user_id?: string | null;
  agent_id?: string | null;
  agent_role?: string | null;
  plan?: string | null;
};

type AdminProfileState = {
  isAdminUser: boolean;
  userId: string;
  agentId: string | null;
  agentRole: string | null;
  plan: string | null;
};

const EMPTY_STATE: AdminProfileState = {
  isAdminUser: false,
  userId: "",
  agentId: null,
  agentRole: null,
  plan: null,
};

export function useConversationAdminProfile() {
  const [state, setState] = useState<AdminProfileState>(EMPTY_STATE);

  useEffect(() => {
    let active = true;
    apiFetch<AdminProfile>("/api/user-profile")
      .then((res) => {
        if (!active) return;
        const userId = String(res?.user_id || "").trim();
        setState({
          isAdminUser: Boolean(res?.is_admin),
          userId,
          agentId: res?.agent_id ?? null,
          agentRole: res?.agent_role ?? null,
          plan: res?.plan ?? null,
        });
      })
      .catch(() => {
        if (!active) return;
        setState(EMPTY_STATE);
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
