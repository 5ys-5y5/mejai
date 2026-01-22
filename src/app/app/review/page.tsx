"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Input } from "@/components/ui/Input";
import { CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

type ReviewItem = {
  id: string;
  session_id: string | null;
  reason: string | null;
  owner: string | null;
  status: string | null;
  created_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ko-KR");
}

export default function ReviewPage() {
  const [owner, setOwner] = useState("");
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ items: ReviewItem[] }>("/api/review-queue?limit=200");
        if (mounted) {
          setReviewItems(res.items || []);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError("리뷰 큐 데이터를 불러오지 못했습니다.");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const items = useMemo(() => {
    const q = owner.trim().toLowerCase();
    return reviewItems.filter((r) => (q ? (r.owner || "").toLowerCase().includes(q) : true));
  }, [reviewItems, owner]);

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-slate-900">후속 지원 요청</h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="block w-full max-w-xs">
            <div className="text-xs text-slate-500">담당자 필터</div>
            <Input
              className="mt-2"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="담당자 이름"
            />
          </label>
        </div>

        <Card className="mt-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">요청 목록</div>
            <div className="text-xs text-slate-500">총 {loading ? "-" : items.length}건</div>
          </div>
          <ul className="divide-y divide-slate-200">
            {error ? <li className="p-4 text-sm text-rose-600">{error}</li> : null}
            {!error && !loading && items.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">요청 데이터가 없습니다.</li>
            ) : null}
            {items.map((r) => (
              <li key={r.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-slate-900">{r.id}</div>
                  <Badge variant="amber">{r.reason || "미정"}</Badge>
                  <Badge variant="slate">{r.status || "Open"}</Badge>
                  <div className="ml-auto text-xs text-slate-500">{formatDate(r.created_at)}</div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <IconChip icon={CheckCircle2} label={`담당자: ${r.owner || "미배정"}`} />
                  <Link
                    className="text-emerald-700 hover:underline"
                    href={`/app/calls/${r.session_id || ""}`}
                  >
                    세션 보기
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
