"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/apiClient";
import { formatKstDateTime } from "@/lib/kst";
import { cn } from "@/lib/utils";

type EndUserProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  member_id: string | null;
  external_user_id: string | null;
  tags?: string[] | null;
  attributes?: Record<string, any> | null;
  locale: string | null;
  time_zone: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  sessions_count: number | null;
  has_chat: boolean | null;
  created_at: string | null;
};

type EndUserIdentity = {
  id: string;
  identity_type: string;
  identity_value: string | null;
  identity_hash: string;
  is_primary: boolean;
  created_at: string | null;
};

type EndUserSummary = {
  summary_text: string;
  updated_at: string | null;
  source_session_id: string | null;
};

type SessionItem = {
  id: string;
  session_id: string;
  channel: string | null;
  agent_id: string | null;
  llm: string | null;
  mode: string | null;
  started_at: string | null;
  ended_at: string | null;
  outcome: string | null;
  satisfaction: number | null;
  summary_text: string | null;
  created_at: string | null;
  resources?: {
    mcp_tool_ids?: string[] | null;
    kb_ids?: string[] | null;
    kb_parent_ids?: string[] | null;
    mcp_calls_count?: number | null;
    kb_hits_count?: number | null;
  } | null;
};

type MessageItem = {
  id: string;
  role: string;
  content: string | null;
  content_summary: string | null;
  created_at: string | null;
};

type MemoryItem = {
  id: string;
  memory_type: string;
  memory_key: string;
  content: string | null;
  value_json: Record<string, any> | null;
  updated_at: string | null;
  source_session_id: string | null;
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

function formatDate(value?: string | null) {
  return formatKstDateTime(value);
}

function formatLocation(profile: EndUserProfile | null) {
  if (!profile) return "-";
  const parts = [profile.city, profile.province, profile.country].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "-";
}

const roleLabel: Record<string, string> = {
  user: "고객",
  assistant: "상담",
  system: "시스템",
  tool: "툴",
};

export default function EndUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const endUserId = params.id as string;
  const [profile, setProfile] = useState<EndUserProfile | null>(null);
  const [identities, setIdentities] = useState<EndUserIdentity[]>([]);
  const [summary, setSummary] = useState<EndUserSummary | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, sessionsRes, memoriesRes, viewerRes] = await Promise.all([
          apiFetch<{ profile: EndUserProfile; identities: EndUserIdentity[]; summary: EndUserSummary | null }>(
            `/api/end-users/${encodeURIComponent(endUserId)}`
          ),
          apiFetch<{ items: SessionItem[] }>(`/api/end-users/${encodeURIComponent(endUserId)}/sessions?limit=200`),
          apiFetch<{ items: MemoryItem[] }>(`/api/end-users/${encodeURIComponent(endUserId)}/memories?active=true`),
          apiFetch<{ is_admin: boolean }>(`/api/user-profile`),
        ]);
        if (!mounted) return;
        setProfile(profileRes.profile);
        setIdentities(profileRes.identities || []);
        setSummary(profileRes.summary);
        setSessions(sessionsRes.items || []);
        setMemories(memoriesRes.items || []);
        setViewerIsAdmin(Boolean(viewerRes.is_admin));
        const initialSession = sessionsRes.items?.[0]?.session_id || null;
        setSelectedSessionId(initialSession);
      } catch {
        if (!mounted) return;
        setError("고객 정보를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [endUserId]);

  async function handleMerge() {
    const targetId = mergeTargetId.trim();
    if (!targetId) {
      setActionError("병합 대상 ID를 입력해주세요.");
      return;
    }
    if (!window.confirm("현재 고객을 대상 고객으로 병합합니다. 계속할까요?")) return;
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await apiFetch(`/api/end-users/${encodeURIComponent(endUserId)}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_id: targetId }),
      });
      setActionMessage("병합이 완료되었습니다.");
      router.push(`/app/users/${encodeURIComponent(targetId)}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "병합에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("이 고객을 삭제(숨김) 처리합니다. 계속할까요?")) return;
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await apiFetch(`/api/end-users/${encodeURIComponent(endUserId)}/delete`, {
        method: "POST",
      });
      setActionMessage("삭제가 완료되었습니다.");
      router.push("/app/contacts");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function loadMessages() {
      if (!selectedSessionId) {
        setMessages([]);
        return;
      }
      setMessagesLoading(true);
      try {
        const res = await apiFetch<{ items: MessageItem[] }>(
          `/api/end-users/${encodeURIComponent(endUserId)}/messages?session_id=${encodeURIComponent(
            selectedSessionId
          )}&limit=400&order=created_at.asc`
        );
        if (!mounted) return;
        setMessages(res.items || []);
      } catch {
        if (!mounted) return;
        setMessages([]);
      } finally {
        if (mounted) setMessagesLoading(false);
      }
    }
    loadMessages();
    return () => {
      mounted = false;
    };
  }, [endUserId, selectedSessionId]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.session_id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  if (!loading && !profile && !error) {
    return (
      <div className="px-5 md:px-8 py-6">
        <div className="mx-auto w-full max-w-6xl">
          <Card className="p-6">
            <div className="text-sm text-slate-900">고객을 찾을 수 없습니다.</div>
            <Link className="mt-3 inline-block text-sm text-emerald-700 hover:underline" href="/app/contacts">
              고객 목록으로 돌아가기
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/app/contacts" className="text-xs text-slate-500 hover:underline">
              ← 고객 목록
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              {profile?.display_name || profile?.email || profile?.phone || "고객 상세"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">고객 프로필과 대화 기록 상세</p>
          </div>
          {profile?.member_id ? <Badge variant="green">회원</Badge> : <Badge variant="slate">비회원</Badge>}
        </div>

        {error ? <div className="text-sm text-rose-600">{error}</div> : null}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 space-y-4">
            <SectionCard title="프로필">
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">이메일</span>
                  <span>{profile?.email || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">휴대폰</span>
                  <span>{profile?.phone || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">회원 ID</span>
                  <span>{profile?.member_id || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">외부 ID</span>
                  <span>{profile?.external_user_id || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">지역</span>
                  <span>{formatLocation(profile)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">언어/시간대</span>
                  <span>{[profile?.locale, profile?.time_zone].filter(Boolean).join(" · ") || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">최초 접속</span>
                  <span>{formatDate(profile?.first_seen_at || profile?.created_at)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">최근 접속</span>
                  <span>{formatDate(profile?.last_seen_at)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">총 세션</span>
                  <span>{profile?.sessions_count ?? 0}</span>
                </div>
              </div>
              {profile?.tags && profile.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.tags.map((tag) => (
                    <Badge key={tag} variant="slate">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </SectionCard>

            {viewerIsAdmin ? (
              <SectionCard title="관리자 작업">
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500">중복 병합</div>
                    <input
                      value={mergeTargetId}
                      onChange={(event) => setMergeTargetId(event.target.value)}
                      placeholder="병합 대상 end_user_id"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleMerge}
                      disabled={actionLoading || !mergeTargetId.trim()}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-sm font-semibold text-white transition",
                        actionLoading
                          ? "bg-slate-300"
                          : "bg-amber-500 hover:bg-amber-600"
                      )}
                    >
                      병합 실행
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500">삭제</div>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={actionLoading}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-sm font-semibold text-white transition",
                        actionLoading
                          ? "bg-slate-300"
                          : "bg-rose-500 hover:bg-rose-600"
                      )}
                    >
                      삭제(숨김) 처리
                    </button>
                  </div>
                  {actionError ? <div className="text-xs text-rose-600">{actionError}</div> : null}
                  {actionMessage ? <div className="text-xs text-emerald-600">{actionMessage}</div> : null}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard title="요약">
              <div className="text-sm text-slate-700 whitespace-pre-line">
                {summary?.summary_text || "요약 정보가 없습니다."}
              </div>
              {summary?.updated_at ? (
                <div className="mt-2 text-xs text-slate-500">업데이트 {formatDate(summary.updated_at)}</div>
              ) : null}
            </SectionCard>

            <SectionCard title="식별자">
              {identities.length === 0 ? (
                <div className="text-sm text-slate-500">등록된 식별자가 없습니다.</div>
              ) : (
                <div className="space-y-2 text-sm text-slate-700">
                  {identities.map((identity) => (
                    <div key={identity.id} className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-500">{identity.identity_type}</div>
                        <div className="text-sm text-slate-900">{identity.identity_value || "-"}</div>
                      </div>
                      {identity.is_primary ? <Badge variant="green">Primary</Badge> : null}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="메모리">
              {memories.length === 0 ? (
                <div className="text-sm text-slate-500">저장된 메모리가 없습니다.</div>
              ) : (
                <div className="space-y-3 text-sm text-slate-700">
                  {memories.map((memory) => (
                    <div key={memory.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">
                        {memory.memory_type} · {memory.memory_key}
                      </div>
                      <div className="mt-1 text-sm text-slate-900">{memory.content || "-"}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        업데이트 {formatDate(memory.updated_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="xl:col-span-8 space-y-4">
            <SectionCard title="상담 세션">
              {sessions.length === 0 ? (
                <div className="text-sm text-slate-500">세션 기록이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => {
                    const selected = session.session_id === selectedSessionId;
                    return (
                      <button
                        key={session.session_id}
                        type="button"
                        onClick={() => setSelectedSessionId(session.session_id)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition-colors",
                          selected
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">
                            {session.summary_text || "요약 없음"}
                          </div>
                          <Badge variant="slate">{session.channel || "채널 미상"}</Badge>
                          {session.outcome ? <Badge variant="amber">{session.outcome}</Badge> : null}
                          <span className="ml-auto text-xs text-slate-500">
                            {formatDate(session.started_at || session.created_at)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                          <span>에이전트 {session.agent_id || "-"}</span>
                          <span>KB {session.resources?.kb_hits_count ?? 0}회</span>
                          <span>MCP {session.resources?.mcp_calls_count ?? 0}회</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard title="대화 내용">
              {selectedSession ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <div>세션 ID: {selectedSession.session_id}</div>
                    <div>채널: {selectedSession.channel || "-"}</div>
                    <div>에이전트: {selectedSession.agent_id || "-"}</div>
                    <div>KB 히트: {selectedSession.resources?.kb_hits_count ?? 0}</div>
                    <div>MCP 호출: {selectedSession.resources?.mcp_calls_count ?? 0}</div>
                  </div>
                  {messagesLoading ? (
                    <div className="text-sm text-slate-500">대화를 불러오는 중...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-slate-500">대화 내용이 없습니다.</div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const isUser = message.role === "user";
                        const label = roleLabel[message.role] || message.role;
                        const body = message.content || message.content_summary || "-";
                        return (
                          <div key={message.id} className={cn("flex gap-3", isUser ? "justify-end" : "")}>
                            <div
                              className={cn(
                                "w-full max-w-[560px] rounded-2xl border p-3",
                                isUser ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                              )}
                            >
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span className={cn("font-medium", isUser ? "text-emerald-800" : "text-slate-700")}>
                                  {label}
                                </span>
                                <span>{formatDate(message.created_at)}</span>
                              </div>
                              <div className="mt-1 text-sm text-slate-900 whitespace-pre-line">{body}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-500">선택된 세션이 없습니다.</div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
