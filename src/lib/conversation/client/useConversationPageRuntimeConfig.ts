"use client";

import { useMemo } from "react";
import {
  deriveConversationDataLoadPlan,
  resolveConversationSetupUi,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";
import { useConversationAdminStatus } from "@/lib/conversation/client/useConversationAdminStatus";
import { useConversationAdminVisibility } from "@/lib/conversation/client/useConversationAdminVisibility";
import { useConversationPageFeatures } from "@/lib/conversation/client/useConversationPageFeatures";

export function useConversationPageRuntimeConfig(
  pageKey: ConversationPageKey,
  options?: { sessionId?: string | null; widgetToken?: string | null }
) {
  const sessionId = options?.sessionId || null;
  const adminVisibility = useConversationAdminVisibility({ sessionId, widgetToken: options?.widgetToken });
  const fallbackAdminUser = useConversationAdminStatus();
  const isAdminUser = sessionId ? adminVisibility.isAdminVisible : fallbackAdminUser;
  const { features: resolvedFeatures, providerValue } = useConversationPageFeatures(pageKey, isAdminUser);
  const pageFeatures = useMemo(() => {
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
    };
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

