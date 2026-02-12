"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

type WidgetConfig = {
  id?: string;
  name?: string | null;
  agent_id?: string | null;
  public_key?: string | null;
  allowed_domains?: string[] | null;
  allowed_paths?: string[] | null;
  theme?: Record<string, unknown> | null;
  is_active?: boolean | null;
};

type AgentItem = {
  id: string;
  name?: string | null;
  version?: string | null;
  is_active?: boolean | null;
};

function normalizeListInput(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function WidgetSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [widget, setWidget] = useState<WidgetConfig | null>(null);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [draft, setDraft] = useState<WidgetConfig>({
    name: "Web Widget",
    agent_id: "",
    allowed_domains: [],
    allowed_paths: [],
    theme: {},
    is_active: true,
  });

  const agentOptions = useMemo<SelectOption[]>(
    () =>
      agents.map((agent) => ({
        id: agent.id,
        label: `${agent.name || agent.id}${agent.is_active ? "" : " (비활성)"}`,
        description: agent.version ? `v${agent.version}` : undefined,
      })),
    [agents]
  );

  const loadWidget = useCallback(async () => {
    setLoading(true);
    try {
      const [widgetRes, agentRes] = await Promise.all([
        apiFetch<{ item: WidgetConfig | null }>("/api/widgets"),
        apiFetch<{ items: AgentItem[] }>("/api/agents?is_active=true&limit=200"),
      ]);
      setWidget(widgetRes.item || null);
      setAgents(agentRes.items || []);
      const current = widgetRes.item;
      if (current) {
        setDraft({
          name: current.name || "Web Widget",
          agent_id: current.agent_id || "",
          allowed_domains: current.allowed_domains || [],
          allowed_paths: current.allowed_paths || [],
          theme: current.theme || {},
          is_active: typeof current.is_active === "boolean" ? current.is_active : true,
        });
      }
    } catch (error) {
      setWidget(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWidget();
  }, [loadWidget]);

  const domainInput = useMemo(
    () => (draft.allowed_domains || []).join("\n"),
    [draft.allowed_domains]
  );
  const pathInput = useMemo(
    () => (draft.allowed_paths || []).join("\n"),
    [draft.allowed_paths]
  );

  const handleSave = async (rotateKey = false) => {
    setSaving(true);
    try {
      const payload = {
        name: draft.name,
        agent_id: draft.agent_id || null,
        allowed_domains: draft.allowed_domains || [],
        allowed_paths: draft.allowed_paths || [],
        theme: draft.theme || {},
        is_active: Boolean(draft.is_active),
        rotate_key: rotateKey,
      };
      const res = await apiFetch<{ item: WidgetConfig }>("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setWidget(res.item);
      toast.success("위젯 설정이 저장되었습니다.");
    } catch (error) {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const greeting = String((draft.theme || {}).greeting || "");
  const inputPlaceholder = String((draft.theme || {}).input_placeholder || "");

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-900">기본 설정</div>
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">위젯 이름</div>
          <Input
            value={draft.name || ""}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            className="h-9"
          />
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">에이전트 선택</div>
          <SelectPopover
            value={draft.agent_id || ""}
            options={agentOptions}
            onChange={(value) => setDraft((prev) => ({ ...prev, agent_id: value }))}
            className="w-full"
            buttonClassName="h-9 text-xs"
          />
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">허용 도메인 (줄바꿈 또는 콤마)</div>
          <textarea
            value={domainInput}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                allowed_domains: normalizeListInput(e.target.value),
              }))
            }
            className="w-full min-h-[90px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          />
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">허용 경로 (선택, 줄바꿈)</div>
          <textarea
            value={pathInput}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                allowed_paths: normalizeListInput(e.target.value),
              }))
            }
            className="w-full min-h-[70px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          />
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">환영 메시지</div>
          <Input
            value={greeting}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                theme: { ...(prev.theme || {}), greeting: e.target.value },
              }))
            }
            className="h-9"
          />
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">입력 안내 문구</div>
          <Input
            value={inputPlaceholder}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                theme: { ...(prev.theme || {}), input_placeholder: e.target.value },
              }))
            }
            className="h-9"
          />
        </label>
      </Card>

      <Card className="p-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </Button>
        <Button type="button" variant="outline" onClick={() => handleSave(true)} disabled={saving}>
          키 재발급
        </Button>
        {widget?.public_key ? (
          <div className="text-xs text-slate-500 flex items-center">
            현재 키: <span className="ml-1 font-mono text-slate-700">{widget.public_key}</span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
