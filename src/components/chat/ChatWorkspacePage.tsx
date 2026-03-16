"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { WidgetConversationTab } from "@/components/design-system/widget/WidgetUI.parts";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { StateBanner } from "@/components/design-system";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CreateListTable } from "@/components/create/CreateResourceShell";
import { ChatMonitoringSummary } from "@/components/chat/ChatMonitoringSummary";
import { ChatMonitoringPreviewPanel } from "@/components/chat/ChatMonitoringPreviewPanel";
import { apiFetch } from "@/lib/apiClient";
import { formatKstDateTime } from "@/lib/kst";

type ChatMonitorListId =
  | "all"
  | "live"
  | "closed"
  | "rated"
  | "unrated"
  | "low_satisfaction"
  | "needs_review"
  | "orphan_ref";

type ChatMonitorOverviewResponse = {
  filters: {
    templates: Array<{ id: string; label: string; session_count: number; missing: boolean }>;
    instances: Array<{ id: string; label: string; template_id: string | null; session_count: number; missing: boolean; active: boolean | null }>;
    lists: Array<{ id: ChatMonitorListId; label: string; session_count: number; admin_only?: boolean }>;
  };
  summary: {
    session_count: number;
    live_count: number;
    closed_count: number;
    satisfaction_avg: number | null;
    satisfaction_response_rate: number;
    avg_turn_count: number;
    review_count: number;
  };
  items: Array<{
    session_id: string;
    session_code: string | null;
    page_url: string | null;
    phone_number: string | null;
    caller_masked: string | null;
    duration_sec: number | null;
    channel: string | null;
    agent_id: string | null;
    sentiment: string | null;
    is_escalated: boolean | null;
    escalation_reason: string | null;
    template_id: string | null;
    template_name: string | null;
    template_missing: boolean;
    instance_id: string | null;
    instance_name: string | null;
    instance_missing: boolean;
    started_at: string | null;
    ended_at: string | null;
    last_turn_at: string | null;
    satisfaction: number | null;
    outcome: string | null;
    turn_count: number;
  }>;
  selection: {
    default_session_id: string | null;
  };
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
  preview_target: {
    mode: "instance" | "template" | "fallback";
    can_preview: boolean;
    reason: "ok" | "instance_missing" | "template_missing" | "public_key_missing" | "widget_mismatch" | "unknown";
    template_id: string | null;
    template_public_key: string | null;
    instance_id: string | null;
    instance_public_key: string | null;
    visitor_id: string | null;
  };
  preview_tabs: Array<{
    tab: WidgetConversationTab;
    label: string;
    enabled: boolean;
    visibility: string;
  }>;
  transcript: Array<{
    role: "user" | "bot";
    content: string;
    rich_html?: string | null;
    created_at?: string | null;
    turn_id?: string | null;
  }>;
};

const CHAT_PAGE_SIZE_OPTIONS = [
  { id: "10", label: "10개", description: "페이지당 10개" },
  { id: "100", label: "100개", description: "페이지당 100개" },
] as const satisfies SelectOption[];

type PaginationToken = number | "ellipsis";

function formatSessionCode(value: string | null, id: string) {
  return value || id.slice(0, 8);
}

function formatSatisfaction(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(1);
}

function formatSessionStatus(item: ChatMonitorOverviewResponse["items"][number]) {
  if (!item.ended_at) return "진행 중";
  if (typeof item.satisfaction === "number" && item.satisfaction <= 2) return "낮은 만족도";
  return "종료";
}

function formatConversationPage(pageUrl: string | null) {
  if (!pageUrl) return "-";
  try {
    const parsed = new URL(pageUrl);
    return `${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return pageUrl;
  }
}

function normalizePageSize(rawValue: string | null) {
  const parsed = Number(rawValue || 10);
  return parsed === 100 ? 100 : 10;
}

function normalizePage(rawValue: string | null) {
  const parsed = Number(rawValue || 1);
  return Number.isFinite(parsed) ? Math.max(Math.trunc(parsed), 1) : 1;
}

function buildPaginationTokens(currentPage: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const tokens: PaginationToken[] = [1];
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(totalPages - 1, currentPage + 1);

  if (windowStart > 2) {
    tokens.push("ellipsis");
  }

  for (let page = windowStart; page <= windowEnd; page += 1) {
    tokens.push(page);
  }

  if (windowEnd < totalPages - 1) {
    tokens.push("ellipsis");
  }

  tokens.push(totalPages);
  return tokens;
}

export function ChatWorkspacePage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const templateId = searchParams.get("templateId") || "all";
  const instanceId = searchParams.get("instanceId") || "all";
  const listId = (searchParams.get("list") as ChatMonitorListId | null) || "all";
  const sessionId = searchParams.get("sessionId") || "";
  const previewTab = (searchParams.get("previewTab") as WidgetConversationTab | null) || "chat";
  const pageSize = normalizePageSize(searchParams.get("pageSize"));
  const currentPage = normalizePage(searchParams.get("page"));
  const currentOffset = (currentPage - 1) * pageSize;

  const [overview, setOverview] = useState<ChatMonitorOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatMonitorSessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const totalSessions = overview?.summary.session_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalSessions / pageSize));
  const visibleRangeStart = totalSessions === 0 ? 0 : currentOffset + 1;
  const visibleRangeEnd = totalSessions === 0 ? 0 : currentOffset + (overview?.items.length ?? 0);
  const paginationTokens = buildPaginationTokens(currentPage, totalPages);

  const replaceQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
          return;
        }
        params.set(key, value);
      });
      const query = params.toString();
      const nextUrl = query ? `${pathname}?${query}` : pathname;
      startTransition(() => {
        router.replace(nextUrl, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    let mounted = true;
    setOverviewLoading(true);
    setOverviewError(null);

    const params = new URLSearchParams();
    params.set("templateId", templateId);
    params.set("instanceId", instanceId);
    params.set("list", listId);
    params.set("limit", String(pageSize));
    params.set("offset", String(currentOffset));

    apiFetch<ChatMonitorOverviewResponse>(`/api/chat-monitor?${params.toString()}`)
      .then((response) => {
        if (!mounted) return;
        setOverview(response);
        setOverviewLoading(false);
      })
      .catch((error) => {
        if (!mounted) return;
        setOverview(null);
        setOverviewError(error instanceof Error ? error.message : "대화 모니터링 데이터를 불러오지 못했습니다.");
        setOverviewLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentOffset, instanceId, listId, pageSize, reloadNonce, templateId]);

  useEffect(() => {
    if (!overview) return;

    if (totalSessions === 0) {
      if (currentPage !== 1) {
        replaceQuery({ page: "1", sessionId: null });
        return;
      }
      if (sessionId) {
        replaceQuery({ sessionId: null });
      }
      return;
    }

    if (currentPage > totalPages) {
      replaceQuery({ page: String(totalPages), sessionId: null });
    }
  }, [currentPage, overview, replaceQuery, sessionId, totalPages, totalSessions]);

  useEffect(() => {
    if (!overview) return;
    if (totalSessions === 0 || currentPage > totalPages) return;
    const availableIds = new Set(overview.items.map((item) => item.session_id));
    if (sessionId && availableIds.has(sessionId)) return;
    if (overview.selection.default_session_id) {
      replaceQuery({ sessionId: overview.selection.default_session_id });
      return;
    }
    if (sessionId) {
      replaceQuery({ sessionId: null });
    }
  }, [currentPage, overview, replaceQuery, sessionId, totalPages, totalSessions]);

  useEffect(() => {
    if (!sessionId) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let mounted = true;
    setDetailLoading(true);
    setDetailError(null);

    apiFetch<ChatMonitorSessionDetail>(`/api/chat-monitor/${encodeURIComponent(sessionId)}`)
      .then((response) => {
        if (!mounted) return;
        setDetail(response);
        setDetailLoading(false);
      })
      .catch((error) => {
        if (!mounted) return;
        setDetail(null);
        setDetailError(error instanceof Error ? error.message : "세션 상세를 불러오지 못했습니다.");
        setDetailLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const templateOptions = useMemo<SelectOption[]>(
    () => [
      { id: "all", label: "전체 템플릿", description: "모든 템플릿" },
      ...((overview?.filters.templates || []).map((item) => ({
        id: item.id,
        label: item.label,
        description: `${item.session_count}개`,
      })) as SelectOption[]),
    ],
    [overview]
  );

  const instanceOptions = useMemo<SelectOption[]>(
    () => [
      { id: "all", label: "전체 인스턴스", description: "모든 인스턴스" },
      ...((overview?.filters.instances || []).map((item) => ({
        id: item.id,
        label: item.label,
        description: `${item.session_count}개`,
      })) as SelectOption[]),
    ],
    [overview]
  );

  const listOptions = useMemo<SelectOption[]>(
    () => [
      { id: "all", label: "전체", description: "모든 세션" },
      ...((overview?.filters.lists || [])
        .filter((item) => item.id !== "all")
        .map((item) => ({
          id: item.id,
          label: item.label,
          description: `${item.session_count}개`,
        })) as SelectOption[]),
    ],
    [overview]
  );

  const instanceOptionById = useMemo(
    () => new Map((overview?.filters.instances || []).map((item) => [item.id, item])),
    [overview]
  );

  const pageSizeOptions = useMemo<SelectOption[]>(() => [...CHAT_PAGE_SIZE_OPTIONS], []);
  const tableColumns = useMemo(() => {
    return [
      {
        id: "session",
        label: "세션",
        width: "minmax(0,1.2fr)",
        render: (item: ChatMonitorOverviewResponse["items"][number]) => (
          <div className="truncate text-sm font-semibold text-slate-900">
            {formatSessionCode(item.session_code, item.session_id)}
          </div>
        ),
      },
      {
        id: "template",
        label: "템플릿",
        width: "minmax(0,1.35fr)",
        render: (item: ChatMonitorOverviewResponse["items"][number]) => item.template_name || "-",
      },
      {
        id: "instance",
        label: "인스턴스",
        width: "minmax(0,1.15fr)",
        render: (item: ChatMonitorOverviewResponse["items"][number]) => item.instance_name || "-",
      },
      {
        id: "page",
        label: "대화 페이지",
        width: "minmax(0,1.6fr)",
        render: (item: ChatMonitorOverviewResponse["items"][number]) => {
          const pageLabel = formatConversationPage(item.page_url);
          return (
            <div className="truncate text-sm text-slate-700" title={item.page_url || undefined}>
              {pageLabel}
            </div>
          );
        },
      },
      {
        id: "status",
        label: "상태",
        width: "minmax(0,0.9fr)",
        render: (item: ChatMonitorOverviewResponse["items"][number]) => formatSessionStatus(item),
      },
      {
        id: "satisfaction",
        label: "만족도",
        width: "minmax(0,0.65fr)",
        render: (item: ChatMonitorOverviewResponse["items"][number]) => formatSatisfaction(item.satisfaction),
      },
      {
        id: "turns",
        label: "턴 수",
        width: "minmax(0,0.65fr)",
        render: (item: ChatMonitorOverviewResponse["items"][number]) => `${item.turn_count}`,
      },
      {
        id: "activity",
        label: "최근 활동",
        width: "minmax(0,1fr)",
        render: (item: ChatMonitorOverviewResponse["items"][number]) => formatKstDateTime(item.last_turn_at || item.started_at),
      },
    ];
  }, []);

  return (
    <div className="px-5 py-6 md:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">대화하기</h1>
          <p className="mt-1 text-sm text-slate-600">
            템플릿, 대화창 인스턴스, 세션 프리셋 기준으로 실제 위젯 대화 현황과 성과를 확인합니다.
          </p>
        </div>

        <Card className="border-slate-200 bg-white p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div>
              <div className="mb-1 text-[11px] font-semibold text-slate-500">템플릿</div>
              <SelectPopover
                value={templateId}
                onChange={(nextTemplateId) => {
                  replaceQuery({
                    templateId: nextTemplateId,
                    instanceId: "all",
                    page: "1",
                    sessionId: null,
                  });
                }}
                options={templateOptions}
                className="w-full"
                buttonClassName="h-10"
              />
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold text-slate-500">인스턴스</div>
              <SelectPopover
                value={instanceId}
                onChange={(nextInstanceId) => {
                  const linkedTemplateId =
                    nextInstanceId !== "all" ? instanceOptionById.get(nextInstanceId)?.template_id || templateId : templateId;
                  replaceQuery({
                    templateId: nextInstanceId !== "all" && linkedTemplateId ? linkedTemplateId : templateId,
                    instanceId: nextInstanceId,
                    page: "1",
                    sessionId: null,
                  });
                }}
                options={instanceOptions}
                className="w-full"
                buttonClassName="h-10"
              />
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold text-slate-500">대화 리스트</div>
              <SelectPopover
                value={listId}
                onChange={(nextListId) => {
                  replaceQuery({
                    list: nextListId,
                    page: "1",
                    sessionId: null,
                  });
                }}
                options={listOptions}
                className="w-full"
                buttonClassName="h-10"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReloadNonce((current) => current + 1)}
                className="h-10 rounded-xl border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                새로고침
              </Button>
            </div>
          </div>
        </Card>

        {overviewError ? (
          <StateBanner tone="danger" title="대화 모니터링 로딩 실패" description={overviewError} />
        ) : null}

        <ChatMonitoringSummary summary={overview?.summary || null} loading={overviewLoading} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(560px,1.05fr)_minmax(420px,0.95fr)]">
          <Card className="overflow-hidden border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">대화 리스트</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold text-slate-500">페이지당</div>
                <SelectPopover
                  value={String(pageSize)}
                  onChange={(nextPageSize) => {
                    const normalizedPageSize = normalizePageSize(nextPageSize);
                    replaceQuery({
                      pageSize: String(normalizedPageSize),
                      page: "1",
                      sessionId: null,
                    });
                  }}
                  options={pageSizeOptions}
                  className="w-[104px]"
                  buttonClassName="h-9"
                />
              </div>
            </div>

            <div>
              {overviewLoading ? (
                <div className="p-4 text-sm text-slate-500">세션 목록을 불러오는 중입니다.</div>
              ) : (
                <>
                  <CreateListTable
                    rows={overview?.items || []}
                    getRowId={(item) => item.session_id}
                    selectedId={sessionId || null}
                    onSelect={(item) => replaceQuery({ sessionId: item.session_id })}
                    emptyState={<div className="p-4 text-sm text-slate-500">조건에 맞는 대화가 없습니다.</div>}
                    columns={tableColumns}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                    <div className="text-xs text-slate-500">
                      {overviewLoading ? "불러오는 중" : `${visibleRangeStart}-${visibleRangeEnd} / ${totalSessions}`}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => replaceQuery({ page: String(currentPage - 1), sessionId: null })}
                        disabled={overviewLoading || currentPage <= 1}
                        className="h-8 rounded-lg border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        이전
                      </Button>
                      {paginationTokens.map((token, index) =>
                        token === "ellipsis" ? (
                          <span key={`ellipsis-${index}`} className="px-2 text-xs text-slate-400">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={token}
                            type="button"
                            variant={token === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => replaceQuery({ page: String(token), sessionId: null })}
                            disabled={overviewLoading}
                            className={
                              token === currentPage
                                ? "h-8 rounded-lg bg-slate-900 px-3 text-xs text-white hover:bg-slate-800"
                                : "h-8 rounded-lg border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50"
                            }
                          >
                            {token}
                          </Button>
                        )
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => replaceQuery({ page: String(currentPage + 1), sessionId: null })}
                        disabled={overviewLoading || currentPage >= totalPages}
                        className="h-8 rounded-lg border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          <ChatMonitoringPreviewPanel
            detail={detail}
            loading={detailLoading}
            error={detailError}
            previewTab={previewTab}
            onPreviewTabChange={(tab) => replaceQuery({ previewTab: tab })}
          />
        </div>
      </div>
    </div>
  );
}
