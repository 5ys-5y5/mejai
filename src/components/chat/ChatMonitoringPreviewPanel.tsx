"use client";

import { useMemo } from "react";
import type { WidgetConversationTab } from "@/components/design-system/widget/WidgetUI.parts";
import { StateBanner } from "@/components/design-system";
import { Card } from "@/components/ui/Card";
import { formatKstDateTime } from "@/lib/kst";
import { buildConversationPreviewSrc } from "@/lib/widgetConversationPreview";
import { WidgetConversationPreviewCard, type WidgetConversationPreviewPanel } from "@/components/widget/WidgetConversationPreviewCard";

type ChatMonitorPreviewTarget = {
  mode: "instance" | "template" | "fallback";
  can_preview: boolean;
  reason: "ok" | "instance_missing" | "template_missing" | "public_key_missing" | "widget_mismatch" | "unknown";
  template_id: string | null;
  template_public_key: string | null;
  instance_id: string | null;
  instance_public_key: string | null;
  visitor_id: string | null;
};

type ChatMonitorPreviewTabStatus = {
  tab: WidgetConversationTab;
  label: string;
  enabled: boolean;
  visibility: string;
};

type ChatMonitorTranscriptMessage = {
  role: "user" | "bot";
  content: string;
  rich_html?: string | null;
  created_at?: string | null;
  turn_id?: string | null;
};

type ChatMonitorSessionDetail = {
  session: {
    id: string;
    session_code: string | null;
    started_at: string | null;
    ended_at: string | null;
    satisfaction: number | null;
    outcome: string | null;
    template_id: string | null;
    template_name: string | null;
    instance_id: string | null;
    instance_name: string | null;
    template_missing: boolean;
    instance_missing: boolean;
    review: boolean;
    metadata: Record<string, unknown> | null;
  };
  preview_target: ChatMonitorPreviewTarget;
  preview_tabs: ChatMonitorPreviewTabStatus[];
  transcript: ChatMonitorTranscriptMessage[];
};

type ChatMonitoringPreviewPanelProps = {
  detail: ChatMonitorSessionDetail | null;
  loading?: boolean;
  error?: string | null;
  previewTab: WidgetConversationTab;
  onPreviewTabChange: (tab: WidgetConversationTab) => void;
};

const previewReasonLabels: Record<string, string> = {
  ok: "미리보기 가능",
  instance_missing: "인스턴스 참조가 없어 transcript만 확인할 수 있습니다.",
  template_missing: "템플릿 참조가 없어 transcript만 확인할 수 있습니다.",
  public_key_missing: "public key가 없어 iframe 미리보기를 열 수 없습니다.",
  widget_mismatch: "세션과 위젯 참조가 맞지 않아 transcript fallback을 사용합니다.",
  unknown: "미리보기 대상을 해석하지 못했습니다.",
};

function formatSessionCode(value: string | null, id: string) {
  return value || id.slice(0, 8);
}

function formatSatisfaction(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(1);
}

function renderFallbackTranscript(messages: ChatMonitorTranscriptMessage[]) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-400">
        저장된 transcript가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-slate-50 p-4">
      {messages.map((message, index) => (
        <div
          key={`${message.turn_id || index}:${message.role}`}
          className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
            message.role === "user"
              ? "ml-auto bg-slate-900 text-white"
              : "mr-auto border border-slate-200 bg-white text-slate-700"
          }`}
        >
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] opacity-60">
            {message.role === "user" ? "User" : "Bot"}
          </div>
          {message.role === "bot" && message.rich_html ? (
            <div
              className="prose prose-sm max-w-none prose-slate"
              dangerouslySetInnerHTML={{ __html: message.rich_html }}
            />
          ) : (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          )}
          <div className="mt-2 text-[10px] opacity-50">{formatKstDateTime(message.created_at)}</div>
        </div>
      ))}
    </div>
  );
}

export function ChatMonitoringPreviewPanel({
  detail,
  loading = false,
  error = null,
  previewTab,
  onPreviewTabChange,
}: ChatMonitoringPreviewPanelProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const panels = useMemo<WidgetConversationPreviewPanel[]>(() => {
    if (!detail) return [];
    return detail.preview_tabs.map((panel) => {
      const previewUnavailable = !detail.preview_target.can_preview;
      const src = buildConversationPreviewSrc({
        baseUrl,
        target: detail.preview_target,
        visitorId: detail.preview_target.visitor_id,
        sessionId: detail.session.id,
        tab: panel.tab,
      });

      return {
        tab: panel.tab,
        label: panel.label,
        enabled: panel.enabled,
        visibility: panel.visibility,
        src,
        body:
          previewUnavailable && panel.tab === "chat"
            ? renderFallbackTranscript(detail.transcript)
            : undefined,
        unavailableTitle: previewUnavailable
          ? "iframe 미리보기를 열 수 없습니다."
          : panel.enabled
            ? "미리보기를 불러올 수 없습니다."
            : "비활성화됨",
        unavailableDetail: previewUnavailable
          ? previewReasonLabels[detail.preview_target.reason] || previewReasonLabels.unknown
          : `visibility: ${panel.visibility}`,
      };
    });
  }, [baseUrl, detail]);

  return (
    <div className="space-y-4">
      {error ? (
        <StateBanner tone="danger" title="세션 상세 로딩 실패" description={error} />
      ) : null}

      <Card className="overflow-hidden border-slate-200 bg-white">
        {!detail ? (
          <div className="p-6 text-sm text-slate-500">
            {loading ? "선택한 세션을 불러오는 중입니다." : "좌측 리스트에서 확인할 세션을 선택하세요."}
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  세션 {formatSessionCode(detail.session.session_code, detail.session.id)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  시작 {formatKstDateTime(detail.session.started_at)} · 종료 {formatKstDateTime(detail.session.ended_at)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                  {detail.session.template_name || "템플릿 미지정"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
                  {detail.session.instance_name || "인스턴스 미지정"}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 ${
                    detail.preview_target.can_preview
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {detail.preview_target.can_preview ? "preview 가능" : "fallback"}
                </span>
              </div>
            </div>

            <WidgetConversationPreviewCard
              panels={panels}
              selectedTab={previewTab}
              onSelectTab={onPreviewTabChange}
              emptyState={<div className="flex h-full items-center justify-center text-xs text-slate-400">세션 프리뷰 정보가 없습니다.</div>}
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">만족도</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{formatSatisfaction(detail.session.satisfaction)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">결과</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{detail.session.outcome || "-"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">참조 상태</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {detail.session.template_missing || detail.session.instance_missing ? "누락 있음" : "정상"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">후속 지원 요청</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{detail.session.review ? "있음" : "없음"}</div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
