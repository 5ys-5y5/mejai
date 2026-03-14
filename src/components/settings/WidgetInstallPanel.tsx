"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import { encodeWidgetOverrides } from "@/lib/widgetOverrides";

type WidgetInstallItem = {
  id: string;
  name?: string | null;
  template_public_key?: string | null;
  instance_id?: string | null;
  instance_public_key?: string | null;
  shared_instance_status?: "ready" | "missing";
};

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "요청에 실패했습니다.";
}

export function WidgetInstallPanel() {
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [widgets, setWidgets] = useState<WidgetInstallItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [requestError, setRequestError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [overridesText, setOverridesText] = useState("");
  const [overridesError, setOverridesError] = useState("");
  const [installOverrides, setInstallOverrides] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setRequestError("");
      try {
        const res = await apiFetch<{ items: WidgetInstallItem[] }>("/api/widgets");
        if (!mounted) return;
        const nextWidgets = res.items || [];
        setWidgets(nextWidgets);
        setSelectedId((prev) => {
          if (prev && nextWidgets.some((item) => item.id === prev)) {
            return prev;
          }
          return nextWidgets[0]?.id || "";
        });
      } catch (error) {
        if (!mounted) return;
        setWidgets([]);
        setSelectedId("");
        setRequestError(readErrorMessage(error));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!overridesText.trim()) {
      setInstallOverrides({});
      setOverridesError("");
      return;
    }

    try {
      const parsed = JSON.parse(overridesText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setInstallOverrides({});
        setOverridesError("Overrides 는 JSON 객체여야 합니다.");
        return;
      }
      setInstallOverrides(parsed as Record<string, unknown>);
      setOverridesError("");
    } catch {
      setInstallOverrides({});
      setOverridesError("유효한 JSON 형식이 아닙니다.");
    }
  }, [overridesText]);

  const selectedWidget = useMemo(
    () => widgets.find((item) => item.id === selectedId) || widgets[0] || null,
    [selectedId, widgets]
  );

  const templateOptions = useMemo<SelectOption[]>(
    () =>
      widgets.map((item) => ({
        id: item.id,
        label: item.name || item.id,
        description:
          item.shared_instance_status === "ready"
            ? "공유 인스턴스 준비 완료"
            : "공유 인스턴스 없음",
      })),
    [widgets]
  );

  const templateId = String(selectedWidget?.id || "").trim();
  const instanceId = String(selectedWidget?.instance_id || "").trim();
  const instancePublicKey = String(selectedWidget?.instance_public_key || "").trim();
  const sharedReady =
    selectedWidget?.shared_instance_status === "ready" && Boolean(templateId && instanceId && instancePublicKey);

  const installScript = useMemo(() => {
    if (!sharedReady) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "https://mejai.help";
    const overrides =
      Object.keys(installOverrides).length > 0 ? JSON.stringify(installOverrides, null, 2).replace(/\n/g, "\\n") : "";
    const overridesSnippet = overrides
      ? `window.mejaiWidget = { instance_id: \"${instanceId}\", public_key: \"${instancePublicKey}\", template_id: \"${templateId}\", overrides: ${overrides} };\\n`
      : `window.mejaiWidget = { instance_id: \"${instanceId}\", public_key: \"${instancePublicKey}\", template_id: \"${templateId}\" };\\n`;
    return `<script>\\n${overridesSnippet}</script>\\n<script async src=\\\"${base}/widget.js\\\" data-instance-id=\\\"${instanceId}\\\" data-public-key=\\\"${instancePublicKey}\\\" data-template-id=\\\"${templateId}\\\"></script>`;
  }, [installOverrides, instanceId, instancePublicKey, sharedReady, templateId]);

  const installUrl = useMemo(() => {
    if (!sharedReady) return "";
    const overridesParam =
      Object.keys(installOverrides).length > 0 ? encodeWidgetOverrides(installOverrides) : "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const src = `${base}/embed/instance_id=${encodeURIComponent(instanceId)}?public_key=${encodeURIComponent(
      instancePublicKey
    )}&template_id=${encodeURIComponent(templateId)}`;
    return overridesParam ? `${src}&ovr=${encodeURIComponent(overridesParam)}` : src;
  }, [installOverrides, instanceId, instancePublicKey, sharedReady, templateId]);

  async function handleProvisionShared() {
    if (!templateId) return;
    setProvisioning(true);
    setRequestError("");
    try {
      await apiFetch("/api/widget-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          instance_kind: "template_shared",
        }),
      });
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      setRequestError(readErrorMessage(error));
    } finally {
      setProvisioning(false);
    }
  }

  const statusText = selectedWidget
    ? selectedWidget.shared_instance_status === "ready"
      ? "공유 인스턴스 준비 완료"
      : "공유 인스턴스가 아직 없습니다"
    : "템플릿을 선택하세요.";

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold text-slate-900">템플릿 선택</div>
        <SelectPopover
          value={selectedWidget?.id || ""}
          options={templateOptions}
          onChange={(value) => setSelectedId(value)}
          className="w-full"
          buttonClassName="h-9 text-xs"
        />
        <div className="text-xs text-slate-600">{loading ? "불러오는 중..." : statusText}</div>
        {requestError ? <div className="text-xs text-rose-600">{requestError}</div> : null}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold text-slate-900">공유 인스턴스 상태</div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
          {selectedWidget
            ? selectedWidget.shared_instance_status === "ready"
              ? "템플릿 public key 경로에서 사용할 공유 인스턴스가 준비되어 있습니다."
              : "현재는 read-only 상태만 확인했습니다. 아래 버튼을 눌렀을 때만 shared provisioning 이 실행됩니다."
            : "표시할 템플릿이 없습니다."}
        </div>
        {selectedWidget && !sharedReady ? (
          <Button type="button" onClick={handleProvisionShared} disabled={provisioning || loading}>
            {provisioning ? "공유 인스턴스 생성 중..." : "공유 인스턴스 생성"}
          </Button>
        ) : null}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold text-slate-900">Overrides (JSON)</div>
        <textarea
          value={overridesText}
          onChange={(event) => setOverridesText(event.target.value)}
          className="min-h-[140px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          placeholder='{"chat_policy":{...},"theme":{...},"setup_config":{...}}'
        />
        <div className="text-[11px] text-slate-500">
          `/app/create?tab=template` 에서 설정 가능한 항목을 preview/install 단계에서만 덮어쓸 수 있습니다.
        </div>
        {overridesError ? <div className="text-xs text-rose-600">{overridesError}</div> : null}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold text-slate-900">설치 코드</div>
        <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
          {installScript || "공유 인스턴스가 ready 상태가 되면 설치 코드가 표시됩니다."}
        </div>
        <div className="text-[11px] text-slate-500">Preview URL: {installUrl || "-"}</div>
        <Button
          type="button"
          variant="outline"
          disabled={!installScript || Boolean(overridesError)}
          onClick={() => {
            if (!installScript) return;
            void navigator.clipboard.writeText(installScript);
          }}
        >
          설치 코드 복사
        </Button>
      </Card>
    </div>
  );
}
