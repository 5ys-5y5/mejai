"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectPopover } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

type WidgetConfig = {
  id: string;
  name?: string | null;
  template_public_key?: string | null;
  instance_id?: string | null;
  instance_public_key?: string | null;
  shared_instance_status?: "ready" | "missing";
  is_active?: boolean | null;
};

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "WIDGET_LOAD_FAILED";
}

export function WidgetQuickstartPanel() {
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setRequestError("");
      try {
        const res = await apiFetch<{ items: WidgetConfig[] }>("/api/widgets");
        if (!mounted) return;
        const list = res.items || [];
        setWidgets(list);
        setSelectedId((prev) => {
          if (prev && list.some((item) => item.id === prev)) {
            return prev;
          }
          return list[0]?.id || "";
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
  }, []);

  const selectedWidget = useMemo(
    () => widgets.find((item) => item.id === selectedId) || widgets[0] || null,
    [widgets, selectedId]
  );

  const templateId = String(selectedWidget?.id || "").trim();
  const instanceId = String(selectedWidget?.instance_id || "").trim();
  const instancePublicKey = String(selectedWidget?.instance_public_key || "").trim();
  const templatePublicKey = String(selectedWidget?.template_public_key || "").trim();
  const sharedReady =
    selectedWidget?.shared_instance_status === "ready" && Boolean(templateId && instanceId && instancePublicKey);

  const snippet = useMemo(() => {
    if (!sharedReady) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "https://mejai.help";
    return `<script async src="${base}/widget.js" data-instance-id="${instanceId}" data-public-key="${instancePublicKey}" data-template-id="${templateId}"></script>`;
  }, [instanceId, instancePublicKey, sharedReady, templateId]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3">
          <div className="mb-1 text-xs text-slate-600">템플릿 선택</div>
          <SelectPopover
            value={selectedWidget?.id || ""}
            options={widgets.map((item) => ({
              id: String(item.id || ""),
              label: String(item.name || item.id || "템플릿"),
              description:
                item.shared_instance_status === "ready"
                  ? "공유 인스턴스 준비 완료"
                  : "공유 인스턴스 없음",
            }))}
            onChange={(value) => setSelectedId(value)}
            className="w-full"
            buttonClassName="h-9 text-xs"
          />
        </div>
        <div className="text-sm font-semibold text-slate-900">시작 안내</div>
        <div className="mt-2 text-xs text-slate-600">
          quickstart 탭은 `/api/widgets` pure read 결과만 보여줍니다. 여기서는 shared provisioning 을 수행하지 않습니다.
        </div>
        <div className="mt-3 space-y-2 text-xs text-slate-700">
          <div>1. 이 페이지는 `/api/widgets` 응답으로 템플릿과 shared 상태를 읽기만 합니다.</div>
          <div>2. 상태가 `ready` 이면 아래 설치 코드를 복사해 고객사 페이지의 `body` 끝에 넣습니다.</div>
          <div>3. 상태가 `missing` 이면 `Widget` 탭으로 이동해 명시적으로 공유 인스턴스를 생성합니다.</div>
          <div>4. 고객사 페이지를 새로고침하면 런처가 나타나고, 클릭 시 `/api/widget/init` 이 기존 shared 를 사용합니다.</div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">/api/widgets 호출 확인</div>
        <div className="mt-2 text-xs text-slate-600">
          이 섹션은 서버 read 결과만 보여주며 DB write side effect 를 일으키지 않습니다.
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
          {loading
            ? "불러오는 중..."
            : requestError
              ? `실패 (${requestError})`
              : selectedWidget
                ? selectedWidget.shared_instance_status === "ready"
                  ? "정상 (shared ready)"
                  : "확인됨 (shared missing)"
                : "템플릿 없음"}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">설치 코드</div>
        <div className="mt-2 text-xs text-slate-600">
          shared 상태가 `ready` 일 때만 실제 설치 코드를 제공합니다.
        </div>
        <div className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
          {snippet || "공유 인스턴스가 아직 준비되지 않았습니다."}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!snippet}
            onClick={() => {
              if (!snippet) return;
              void navigator.clipboard.writeText(snippet);
              toast.success("설치 코드가 복사되었습니다.");
            }}
          >
            코드 복사
          </Button>
          <div className="text-xs text-slate-500">
            템플릿 키: <span className="font-mono text-slate-700">{templatePublicKey || "-"}</span>
          </div>
          <div className="text-xs text-slate-500">
            인스턴스 키: <span className="font-mono text-slate-700">{instancePublicKey || "-"}</span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">현재 상태</div>
        <div className="mt-2 text-xs text-slate-600">
          template-key read 경로는 shared 가 없으면 더 이상 자동 생성하지 않고 missing 상태를 그대로 드러냅니다.
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
          {selectedWidget
            ? selectedWidget.shared_instance_status === "ready"
              ? "shared ready"
              : "shared missing"
            : "선택된 템플릿 없음"}
        </div>
      </Card>
    </div>
  );
}
