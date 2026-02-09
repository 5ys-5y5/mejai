"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { DebugTranscriptOptions } from "@/lib/debugTranscript";
import {
  PAGE_CONVERSATION_FEATURES,
  mergeConversationPageFeatures,
  type ConversationFeaturesProviderShape,
  type FeatureVisibilityMode,
  type ConversationPageFeatures,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";
import {
  DEFAULT_CONVERSATION_DEBUG_OPTIONS,
  resolvePageConversationDebugOptions,
} from "@/lib/transcriptCopyPolicy";

const PAGE_KEYS: ConversationPageKey[] = ["/", "/app/laboratory"];
const DEFAULT_DEBUG_COPY_BY_PAGE: Record<ConversationPageKey, DebugTranscriptOptions> = {
  "/": { ...DEFAULT_CONVERSATION_DEBUG_OPTIONS },
  "/app/laboratory": { ...DEFAULT_CONVERSATION_DEBUG_OPTIONS },
};

type Props = {
  authToken: string;
};

type GovernanceConfig = {
  enabled: boolean;
  visibility_mode: "user" | "admin";
  source: "principles_default" | "event_override";
  updated_at: string | null;
  updated_by: string | null;
};

type SettingFileItem = {
  key: string;
  label: string;
  files: string[];
  notes: string;
  usedByPages: ConversationPageKey[] | "common";
};

type DebugFieldExamplesPayload = {
  event_types?: string[];
  mcp_tools?: string[];
  sample_paths?: Record<string, unknown>;
  error?: string;
};

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toCsv(values?: string[]) {
  return (values || []).join(", ");
}

function toEventCsv(values?: string[]) {
  return (values || []).join(", ");
}

async function parseJsonBody<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  visibility: FeatureVisibilityMode;
  onChange: (checked: boolean) => void;
  onChangeVisibility: (mode: FeatureVisibilityMode) => void;
};

function ToggleField({ label, checked, visibility, onChange, onChangeVisibility }: ToggleFieldProps) {
  return (
    <label
      className={
        checked
          ? "flex items-center justify-between gap-3 rounded-lg border border-emerald-500 bg-emerald-100 px-3 py-2 text-xs ring-1 ring-emerald-200"
          : "flex items-center justify-between gap-3 rounded-lg border border-rose-400 bg-rose-100 px-3 py-2 text-xs ring-1 ring-rose-200"
      }
    >
      <span className={checked ? "font-semibold text-emerald-900" : "font-semibold text-rose-900"}>{label}</span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={
            checked
              ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
              : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
          }
        >
          {checked ? "ON" : "OFF"}
        </button>
        <button
          type="button"
          onClick={() => onChangeVisibility(visibility === "user" ? "admin" : "user")}
          className={
            visibility === "admin"
              ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-amber-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
              : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
          }
        >
          {visibility === "admin" ? "ADMIN" : "USER"}
        </button>
      </span>
    </label>
  );
}

type GateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

function GateField({ label, value, onChange, placeholder }: GateFieldProps) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold text-slate-600">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
      />
    </label>
  );
}

const SETTING_FILE_GUIDE: SettingFileItem[] = [
  {
    key: "mcp.providerSelector",
    label: "MCP > Provider 선택",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
      "src/components/conversation/HeroModelCard.tsx",
      "src/components/conversation/LaboratoryModelCard.tsx",
    ],
    notes: "Provider 선택 UI 노출과 요청 payload 포함 여부를 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "mcp.actionSelector",
    label: "MCP > Action 선택",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
      "src/components/conversation/HeroModelCard.tsx",
      "src/components/conversation/LaboratoryModelCard.tsx",
    ],
    notes: "Action 선택 UI 노출과 요청 payload 포함 여부를 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "mcp.providers.allowDeny",
    label: "MCP > Provider Allowlist/Denylist",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
    ],
    notes: "페이지별 provider 허용/차단 필터를 적용합니다. 예: cafe24 차단.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "mcp.tools.allowDeny",
    label: "MCP > Tool Allowlist/Denylist",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
    ],
    notes: "페이지별 tool 허용/차단 필터를 적용합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "adminPanel",
    label: "Admin Panel (enabled/selection/logs/messageMeta)",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/conversation/ConversationAdminMenu.tsx",
      "src/components/conversation/LaboratoryConversationPane.tsx",
      "src/components/conversation/HeroModelCard.tsx",
    ],
    notes: "관리자 메뉴 표시, 선택/로그 토글, 메시지 메타 노출을 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "adminPanel.copy",
    label: "Admin Panel > 대화/문제 로그 복사",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/transcriptCopyPolicy.ts",
      "src/lib/conversation/client/useConversationController.ts",
      "src/lib/conversation/client/useLaboratoryConversationActions.ts",
    ],
    notes: "복사 버튼 노출과 복사 허용 정책(실제 payload 생성)까지 함께 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "adminPanel.copy.debug",
    label: "Admin Panel > 대화 복사 디버그 항목",
    files: [
      "src/components/settings/ChatSettingsPanel.tsx",
      "src/lib/transcriptCopyPolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
    ],
    notes: "페이지별 대화 복사 시 포함할 디버그 항목(debugOptions)을 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "interaction.quickReplies",
    label: "Interaction > Quick Replies",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/conversation/ConversationReplySelectors.tsx",
      "src/components/conversation/LaboratoryConversationPane.tsx",
      "src/components/conversation/HeroModelCard.tsx",
    ],
    notes: "퀵리플라이 렌더/선택/확정 UI를 활성/비활성합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "interaction.productCards",
    label: "Interaction > Product Cards",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/conversation/ConversationReplySelectors.tsx",
      "src/components/conversation/LaboratoryConversationPane.tsx",
      "src/components/conversation/HeroModelCard.tsx",
    ],
    notes: "카드 렌더/선택/확정 UI를 활성/비활성합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "interaction.inputSubmit",
    label: "Interaction > 입력/전송",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/conversation/LaboratoryConversationPane.tsx",
      "src/components/conversation/HeroModelCard.tsx",
    ],
    notes: "입력창/전송 버튼 자체 노출을 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "setup",
    label: "Setup (model/llm/kb/adminKb/mode/route/inlineUserKb/defaults)",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/conversation/ConversationSetupFields.tsx",
      "src/components/conversation/LaboratoryExistingSetup.tsx",
      "src/components/conversation/LaboratoryNewModelControls.tsx",
      "src/components/conversation/HeroModelCard.tsx",
      "src/components/conversation/LaboratoryModelCard.tsx",
    ],
    notes: "페이지별 설정 영역 구성요소(모델/LLM/저장KB/임시KB/AdminKB/모드/Route) 노출과 기본값을 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "runtimeLoader",
    label: "런타임 반영 로더",
    files: [
      "src/lib/conversation/client/useConversationPageFeatures.ts",
      "src/app/api/auth-settings/providers/route.ts",
      "src/components/settings/ChatSettingsPanel.tsx",
    ],
    notes: "설정 페이지 저장값(chat_policy)을 읽어 각 페이지 정책에 병합합니다.",
    usedByPages: "common",
  },
];

export function ChatSettingsPanel({ authToken }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [governanceSaving, setGovernanceSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [governanceConfig, setGovernanceConfig] = useState<GovernanceConfig | null>(null);
  const [cardBaseWidth, setCardBaseWidth] = useState(240);
  const [cardBaseWidthDraft, setCardBaseWidthDraft] = useState("240");
  const [isLgViewport, setIsLgViewport] = useState(false);
  const [draftByPage, setDraftByPage] = useState<Record<ConversationPageKey, ConversationPageFeatures>>({
    "/": PAGE_CONVERSATION_FEATURES["/"],
    "/app/laboratory": PAGE_CONVERSATION_FEATURES["/app/laboratory"],
  });
  const [debugCopyDraftByPage, setDebugCopyDraftByPage] =
    useState<Record<ConversationPageKey, DebugTranscriptOptions>>(DEFAULT_DEBUG_COPY_BY_PAGE);
  const [debugFieldExamples, setDebugFieldExamples] = useState<Record<string, unknown>>({});
  const [debugFieldEventTypes, setDebugFieldEventTypes] = useState<string[]>([]);
  const [debugFieldMcpTools, setDebugFieldMcpTools] = useState<string[]>([]);

  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) next.Authorization = `Bearer ${authToken}`;
    return next;
  }, [authToken]);

  const loadDebugFieldExamples = useCallback(async () => {
    try {
      const res = await fetch("/api/runtime/debug-fields", {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        cache: "no-store",
      });
      const payload = await parseJsonBody<DebugFieldExamplesPayload>(res);
      if (!res.ok) return;
      setDebugFieldExamples((payload?.sample_paths || {}) as Record<string, unknown>);
      setDebugFieldEventTypes(Array.isArray(payload?.event_types) ? payload!.event_types! : []);
      setDebugFieldMcpTools(Array.isArray(payload?.mcp_tools) ? payload!.mcp_tools! : []);
    } catch {
      // optional data for UI hint
    }
  }, [authToken]);

  const pickExample = useCallback(
    (paths: string[]) => {
      for (const path of paths) {
        if (!(path in debugFieldExamples)) continue;
        const value = debugFieldExamples[path];
        if (value === null || value === undefined) return `${path}: null`;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          return `${path}: ${String(value)}`;
        }
        try {
          return `${path}: ${JSON.stringify(value)}`;
        } catch {
          return `${path}: [unserializable]`;
        }
      }
      return "";
    },
    [debugFieldExamples]
  );

  const applyProviderToDraft = useCallback((providerValue?: ConversationFeaturesProviderShape | null) => {
    const next: Record<ConversationPageKey, ConversationPageFeatures> = {
      "/": PAGE_CONVERSATION_FEATURES["/"],
      "/app/laboratory": PAGE_CONVERSATION_FEATURES["/app/laboratory"],
    };
    const nextDebug: Record<ConversationPageKey, DebugTranscriptOptions> = {
      "/": { ...DEFAULT_CONVERSATION_DEBUG_OPTIONS },
      "/app/laboratory": { ...DEFAULT_CONVERSATION_DEBUG_OPTIONS },
    };
    for (const page of PAGE_KEYS) {
      next[page] = mergeConversationPageFeatures(PAGE_CONVERSATION_FEATURES[page], providerValue?.pages?.[page]);
      nextDebug[page] = resolvePageConversationDebugOptions(page, providerValue);
    }
    setDraftByPage(next);
    setDebugCopyDraftByPage(nextDebug);
  }, []);

  const updatePage = useCallback(
    (page: ConversationPageKey, updater: (prev: ConversationPageFeatures) => ConversationPageFeatures) => {
      setDraftByPage((prev) => ({ ...prev, [page]: updater(prev[page]) }));
    },
    []
  );

  const updateDebugCopyOptions = useCallback(
    (page: ConversationPageKey, updater: (prev: DebugTranscriptOptions) => DebugTranscriptOptions) => {
      setDebugCopyDraftByPage((prev) => ({ ...prev, [page]: updater(prev[page]) }));
    },
    []
  );

  const loadGovernanceConfig = useCallback(async () => {
    const governanceRes = await fetch("/api/runtime/governance/config", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      cache: "no-store",
    });
    if (!governanceRes.ok) return null;
    const governancePayload = await parseJsonBody<{ config?: GovernanceConfig }>(governanceRes);
    if (governancePayload?.config) {
      setGovernanceConfig(governancePayload.config);
      return governancePayload.config;
    }
    return null;
  }, [authToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth-settings/providers?provider=chat_policy", {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      const payload = await parseJsonBody<{ provider?: ConversationFeaturesProviderShape; error?: string }>(res);
      if (!res.ok) {
        setError(payload?.error || "대화 설정을 불러오지 못했습니다.");
        return;
      }
      applyProviderToDraft(payload?.provider || null);
      const loadedCardWidth = Number(payload?.provider?.settings_ui?.chat_card_base_width);
      const nextCardWidth = Number.isFinite(loadedCardWidth)
        ? Math.max(180, Math.min(600, Math.round(loadedCardWidth)))
        : 240;
      setCardBaseWidth(nextCardWidth);
      setCardBaseWidthDraft(String(nextCardWidth));
      try {
        await loadGovernanceConfig();
      } catch {
        // governance config is optional for this panel
      }
      try {
        await loadDebugFieldExamples();
      } catch {
        // debug field examples are optional for this panel
      }
    } catch {
      setError("대화 설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [applyProviderToDraft, authToken, loadDebugFieldExamples, loadGovernanceConfig]);

  const saveGovernanceConfig = useCallback(
    async (next: { enabled: boolean; visibility_mode: "user" | "admin" }) => {
      setGovernanceSaving(true);
      const res = await fetch("/api/runtime/governance/config", {
        method: "POST",
        headers,
        body: JSON.stringify(next),
      });
      const payload = await parseJsonBody<{ config?: GovernanceConfig; error?: string }>(res);
      if (!res.ok || payload?.error) {
        throw new Error(payload?.error || "self update 설정 저장에 실패했습니다.");
      }
      if (payload?.config) {
        setGovernanceConfig(payload.config);
      } else {
        await loadGovernanceConfig();
      }
      setError(null);
      setSavedAt(new Date().toLocaleString("ko-KR"));
      setGovernanceSaving(false);
    },
    [headers, loadGovernanceConfig]
  );

  const handleGovernanceChange = useCallback(
    async (next: { enabled: boolean; visibility_mode: "user" | "admin" }) => {
      try {
        await saveGovernanceConfig(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "self update 설정 저장에 실패했습니다.");
      } finally {
        setGovernanceSaving(false);
      }
    },
    [saveGovernanceConfig]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLgViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const handleResetToDefaults = () => {
    applyProviderToDraft(null);
    setDebugCopyDraftByPage(DEFAULT_DEBUG_COPY_BY_PAGE);
    setCardBaseWidthDraft("240");
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const pages: Partial<Record<ConversationPageKey, ConversationPageFeatures>> = {
        "/": draftByPage["/"],
        "/app/laboratory": draftByPage["/app/laboratory"],
      };
      const debug_copy: Partial<Record<ConversationPageKey, Partial<DebugTranscriptOptions>>> = {
        "/": debugCopyDraftByPage["/"],
        "/app/laboratory": debugCopyDraftByPage["/app/laboratory"],
      };
      const parsedDraft = Number(cardBaseWidthDraft);
      const nextCardWidth = Number.isFinite(parsedDraft)
        ? Math.max(180, Math.min(600, Math.round(parsedDraft)))
        : cardBaseWidth;

      const res = await fetch("/api/auth-settings/providers", {
        method: "POST",
        headers,
        body: JSON.stringify({
          provider: "chat_policy",
          values: {
            pages,
            debug_copy,
            settings_ui: {
              chat_card_base_width: nextCardWidth,
            },
          },
          commit: true,
        }),
      });
      const payload = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || payload?.error || !payload?.ok) {
        throw new Error(payload?.error || "대화 설정 저장에 실패했습니다.");
      }
      setCardBaseWidth(nextCardWidth);
      setSavedAt(new Date().toLocaleString("ko-KR"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "대화 설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">대화 설정 관리</div>
        <div className="mt-2 text-sm text-slate-600">
          페이지별 대화 정책을 폼으로 수정합니다. 저장 시 <code>A_iam_auth_settings.providers.chat_policy</code>에 반영됩니다.
        </div>
        {loading ? <div className="mt-2 text-xs text-slate-500">불러오는 중...</div> : null}
        {error ? <div className="mt-2 text-xs text-rose-600">{error}</div> : null}
        {savedAt ? <div className="mt-2 text-xs text-slate-500">저장됨: {savedAt}</div> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading || saving}>
            새로고침
          </Button>
          <Button type="button" variant="outline" onClick={handleResetToDefaults} disabled={loading || saving}>
            기본값으로 채우기
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading || saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
          <input
            type="text"
            inputMode="numeric"
            value={cardBaseWidthDraft}
            onChange={(e) => {
              const next = e.target.value;
              if (/^\d*$/.test(next)) {
                setCardBaseWidthDraft(next);
              }
            }}
            placeholder="숫자 (카드 폭)"
            className="h-9 w-28 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
          />
        </div>
      </Card>

      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-full gap-4">
          {PAGE_KEYS.map((page) => {
            const draft = draftByPage[page];
            const debugCopyDraft = debugCopyDraftByPage[page];
            const debugHeader = debugCopyDraft.sections?.header;
            const debugTurn = debugCopyDraft.sections?.turn;
            const debugLogs = debugCopyDraft.sections?.logs;
            const debugLogMcp = debugLogs?.mcp;
            const debugLogEvent = debugLogs?.event;
            const debugLogDebug = debugLogs?.debug;
            return (
              <Card
                key={page}
                className="shrink-0 p-4"
                style={{ width: `${isLgViewport ? cardBaseWidth + 20 : cardBaseWidth}px` }}
              >
                <div className="text-sm font-semibold text-slate-900">{page}</div>
                <div className="mt-1 text-xs text-slate-500">해당 페이지에서 실제 적용될 대화 기능 설정</div>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Runtime Self Update</div>
                    <div className="text-[11px] text-slate-500">
                      기준: <code>src/app/api/runtime/chat/policies/principles.ts</code>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-5 text-slate-700">
                      <div>
                        기능 설명:
                        <ul className="list-disc space-y-1 pl-4">
                          <li>원칙 기준선(<code>C:\dev\1227\mejai\src\app\api\runtime\chat\policies\principles.ts</code>)과 최근 대화/이벤트를 비교</li>
                          <li>위배 항목을 감지하고, 패치 제안(proposal)을 생성하는 거버넌스 기능</li>
                        </ul>
                      </div>
                      <div className="mt-5">
                        참고:
                        <ul className="list-disc space-y-1 pl-4">
                          <li>위배 감지는 대화 중 실시간 자동 실행이 아니라, <code>POST /api/runtime/governance/review</code> 호출</li>
                          <li>(또는 <code>/runtime/principles</code>의 &quot;문제 감지 실행&quot; 버튼) 시 실행</li>
                        </ul>
                      </div>
                      <div className="mt-5">
                        실험 방법
                        <ol className="list-decimal space-y-1 pl-4">
                          <li>이 카드에서 Self Update를 ON으로 설정하고 저장.</li>
                          <li>테스트 세션에서 이미 제공한 전화번호/주소를 봇이 다시 물어보는 대화를 의도적으로 생성</li>
                          <li>관리자 계정으로 <code>/runtime/principles</code> 이동 후 &quot;문제 감지 실행&quot;을 누르거나, <code>POST /api/runtime/governance/review</code>를 호출</li>
                          <li><code>GET /api/runtime/governance/proposals</code> 또는 동일 페이지 목록에서 생성된 proposal과 상태를 확인</li>
                        </ol>
                      </div>
                    </div>
                    <ToggleField
                      label="Self Update 활성화"
                      checked={Boolean(governanceConfig?.enabled)}
                      visibility={governanceConfig?.visibility_mode || "admin"}
                      onChange={(v) =>
                        void handleGovernanceChange({
                          enabled: v,
                          visibility_mode: governanceConfig?.visibility_mode || "admin",
                        })
                      }
                      onChangeVisibility={(mode) =>
                        void handleGovernanceChange({
                          enabled: governanceConfig?.enabled ?? true,
                          visibility_mode: mode,
                        })
                      }
                    />
                    <div className="text-[11px] text-slate-500">
                      상태: {governanceConfig?.enabled ? "활성" : "비활성"} / visible: {governanceConfig?.visibility_mode || "-"}
                    </div>
                    {governanceSaving ? <div className="text-[11px] text-slate-500">Self Update 저장 중...</div> : null}
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">MCP</div>
                    <ToggleField
                      label="Provider 선택"
                      checked={draft.mcp.providerSelector}
                      visibility={draft.visibility.mcp.providerSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, providerSelector: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, mcp: { ...prev.visibility.mcp, providerSelector: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="Action 선택"
                      checked={draft.mcp.actionSelector}
                      visibility={draft.visibility.mcp.actionSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, actionSelector: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, mcp: { ...prev.visibility.mcp, actionSelector: mode } },
                        }))
                      }
                    />
                    <GateField
                      label="Provider Allowlist"
                      value={toCsv(draft.mcp.providers.allowlist)}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          mcp: { ...prev.mcp, providers: { ...prev.mcp.providers, allowlist: parseCsv(v) } },
                        }))
                      }
                      placeholder="예: solapi, juso"
                    />
                    <GateField
                      label="Provider Denylist"
                      value={toCsv(draft.mcp.providers.denylist)}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          mcp: { ...prev.mcp, providers: { ...prev.mcp.providers, denylist: parseCsv(v) } },
                        }))
                      }
                      placeholder="예: cafe24"
                    />
                    <GateField
                      label="Tool Allowlist"
                      value={toCsv(draft.mcp.tools.allowlist)}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          mcp: { ...prev.mcp, tools: { ...prev.mcp.tools, allowlist: parseCsv(v) } },
                        }))
                      }
                      placeholder="예: restock_lite, send_otp"
                    />
                    <GateField
                      label="Tool Denylist"
                      value={toCsv(draft.mcp.tools.denylist)}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          mcp: { ...prev.mcp, tools: { ...prev.mcp.tools, denylist: parseCsv(v) } },
                        }))
                      }
                      placeholder="예: cafe24:list_orders"
                    />
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Admin Panel</div>
                    <ToggleField
                      label="패널 활성화"
                      checked={draft.adminPanel.enabled}
                      visibility={draft.visibility.adminPanel.enabled}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, enabled: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, adminPanel: { ...prev.visibility.adminPanel, enabled: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="선택 토글"
                      checked={draft.adminPanel.selectionToggle}
                      visibility={draft.visibility.adminPanel.selectionToggle}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, selectionToggle: v } }))
                      }
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            adminPanel: { ...prev.visibility.adminPanel, selectionToggle: mode },
                          },
                        }))
                      }
                    />
                    <ToggleField
                      label="로그 토글"
                      checked={draft.adminPanel.logsToggle}
                      visibility={draft.visibility.adminPanel.logsToggle}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, logsToggle: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, adminPanel: { ...prev.visibility.adminPanel, logsToggle: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="메시지 선택"
                      checked={draft.adminPanel.messageSelection}
                      visibility={draft.visibility.adminPanel.messageSelection}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, messageSelection: v } }))
                      }
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            adminPanel: { ...prev.visibility.adminPanel, messageSelection: mode },
                          },
                        }))
                      }
                    />
                    <ToggleField
                      label="메시지 메타"
                      checked={draft.adminPanel.messageMeta}
                      visibility={draft.visibility.adminPanel.messageMeta}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, messageMeta: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, adminPanel: { ...prev.visibility.adminPanel, messageMeta: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="대화 복사"
                      checked={draft.adminPanel.copyConversation}
                      visibility={draft.visibility.adminPanel.copyConversation}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, copyConversation: v } }))
                      }
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            adminPanel: { ...prev.visibility.adminPanel, copyConversation: mode },
                          },
                        }))
                      }
                    />
                    <ToggleField
                      label="문제 로그 복사"
                      checked={draft.adminPanel.copyIssue}
                      visibility={draft.visibility.adminPanel.copyIssue}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, copyIssue: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, adminPanel: { ...prev.visibility.adminPanel, copyIssue: mode } },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Debug Transcript (대화 복사)</div>
                    <div className="text-[11px] leading-5 text-slate-500">
                      상위 그룹 OFF 시 하위는 모두 OFF 처리됩니다. 예시값은 최근 로그 테이블에서 읽은 값입니다.
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <div className="mb-2 text-[11px] font-semibold text-slate-700">Header 그룹</div>
                      <label className="flex items-center justify-between gap-3 text-xs">
                        <span>Header ON/OFF</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                header: { ...prev.sections?.header, enabled: !(debugHeader?.enabled ?? true) },
                              },
                            }))
                          }
                          className={(debugHeader?.enabled ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white"}
                        >
                          {(debugHeader?.enabled ?? true) ? "ON" : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>대원칙</span>
                        <button
                          type="button"
                          disabled={!(debugHeader?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                header: { ...prev.sections?.header, principle: !(debugHeader?.principle ?? true) },
                              },
                            }))
                          }
                          className={(debugHeader?.enabled ?? true) && (debugHeader?.principle ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugHeader?.enabled ?? true) ? ((debugHeader?.principle ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>기대 목록</span>
                        <button
                          type="button"
                          disabled={!(debugHeader?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                header: { ...prev.sections?.header, expectedLists: !(debugHeader?.expectedLists ?? true) },
                              },
                            }))
                          }
                          className={(debugHeader?.enabled ?? true) && (debugHeader?.expectedLists ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugHeader?.enabled ?? true) ? ((debugHeader?.expectedLists ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>사용 모듈</span>
                        <button
                          type="button"
                          disabled={!(debugHeader?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                header: { ...prev.sections?.header, runtimeModules: !(debugHeader?.runtimeModules ?? true) },
                              },
                            }))
                          }
                          className={(debugHeader?.enabled ?? true) && (debugHeader?.runtimeModules ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugHeader?.enabled ?? true) ? ((debugHeader?.runtimeModules ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <div className="mt-1 text-[10px] text-slate-500">예시: {pickExample(["debug.prefix_json.execution.call_chain[0].module_path"]) || "-"}</div>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>점검 상태</span>
                        <button
                          type="button"
                          disabled={!(debugHeader?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                header: { ...prev.sections?.header, auditStatus: !(debugHeader?.auditStatus ?? true) },
                              },
                            }))
                          }
                          className={(debugHeader?.enabled ?? true) && (debugHeader?.auditStatus ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugHeader?.enabled ?? true) ? ((debugHeader?.auditStatus ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <div className="mt-1 text-[10px] text-slate-500">예시(MCP): {debugFieldMcpTools[0] || "-"} / 예시(Event): {debugFieldEventTypes[0] || "-"}</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <div className="mb-2 text-[11px] font-semibold text-slate-700">Turn 그룹</div>
                      <label className="flex items-center justify-between gap-3 text-xs">
                        <span>Turn ON/OFF</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, turn: { ...prev.sections?.turn, enabled: !(debugTurn?.enabled ?? true) } },
                            }))
                          }
                          className={(debugTurn?.enabled ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white"}
                        >
                          {(debugTurn?.enabled ?? true) ? "ON" : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>TURN_ID</span>
                        <button
                          type="button"
                          disabled={!(debugTurn?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, turn: { ...prev.sections?.turn, turnId: !(debugTurn?.turnId ?? true) } },
                            }))
                          }
                          className={(debugTurn?.enabled ?? true) && (debugTurn?.turnId ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugTurn?.enabled ?? true) ? ((debugTurn?.turnId ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>TOKEN_USED</span>
                        <button
                          type="button"
                          disabled={!(debugTurn?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, turn: { ...prev.sections?.turn, tokenUsed: !(debugTurn?.tokenUsed ?? true) } },
                            }))
                          }
                          className={(debugTurn?.enabled ?? true) && (debugTurn?.tokenUsed ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugTurn?.enabled ?? true) ? ((debugTurn?.tokenUsed ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>TOKEN_UNUSED</span>
                        <button
                          type="button"
                          disabled={!(debugTurn?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, turn: { ...prev.sections?.turn, tokenUnused: !(debugTurn?.tokenUnused ?? true) } },
                            }))
                          }
                          className={(debugTurn?.enabled ?? true) && (debugTurn?.tokenUnused ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugTurn?.enabled ?? true) ? ((debugTurn?.tokenUnused ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>RESPONSE_SCHEMA(요약)</span>
                        <button
                          type="button"
                          disabled={!(debugTurn?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                turn: { ...prev.sections?.turn, responseSchemaSummary: !(debugTurn?.responseSchemaSummary ?? true) },
                              },
                            }))
                          }
                          className={(debugTurn?.enabled ?? true) && (debugTurn?.responseSchemaSummary ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugTurn?.enabled ?? true) ? ((debugTurn?.responseSchemaSummary ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>RESPONSE_SCHEMA(상세)</span>
                        <button
                          type="button"
                          disabled={!(debugTurn?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                turn: { ...prev.sections?.turn, responseSchemaDetail: !(debugTurn?.responseSchemaDetail ?? true) },
                              },
                            }))
                          }
                          className={(debugTurn?.enabled ?? true) && (debugTurn?.responseSchemaDetail ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugTurn?.enabled ?? true) ? ((debugTurn?.responseSchemaDetail ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>RENDER_PLAN(요약)</span>
                        <button
                          type="button"
                          disabled={!(debugTurn?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, turn: { ...prev.sections?.turn, renderPlanSummary: !(debugTurn?.renderPlanSummary ?? true) } },
                            }))
                          }
                          className={(debugTurn?.enabled ?? true) && (debugTurn?.renderPlanSummary ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugTurn?.enabled ?? true) ? ((debugTurn?.renderPlanSummary ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>RENDER_PLAN(상세)</span>
                        <button
                          type="button"
                          disabled={!(debugTurn?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, turn: { ...prev.sections?.turn, renderPlanDetail: !(debugTurn?.renderPlanDetail ?? true) } },
                            }))
                          }
                          className={(debugTurn?.enabled ?? true) && (debugTurn?.renderPlanDetail ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugTurn?.enabled ?? true) ? ((debugTurn?.renderPlanDetail ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>QUICK_REPLY_RULE</span>
                        <button
                          type="button"
                          disabled={!(debugTurn?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, turn: { ...prev.sections?.turn, quickReplyRule: !(debugTurn?.quickReplyRule ?? true) } },
                            }))
                          }
                          className={(debugTurn?.enabled ?? true) && (debugTurn?.quickReplyRule ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugTurn?.enabled ?? true) ? ((debugTurn?.quickReplyRule ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <div className="mb-2 text-[11px] font-semibold text-slate-700">Logs 그룹</div>
                      <label className="flex items-center justify-between gap-3 text-xs">
                        <span>Logs ON/OFF</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, logs: { ...prev.sections?.logs, enabled: !(debugLogs?.enabled ?? true) } },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white"}
                        >
                          {(debugLogs?.enabled ?? true) ? "ON" : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>문제 요약</span>
                        <button
                          type="button"
                          disabled={!(debugLogs?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, logs: { ...prev.sections?.logs, issueSummary: !(debugLogs?.issueSummary ?? true) } },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) && (debugLogs?.issueSummary ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugLogs?.enabled ?? true) ? ((debugLogs?.issueSummary ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>DEBUG 로그</span>
                        <button
                          type="button"
                          disabled={!(debugLogs?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, logs: { ...prev.sections?.logs, debug: { ...prev.sections?.logs?.debug, enabled: !(debugLogDebug?.enabled ?? true) } } },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) && (debugLogDebug?.enabled ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugLogs?.enabled ?? true) ? ((debugLogDebug?.enabled ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>DEBUG prefix_json</span>
                        <button
                          type="button"
                          disabled={!(debugLogs?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, logs: { ...prev.sections?.logs, debug: { ...prev.sections?.logs?.debug, prefixJson: !(debugLogDebug?.prefixJson ?? true) } } },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) && (debugLogDebug?.prefixJson ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugLogs?.enabled ?? true) ? ((debugLogDebug?.prefixJson ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <div className="mt-1 text-[10px] text-slate-500">예시: {pickExample(["debug.prefix_json.mcp.last.function", "debug.prefix_json.decision.function_name"]) || "-"}</div>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>MCP 로그</span>
                        <button
                          type="button"
                          disabled={!(debugLogs?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, logs: { ...prev.sections?.logs, mcp: { ...prev.sections?.logs?.mcp, enabled: !(debugLogMcp?.enabled ?? true) } } },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugLogs?.enabled ?? true) ? ((debugLogMcp?.enabled ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>MCP request</span>
                        <button
                          type="button"
                          disabled={!(debugLogs?.enabled ?? true) || !(debugLogMcp?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                logs: { ...prev.sections?.logs, mcp: { ...prev.sections?.logs?.mcp, request: !(debugLogMcp?.request ?? true) } },
                              },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) && (debugLogMcp?.request ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) ? ((debugLogMcp?.request ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <div className="mt-1 text-[10px] text-slate-500">예시: {pickExample(["mcp.request_payload.path", "mcp.request_payload.method"]) || "-"}</div>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>MCP response</span>
                        <button
                          type="button"
                          disabled={!(debugLogs?.enabled ?? true) || !(debugLogMcp?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                logs: { ...prev.sections?.logs, mcp: { ...prev.sections?.logs?.mcp, response: !(debugLogMcp?.response ?? true) } },
                              },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) && (debugLogMcp?.response ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) ? ((debugLogMcp?.response ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <div className="mt-1 text-[10px] text-slate-500">예시: {pickExample(["mcp.response_payload.error.code", "mcp.response_payload.verified"]) || "-"}</div>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>MCP success 포함</span>
                        <button
                          type="button"
                          disabled={!(debugLogs?.enabled ?? true) || !(debugLogMcp?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, logs: { ...prev.sections?.logs, mcp: { ...prev.sections?.logs?.mcp, includeSuccess: !(debugLogMcp?.includeSuccess ?? true) } } },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) && (debugLogMcp?.includeSuccess ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) ? ((debugLogMcp?.includeSuccess ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>MCP error 포함</span>
                        <button
                          type="button"
                          disabled={!(debugLogs?.enabled ?? true) || !(debugLogMcp?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, logs: { ...prev.sections?.logs, mcp: { ...prev.sections?.logs?.mcp, includeError: !(debugLogMcp?.includeError ?? true) } } },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) && (debugLogMcp?.includeError ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) ? ((debugLogMcp?.includeError ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>Event 로그</span>
                        <button
                          type="button"
                          disabled={!(debugLogs?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: { ...prev.sections, logs: { ...prev.sections?.logs, event: { ...prev.sections?.logs?.event, enabled: !(debugLogEvent?.enabled ?? true) } } },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) && (debugLogEvent?.enabled ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugLogs?.enabled ?? true) ? ((debugLogEvent?.enabled ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <label className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span>Event payload</span>
                        <button
                          type="button"
                          disabled={!(debugLogs?.enabled ?? true) || !(debugLogEvent?.enabled ?? true)}
                          onClick={() =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                logs: { ...prev.sections?.logs, event: { ...prev.sections?.logs?.event, payload: !(debugLogEvent?.payload ?? true) } },
                              },
                            }))
                          }
                          className={(debugLogs?.enabled ?? true) && (debugLogEvent?.enabled ?? true) && (debugLogEvent?.payload ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                        >
                          {(debugLogs?.enabled ?? true) && (debugLogEvent?.enabled ?? true) ? ((debugLogEvent?.payload ?? true) ? "ON" : "OFF") : "OFF"}
                        </button>
                      </label>
                      <div className="mt-1 text-[10px] text-slate-500">예시: {pickExample(["event.payload.intent", "event.payload.error", "event.payload.tool"]) || "-"}</div>
                      <label className="mt-2 block">
                        <div className="mb-1 text-[11px] font-semibold text-slate-600">Event allowlist (CSV)</div>
                        <input
                          type="text"
                          value={toEventCsv(debugLogEvent?.allowlist)}
                          onChange={(e) =>
                            updateDebugCopyOptions(page, (prev) => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                logs: {
                                  ...prev.sections?.logs,
                                  event: {
                                    ...prev.sections?.logs?.event,
                                    allowlist: parseCsv(e.target.value).map((item) => item.toUpperCase()),
                                  },
                                },
                              },
                            }))
                          }
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
                          placeholder="예: PRE_MCP_DECISION, MCP_TOOL_FAILED"
                        />
                      </label>
                      <div className="mt-1 text-[10px] text-slate-500">감지된 타입: {debugFieldEventTypes.join(", ") || "-"}</div>
                    </div>

                    <label className="block">
                      <div className="mb-1 text-[11px] font-semibold text-slate-600">Audit 대상 BOT 범위</div>
                      <select
                        value={debugCopyDraft.auditBotScope || "runtime_turns_only"}
                        onChange={(e) =>
                          updateDebugCopyOptions(page, (prev) => ({
                            ...prev,
                            auditBotScope:
                              e.target.value === "all_bot_messages" ? "all_bot_messages" : "runtime_turns_only",
                          }))
                        }
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
                      >
                        <option value="runtime_turns_only">runtime_turns_only</option>
                        <option value="all_bot_messages">all_bot_messages</option>
                      </select>
                    </label>
                  </div>
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Interaction</div>
                    <ToggleField
                      label="Quick Replies"
                      checked={draft.interaction.quickReplies}
                      visibility={draft.visibility.interaction.quickReplies}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, quickReplies: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            interaction: { ...prev.visibility.interaction, quickReplies: mode },
                          },
                        }))
                      }
                    />
                    <ToggleField
                      label="Product Cards"
                      checked={draft.interaction.productCards}
                      visibility={draft.visibility.interaction.productCards}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, productCards: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            interaction: { ...prev.visibility.interaction, productCards: mode },
                          },
                        }))
                      }
                    />
                    <ToggleField
                      label="입력/전송"
                      checked={draft.interaction.inputSubmit}
                      visibility={draft.visibility.interaction.inputSubmit}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, inputSubmit: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            interaction: { ...prev.visibility.interaction, inputSubmit: mode },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Setup</div>
                    <ToggleField
                      label="모델 선택"
                      checked={draft.setup.modelSelector}
                      visibility={draft.visibility.setup.modelSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modelSelector: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, modelSelector: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="LLM 선택"
                      checked={draft.setup.llmSelector}
                      visibility={draft.visibility.setup.llmSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, llmSelector: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, llmSelector: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="KB 선택(저장)"
                      checked={draft.setup.kbSelector}
                      visibility={draft.visibility.setup.kbSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, kbSelector: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, kbSelector: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="Admin KB 선택"
                      checked={draft.setup.adminKbSelector}
                      visibility={draft.visibility.setup.adminKbSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, adminKbSelector: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, adminKbSelector: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="Existing 모드"
                      checked={draft.setup.modeExisting}
                      visibility={draft.visibility.setup.modeExisting}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modeExisting: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, modeExisting: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="New 모드"
                      checked={draft.setup.modeNew}
                      visibility={draft.visibility.setup.modeNew}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modeNew: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, modeNew: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="Route 선택"
                      checked={draft.setup.routeSelector}
                      visibility={draft.visibility.setup.routeSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, routeSelector: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, routeSelector: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      label="KB 입력(임시)"
                      checked={draft.setup.inlineUserKbInput}
                      visibility={draft.visibility.setup.inlineUserKbInput}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, inlineUserKbInput: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            setup: { ...prev.visibility.setup, inlineUserKbInput: mode },
                          },
                        }))
                      }
                    />
                    <label className="block">
                      <div className="mb-1 text-[11px] font-semibold text-slate-600">기본 모드</div>
                      <select
                        value={draft.setup.defaultSetupMode}
                        onChange={(e) =>
                          updatePage(page, (prev) => ({
                            ...prev,
                            setup: { ...prev.setup, defaultSetupMode: e.target.value as "existing" | "new" },
                          }))
                        }
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
                      >
                        <option value="existing">existing</option>
                        <option value="new">new</option>
                      </select>
                    </label>
                    <label className="block">
                      <div className="mb-1 text-[11px] font-semibold text-slate-600">기본 LLM</div>
                      <select
                        value={draft.setup.defaultLlm}
                        onChange={(e) =>
                          updatePage(page, (prev) => ({
                            ...prev,
                            setup: { ...prev.setup, defaultLlm: e.target.value as "chatgpt" | "gemini" },
                          }))
                        }
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
                      >
                        <option value="chatgpt">chatgpt</option>
                        <option value="gemini">gemini</option>
                      </select>
                    </label>
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">설정-파일 매핑 (공통 상세)</div>
        <div className="mt-1 text-xs text-slate-500">중앙화 구조 기준으로 공통 1회만 출력됩니다.</div>
        <div className="mt-3 space-y-2">
          {SETTING_FILE_GUIDE.map((item) => (
            <details key={`common-${item.key}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-slate-800">{item.label}</summary>
              <div className="mt-2 text-[11px] text-slate-600">{item.notes}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                사용 페이지:{" "}
                {item.usedByPages === "common" ? "공통" : item.usedByPages.join(", ")}
              </div>
              <div className="mt-2 space-y-1">
                {item.files.map((file) => (
                  <div key={`common-${item.key}-${file}`} className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700">
                    {file}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
