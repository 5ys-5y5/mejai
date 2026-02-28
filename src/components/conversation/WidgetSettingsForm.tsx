"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import type { ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";
import { toast } from "sonner";

export type WidgetConfig = {
  id?: string;
  name?: string | null;
  agent_id?: string | null;
  public_key?: string | null;
  theme?: Record<string, unknown> | null;
  chat_policy?: ConversationFeaturesProviderShape | null;
};

export type AgentItem = {
  id: string;
  name?: string | null;
  version?: string | null;
  is_active?: boolean | null;
};

export type WidgetSavePayload = {
  name: string;
  agent_id: string | null;
  theme: Record<string, unknown>;
  chat_policy?: ConversationFeaturesProviderShape | null;
  rotate_key?: boolean;
};

type WidgetSettingsFormProps = {
  widget: WidgetConfig | null;
  agents: AgentItem[];
  onSave: (payload: WidgetSavePayload) => Promise<WidgetConfig>;
  onSaved?: (widget: WidgetConfig) => void;
  title?: string;
  extra?: ReactNode;
};

function buildDraftFromWidget(widget: WidgetConfig | null) {
  const current = widget || {};
  return {
    name: current.name || "Web Widget",
    agent_id: current.agent_id || "",
    theme: current.theme || {},
  };
}

export function WidgetSettingsForm({
  widget,
  agents,
  onSave,
  onSaved,
  title = "위젯 설정",
  extra,
}: WidgetSettingsFormProps) {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<WidgetConfig>(() => buildDraftFromWidget(widget));

  const agentOptions = useMemo<SelectOption[]>(
    () =>
      agents.map((agent) => ({
        id: agent.id,
        label: `${agent.name || agent.id}${agent.is_active ? "" : " (비활성)"}`,
        description: agent.version ? `v${agent.version}` : undefined,
      })),
    [agents]
  );
useEffect(() => {
    const nextDraft = buildDraftFromWidget(widget);
    setDraft(nextDraft);
  }, [widget]);

  const handleSave = async (rotateKey = false) => {
    setSaving(true);
    try {
      const chatPolicy = widget?.chat_policy ?? null;
      const payload: WidgetSavePayload = {
        name: String(draft.name || "").trim() || "Web Widget",
        agent_id: draft.agent_id ? String(draft.agent_id).trim() : null,
        theme: { ...(draft.theme || {}) },
        chat_policy: chatPolicy,
        rotate_key: rotateKey,
      };
      const saved = await onSave(payload);
      onSaved?.(saved);
      toast.success("위젯 설정이 저장되었습니다.");
    } catch (error) {
      toast.error("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };
  const launcherIconUrl = String((draft.theme || {}).launcher_icon_url || "");
  const publicKey = String(widget?.public_key || "").trim();

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
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
          <div className="mb-1 text-xs text-slate-600">런처 아이콘 URL</div>
          <div className="flex items-center gap-2">
            <Input
              value={launcherIconUrl}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  theme: { ...(prev.theme || {}), launcher_icon_url: e.target.value },
                }))
              }
              placeholder="/brand/logo.png"
              className="h-9 flex-1"
            />
            <div className="h-9 w-9 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={launcherIconUrl || "/brand/logo.png"}
                alt="Widget Icon Preview"
                className="block h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="text-[11px] text-slate-500">위젯 아이콘은 런처/헤더에 표시됩니다.</div>
        </label>
        {extra ? <div className="pt-2">{extra}</div> : null}
      </Card>

                  <Card className="p-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </Button>
        <Button type="button" variant="outline" onClick={() => handleSave(true)} disabled={saving}>
          공개 설정으로 저장
        </Button>
        {publicKey ? (
          <div className="text-xs text-slate-500 flex items-center">
            공개 키<span className="ml-1 font-mono text-slate-700">{publicKey}</span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}