"use client";

import { useMemo } from "react";
import {
  deriveConversationDataLoadPlan,
  resolveConversationSetupUi,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";
import { useConversationAdminStatus } from "@/lib/conversation/client/useConversationAdminStatus";
import { useConversationPageFeatures } from "@/lib/conversation/client/useConversationPageFeatures";

export function useConversationPageRuntimeConfig(pageKey: ConversationPageKey) {
  const isAdminUser = useConversationAdminStatus();
  const { features: pageFeatures, providerValue } = useConversationPageFeatures(pageKey, isAdminUser);
  const loadPlan = useMemo(() => deriveConversationDataLoadPlan(pageFeatures), [pageFeatures]);
  const setupUi = useMemo(() => resolveConversationSetupUi(pageKey, providerValue), [pageKey, providerValue]);

  return {
    isAdminUser,
    pageFeatures,
    providerValue,
    loadPlan,
    setupUi,
  };
}

