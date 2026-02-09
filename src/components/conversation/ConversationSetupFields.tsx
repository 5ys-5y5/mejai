"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { MultiSelectPopover, SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { Button } from "@/components/ui/Button";
import type { InlineKbSampleItem } from "@/lib/conversation/inlineKbSamples";
import type { SetupFieldKey } from "@/lib/conversation/pageFeaturePolicy";

type Props = {
  showInlineUserKbInput: boolean;
  inlineKbValue: string;
  onInlineKbChange: (value: string) => void;
  inlineKbLabel?: string;
  inlineKbPlaceholder?: string;
  inlineKbTextareaClassName?: string;
  inlineKbLabelClassName?: string;
  inlineKbAdminOnly?: boolean;
  inlineKbSamples?: InlineKbSampleItem[];
  inlineKbSampleSelectionOrder?: string[];
  onInlineKbSampleApply?: (sampleIds: string[]) => void;
  inlineKbSampleConflict?: boolean;
  setupFieldOrder?: SetupFieldKey[];

  showLlmSelector: boolean;
  llmLabel?: string;
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
  mcpProviderLabel?: string;
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
  mcpActionLabel?: string;
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
  inlineKbSamples = [],
  inlineKbSampleSelectionOrder = [],
  onInlineKbSampleApply,
  inlineKbSampleConflict = false,
  setupFieldOrder,
  showLlmSelector,
  llmLabel = "LLM 선택",
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
  mcpProviderLabel = "MCP 프로바이더 선택",
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
  mcpActionLabel = "MCP 액션 선택",
  actionValues,
  onActionChange,
  actionOptions,
  actionPlaceholder = "선택",
  actionSearchable = false,
  mcpActionAdminOnly = false,
}: Props) {
  const [sampleOpen, setSampleOpen] = useState(false);
  const [pendingSampleIds, setPendingSampleIds] = useState<string[]>([]);
  const sampleById = useMemo(() => {
    const map = new Map<string, InlineKbSampleItem>();
    inlineKbSamples.forEach((item) => map.set(item.id, item));
    return map;
  }, [inlineKbSamples]);
  const pendingOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    pendingSampleIds.forEach((id, idx) => map.set(id, idx + 1));
    return map;
  }, [pendingSampleIds]);
  const selectedSampleTitles = inlineKbSampleSelectionOrder
    .map((id, idx) => {
      const sample = sampleById.get(id);
      if (!sample) return null;
      return `${idx + 1}. ${sample.title}`;
    })
    .filter(Boolean);
  const sampleOptions = useMemo<SelectOption[]>(
    () =>
      inlineKbSamples.map((sample) => ({
        id: sample.id,
        label: pendingOrderMap.has(sample.id) ? `${pendingOrderMap.get(sample.id)}. ${sample.title}` : sample.title,
        description: sample.content,
      })),
    [inlineKbSamples, pendingOrderMap]
  );

  const renderInlineKb = () =>
    showInlineUserKbInput ? (
      <div key="inlineUserKbInput">
        <div className={`${inlineKbLabelClassName} flex items-center gap-1`}>
          <span>{inlineKbLabel}</span>
          {inlineKbAdminOnly ? <AdminBadge /> : null}
        </div>
        <div className="mb-2 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <MultiSelectPopover
              values={pendingSampleIds}
              onChange={setPendingSampleIds}
              options={sampleOptions}
              placeholder="KB 입력(임시) 샘플 선택"
              displayMode="count"
              searchable={false}
              showBulkActions={false}
              open={sampleOpen}
              onOpenChange={setSampleOpen}
              className="relative flex-1 min-w-0"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (!onInlineKbSampleApply || pendingSampleIds.length === 0) return;
              onInlineKbSampleApply(pendingSampleIds);
              setPendingSampleIds([]);
              setSampleOpen(false);
            }}
            disabled={!onInlineKbSampleApply || pendingSampleIds.length === 0}
            className="h-9 px-3 text-xs"
          >
            적용
          </Button>
        </div>
        <textarea
          value={inlineKbValue}
          onChange={(event) => onInlineKbChange(event.target.value)}
          placeholder={inlineKbPlaceholder}
          className={inlineKbTextareaClassName}
        />
        {selectedSampleTitles.length > 0 ? (
          <div className="mt-2 text-[11px] text-slate-500">{selectedSampleTitles.join(" > ")}</div>
        ) : null}
        {inlineKbSampleConflict ? (
          <div className="mt-2 text-[11px] font-medium text-amber-700">
            선택한 샘플 간 상충 가능성이 있어 답변 품질이 나빠질 수 있습니다.
          </div>
        ) : null}
      </div>
    ) : null;

  const renderLlm = () =>
    showLlmSelector ? (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span>{llmLabel}</span>
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
      ) : null;

  const renderMcpProvider = () =>
    showMcpProviderSelector ? (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span>{mcpProviderLabel}</span>
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
      ) : null;

  const renderMcpAction = () =>
    showMcpActionSelector ? (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span>{mcpActionLabel}</span>
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
      ) : null;

  const setupOrder = setupFieldOrder || [
    "inlineUserKbInput",
    "llmSelector",
    "kbSelector",
    "adminKbSelector",
    "routeSelector",
    "mcpProviderSelector",
    "mcpActionSelector",
  ];
  const orderedNodes: ReactNode[] = [];
  let middleInserted = false;
  setupOrder.forEach((key) => {
    if ((key === "kbSelector" || key === "adminKbSelector" || key === "routeSelector") && middleContent && !middleInserted) {
      orderedNodes.push(middleContent);
      middleInserted = true;
      return;
    }
    if (key === "inlineUserKbInput") orderedNodes.push(renderInlineKb());
    if (key === "llmSelector") orderedNodes.push(renderLlm());
    if (key === "mcpProviderSelector") orderedNodes.push(renderMcpProvider());
    if (key === "mcpActionSelector") orderedNodes.push(renderMcpAction());
  });
  if (middleContent && !middleInserted) orderedNodes.push(middleContent);

  return <div className="space-y-3">{orderedNodes.filter(Boolean)}</div>;
}
