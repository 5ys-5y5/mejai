"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

type MpcTool = {
  id: string;
  name: string;
  description?: string | null;
  version?: string | null;
  policy?: {
    is_allowed?: boolean | null;
    rate_limit_per_min?: number | null;
    adapter_key?: string | null;
  } | null;
};

export default function RulesPage() {
  const [tools, setTools] = useState<MpcTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              return (
                <div key={tool.id} className="p-4 hover:bg-slate-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
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
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
