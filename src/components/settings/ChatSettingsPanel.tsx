"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  PAGE_CONVERSATION_FEATURES,
  mergeConversationPageFeatures,
  type ConversationFeaturesProviderShape,
  type ConversationPageFeatures,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";

const PAGE_KEYS: ConversationPageKey[] = ["/", "/app/laboratory"];

type Props = {
  authToken: string;
};

type SettingFileItem = {
  key: string;
  label: string;
  files: string[];
  notes: string;
  usedByPages: ConversationPageKey[] | "common";
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

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <label
      className={
        checked
          ? "flex items-center justify-between gap-3 rounded-lg border border-emerald-500 bg-emerald-100 px-3 py-2 text-xs ring-1 ring-emerald-200"
          : "flex items-center justify-between gap-3 rounded-lg border border-rose-400 bg-rose-100 px-3 py-2 text-xs ring-1 ring-rose-200"
      }
    >
      <span className={checked ? "font-semibold text-emerald-900" : "font-semibold text-rose-900"}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          checked
            ? "rounded-md border border-emerald-900 bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
            : "rounded-md border border-rose-700 bg-rose-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
        }
      >
        {checked ? "ON" : "OFF"}
      </button>
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
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [draftByPage, setDraftByPage] = useState<Record<ConversationPageKey, ConversationPageFeatures>>({
    "/": PAGE_CONVERSATION_FEATURES["/"],
    "/app/laboratory": PAGE_CONVERSATION_FEATURES["/app/laboratory"],
  });

  const headers = useMemo(
    () =>
      authToken
        ? {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        }
        : { "Content-Type": "application/json" },
    [authToken]
  );

  const applyProviderToDraft = useCallback((providerValue?: ConversationFeaturesProviderShape | null) => {
    const next: Record<ConversationPageKey, ConversationPageFeatures> = {
      "/": PAGE_CONVERSATION_FEATURES["/"],
      "/app/laboratory": PAGE_CONVERSATION_FEATURES["/app/laboratory"],
    };
    for (const page of PAGE_KEYS) {
      next[page] = mergeConversationPageFeatures(PAGE_CONVERSATION_FEATURES[page], providerValue?.pages?.[page]);
    }
    setDraftByPage(next);
  }, []);

  const updatePage = useCallback(
    (page: ConversationPageKey, updater: (prev: ConversationPageFeatures) => ConversationPageFeatures) => {
      setDraftByPage((prev) => ({ ...prev, [page]: updater(prev[page]) }));
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth-settings/providers?provider=chat_policy", {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      const payload = (await res.json()) as { provider?: ConversationFeaturesProviderShape; error?: string };
      if (!res.ok) {
        setError(payload.error || "대화 설정을 불러오지 못했습니다.");
        return;
      }
      applyProviderToDraft(payload.provider || null);
    } catch {
      setError("대화 설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [applyProviderToDraft, authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleResetToDefaults = () => {
    applyProviderToDraft(null);
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

      const res = await fetch("/api/auth-settings/providers", {
        method: "POST",
        headers,
        body: JSON.stringify({
          provider: "chat_policy",
          values: { pages },
          commit: true,
        }),
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || payload.error || !payload.ok) {
        throw new Error(payload.error || "대화 설정 저장에 실패했습니다.");
      }
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
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading || saving}>
            새로고침
          </Button>
          <Button type="button" variant="outline" onClick={handleResetToDefaults} disabled={loading || saving}>
            기본값으로 채우기
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading || saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </Card>

      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-full gap-4">
          {PAGE_KEYS.map((page) => {
            const draft = draftByPage[page];
            return (
              <Card key={page} className="w-[240px] shrink-0 p-4 lg:w-[260px]">
                <div className="text-sm font-semibold text-slate-900">{page}</div>
                <div className="mt-1 text-xs text-slate-500">해당 페이지에서 실제 적용될 대화 기능 설정</div>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">MCP</div>
                    <ToggleField
                      label="Provider 선택"
                      checked={draft.mcp.providerSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, providerSelector: v } }))}
                    />
                    <ToggleField
                      label="Action 선택"
                      checked={draft.mcp.actionSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, actionSelector: v } }))}
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
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, enabled: v } }))}
                    />
                    <ToggleField
                      label="선택 토글"
                      checked={draft.adminPanel.selectionToggle}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, selectionToggle: v } }))
                      }
                    />
                    <ToggleField
                      label="로그 토글"
                      checked={draft.adminPanel.logsToggle}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, logsToggle: v } }))}
                    />
                    <ToggleField
                      label="메시지 선택"
                      checked={draft.adminPanel.messageSelection}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, messageSelection: v } }))
                      }
                    />
                    <ToggleField
                      label="메시지 메타"
                      checked={draft.adminPanel.messageMeta}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, messageMeta: v } }))}
                    />
                    <ToggleField
                      label="대화 복사"
                      checked={draft.adminPanel.copyConversation}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, copyConversation: v } }))
                      }
                    />
                    <ToggleField
                      label="문제 로그 복사"
                      checked={draft.adminPanel.copyIssue}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, copyIssue: v } }))}
                    />
                  </div>
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Interaction</div>
                    <ToggleField
                      label="Quick Replies"
                      checked={draft.interaction.quickReplies}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, quickReplies: v } }))}
                    />
                    <ToggleField
                      label="Product Cards"
                      checked={draft.interaction.productCards}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, productCards: v } }))}
                    />
                    <ToggleField
                      label="입력/전송"
                      checked={draft.interaction.inputSubmit}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, inputSubmit: v } }))}
                    />
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Setup</div>
                    <ToggleField
                      label="모델 선택"
                      checked={draft.setup.modelSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modelSelector: v } }))}
                    />
                    <ToggleField
                      label="LLM 선택"
                      checked={draft.setup.llmSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, llmSelector: v } }))}
                    />
                    <ToggleField
                      label="KB 선택(저장)"
                      checked={draft.setup.kbSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, kbSelector: v } }))}
                    />
                    <ToggleField
                      label="Admin KB 선택"
                      checked={draft.setup.adminKbSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, adminKbSelector: v } }))}
                    />
                    <ToggleField
                      label="Existing 모드"
                      checked={draft.setup.modeExisting}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modeExisting: v } }))}
                    />
                    <ToggleField
                      label="New 모드"
                      checked={draft.setup.modeNew}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modeNew: v } }))}
                    />
                    <ToggleField
                      label="Route 선택"
                      checked={draft.setup.routeSelector}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, routeSelector: v } }))}
                    />
                    <ToggleField
                      label="KB 입력(임시)"
                      checked={draft.setup.inlineUserKbInput}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, inlineUserKbInput: v } }))}
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
