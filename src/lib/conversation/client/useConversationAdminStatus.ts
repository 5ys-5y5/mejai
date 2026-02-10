"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

export function useConversationAdminStatus() {
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<{ is_admin?: boolean }>("/api/user-profile")
      .then((res) => {
        if (!active) return;
        setIsAdminUser(Boolean(res?.is_admin));
      })
      .catch(() => {
        if (!active) return;
        setIsAdminUser(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return isAdminUser;
}

