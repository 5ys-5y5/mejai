"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { Plus, Upload } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

type KbItem = {
  id: string;
  title: string;
  version: string | null;
  category: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ko-KR");
}

export default function KbPage() {
  const [tab, setTab] = useState("문서");
  const [items, setItems] = useState<KbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ items: KbItem[] }>("/api/kb?limit=200");
        if (mounted) {
          setItems(res.items || []);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError("KB 데이터를 불러오지 못했습니다.");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-slate-900">지식 베이스</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {["문서", "버전", "인덱싱"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs",
                tab === t
                  ? "border-slate-200 bg-slate-100 text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {t}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 hover:bg-slate-50">
              <Upload className="mr-2 inline h-4 w-4" />
              파일 추가
            </button>
            <button className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
              <Plus className="mr-2 inline h-4 w-4" />
              문서 생성
            </button>
          </div>
        </div>

        <Card className="mt-4">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">KB 목록</div>
            <div className="text-xs text-slate-500">총 {loading ? "-" : items.length}건</div>
          </div>
          <ul className="divide-y divide-slate-200">
            {error ? <li className="p-4 text-sm text-rose-600">{error}</li> : null}
            {!error && !loading && items.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">문서가 없습니다.</li>
            ) : null}
            {items.map((d) => (
              <li key={d.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-slate-900">{d.title}</div>
                  <Badge variant={d.is_active ? "green" : "amber"}>
                    {d.is_active ? "배포됨" : "비활성"}
                  </Badge>
                  <Badge variant="slate">{d.version || "-"}</Badge>
                  <div className="ml-auto text-xs text-slate-500">등록일: {formatDate(d.created_at)}</div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  인덱싱 상태, 청크 구성, 임베딩 버전, 적용 에이전트 등을 확인할 수 있습니다.
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
