"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyConversationFeatureVisibility,
  getDefaultConversationPageFeatures,
  normalizeConversationPageKey,
  resolveConversationPageFeatures,
  type AccessRole,
  type ConversationFeaturesProviderShape,
  type ConversationPageFeatures,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";

const policyIssueDedup = new Set<string>();

function logPolicyIssueOnce(key: string, payload: Record<string, unknown>) {
  if (policyIssueDedup.has(key)) return;
  policyIssueDedup.add(key);
  if (typeof window !== "undefined") {
    try {
      const sessionKey = `chat_policy_issue:${key}`;
      if (window.sessionStorage.getItem(sessionKey)) return;
      window.sessionStorage.setItem(sessionKey, "1");
    } catch {
      // ignore session storage failures
    }
  }
  console.error("[chat_policy] policy load failed", payload);
}

export function useConversationPageFeatures(page: ConversationPageKey, accessRole: AccessRole = "public") {
  const [providerValue, setProviderValue] = useState<ConversationFeaturesProviderShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const normalized = normalizeConversationPageKey(page);
      if (!normalized) {
        setProviderValue(null);
        setFetchError("INVALID_PAGE_KEY");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setFetchError(null);
        // Auto-register pages that mount conversation blocks so settings can discover them.
        await fetch("/api/conversation/pages/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: normalized }),
        }).catch((error) => {
          logPolicyIssueOnce(`register:${normalized}`, {
            reason: "PAGE_REGISTER_FAILED",
            page_key: normalized,
            error: error instanceof Error ? error.message : String(error),
          });
        });
        const res = await fetch("/api/auth-settings/providers?provider=chat_policy", { cache: "no-store" });
        if (!active) return;
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          setProviderValue(null);
          setFetchError(payload?.error || "CHAT_POLICY_FETCH_FAILED");
          setLoading(false);
          return;
        }
        const payload = (await res.json().catch(() => null)) as { provider?: ConversationFeaturesProviderShape } | null;
        if (!active) return;
        if (!payload?.provider) {
          setProviderValue(null);
          setFetchError("CHAT_POLICY_MISSING");
          setLoading(false);
          return;
        }
        setProviderValue(payload.provider);
        setLoading(false);
      } catch (error) {
        if (!active) return;
        setProviderValue(null);
        setFetchError(error instanceof Error ? error.message : "CHAT_POLICY_FETCH_FAILED");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page]);

  const { features, resolveError } = useMemo(() => {
    if (loading) {
      return { features: getDefaultConversationPageFeatures(page), resolveError: null as string | null };
    }
    if (fetchError) {
      return { features: getDefaultConversationPageFeatures(page), resolveError: fetchError };
    }
    try {
      const resolved = resolveConversationPageFeatures(page, providerValue);
      return {
        features: applyConversationFeatureVisibility(resolved, accessRole),
        resolveError: null,
      };
    } catch (error) {
      return {
        features: getDefaultConversationPageFeatures(page),
        resolveError: error instanceof Error ? error.message : "CHAT_POLICY_INVALID",
      };
    }
  }, [accessRole, fetchError, loading, page, providerValue]);

  useEffect(() => {
    if (!resolveError) return;
    const normalized = normalizeConversationPageKey(page);
    logPolicyIssueOnce(`resolve:${normalized}:${resolveError}`, {
      reason: resolveError,
      page_key: normalized,
      access_role: accessRole,
    });
  }, [accessRole, page, resolveError]);

  return {
    defaults: getDefaultConversationPageFeatures(page),
    features,
    providerValue,
    loading,
    error: resolveError,
  };
}
