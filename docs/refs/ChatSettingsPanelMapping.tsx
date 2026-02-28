"use client";

import { Card } from "@/components/ui/Card";

type Props = {
  authToken: string;
};

type SettingFileItem = {
  key: string;
  label: string;
  files: string[];
  notes: string;
  usedByPages: string[] | "common";
};

const SETTING_FILE_GUIDE: SettingFileItem[] = [
  {
    key: "mcp.providerSelector",
    label: "MCP > Provider 선택",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
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
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
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
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
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
      "src/components/settings/ChatSettingsPanelCore.tsx",
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
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "퀵리플라이 렌더/선택/확정 UI를 활성/비활성합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "interaction.productCards",
    label: "Interaction > Product Cards",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "카드 렌더/선택/확정 UI를 활성/비활성합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "interaction.prefill",
    label: "Interaction > Prefill",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.parts.tsx",
    ],
    notes: "초기 안내 prefill 메시지 출력 여부를 제어합니다.",
    usedByPages: ["/", "/app/laboratory", "/embed"],
  },
  {
    key: "interaction.prefillMessages",
    label: "Interaction > Prefill Messages",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.parts.tsx",
    ],
    notes: "초기 안내 prefill 메시지 문구를 설정합니다.",
    usedByPages: ["/", "/app/laboratory", "/embed"],
  },
  {
    key: "interaction.inputPlaceholder",
    label: "Interaction > Input Placeholder",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "입력 안내 문구를 설정합니다.",
    usedByPages: ["/", "/app/laboratory", "/embed"],
  },
  {
    key: "interaction.threePhasePrompt",
    label: "Interaction > 3-Phase Prompt",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.parts.tsx",
    ],
    notes: "3단계 요약 메시지(Confirmed/Confirming/Next) 출력 여부를 제어합니다.",
    usedByPages: ["/", "/app/laboratory", "/embed"],
  },
  {
    key: "interaction.threePhasePromptLabels",
    label: "Interaction > 3-Phase Labels",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.parts.tsx",
    ],
    notes: "3단계 라벨 텍스트(Confirmed/Confirming/Next)를 설정합니다.",
    usedByPages: ["/", "/app/laboratory", "/embed"],
  },
  {
    key: "interaction.threePhasePromptShowConfirmed",
    label: "Interaction > 3-Phase Show Confirmed",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.parts.tsx",
    ],
    notes: "Confirmed 구간 표시 여부를 제어합니다.",
    usedByPages: ["/", "/app/laboratory", "/embed"],
  },
  {
    key: "interaction.threePhasePromptShowConfirming",
    label: "Interaction > 3-Phase Show Confirming",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.parts.tsx",
    ],
    notes: "Confirming 구간 표시 여부를 제어합니다.",
    usedByPages: ["/", "/app/laboratory", "/embed"],
  },
  {
    key: "interaction.threePhasePromptShowNext",
    label: "Interaction > 3-Phase Show Next",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.parts.tsx",
    ],
    notes: "Next 구간 표시 여부를 제어합니다.",
    usedByPages: ["/", "/app/laboratory", "/embed"],
  },
  {
    key: "interaction.threePhasePromptHideLabels",
    label: "Interaction > 3-Phase Hide Labels",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.parts.tsx",
    ],
    notes: "라벨 텍스트 자체를 숨길지 여부를 제어합니다.",
    usedByPages: ["/", "/app/laboratory", "/embed"],
  },
  {
    key: "interaction.inputSubmit",
    label: "Interaction > 입력/전송",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "입력창/전송 버튼 자체 노출을 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "setup",
    label: "Setup (model/llm/kb/adminKb/mode/route/inlineUserKb/defaults)",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes:
      "페이지별 설정 영역 구성요소(모델/LLM/저장KB/임시KB/AdminKB/모드/Route) 노출과 기본값을 제어하며, 임시KB 샘플 선택 UI에도 공통 반영됩니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "runtimeLoader",
    label: "런타임 반영 로더",
    files: [
      "src/lib/conversation/client/useConversationPageFeatures.ts",
      "src/app/api/auth-settings/providers/route.ts",
      "src/components/settings/ChatSettingsPanelCore.tsx",
    ],
    notes: "설정 페이지 저장값(chat_policy)을 B_chat_settings에서 읽어 각 페이지 정책에 병합합니다.",
    usedByPages: "common",
  },
];

export function ChatSettingsPanelMapping({ authToken: _authToken }: Props) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">설정-파일 매핑 (공통 상세)</div>
        <div className="mt-1 text-xs text-slate-500">
          중앙화 구조 기준으로 공통 1회만 출력됩니다.
        </div>
        <div className="mt-3 space-y-2">
          {SETTING_FILE_GUIDE.map((item) => (
            <details key={`common-${item.key}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-slate-800">{item.label}</summary>
              <div className="mt-2 text-[11px] text-slate-600">{item.notes}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                사용 페이지: {item.usedByPages === "common" ? "공통" : item.usedByPages.join(", ")}
              </div>
              <div className="mt-2 space-y-1">
                {item.files.map((file, idx) => (
                  <div
                    key={`common-${item.key}-${idx}-${file}`}
                    className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700"
                  >
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
