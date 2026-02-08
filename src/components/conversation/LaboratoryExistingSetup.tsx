"use client";

import { cn } from "@/lib/utils";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";

type ConversationMode = "history" | "edit" | "new";
type SetupMode = "existing" | "new";

type Props = {
  showModelSelector: boolean;
  showModeExisting: boolean;
  showModeNew: boolean;
  setupMode: SetupMode;
  onSelectExisting: () => void;
  onSelectNew: () => void;

  selectedAgentGroupId: string;
  selectedAgentId: string;
  selectedSessionId: string | null;
  sessionsLength: number;
  sessionsLoading: boolean;
  sessionsError: string | null;
  conversationMode: ConversationMode;

  agentGroupOptions: SelectOption[];
  versionOptions: SelectOption[];
  sessionOptions: SelectOption[];

  onSelectAgentGroup: (value: string) => void;
  onSelectAgentVersion: (value: string) => void;
  onSelectSession: (value: string) => void;
  onChangeConversationMode: (mode: ConversationMode) => void;
};

export function LaboratoryExistingSetup({
  showModelSelector,
  showModeExisting,
  showModeNew,
  setupMode,
  onSelectExisting,
  onSelectNew,
  selectedAgentGroupId,
  selectedAgentId,
  selectedSessionId,
  sessionsLength,
  sessionsLoading,
  sessionsError,
  conversationMode,
  agentGroupOptions,
  versionOptions,
  sessionOptions,
  onSelectAgentGroup,
  onSelectAgentVersion,
  onSelectSession,
  onChangeConversationMode,
}: Props) {
  return (
    <>
      {showModelSelector ? (
        <div className="border-b border-slate-200 bg-white pb-3">
          <div className={cn("grid gap-2 w-full", showModeExisting && showModeNew ? "grid-cols-2" : "grid-cols-1")}>
            {showModeExisting ? (
              <button
                type="button"
                onClick={onSelectExisting}
                className={cn(
                  "w-full rounded-xl border px-3 py-1.5 text-xs font-semibold",
                  setupMode === "existing"
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                기존 모델
              </button>
            ) : null}
            {showModeNew ? (
              <button
                type="button"
                onClick={onSelectNew}
                className={cn(
                  "w-full rounded-xl border px-3 py-1.5 text-xs font-semibold",
                  setupMode === "new"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                신규 모델
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {setupMode === "existing" ? (
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-600">에이전트 선택</div>
            <SelectPopover
              value={selectedAgentGroupId}
              onChange={onSelectAgentGroup}
              options={agentGroupOptions}
              searchable
              className="flex-1 min-w-0"
            />
          </div>
          {selectedAgentGroupId ? (
            <div>
              <div className="mb-1 text-[11px] font-semibold text-slate-600">버전 선택</div>
              <SelectPopover
                value={selectedAgentId}
                onChange={onSelectAgentVersion}
                options={versionOptions}
                searchable
                className="flex-1 min-w-0"
              />
            </div>
          ) : null}
          {selectedAgentId ? (
            <div>
              <div className="mb-1 text-[11px] font-semibold text-slate-600">세션 선택</div>
              <SelectPopover
                value={selectedSessionId || ""}
                onChange={onSelectSession}
                options={sessionOptions}
                searchable
                className="flex-1 min-w-0"
              />
              {sessionsLoading ? <div className="mt-1 text-[11px] text-slate-500">세션 불러오는 중...</div> : null}
              {sessionsError ? <div className="mt-1 text-[11px] text-rose-600">{sessionsError}</div> : null}
            </div>
          ) : null}
          {selectedAgentId && (selectedSessionId || sessionsLength === 0) ? (
            <div className="space-y-1">
              <div className="mb-1 text-[11px] font-semibold text-slate-600">모드 선택</div>
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => onChangeConversationMode("history")}
                  disabled={sessionsLength === 0}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                    sessionsLength === 0 && "cursor-not-allowed opacity-50",
                    conversationMode === "history"
                      ? "border-slate-300 bg-slate-100 text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  히스토리 모드
                </button>
                <button
                  type="button"
                  onClick={() => onChangeConversationMode("new")}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                    conversationMode === "new"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  신규 대화
                </button>
                <button
                  type="button"
                  onClick={() => onChangeConversationMode("edit")}
                  disabled={sessionsLength === 0}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                    sessionsLength === 0 && "cursor-not-allowed opacity-50",
                    conversationMode === "edit"
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  수정 모드
                </button>
              </div>
              {sessionsLength === 0 ? (
                <div className="text-[11px] text-slate-500">선택한 에이전트/버전에 세션이 없어 신규 대화만 가능합니다.</div>
              ) : null}
              {conversationMode === "edit" ? (
                <div className="text-[11px] text-amber-700">수정 모드 첫 전송 시 기존 세션을 복제한 새 세션으로 이어집니다.</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
