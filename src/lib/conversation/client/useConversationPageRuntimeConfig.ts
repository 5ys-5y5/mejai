"use client";

import { useMemo } from "react";
import {
  deriveConversationDataLoadPlan,
  resolveConversationSetupUi,
  type ConversationPageFeatures,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";
import { useConversationAccessRole, useConversationAccessRoleFromProfile } from "@/lib/conversation/client/useConversationAccessRole";
import { useConversationPageFeatures } from "@/lib/conversation/client/useConversationPageFeatures";

export function useConversationPageRuntimeConfig(
  pageKey: ConversationPageKey,
  options?: { sessionId?: string | null; widgetToken?: string | null }
) {
  const sessionId = options?.sessionId || null;
  const sessionRole = useConversationAccessRole({ sessionId, widgetToken: options?.widgetToken });
  const profileRole = useConversationAccessRoleFromProfile();
  const accessRole = sessionId ? sessionRole.accessRole : profileRole;
  const isAdminUser = accessRole === "admin";
  const { features: resolvedFeatures, providerValue } = useConversationPageFeatures(pageKey, accessRole);
  const pageFeatures: ConversationPageFeatures = useMemo(() => {
    if (pageKey !== "/" || isAdminUser) return resolvedFeatures;
    if (resolvedFeatures.setup.inlineUserKbInput) return resolvedFeatures;
    return {
      ...resolvedFeatures,
      setup: {
        ...resolvedFeatures.setup,
        inlineUserKbInput: true,
      },
      visibility: {
        ...resolvedFeatures.visibility,
        setup: {
          ...resolvedFeatures.visibility.setup,
          inlineUserKbInput: "user",
        },
      },
    } as ConversationPageFeatures;
  }, [isAdminUser, pageKey, resolvedFeatures]);
  const loadPlan = useMemo(() => {
    const plan = deriveConversationDataLoadPlan(pageFeatures);
    if (pageKey === "/") {
      return { ...plan, loadInlineKbSamples: true };
    }
    return plan;
  }, [pageFeatures, pageKey]);
  const setupUi = useMemo(() => resolveConversationSetupUi(pageKey, providerValue), [pageKey, providerValue]);

  return {
    isAdminUser,
    pageFeatures,
    providerValue,
    loadPlan,
    setupUi,
  };
}

