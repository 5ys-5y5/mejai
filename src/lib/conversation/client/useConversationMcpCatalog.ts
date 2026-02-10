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
    apiFetch<{ providers?: McpProvider[] }>("/api/mcp")
      .then((res) => {
        if (!active) return;
        const nextProviders = (res.providers || []).filter((provider) => isProviderEnabled(provider.key, pageFeatures));
        const nextTools = nextProviders
          .flatMap((provider) => (provider.actions || []).map((tool) => ({ ...tool, provider: provider.key })))
          .filter((tool) => isToolEnabled(tool.id, pageFeatures));
        setProviders(nextProviders);
        setTools(nextTools);
      })
      .catch(() => {
        if (!active) return;
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
