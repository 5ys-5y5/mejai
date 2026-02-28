"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
  onSave: (payload: WidgetSavePayload) => Promise<WidgetConfig>;
  onSaved?: (widget: WidgetConfig) => void;
  title?: string;
  extra?: ReactNode;
};

export function WidgetSettingsForm({
  widget,
  onSave,
  onSaved,
  title = "위젯 설정",
  extra,
}: WidgetSettingsFormProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async (rotateKey = false) => {
    setSaving(true);
    try {
      const chatPolicy = widget?.chat_policy ?? null;
      const payload: WidgetSavePayload = {
        name: String(widget?.name || "").trim() || "Web Widget",
        agent_id: widget?.agent_id ? String(widget.agent_id).trim() : null,
        theme: { ...(widget?.theme || {}) },
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
  const publicKey = String(widget?.public_key || "").trim();

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
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
