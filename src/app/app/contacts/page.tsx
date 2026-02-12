"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { formatKstDateTime } from "@/lib/kst";
import { cn } from "@/lib/utils";

type EndUserItem = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  member_id: string | null;
  tags?: string[] | null;
  locale: string | null;
  time_zone: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  sessions_count: number | null;
  has_chat: boolean | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  created_at: string | null;
};

function formatLocation(item: EndUserItem) {
  const parts = [item.city, item.province, item.country].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "-";
}

function formatDate(value?: string | null) {
  return formatKstDateTime(value);
}

export default function ContactsPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<EndUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const handle = setTimeout(() => {
      async function load() {
        setLoading(true);
        setError(null);
        try {
          const q = query.trim();
          const queryParam = q ? `&q=${encodeURIComponent(q)}` : "";
          const res = await apiFetch<{ items: EndUserItem[]; total: number }>(
            `/api/end-users?limit=200&offset=0${queryParam}`
          );
          if (!mounted) return;
          setItems(res.items || []);
          setTotal(res.total || 0);
        } catch {
          if (!mounted) return;
          setError("고객 목록을 불러오지 못했습니다.");
        } finally {
          if (mounted) setLoading(false);
        }
      }
      load();
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(handle);
    };
  }, [query]);

  const rows = useMemo(() => items, [items]);

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">고객</h1>
          <p className="mt-1 text-sm text-slate-500">엔드 유저 프로필과 대화 기록을 관리합니다.</p>
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">고객 목록</div>
            <div className="text-xs text-slate-500">총 {loading ? "-" : total}명</div>
          </div>
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름, 이메일, 전화번호, 회원 ID로 검색"
                className="pl-9"
              />
            </div>
          </div>
          {error ? <div className="p-4 text-sm text-rose-600">{error}</div> : null}
          {!error && !loading && rows.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">조회된 고객이 없습니다.</div>
          ) : null}
          <div className="divide-y divide-slate-200">
            {rows.map((item) => {
              const name = item.display_name || item.email || item.phone || "이름 없음";
              const tags = (item.tags || []).slice(0, 3);
              return (
                <Link
                  key={item.id}
                  href={`/app/users/${encodeURIComponent(item.id)}`}
                  className={cn("block p-4 transition-colors hover:bg-slate-50", loading ? "opacity-70" : "")}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">{name}</div>
                    {item.member_id ? <Badge variant="green">회원</Badge> : <Badge variant="slate">비회원</Badge>}
                    {item.has_chat ? <Badge variant="amber">대화 있음</Badge> : <Badge variant="slate">대화 없음</Badge>}
                    <span className="ml-auto text-xs text-slate-500">
                      최근 접속 {formatDate(item.last_seen_at || item.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
                    <span>이메일 {item.email || "-"}</span>
                    <span>휴대폰 {item.phone || "-"}</span>
                    <span>회원 ID {item.member_id || "-"}</span>
                    <span>총 세션 {item.sessions_count ?? 0}</span>
                    <span>지역 {formatLocation(item)}</span>
                  </div>
                  {tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="slate">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
