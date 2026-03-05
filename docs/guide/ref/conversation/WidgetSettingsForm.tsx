"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  is_public?: boolean | null;
};

export type AgentItem = {
  id: string;
  name?: string | null;
  kb_id?: string | null;
  mcp_tool_ids?: string[] | null;
  version?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
};

export type WidgetSavePayload = {
  name: string;
  agent_id: string | null;
  theme: Record<string, unknown>;
  chat_policy?: ConversationFeaturesProviderShape | null;
  rotate_key?: boolean;
  is_public?: boolean;
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
  const [isPublic, setIsPublic] = useState<boolean>(Boolean(widget?.is_public));

  useEffect(() => {
    setIsPublic(Boolean(widget?.is_public));
  }, [widget?.is_public]);

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
        is_public: isPublic,
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
  const widgetId = String(widget?.id || "").trim();

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <Button type="button" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
        <div className="text-xs text-slate-500 space-y-1">
          {publicKey ? (
            <div>
              공개 키<span className="ml-1 font-mono text-slate-700">{publicKey}</span>
            </div>
          ) : null}
          {widgetId ? (
            <div>
              Widget Policy id<span className="ml-1 font-mono text-slate-700">{widgetId}</span>
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          <div
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 h-12 text-xs ${
              isPublic
                ? "border-emerald-500 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
                : "border-rose-400 bg-rose-100 text-rose-900 ring-1 ring-rose-200"
            }`}
          >
            <button
              type="button"
              className="inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold"
              aria-disabled="true"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span>공개 위젯 (비로그인 사용자도 사용 가능)</span>
              </span>
            </button>
            <div className="flex items-center gap-2">
              <span className="state-controls flex items-center gap-1">
                <button
                  type="button"
                  className={`inline-flex h-7 w-[55px] items-center justify-center rounded-md px-2 py-1 text-[11px] font-bold shadow-sm ${
                    isPublic ? "bg-emerald-700 text-white" : "bg-rose-700 text-white"
                  }`}
                  onClick={() => setIsPublic((prev) => !prev)}
                >
                  {isPublic ? "ON" : "OFF"}
                </button>
              </span>
            </div>
          </div>
        </div>
        {extra ? <div className="pt-2">{extra}</div> : null}
      </Card>

                  
    </div>
  );
}
