"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  applyConversationFeatureVisibility,
  getDefaultConversationPageFeatures,
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

  useEffect(() => {
    const normalized = String(page || "").trim();
    if (!normalized) return;
    // Auto-register pages that mount conversation blocks so settings can discover them.
    void fetch("/api/conversation/pages/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: normalized }),
    }).catch(() => undefined);
  }, [page]);

  const features: ConversationPageFeatures = useMemo(() => {
    const resolved = resolveConversationPageFeatures(page, providerValue);
    return applyConversationFeatureVisibility(resolved, isAdminUser);
  }, [isAdminUser, page, providerValue]);

  return {
    defaults: getDefaultConversationPageFeatures(page),
    features,
    providerValue,
  };
}
