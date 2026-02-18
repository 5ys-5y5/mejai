"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Copy, Minus, Play, Plus } from "lucide-react";
import { SelectPopover } from "@/components/SelectPopover";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type McpAction = {
  id: string;
  tool_key?: string;
  provider_key?: string;
  name: string;
  usage_count?: number;
  description?: string | null;
  schema?: Record<string, unknown> | null;
  version?: string | null;
  provider?: string;
  meta?: {
    visibility?: "public";
    access?: "open_world";
    destructive?: boolean;
  };
  policy?: {
    is_allowed?: boolean | null;
    rate_limit_per_min?: number | null;
  } | null;
};

type McpProvider = {
  key: string;
  title: string;
  description: string;
  initials: string;
  connected: boolean;
  action_count: number;
  actions: McpAction[];
};

type McpPayload = {
  summary?: { provider_count: number; action_count: number };
  providers: McpProvider[];
};

type RunState = {
  loading: boolean;
  error?: string | null;
};

const ACTION_SEARCH_COLUMN_OPTIONS = [
  { id: "all", label: "전체 컬럼" },
  { id: "name", label: "액션" },
  { id: "description", label: "설명" },
  { id: "meta", label: "메타데이터" },
  { id: "usage_count", label: "사용 빈도" },
];

function pickExampleValue(key: string, schema?: Record<string, unknown>) {
  const normalizedKey = key.toLowerCase();
  const example = schema?.example;
  if (example !== undefined) return example;
  const fallbackType = typeof schema?.type === "string" ? schema?.type : "string";

  if (fallbackType === "string") {
    if (normalizedKey.includes("phone")) return "01093107159";
    if (normalizedKey.includes("email")) return "sungjy2020@gmail.com";
    if (normalizedKey.includes("order")) return "20260127-0000014";
    if (normalizedKey.includes("product")) return "1000000001";
    if (normalizedKey.includes("zipcode")) return "08813";
    if (normalizedKey.includes("address1")) return "서울시 관악구 신림동 1515-7";
    if (normalizedKey.includes("address2")) return "406";
    if (normalizedKey.endsWith("id")) return "example_id";
    if (normalizedKey.includes("path")) return "/orders/setting";
    if (normalizedKey.includes("method")) return "GET";
    return "example";
  }
  if (fallbackType === "number" || fallbackType === "integer") return 1;
  if (fallbackType === "boolean") return false;
  if (fallbackType === "array") return [];
  if (fallbackType === "object") return {};
  return "example";
}

function buildExampleParams(toolName: string, schema?: Record<string, unknown> | null) {
  if (!schema || schema.type !== "object" || !schema.properties || typeof schema.properties !== "object") {
    return {};
  }
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const requiredList = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const required = new Set(requiredList);
  const keys = Object.keys(properties);
  let pickedKeys = required.size > 0 ? keys.filter((key) => required.has(key)) : keys.slice(0, 3);

  if (toolName === "update_order_shipping_address") {
    const forcedOrder = ["order_id", "address1", "address2", "zipcode"];
    const otherKeys = pickedKeys.filter((k) => !forcedOrder.includes(k));
    pickedKeys = [...forcedOrder, ...otherKeys].filter((k) => keys.includes(k));
  }

  const result: Record<string, unknown> = {};
  pickedKeys.forEach((key) => {
    const propSchema = properties[key] || {};
    if (propSchema.default !== undefined) {
      result[key] = propSchema.default;
      return;
    }
    result[key] = pickExampleValue(key, propSchema);
  });
  return result;
}

function providerTone(key: string) {
  if (key === "cafe24") return "from-blue-50 to-cyan-50 border-blue-200 text-blue-700";
  if (key === "solapi") return "from-emerald-50 to-green-50 border-emerald-200 text-emerald-700";
  if (key === "juso") return "from-amber-50 to-orange-50 border-amber-200 text-amber-700";
  return "from-slate-50 to-slate-100 border-slate-200 text-slate-700";
}

export default function RulesPage() {
  const [providers, setProviders] = useState<McpProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProviderKey, setSelectedProviderKey] = useState<string>("");
  const [selectedActionId, setSelectedActionId] = useState<string>("");
  const [actionSearch, setActionSearch] = useState("");
  const [actionSearchColumn, setActionSearchColumn] = useState<
    "all" | "name" | "description" | "meta" | "usage_count"
  >("all");
  const [actionSortKey, setActionSortKey] = useState<"name" | "description" | "meta" | "usage_count">("name");
  const [actionSortDirection, setActionSortDirection] = useState<"asc" | "desc">("asc");
  const [inputByTool, setInputByTool] = useState<Record<string, string>>({});
  const [outputByTool, setOutputByTool] = useState<Record<string, string>>({});
  const [outputExpandedByTool, setOutputExpandedByTool] = useState<Record<string, boolean>>({});
  const [runStateByTool, setRunStateByTool] = useState<Record<string, RunState>>({});
  const GRID_COLS = "grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)_minmax(0,0.5fr)_minmax(56px,0.25fr)]";
  useEffect(() => {
    let mounted = true;
    async function loadMcp() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<McpPayload>("/api/mcp");
        if (!mounted) return;
        const loadedProviders = res.providers || [];
        setProviders(loadedProviders);
        if (loadedProviders.length > 0) {
          const firstProvider = loadedProviders[0];
          setSelectedProviderKey(firstProvider.key);
          if (firstProvider.actions?.length > 0) {
            setSelectedActionId(firstProvider.actions[0].id);
          }
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "MCP 목록을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadMcp();
    return () => {
      mounted = false;
    };
  }, []);

  const allActions = useMemo(() => providers.flatMap((provider) => provider.actions || []), [providers]);
  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.key === selectedProviderKey) || providers[0] || null,
    [providers, selectedProviderKey]
  );
  const filteredActions = useMemo(() => {
    if (!selectedProvider) return [];
    const query = actionSearch.trim().toLowerCase();
    return selectedProvider.actions.filter((action) => {
      const name = action.name.toLowerCase();
      const description = (action.description || "").toLowerCase();
      const metaText = [action.meta?.destructive ? "파괴적" : "", action.provider_key || action.provider || ""]
        .join(" ")
        .toLowerCase();
      const usageText = String(action.usage_count ?? 0);
      if (query.length === 0) return true;
      if (actionSearchColumn === "name") return name.includes(query);
      if (actionSearchColumn === "description") return description.includes(query);
      if (actionSearchColumn === "meta") return metaText.includes(query);
      if (actionSearchColumn === "usage_count") return usageText.includes(query);
      if (actionSearchColumn === "all") {
        return (
          name.includes(query) || description.includes(query) || metaText.includes(query) || usageText.includes(query)
        );
      }
      return true;
    });
  }, [selectedProvider, actionSearch, actionSearchColumn]);
  const sortedActions = useMemo(() => {
    if (!filteredActions.length) return filteredActions;
    const sorted = [...filteredActions];
    const dir = actionSortDirection === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      if (actionSortKey === "usage_count") {
        const aValue = a.usage_count ?? 0;
        const bValue = b.usage_count ?? 0;
        return (aValue - bValue) * dir;
      }
      if (actionSortKey === "name") {
        return a.name.localeCompare(b.name) * dir;
      }
      if (actionSortKey === "description") {
        return (a.description || "").localeCompare(b.description || "") * dir;
      }
      const aMeta = [a.meta?.destructive ? "파괴적" : "", a.provider_key || a.provider || ""]
        .join(" ")
        .trim();
      const bMeta = [b.meta?.destructive ? "파괴적" : "", b.provider_key || b.provider || ""]
        .join(" ")
        .trim();
      return aMeta.localeCompare(bMeta) * dir;
    });
    return sorted;
  }, [filteredActions, actionSortDirection, actionSortKey]);
  const selectedAction = useMemo(() => {
    if (!sortedActions.length) return null;
    return sortedActions.find((action) => action.id === selectedActionId) || sortedActions[0] || null;
  }, [sortedActions, selectedActionId]);
  const providersSorted = useMemo(
    () => [...providers].sort((a, b) => (b.action_count || 0) - (a.action_count || 0)),
    [providers]
  );
  useEffect(() => {
    if (!allActions.length) return;
    setInputByTool((prev) => {
      const next = { ...prev };
      allActions.forEach((action) => {
        if (next[action.id] !== undefined) return;
        next[action.id] = JSON.stringify(buildExampleParams(action.name, action.schema || undefined), null, 2);
      });
      return next;
    });
  }, [allActions]);
  useEffect(() => {
    if (!selectedProvider) return;
    if (sortedActions.length === 0) {
      setSelectedActionId("");
      return;
    }
    if (!sortedActions.some((action) => action.id === selectedActionId)) {
      setSelectedActionId(sortedActions[0].id);
    }
  }, [selectedProvider, sortedActions, selectedActionId]);

  function handleActionSort(nextKey: "name" | "description" | "meta" | "usage_count") {
    if (actionSortKey === nextKey) {
      setActionSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setActionSortKey(nextKey);
    setActionSortDirection("asc");
  }

  async function handleRun(action: McpAction) {
    setRunStateByTool((prev) => ({ ...prev, [action.id]: { loading: true, error: null } }));
    let params: Record<string, unknown> = {};
    const rawInput = inputByTool[action.id] || "{}";
    try {
      params = JSON.parse(rawInput);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "JSON 파싱에 실패했습니다.";
      setRunStateByTool((prev) => ({ ...prev, [action.id]: { loading: false, error: message } }));
      setOutputByTool((prev) => ({ ...prev, [action.id]: message }));
      return;
    }

    try {
      const res = await apiFetch<Record<string, unknown>>("/api/mcp/tools/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_key: action.tool_key,
          provider_key: action.provider_key || action.provider,
          name: action.name,
          params,
        }),
      });
      setOutputByTool((prev) => ({ ...prev, [action.id]: JSON.stringify(res, null, 2) }));
      setRunStateByTool((prev) => ({ ...prev, [action.id]: { loading: false, error: null } }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "도구 호출에 실패했습니다.";
      setOutputByTool((prev) => ({ ...prev, [action.id]: message }));
      setRunStateByTool((prev) => ({ ...prev, [action.id]: { loading: false, error: message } }));
    }
  }

  async function handleCopy(action: McpAction) {
    const input = inputByTool[action.id] || "";
    const output = outputByTool[action.id] || "";
    const payload = `Input (JSON)\n${input}\n\nOutput\n${output}`;
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Input/Output을 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }

  return (
    <div className="px-5 py-6 md:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">규칙</h1>
          <p className="mt-1 text-sm text-slate-500">
            MCP를 공급자(Provider) &gt; 액션(Action) 계층으로 관리하고 즉시 실행할 수 있습니다.
          </p>
        </div>

        {error ? <Card className="p-4 text-sm text-rose-600">{error}</Card> : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-4">
              <div className="text-lg font-medium text-slate-900">활성화된 MCP</div>
              <div className="mt-1 text-xs text-slate-500">연결된 공급자와 액션을 선택하세요</div>
            </div>
            <div className="max-h-[720px] overflow-y-auto px-2 py-4">
              {loading ? <div className="p-3 text-sm text-slate-500">불러오는 중...</div> : null}
              {!loading && providers.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">연결된 MCP가 없습니다.</div>
              ) : null}
              {providersSorted.map((provider) => {
                const selected = provider.key === selectedProvider?.key;
                return (
                  <button
                    key={provider.key}
                    type="button"
                    onClick={() => {
                      setSelectedProviderKey(provider.key);
                      if (provider.actions?.length > 0) setSelectedActionId(provider.actions[0].id);
                    }}
                    className={cn(
                      "mb-2 flex w-full items-center justify-between rounded-xl border p-3 text-left transition",
                      selected ? "border-slate-300 bg-slate-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br text-sm font-semibold",
                          providerTone(provider.key)
                        )}
                      >
                        {provider.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{provider.title}</div>
                        <div className="truncate text-xs text-slate-500">{provider.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">
                        {provider.action_count}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="overflow-hidden">
            {!selectedProvider ? (
              <div className="p-6 text-sm text-slate-500">선택된 MCP가 없습니다.</div>
            ) : (
              <div>
                <div className="border-b border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-block h-[5px] w-[5px] rounded-full",
                        selectedProvider.connected ? "bg-emerald-500" : "bg-rose-500"
                      )}
                      aria-label={selectedProvider.connected ? "연결됨" : "미연결"}
                    />
                    <div className="text-lg font-medium text-slate-900">{selectedProvider.title}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{selectedProvider.description}</div>
                </div>

                {/* 스크롤 컨테이너(헤더+바디 공통) */}
                <div className="border-b border-slate-200 px-4 py-4">
                  <div className="mb-3 w-full">
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                      <SelectPopover
                        value={actionSearchColumn}
                        onChange={(value) =>
                          setActionSearchColumn(
                            value as "all" | "name" | "description" | "meta" | "usage_count"
                          )
                        }
                        options={ACTION_SEARCH_COLUMN_OPTIONS}
                        className="w-[150px] shrink-0"
                        placeholder="검색 컬럼"
                      />
                      <input
                        type="text"
                        value={actionSearch}
                        onChange={(event) => setActionSearch(event.target.value)}
                        placeholder="액션 검색"
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300"
                      />
                    </div>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200 [scrollbar-gutter:auto]">
                    {/* 헤더(컬럼명) 고정 영역 */}
                    <div className="sticky top-0 z-10 bg-white">
                                            <div className={cn("grid border-b border-slate-200 text-left", GRID_COLS)}>
                        <button
                          type="button"
                          onClick={() => handleActionSort("name")}
                          className="flex min-h-[40px] items-center gap-1 px-2 py-2 text-left text-[11px] font-semibold text-slate-500 transition hover:text-slate-700"
                          aria-label="Sort by name"
                        >
                          <span>액션</span>
                          <span className="text-[10px] text-slate-400">
                            {actionSortKey === "name" ? (
                              actionSortDirection === "asc" ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )
                            ) : null}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActionSort("description")}
                          className="flex min-h-[40px] items-center gap-1 px-2 py-2 text-left text-[11px] font-semibold text-slate-500 transition hover:text-slate-700"
                          aria-label="Sort by description"
                        >
                          <span>설명</span>
                          <span className="text-[10px] text-slate-400">
                            {actionSortKey === "description" ? (
                              actionSortDirection === "asc" ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )
                            ) : null}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActionSort("meta")}
                          className="flex min-h-[40px] items-center gap-1 px-2 py-2 text-left text-[11px] font-semibold text-slate-500 transition hover:text-slate-700"
                          aria-label="Sort by meta"
                        >
                          <span>메타데이터</span>
                          <span className="text-[10px] text-slate-400">
                            {actionSortKey === "meta" ? (
                              actionSortDirection === "asc" ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )
                            ) : null}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActionSort("usage_count")}
                          className="flex min-h-[40px] items-center justify-end gap-1 px-2 py-2 text-right text-[11px] font-semibold text-slate-500 transition hover:text-slate-700"
                          aria-label="Sort by usage count"
                        >
                          <span>사용 빈도</span>
                          <span className="text-[10px] text-slate-400">
                            {actionSortKey === "usage_count" ? (
                              actionSortDirection === "asc" ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )
                            ) : null}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* 스크롤 되는 바디(리스트) 영역 */}
                    <ul className="divide-y divide-slate-200">
                      {sortedActions.map((action) => {
                        const selected = action.id === selectedAction?.id;
                        const allowed = action.policy?.is_allowed ?? true;

                        const metaText = [
                          "공개적으로 쓰기",
                          "오픈 월드",
                          action.meta?.destructive ? "파괴적" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ");

                        return (
                          <li
                            key={action.id}
                            className={cn(
                              "grid text-left transition",
                              GRID_COLS,
                              selected ? "bg-slate-50" : "hover:bg-slate-50"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedActionId(action.id)}
                              className="flex min-h-[44px] min-w-0 items-center justify-start px-2 py-2 text-left font-mono text-xs font-medium text-slate-900"
                            >
                              <span
                                className={cn(
                                  "mr-0 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                                  allowed ? "bg-emerald-500" : "bg-rose-500"
                                )}
                                aria-label={allowed ? "허용" : "차단"}
                                title={allowed ? "허용" : "차단"}
                              />
                              <span className="min-w-0 truncate whitespace-nowrap">{action.name}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedActionId(action.id)}
                              className="flex min-h-[44px] min-w-0 items-center justify-start px-2 py-2 text-left text-xs text-slate-600"
                            >
                              <span className="min-w-0 truncate whitespace-nowrap">
                                {action.description || "설명 없음"}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedActionId(action.id)}
                              className="flex min-h-[44px] min-w-0 items-center justify-start px-2 py-2 text-left"
                            >
                              <span className="min-w-0 truncate whitespace-nowrap text-[11px] font-semibold text-slate-600">
                                {metaText || "메타데이터 없음"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedActionId(action.id)}
                              className="flex min-h-[44px] min-w-0 items-center justify-end px-2 py-2 text-right"
                            >
                              <span className="text-xs font-semibold tabular-nums text-slate-700">
                                {Number(action.usage_count || 0).toLocaleString("ko-KR")}
                              </span>
                            </button>

                          </li>
                        );
                      })}
                    </ul>
                    {sortedActions.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-slate-500">검색/필터 결과가 없습니다.</div>
                    ) : null}
                  </div>
                </div>

                {selectedAction ? (
                  <div className="space-y-3 p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-2 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="col-start-1 row-start-1 flex flex-wrap items-center justify-left gap-4">
                        <div className="font-mono text-sm font-semibold text-slate-900">
                          {selectedAction.name}
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500">
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                            버전 {selectedAction.version || "v1"}
                          </span>
                          {selectedAction.policy?.rate_limit_per_min ? (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                              분당 {selectedAction.policy.rate_limit_per_min}회
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="col-start-1 row-start-2 text-xs text-slate-500">
                        {selectedAction.description || "설명 없음"}
                      </div>
                      <div className="col-start-2 row-span-2 row-start-1 flex items-stretch justify-end gap-2 self-stretch">
                        {Boolean((outputByTool[selectedAction.id] || "").trim()) ? (
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedAction)}
                            className="inline-flex h-full aspect-square items-center justify-center rounded-lg bg-slate-200 text-black transition hover:bg-slate-400"
                            aria-label="입력/출력 복사"
                            title="입력/출력 복사"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleRun(selectedAction)}
                          className="inline-flex h-full aspect-square items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                          aria-label={runStateByTool[selectedAction.id]?.loading ? "실행 중" : "실행"}
                          title={runStateByTool[selectedAction.id]?.loading ? "실행 중..." : "실행"}
                          disabled={runStateByTool[selectedAction.id]?.loading}
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <div className="mb-1 flex min-h-7 items-center justify-between gap-2">
                          <div className="text-[11px] font-semibold text-slate-700">Input (JSON)</div>
                          <div className="invisible flex items-center gap-2" aria-hidden="true">
                            <span className="h-7 w-[52px] rounded-lg border border-slate-200" />
                            <span className="h-7 w-[52px] rounded-lg border border-slate-200" />
                          </div>
                        </div>
                        <textarea
                          className="h-[200px] w-full resize-y rounded-lg border border-slate-200 bg-white p-2 font-mono text-[11px] text-slate-700 focus:outline-none"
                          value={inputByTool[selectedAction.id] || ""}
                          onChange={(event) =>
                            setInputByTool((prev) => ({ ...prev, [selectedAction.id]: event.target.value }))
                          }
                          spellCheck={false}
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex min-h-7 items-center justify-between gap-2">
                          <div className="text-[11px] font-semibold text-slate-700">Output</div>
                          <div />
                        </div>
                        <div className="relative">
                          <pre
                            className={cn(
                              "overflow-auto rounded-lg border border-slate-200 bg-white p-2 font-mono text-[11px] text-slate-700 whitespace-pre-wrap transition-[height] duration-200",
                              outputExpandedByTool[selectedAction.id] ? "h-[600px]" : "h-[200px]"
                            )}
                          >
                            {outputByTool[selectedAction.id] || "아직 실행하지 않았습니다."}
                          </pre>
                          <div className="pointer-events-none absolute left-1/2 bottom-0 z-20 -translate-x-1/2 translate-y-1/2">
                            <button
                              type="button"
                              onClick={() =>
                                setOutputExpandedByTool((prev) => ({
                                  ...prev,
                                  [selectedAction.id]: !prev[selectedAction.id],
                                }))
                              }
                              className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400 bg-white text-slate-600 hover:bg-slate-50"
                              aria-label={
                                outputExpandedByTool[selectedAction.id] ? "아웃풋 높이 줄이기" : "아웃풋 높이 늘리기"
                              }
                            >
                              {outputExpandedByTool[selectedAction.id] ? (
                                <Minus className="h-5 w-5" />
                              ) : (
                                <Plus className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {runStateByTool[selectedAction.id]?.error ? (
                      <div className="text-xs text-rose-600">{runStateByTool[selectedAction.id]?.error}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
