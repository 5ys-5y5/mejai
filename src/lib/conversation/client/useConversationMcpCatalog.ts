"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { isProviderEnabled, isToolEnabled, type ConversationPageFeatures } from "@/lib/conversation/pageFeaturePolicy";

type McpAction = {
  id: string;
  tool_key?: string;
  provider_key?: string;
  provider?: string;
  name: string;
  description?: string | null;
};

type McpProvider = {
  key: string;
  title: string;
  description?: string;
  action_count?: number;
  actions?: McpAction[];
};

export type ConversationMcpTool = McpAction & { provider: string };

export function useConversationMcpCatalog(enabled: boolean, pageFeatures: ConversationPageFeatures) {
  const [providers, setProviders] = useState<McpProvider[]>([]);
  const [tools, setTools] = useState<ConversationMcpTool[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const applyResult = (res: { providers?: McpProvider[] }) => {
      if (!active) return;
      const nextProviders = (res.providers || []).filter((provider) => isProviderEnabled(provider.key, pageFeatures));
      const nextTools = nextProviders
        .flatMap((provider) => (provider.actions || []).map((tool) => ({ ...tool, provider: provider.key })))
        .filter((tool) => isToolEnabled(tool.id, pageFeatures));
      setProviders(nextProviders);
      setTools(nextTools);
    };
    apiFetch<{ providers?: McpProvider[] }>("/api/mcp")
      .then(applyResult)
      .catch(async (err) => {
        if (!active) return;
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          try {
            const res = await fetch("/api/mcp", { cache: "no-store" });
            if (!res.ok) {
              setProviders([]);
              setTools([]);
              return;
            }
            const payload = (await res.json()) as { providers?: McpProvider[] };
            applyResult(payload);
            return;
          } catch {
            // fall through to reset
          }
        }
        setProviders([]);
        setTools([]);
      });
    return () => {
      active = false;
    };
  }, [enabled, pageFeatures]);

  return {
    providers: enabled ? providers : [],
    tools: enabled ? tools : [],
  };
}
