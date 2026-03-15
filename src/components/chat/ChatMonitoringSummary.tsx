"use client";

import { PanelCard } from "@/components/design-system";

type ChatMonitorSummary = {
  session_count: number;
  live_count: number;
  closed_count: number;
  satisfaction_avg: number | null;
  satisfaction_response_rate: number;
  avg_turn_count: number;
  review_count: number;
};

type ChatMonitoringSummaryProps = {
  summary: ChatMonitorSummary | null;
  loading?: boolean;
};

function formatRate(value?: number | null) {
  const safe = Number(value || 0);
  if (!Number.isFinite(safe)) return "0%";
  return `${Math.round(safe * 100)}%`;
}

function formatSatisfaction(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function formatTurns(value?: number | null) {
  const safe = Number(value || 0);
  if (!Number.isFinite(safe)) return "0";
  return safe.toFixed(2);
}

export function ChatMonitoringSummary({ summary, loading = false }: ChatMonitoringSummaryProps) {
  const cards = [
    {
      label: "대화 수",
      value: loading ? "-" : String(summary?.session_count ?? 0),
      helper: "현재 필터 결과 기준",
    },
    {
      label: "진행 중",
      value: loading ? "-" : String(summary?.live_count ?? 0),
      helper: "종료 시각이 없는 세션",
    },
    {
      label: "종료됨",
      value: loading ? "-" : String(summary?.closed_count ?? 0),
      helper: "종료 처리된 세션",
    },
    {
      label: "평균 만족도",
      value: loading ? "-" : formatSatisfaction(summary?.satisfaction_avg),
      helper: "응답 세션만 평균",
    },
    {
      label: "만족도 응답률",
      value: loading ? "-" : formatRate(summary?.satisfaction_response_rate),
      helper: "satisfaction 입력 비율",
    },
    {
      label: "평균 턴 수",
      value: loading ? "-" : formatTurns(summary?.avg_turn_count),
      helper: "세션당 평균 턴",
    },
    {
      label: "후속 지원 요청",
      value: loading ? "-" : String(summary?.review_count ?? 0),
      helper: "review queue 기준",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <PanelCard key={card.label} className="p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{card.value}</div>
          <div className="mt-1 text-xs text-slate-500">{card.helper}</div>
        </PanelCard>
      ))}
    </div>
  );
}
