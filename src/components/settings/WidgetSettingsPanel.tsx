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

function normalizeThemeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return normalizeListInput(value);
  }
  return [];
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
  const [domainText, setDomainText] = useState("");
  const [pathText, setPathText] = useState("");
  const [allowedAccountsText, setAllowedAccountsText] = useState("");

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
        const nextDomains = current.allowed_domains || [];
        const nextPaths = current.allowed_paths || [];
        const nextAccounts = normalizeThemeList(
          (current.theme || {}).allowed_accounts || (current.theme || {}).allowedAccounts
        );
        setDraft({
          name: current.name || "Web Widget",
          agent_id: current.agent_id || "",
          allowed_domains: nextDomains,
          allowed_paths: nextPaths,
          theme: current.theme || {},
          is_active: typeof current.is_active === "boolean" ? current.is_active : true,
        });
        setDomainText(nextDomains.join("\n"));
        setPathText(nextPaths.join("\n"));
        setAllowedAccountsText(nextAccounts.join("\n"));
      } else {
        setDomainText("");
        setPathText("");
        setAllowedAccountsText("");
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

  const handleSave = async (rotateKey = false) => {
    setSaving(true);
    try {
      const allowedDomains = normalizeListInput(domainText);
      const allowedPaths = normalizeListInput(pathText);
      const allowedAccounts = normalizeListInput(allowedAccountsText);
      const payload = {
        name: draft.name,
        agent_id: draft.agent_id || null,
        allowed_domains: allowedDomains,
        allowed_paths: allowedPaths,
        theme: { ...(draft.theme || {}), allowed_accounts: allowedAccounts },
        is_active: Boolean(draft.is_active),
        rotate_key: rotateKey,
      };
      const res = await apiFetch<{ item: WidgetConfig }>("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setWidget(res.item);
      setDraft((prev) => ({
        ...prev,
        allowed_domains: allowedDomains,
        allowed_paths: allowedPaths,
        theme: { ...(prev.theme || {}), allowed_accounts: allowedAccounts },
      }));
      toast.success("위젯 설정이 저장되었습니다.");
    } catch (error) {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const greeting = String((draft.theme || {}).greeting || "");
  const inputPlaceholder = String((draft.theme || {}).input_placeholder || "");
  const launcherIconUrl = String((draft.theme || {}).launcher_icon_url || "");

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
            value={domainText}
            onChange={(e) => setDomainText(e.target.value)}
            className="w-full min-h-[90px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          />
          <div className="mt-1 text-[11px] text-slate-500">
            위젯을 띄울 웹사이트 주소를 적습니다. 예: <span className="font-mono">example.com</span>,{" "}
            <span className="font-mono">shop.example.com</span>.{" "}
            <span className="font-mono">https://</span>는 있어도 무시되며,{" "}
            <span className="font-mono">*.example.com</span> 형태로 모든 서브도메인을 허용할 수 있습니다.
            이 목록에 없는 도메인에서는 위젯이 열리지 않습니다.
          </div>
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">허용 경로 (선택, 줄바꿈)</div>
          <textarea
            value={pathText}
            onChange={(e) => setPathText(e.target.value)}
            className="w-full min-h-[70px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          />
          <div className="mt-1 text-[11px] text-slate-500">
            도메인 안에서 위젯이 보일 페이지를 제한합니다. 비워두면 도메인 내 모든 페이지에서 작동합니다.{" "}
            <span className="font-mono">/support</span>처럼 입력하면 해당 경로로 시작하는 페이지에서만 보이고,{" "}
            <span className="font-mono">*</span>는 모든 경로 허용입니다.
          </div>
        </label>
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">허용 계정 (줄바꿈 또는 콤마)</div>
          <textarea
            value={allowedAccountsText}
            onChange={(e) => setAllowedAccountsText(e.target.value)}
            className="w-full min-h-[70px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          />
          <div className="mt-1 text-[11px] text-slate-500">
            로그인 사용자 식별자를 입력합니다. 여기 등록된 계정에만 위젯의 <span className="font-semibold">정책 탭</span>
            등 운영용 기능이 노출됩니다. 일반 고객 채팅에는 영향이 없습니다.
          </div>
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
          <div className="mt-1 text-[11px] text-slate-500">비워두면 기본 아이콘(/brand/logo.png)이 사용됩니다.</div>
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
