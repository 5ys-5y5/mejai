"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { MultiSelectPopover, SelectPopover, type SelectOption } from "@/components/SelectPopover";

type Props = {
  showInlineUserKbInput: boolean;
  inlineKbValue: string;
  onInlineKbChange: (value: string) => void;
  inlineKbLabel?: string;
  inlineKbPlaceholder?: string;
  inlineKbTextareaClassName?: string;
  inlineKbLabelClassName?: string;
  inlineKbAdminOnly?: boolean;

  showLlmSelector: boolean;
  llmValue: string;
  onLlmChange: (value: string) => void;
  llmOptions: SelectOption[];
  showLlmInfoButton?: boolean;
  onToggleLlmInfo?: () => void;
  llmInfoOpen?: boolean;
  llmInfoText?: string;
  llmAdminOnly?: boolean;

  middleContent?: ReactNode;

  showMcpProviderSelector: boolean;
  providerValues: string[];
  onProviderChange: (values: string[]) => void;
  providerOptions: SelectOption[];
  providerPlaceholder?: string;
  showMcpInfoButton?: boolean;
  onToggleMcpInfo?: () => void;
  mcpInfoOpen?: boolean;
  mcpInfoText?: string;
  mcpProviderAdminOnly?: boolean;

  showMcpActionSelector: boolean;
  actionValues: string[];
  onActionChange: (values: string[]) => void;
  actionOptions: SelectOption[];
  actionPlaceholder?: string;
  actionSearchable?: boolean;
  mcpActionAdminOnly?: boolean;
};

function AdminBadge() {
  return (
    <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
      ADMIN
    </span>
  );
}

export function ConversationSetupFields({
  showInlineUserKbInput,
  inlineKbValue,
  onInlineKbChange,
  inlineKbLabel = "사용자 KB입력란",
  inlineKbPlaceholder = "예) 고객 정책, FAQ, 톤 가이드",
  inlineKbTextareaClassName = "h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700",
  inlineKbLabelClassName = "mb-1 text-[11px] font-semibold text-slate-600",
  inlineKbAdminOnly = false,
  showLlmSelector,
  llmValue,
  onLlmChange,
  llmOptions,
  showLlmInfoButton = false,
  onToggleLlmInfo,
  llmInfoOpen = false,
  llmInfoText = "",
  llmAdminOnly = false,
  middleContent,
  showMcpProviderSelector,
  providerValues,
  onProviderChange,
  providerOptions,
  providerPlaceholder = "선택",
  showMcpInfoButton = false,
  onToggleMcpInfo,
  mcpInfoOpen = false,
  mcpInfoText = "",
  mcpProviderAdminOnly = false,
  showMcpActionSelector,
  actionValues,
  onActionChange,
  actionOptions,
  actionPlaceholder = "선택",
  actionSearchable = false,
  mcpActionAdminOnly = false,
}: Props) {
  return (
    <div className="space-y-3">
      {showInlineUserKbInput ? (
        <div>
          <div className={`${inlineKbLabelClassName} flex items-center gap-1`}>
            <span>{inlineKbLabel}</span>
            {inlineKbAdminOnly ? <AdminBadge /> : null}
          </div>
          <textarea
            value={inlineKbValue}
            onChange={(event) => onInlineKbChange(event.target.value)}
            placeholder={inlineKbPlaceholder}
            className={inlineKbTextareaClassName}
          />
        </div>
      ) : null}

      {showLlmSelector ? (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span>LLM 선택</span>
            {llmAdminOnly ? <AdminBadge /> : null}
          </div>
          <div className="flex items-center gap-2">
            <SelectPopover value={llmValue} onChange={onLlmChange} options={llmOptions} className="flex-1 min-w-0" />
            {showLlmInfoButton ? (
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                onClick={onToggleLlmInfo}
                aria-label="LLM 정보"
              >
                <Info className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {showLlmInfoButton && llmInfoOpen ? (
            <textarea
              readOnly
              value={llmInfoText}
              className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
            />
          ) : null}
        </div>
      ) : null}

      {middleContent}

      {showMcpProviderSelector ? (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span>MCP 프로바이더 선택</span>
            {mcpProviderAdminOnly ? <AdminBadge /> : null}
          </div>
          <div className="flex items-center gap-2">
            <MultiSelectPopover
              values={providerValues}
              onChange={onProviderChange}
              options={providerOptions}
              placeholder={providerPlaceholder}
              displayMode="count"
              showBulkActions
              className="flex-1 min-w-0"
            />
            {showMcpInfoButton ? (
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                onClick={onToggleMcpInfo}
                aria-label="MCP 정보"
              >
                <Info className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showMcpActionSelector ? (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span>MCP 액션 선택</span>
            {mcpActionAdminOnly ? <AdminBadge /> : null}
          </div>
          <div className="flex items-center gap-2">
            <MultiSelectPopover
              values={actionValues}
              onChange={onActionChange}
              options={actionOptions}
              placeholder={actionPlaceholder}
              displayMode="count"
              showBulkActions
              searchable={actionSearchable}
              className="flex-1 min-w-0"
            />
          </div>
          {showMcpInfoButton && mcpInfoOpen ? (
            <textarea
              readOnly
              value={mcpInfoText}
              className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
