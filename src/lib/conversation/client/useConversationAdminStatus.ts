"use client";

import { useConversationAccessRoleFromProfile } from "@/lib/conversation/client/useConversationAccessRole";

export function useConversationAdminStatus() {
  const accessRole = useConversationAccessRoleFromProfile();
  return accessRole === "admin";
}

