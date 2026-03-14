"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { SelectPopover } from "@/components/SelectPopover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  WidgetLauncherRuntime,
  buildWidgetEmbedSrc,
  type WidgetConversationTab,
  type WidgetLauncherPosition,
} from "@/components/design-system/widget/WidgetUI.parts";
import {
  WIDGET_PAGE_KEY,
  resolveConversationPageFeatures,
} from "@/lib/conversation/pageFeaturePolicy";
import type { WidgetTemplateSettingsController } from "@/lib/conversation/client/useWidgetTemplateSettingsController";

type CreateWorkspacePreviewRailProps = {
  controller: WidgetTemplateSettingsController;
};

export function CreateWorkspacePreviewRail({ controller }: CreateWorkspacePreviewRailProps) {
  const widgetsPreviewRef = useRef<HTMLDivElement | null>(null);
  const [previewHost, setPreviewHost] = useState<HTMLDivElement | null>(null);
  const [launcherHighlight, setLauncherHighlight] = useState(false);
  const [launcherPreviewOpen, setLauncherPreviewOpen] = useState(false);

  const previewTabStatus = useMemo(() => {
    const resolved = resolveConversationPageFeatures(WIDGET_PAGE_KEY, controller.policyValue);
    return {
      chat: {
        enabled: resolved.widget.tabBar.chat,
        visibility: resolved.visibility.widget.tabBar.chat,
      },
      list: {
        enabled: resolved.widget.tabBar.list,
        visibility: resolved.visibility.widget.tabBar.list,
      },
      policy: {
        enabled: resolved.widget.tabBar.policy,
        visibility: resolved.visibility.widget.tabBar.policy,
      },
      login: {
        enabled: resolved.widget.tabBar.login,
        visibility: resolved.visibility.widget.tabBar.login,
      },
    } as const;
  }, [controller.policyValue]);

  const launcherConfig = useMemo(() => {
    const launcher = controller.policyValue?.widget?.launcher;
    const container = launcher?.container || {};
    return {
      bottom: typeof container.bottom === "string" ? container.bottom : undefined,
      left: typeof container.left === "string" ? container.left : undefined,
      right: typeof container.right === "string" ? container.right : undefined,
      zIndex: typeof container.zIndex === "number" ? container.zIndex : undefined,
      size: typeof launcher?.size === "number" ? launcher.size : undefined,
    };
  }, [controller.policyValue]);

  const launcherPosition: WidgetLauncherPosition = useMemo(() => {
    if (launcherConfig.left && !launcherConfig.right) return "bottom-left";
    return "bottom-right";
  }, [launcherConfig.left, launcherConfig.right]);

  const previewPanels = useMemo(
    () =>
      [
        { tab: "chat", label: "Conversation", status: previewTabStatus.chat },
        { tab: "list", label: "List", status: previewTabStatus.list },
        { tab: "policy", label: "Policy", status: previewTabStatus.policy },
        { tab: "login", label: "Login", status: previewTabStatus.login },
      ] as const,
    [previewTabStatus]
  );

  const previewWidgetId = controller.draft?.id || "";
  const previewPublicKey = controller.draft?.public_key || "";
  const previewIdentity = `${previewWidgetId}:${previewPublicKey}`;

  const previewRowCount = useMemo(() => {
    const count = previewPanels.length;
    if (count <= 1) return 1;
    if (count % 3 === 0) return 3;
    if (count % 2 === 0) return 2;
    return 1;
  }, [previewPanels.length]);

  const previewColumnCount = useMemo(() => {
    const count = previewPanels.length;
    return Math.max(1, Math.ceil(count / previewRowCount));
  }, [previewPanels.length, previewRowCount]);

  const launcherPreviewKey = useMemo(
    () => `${controller.previewInitNonce}-${launcherPreviewOpen ? "open" : "closed"}`,
    [controller.previewInitNonce, launcherPreviewOpen]
  );

  const buildPreviewSrc = useCallback(
    (tab?: WidgetConversationTab) => {
      if (!previewWidgetId || !previewPublicKey) return "";
      const base = typeof window !== "undefined" ? window.location.origin : "";
      return buildWidgetEmbedSrc(
        base,
        { widgetId: previewWidgetId, widgetPublicKey: previewPublicKey },
        "preview",
        "",
        controller.previewOverridesParam,
        controller.previewMeta,
        tab,
        { preview: true }
      );
    },
    [controller.previewMeta, controller.previewOverridesParam, previewPublicKey, previewWidgetId]
  );

  const handleLauncherClick = useCallback(() => {
    setLauncherHighlight(true);
    setLauncherPreviewOpen((current) => !current);
    widgetsPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    setLauncherPreviewOpen(false);
  }, [controller.previewInitNonce, previewIdentity]);

  useEffect(() => {
    if (!launcherHighlight) return;
    const timer = setTimeout(() => setLauncherHighlight(false), 800);
    return () => clearTimeout(timer);
  }, [launcherHighlight]);

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">전역 프리뷰</div>
            <div className="mt-1 text-xs text-slate-500">
              선택된 템플릿의 설치 코드와 프리뷰를 모든 탭에서 같은 상태로 유지합니다.
            </div>
          </div>
          <div className="w-full max-w-sm">
            <div className="mb-1 text-[11px] font-semibold text-slate-500">프리뷰 대상 템플릿</div>
            <SelectPopover
              value={controller.selectedTemplateId}
              onChange={controller.selectTemplate}
              options={controller.templateOptions}
              placeholder="템플릿 선택"
              className="w-full"
              buttonClassName="h-10"
            />
          </div>
        </div>
      </Card>

      {controller.draft ? (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <Card className="space-y-4 border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700">설치 코드와 프리뷰 메타</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    저장 전 draft 상태도 즉시 프리뷰할 수 있습니다.
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!controller.installScript}
                  onClick={() => {
                    if (!controller.installScript) return;
                    void navigator.clipboard.writeText(controller.installScript);
                  }}
                >
                  설치 코드 복사
                </Button>
              </div>

              <label className="block">
                <div className="mb-1 text-xs text-slate-600">Overrides (JSON)</div>
                <textarea
                  value={controller.installOverridesText}
                  onChange={(event) => controller.setInstallOverridesText(event.target.value)}
                  className="min-h-[140px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  placeholder='{"chat_policy":{...},"theme":{...}}'
                />
              </label>

              <div
                tabIndex={0}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700 whitespace-pre-wrap"
              >
                {controller.installScript || "템플릿을 선택하세요."}
              </div>
              <div className="break-all text-[11px] text-slate-500">Preview URL: {controller.installUrl || "-"}</div>

              <div className="grid grid-cols-1 gap-3">
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">Origin</div>
                  <Input
                    value={controller.previewMeta.origin}
                    onChange={(event) => controller.updatePreviewMeta("origin", event.target.value)}
                    className="h-9"
                    placeholder="https://example.com"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">Page URL</div>
                  <Input
                    value={controller.previewMeta.page_url}
                    onChange={(event) => controller.updatePreviewMeta("page_url", event.target.value)}
                    className="h-9"
                    placeholder="https://example.com/page"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">Referrer</div>
                  <Input
                    value={controller.previewMeta.referrer}
                    onChange={(event) => controller.updatePreviewMeta("referrer", event.target.value)}
                    className="h-9"
                    placeholder="https://ref.example.com"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={controller.applyPreview}>
                  미리보기 적용
                </Button>
                {controller.templatePreviewUrl ? (
                  <button
                    type="button"
                    onClick={() => window.open(controller.templatePreviewUrl, "_blank", "noreferrer")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    위젯 UI 링크
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </Card>

            <Card className="space-y-3 border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700">런처 위치 프리뷰</div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    launcherPreviewOpen
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {launcherPreviewOpen ? "OPEN" : "CLOSED"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">가로 폭을 드래그해서 반응형 위치를 확인할 수 있습니다.</div>
              <div
                className="relative h-[280px] max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                style={{ resize: "horizontal", overflow: "auto", minWidth: "260px" }}
              >
                <div ref={setPreviewHost} className="absolute inset-0" />
                {previewHost && previewWidgetId && previewPublicKey ? (
                  <WidgetLauncherRuntime
                    key={launcherPreviewKey}
                    cfg={{ overrides: controller.installOverrides }}
                    baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
                    widgetId={previewWidgetId}
                    widgetPublicKey={previewPublicKey}
                    previewMode
                    visitorId="preview"
                    sessionId=""
                    sessionStorageKey={`preview_${previewWidgetId}`}
                    position={launcherPosition}
                    brandName={controller.draft?.name || "Mejai"}
                    launcherLabel="Chat"
                    mountNode={previewHost}
                    previewMeta={controller.previewMeta}
                    defaultOpen={launcherPreviewOpen}
                    layout="absolute"
                    bottom={launcherConfig.bottom}
                    left={launcherConfig.left}
                    right={launcherConfig.right}
                    zIndex={launcherConfig.zIndex}
                    initNonce={controller.previewInitNonce}
                    disableToggle
                    onLauncherClick={handleLauncherClick}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    미리보기 대상 템플릿을 선택하세요.
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Card
            ref={widgetsPreviewRef}
            className={`space-y-3 border-slate-200 bg-white p-4 ${launcherHighlight ? "ring-2 ring-slate-900" : ""}`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>위젯 UI 다중 프리뷰</span>
              <span className="text-[11px] font-normal text-slate-500">chat / list / policy / login</span>
            </div>
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${previewColumnCount}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${previewRowCount}, minmax(0, 1fr))`,
              }}
            >
              {previewPanels.map((panel) => (
                <div key={panel.tab} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold text-slate-600">{panel.label}</div>
                    <div className="flex items-center gap-2 text-[10px] font-semibold">
                      <span
                        className={`rounded-full border px-2 py-0.5 ${
                          panel.status.enabled
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {panel.status.enabled ? "ON" : "OFF"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
                        {panel.status.visibility}
                      </span>
                    </div>
                  </div>
                  <div className="h-[560px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {previewWidgetId && previewPublicKey ? (
                      panel.status.enabled ? (
                        <iframe
                          key={`${previewIdentity}-${panel.tab}-${controller.previewInitNonce}`}
                          title={`Widget ${panel.label} Preview`}
                          src={buildPreviewSrc(panel.tab)}
                          className="h-full w-full"
                          allow="clipboard-write"
                          style={{ border: "none" }}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-slate-400">
                          <span>비활성화됨</span>
                          <span className="text-[11px] text-slate-300">
                            visibility: {panel.status.visibility}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        미리보기 대상 템플릿을 선택하세요.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card className="border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          프리뷰 대상 템플릿을 선택하세요. 템플릿이 없으면 `템플릿` 탭에서 새 템플릿을 만든 뒤 다시 확인합니다.
        </Card>
      )}
    </div>
  );
}
