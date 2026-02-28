"use client";

import { useMemo } from "react";
import {
  applyConversationFeatureVisibility,
  getDefaultConversationPageFeatures,
  resolveConversationPageFeatures,
  type ConversationFeaturesProviderShape,
  type ConversationPageFeatures,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";

export function useConversationPageFeatures(page: ConversationPageKey, isAdminUser = false) {
  const providerValue: ConversationFeaturesProviderShape | null = null;
  const features: ConversationPageFeatures = useMemo(() => {
    const resolved = resolveConversationPageFeatures(page, providerValue);
    return applyConversationFeatureVisibility(resolved, isAdminUser);
  }, [isAdminUser, page]);

  return {
    defaults: getDefaultConversationPageFeatures(page),
    features,
    providerValue,
  };
}
