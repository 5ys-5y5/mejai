"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MpcTool = {
  id: string;
  name: string;
  description?: string | null;
  schema?: Record<string, unknown> | null;
  version?: string | null;
  policy?: {
    is_allowed?: boolean | null;
    rate_limit_per_min?: number | null;
    adapter_key?: string | null;
  } | null;
};

type RunState = {
  loading: boolean;
  error?: string | null;
};

type PanelState = {
  input: boolean;
  output: boolean;
};

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
  let pickedKeys = required.size > 0 ? keys.filter((key) => required.has(key)) : keys.slice(0, 2);

  // Special case for update_order_shipping_address
  if (toolName === "update_order_shipping_address") {
    const forcedOrder = ["order_id", "address1", "address2", "zipcode"];
    const otherKeys = pickedKeys.filter(k => !forcedOrder.includes(k));
    pickedKeys = [...forcedOrder, ...otherKeys].filter(k => keys.includes(k));
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

export default function RulesPage() {
  const [tools, setTools] = useState<MpcTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [inputByTool, setInputByTool] = useState<Record<string, string>>({});
  const [outputByTool, setOutputByTool] = useState<Record<string, string>>({});
  const [runStateByTool, setRunStateByTool] = useState<Record<string, RunState>>({});
  const [panelByTool, setPanelByTool] = useState<Record<string, PanelState>>({});

  useEffect(() => {
    let mounted = true;
    async function loadTools() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ items: MpcTool[] }>("/api/mcp/tools");
        if (!mounted) return;
        setTools(res.items || []);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "MCP 목록을 불러오지 못했습니다.";
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadTools();
    return () => {
      mounted = false;
    };
  }, []);

  const toolCount = useMemo(() => tools.length, [tools]);

  useEffect(() => {
    if (tools.length === 0) return;
    setInputByTool((prev) => {
      const next = { ...prev };
      tools.forEach((tool) => {
        if (next[tool.id] !== undefined) return;
        const example = buildExampleParams(tool.name, tool.schema || undefined);
        next[tool.id] = JSON.stringify(example, null, 2);
      });
      return next;
    });
  }, [tools]);

  async function handleRun(tool: MpcTool) {
    setRunStateByTool((prev) => ({
      ...prev,
      [tool.id]: { loading: true, error: null },
    }));
    let params: Record<string, unknown> = {};
    const rawInput = inputByTool[tool.id] || "{}";
    try {
      params = JSON.parse(rawInput);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "JSON 파싱에 실패했습니다.";
      setRunStateByTool((prev) => ({
        ...prev,
        [tool.id]: { loading: false, error: message },
      }));
      setOutputByTool((prev) => ({
        ...prev,
        [tool.id]: message,
      }));
      return;
    }

    try {
      const res = await apiFetch<Record<string, unknown>>("/api/mcp/tools/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool: tool.name,
          params,
        }),
      });
      setOutputByTool((prev) => ({
        ...prev,
        [tool.id]: JSON.stringify(res, null, 2),
      }));
      setRunStateByTool((prev) => ({
        ...prev,
        [tool.id]: { loading: false, error: null },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "도구 호출에 실패했습니다.";
      setOutputByTool((prev) => ({
        ...prev,
        [tool.id]: message,
      }));
      setRunStateByTool((prev) => ({
        ...prev,
        [tool.id]: { loading: false, error: message },
      }));
    }
  }

  async function handleCopy(tool: MpcTool) {
    const input = inputByTool[tool.id] || "";
    const output = outputByTool[tool.id] || "";
    const payload = `Input (JSON)\n${input}\n\nOutput\n${output}`;
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Input/Output을 복사했습니다.");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = payload;
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("Input/Output을 복사했습니다.");
    }
  }

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-slate-900">규칙</h1>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-900">라우팅 규칙</div>
            <div className="mt-2 text-xs text-slate-500">
              예: 환불/결제 → 결제 큐, 배송 → 배송 큐, 분쟁 → 사람 상담 이관
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-900">규칙 #12</span>
                  <Badge variant="green">활성</Badge>
                </div>
                <div className="mt-1 text-slate-500">의도=환불 또는 정책=차지백 → 사람 이관</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-900">규칙 #05</span>
                  <Badge variant="amber">초안</Badge>
                </div>
                <div className="mt-1 text-slate-500">의도=배송 → 도구=배송조회</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-900">에스컬레이션 정책</div>
            <div className="mt-2 text-xs text-slate-500">
              예: 본인 확인 실패, 개인정보 요청, 고위험 민원 시 강제 이관
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-900">개인정보 요청</span>
                  <Badge variant="green">활성</Badge>
                </div>
                <div className="mt-1 text-slate-500">마스킹 필수, 실패 시 사람 이관</div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mt-4 p-4">
          <div className="text-sm font-semibold text-slate-900">MCP의 역할 (툴/시스템 통합)</div>
          <div className="mt-2 text-xs text-slate-500">
            MCP를 쓰면, LLM이 직접 DB나 내부 API를 무작정 두드리는 형태가 아니라 표준화된 Tool 서버로
            기능을 호출합니다.
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-slate-900 font-medium">표준화된 Tool 제공</div>
              <div className="mt-1 text-slate-500">
                주문조회, 배송추적, 환불정책 조회, 상담 티켓 생성, 인증(OTP) 발송 등을
                표준화된 Tool 서버로 제공합니다.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-slate-900 font-medium">테넌트별 허용 범위</div>
              <div className="mt-1 text-slate-500">
                브랜드별로 허용된 Tool만 노출하고 파라미터 스키마를 엄격히 강제합니다.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-slate-900 font-medium">백엔드 다변화 대응</div>
              <div className="mt-1 text-slate-500">
                브랜드 A는 Shopify, 브랜드 B는 카페24, 브랜드 C는 자체 ERP처럼 백엔드가 달라도
                LLM 입장에서는 동일한 인터페이스로 사용합니다.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-slate-900 font-medium">안전한 기능 카탈로그</div>
              <div className="mt-1 text-slate-500">
                MCP는 LLM이 쓸 수 있는 안전한 기능 카탈로그를 제공하고,
                도구 호출의 권한/감사로그/속도제한/마스킹을 중앙에서 수행하기 좋습니다.
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-4">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">MCP 도구 목록</div>
            <div className="text-xs text-slate-500">총 {loading ? "-" : toolCount}건</div>
          </div>
          {error ? <div className="p-4 text-sm text-rose-600">{error}</div> : null}
          {!error && !loading && toolCount === 0 ? (
            <div className="p-4 text-sm text-slate-500">연결 가능한 MCP 도구가 없습니다.</div>
          ) : null}
          <div className="divide-y divide-slate-200">
            {tools.map((tool) => {
              const allowed = tool.policy?.is_allowed ?? true;
              const rate = tool.policy?.rate_limit_per_min ?? null;
              const isExpanded = Boolean(expanded[tool.id]);
              const runState = runStateByTool[tool.id];
              return (
                <div key={tool.id} className="p-4 hover:bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [tool.id]: !prev[tool.id] }))}
                    className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{tool.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{tool.description || "설명 없음"}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                          버전 {tool.version || "v1"}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5",
                            allowed
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          )}
                        >
                          {allowed ? "허용됨" : "차단"}
                        </span>
                        {rate !== null ? (
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                            분당 {rate}회
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500">
                      {isExpanded ? "접기" : "Input/Output 보기"}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
                      <div className="relative flex h-full flex-col">
                        <div className="flex min-h-[28px] items-center justify-between">
                          <div className="text-[11px] font-semibold text-slate-700">Input (JSON)</div>
                          <span className="h-7 w-[64px] rounded-lg border border-transparent px-3 py-1 text-[11px] opacity-0">
                            실행
                          </span>
                        </div>
                        <div className="relative mt-2 overflow-visible">
                          <div
                            className={cn(
                              "rounded-lg border border-slate-200 bg-white p-2 overflow-hidden",
                              panelByTool[tool.id]?.input ? "h-[600px]" : "h-[100px]"
                            )}
                          >
                            <textarea
                              className="h-full w-full resize-none overflow-auto bg-transparent font-mono text-[11px] text-slate-700 focus:outline-none"
                              value={inputByTool[tool.id] || ""}
                              onChange={(event) =>
                                setInputByTool((prev) => ({
                                  ...prev,
                                  [tool.id]: event.target.value,
                                }))
                              }
                              spellCheck={false}
                            />
                          </div>
                          <div className="pointer-events-none absolute left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-1/2">
                            <button
                              type="button"
                              onClick={() =>
                                setPanelByTool((prev) => ({
                                  ...prev,
                                  [tool.id]: {
                                    input: !(prev[tool.id]?.input ?? false),
                                    output: prev[tool.id]?.output ?? false,
                                  },
                                }))
                              }
                              className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                              aria-label={panelByTool[tool.id]?.input ? "인풋 높이 줄이기" : "인풋 높이 늘리기"}
                            >
                              {panelByTool[tool.id]?.input ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        {runState?.error ? (
                          <div className="mt-2 text-[11px] text-rose-600">{runState.error}</div>
                        ) : null}
                      </div>
                      <div className="relative flex flex-col pb-3">
                        <div className="flex min-h-[28px] items-center justify-between gap-2">
                          <div className="text-[11px] font-semibold text-slate-700">Output</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(tool)}
                              className="h-7 rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300"
                            >
                              복사
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRun(tool)}
                              className="h-7 rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300"
                            >
                              {runState?.loading ? "실행 중..." : "실행"}
                            </button>
                          </div>
                        </div>
                        <div className="relative mt-2 overflow-visible">
                          <div
                            className={cn(
                              "rounded-lg border border-slate-200 bg-white p-2 overflow-auto",
                              panelByTool[tool.id]?.output ? "h-[600px]" : "h-[100px]"
                            )}
                          >
                            <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-700">
                              {outputByTool[tool.id] || "아직 실행하지 않았습니다."}
                            </pre>
                          </div>
                          <div className="pointer-events-none absolute left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-1/2">
                            <button
                              type="button"
                              onClick={() =>
                                setPanelByTool((prev) => ({
                                  ...prev,
                                  [tool.id]: {
                                    input: prev[tool.id]?.input ?? false,
                                    output: !(prev[tool.id]?.output ?? false),
                                  },
                                }))
                              }
                              className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                              aria-label={panelByTool[tool.id]?.output ? "아웃풋 높이 줄이기" : "아웃풋 높이 늘리기"}
                            >
                              {panelByTool[tool.id]?.output ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        {runState?.error ? (
                          <div className="mt-2 text-[11px] text-rose-600">{runState.error}</div>
                        ) : null}
                      </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
