"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  WidgetSettingsForm,
  type AgentItem,
  type WidgetConfig,
  type WidgetSavePayload,
} from "@/components/settings/WidgetSettingsForm";

export function WidgetSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [widget, setWidget] = useState<WidgetConfig | null>(null);
  const [agents, setAgents] = useState<AgentItem[]>([]);

  const loadWidget = useCallback(async () => {
    setLoading(true);
    try {
      const [widgetRes, agentRes] = await Promise.all([
        apiFetch<{ item: WidgetConfig | null; items?: WidgetConfig[] }>("/api/widgets"),
        apiFetch<{ items: AgentItem[] }>("/api/agents?is_active=true&limit=200")
      ]);
      setWidget(widgetRes.item || null);
      setAgents(agentRes.items || []);
    } catch {
      setWidget(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWidget();
  }, [loadWidget]);

  const handleSave = async (payload: WidgetSavePayload) => {
    const targetId = widget?.id;
    const res = await apiFetch<{ item: WidgetConfig }>(targetId ? `/api/widgets/${targetId}` : "/api/widgets", {
      method: targetId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setWidget(res.item);
    return res.item;
  };

  if (loading) {
    return <div className="text-sm text-slate-500">불러오는 중...</div>;
  }

  return (
    <WidgetSettingsForm
      widget={widget}
      agents={agents}
      onSave={handleSave}
      onSaved={setWidget}
    />
  );
}
