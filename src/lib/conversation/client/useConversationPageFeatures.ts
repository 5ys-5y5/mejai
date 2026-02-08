"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  applyConversationFeatureVisibility,
  PAGE_CONVERSATION_FEATURES,
  resolveConversationPageFeatures,
  type ConversationFeaturesProviderShape,
  type ConversationPageFeatures,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";

export function useConversationPageFeatures(page: ConversationPageKey, isAdminUser = false) {
  const [providerValue, setProviderValue] = useState<ConversationFeaturesProviderShape | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const payload = await apiFetch<{ provider?: ConversationFeaturesProviderShape }>(
          "/api/auth-settings/providers?provider=chat_policy",
          { cache: "no-store" }
        );
        if (!active) return;
        setProviderValue(payload.provider || null);
      } catch {
        try {
          const res = await fetch("/api/auth-settings/providers?provider=chat_policy", { cache: "no-store" });
          if (!active || !res.ok) {
            setProviderValue(null);
            return;
          }
          const payload = (await res.json()) as { provider?: ConversationFeaturesProviderShape };
          if (!active) return;
          setProviderValue(payload.provider || null);
        } catch {
          if (!active) return;
          setProviderValue(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const features: ConversationPageFeatures = useMemo(() => {
    const resolved = resolveConversationPageFeatures(page, providerValue);
    return applyConversationFeatureVisibility(resolved, isAdminUser);
  }, [isAdminUser, page, providerValue]);

  return {
    defaults: PAGE_CONVERSATION_FEATURES[page],
    features,
    providerValue,
  };
}
