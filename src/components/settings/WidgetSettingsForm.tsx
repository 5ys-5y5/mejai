"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import type { ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";
import { apiFetch } from "@/lib/apiClient";
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
  version?: string | null;
  is_active?: boolean | null;
};

export type WidgetSavePayload = {
  name: string;
  agent_id: string | null;
  theme: Record<string, unknown>;
  chat_policy?: ConversationFeaturesProviderShape | null;
  rotate_key?: boolean;
  is_public?: boolean;
};

type OwnershipInfo = {
  created_by: string | null;
  owner_user_ids: string[];
  allowed_user_ids: string[];
  is_public: boolean | null;
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
    is_public: Boolean(current.is_public),
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
  const [ownerInviteIds, setOwnerInviteIds] = useState("");
  const [viewerInviteIds, setViewerInviteIds] = useState("");
  const [ownershipInfo, setOwnershipInfo] = useState<OwnershipInfo | null>(null);
  const [ownershipLoading, setOwnershipLoading] = useState(false);
  const [ownershipError, setOwnershipError] = useState<string | null>(null);

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

  useEffect(() => {
    let mounted = true;
    async function loadOwnership() {
      if (!widget?.id) {
        setOwnershipInfo(null);
        return;
      }
      setOwnershipLoading(true);
      setOwnershipError(null);
      try {
        const res = await apiFetch<OwnershipInfo>(
          `/api/ownership/resource?resource_type=widgets&resource_id=${encodeURIComponent(widget.id)}`
        );
        if (!mounted) return;
        setOwnershipInfo({
          created_by: res.created_by ?? null,
          owner_user_ids: Array.isArray(res.owner_user_ids) ? res.owner_user_ids : [],
          allowed_user_ids: Array.isArray(res.allowed_user_ids) ? res.allowed_user_ids : [],
          is_public: res.is_public ?? null,
        });
      } catch (err) {
        if (!mounted) return;
        setOwnershipError(err instanceof Error ? err.message : "권한 정보를 불러오지 못했습니다.");
        setOwnershipInfo(null);
      } finally {
        if (mounted) setOwnershipLoading(false);
      }
    }
    void loadOwnership();
    return () => {
      mounted = false;
    };
  }, [widget?.id]);

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
        is_public: Boolean(draft.is_public),
      };
      const saved = await onSave(payload);
      onSaved?.(saved);
      toast.success("위젯 설정이 저장되었습니다.");
    } catch (error) {
      toast.error("저장에 실패했습니다.");
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
          <div className="mb-1 text-xs text-slate-600">에이전트</div>
          <SelectPopover
            value={draft.agent_id || ""}
            options={agentOptions}
            onChange={(value) => setDraft((prev) => ({ ...prev, agent_id: value }))}
            className="w-full"
            buttonClassName="h-9 text-xs"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(draft.is_public)}
            onChange={(e) => setDraft((prev) => ({ ...prev, is_public: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
          />
          공개 위젯 (비로그인 사용자도 사용 가능)
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">위젯 아이콘 URL</div>
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
          <div className="mt-1 text-[11px] text-slate-500">비워두면 기본 아이콘을 사용합니다.</div>
        </label>
        {extra ? <div className="pt-2">{extra}</div> : null}
      </Card>
      {widget?.id ? (
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-900">권한 초대</div>
          {ownershipLoading ? (
            <div className="text-xs text-slate-500">권한 정보를 불러오는 중...</div>
          ) : ownershipError ? (
            <div className="text-xs text-rose-600">{ownershipError}</div>
          ) : ownershipInfo ? (
            <div className="grid gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
              <div>
                생성자:{" "}
                <span className="font-mono text-slate-800">{ownershipInfo.created_by || "-"}</span>
              </div>
              <div>
                수정 권한자:{" "}
                <span className="font-mono text-slate-800">
                  {ownershipInfo.owner_user_ids.length > 0 ? ownershipInfo.owner_user_ids.join(", ") : "-"}
                </span>
              </div>
              <div>
                사용 권한자:{" "}
                <span className="font-mono text-slate-800">
                  {ownershipInfo.allowed_user_ids.length > 0 ? ownershipInfo.allowed_user_ids.join(", ") : "-"}
                </span>
              </div>
            </div>
          ) : null}
          <div className="grid gap-2">
            <div className="text-xs text-slate-600">수정 권한자 UUID (쉼표로 구분)</div>
            <Input
              value={ownerInviteIds}
              onChange={(e) => setOwnerInviteIds(e.target.value)}
              className="h-9"
              placeholder="uuid, uuid, ..."
            />
            <Button
              type="button"
              onClick={async () => {
                if (!ownerInviteIds.trim()) return;
                const res = await apiFetch<{ owner_user_ids?: string[]; allowed_user_ids?: string[] }>(
                  "/api/ownership/invite",
                  {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    resource_type: "widgets",
                    resource_id: widget.id,
                    role: "owner",
                    action: "add",
                    user_ids: ownerInviteIds.split(",").map((v) => v.trim()).filter(Boolean),
                  }),
                  }
                );
                setOwnershipInfo((prev) =>
                  prev
                    ? {
                        ...prev,
                        owner_user_ids: Array.isArray(res.owner_user_ids) ? res.owner_user_ids : prev.owner_user_ids,
                        allowed_user_ids: Array.isArray(res.allowed_user_ids)
                          ? res.allowed_user_ids
                          : prev.allowed_user_ids,
                      }
                    : prev
                );
                toast.success("수정 권한자를 초대했습니다.");
                setOwnerInviteIds("");
              }}
            >
              수정 권한자 초대
            </Button>
          </div>
          <div className="grid gap-2">
            <div className="text-xs text-slate-600">사용 권한자 UUID (쉼표로 구분)</div>
            <Input
              value={viewerInviteIds}
              onChange={(e) => setViewerInviteIds(e.target.value)}
              className="h-9"
              placeholder="uuid, uuid, ..."
            />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!viewerInviteIds.trim()) return;
                const res = await apiFetch<{ owner_user_ids?: string[]; allowed_user_ids?: string[] }>(
                  "/api/ownership/invite",
                  {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    resource_type: "widgets",
                    resource_id: widget.id,
                    role: "viewer",
                    action: "add",
                    user_ids: viewerInviteIds.split(",").map((v) => v.trim()).filter(Boolean),
                  }),
                  }
                );
                setOwnershipInfo((prev) =>
                  prev
                    ? {
                        ...prev,
                        owner_user_ids: Array.isArray(res.owner_user_ids) ? res.owner_user_ids : prev.owner_user_ids,
                        allowed_user_ids: Array.isArray(res.allowed_user_ids)
                          ? res.allowed_user_ids
                          : prev.allowed_user_ids,
                      }
                    : prev
                );
                toast.success("사용 권한자를 초대했습니다.");
                setViewerInviteIds("");
              }}
            >
              사용 권한자 초대
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </Button>
        <Button type="button" variant="outline" onClick={() => handleSave(true)} disabled={saving}>
          공개키 재발급
        </Button>
        {publicKey ? (
          <div className="text-xs text-slate-500 flex items-center">
            공개키<span className="ml-1 font-mono text-slate-700">{publicKey}</span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
