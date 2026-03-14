"use client";

import { useCallback, useMemo, useState } from "react";
import { ChatSettingsPanel } from "@/components/conversation/ChatSettingsPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { WidgetTemplateSettingsController } from "@/lib/conversation/client/useWidgetTemplateSettingsController";
import {
  WIDGET_PAGE_KEY,
  applyConversationFeatureBulkToggle,
  applyConversationFeatureVisibilityMode,
  resolveConversationPageFeatures,
  type FeatureVisibilityMode,
} from "@/lib/conversation/pageFeaturePolicy";

type WidgetTemplateSettingsEditorProps = {
  controller: WidgetTemplateSettingsController;
};

function isVisibilityMode(value: unknown): value is FeatureVisibilityMode {
  return value === "public" || value === "user" || value === "admin";
}

function countBooleanFields(value: unknown, skipVisibility = false): { total: number; enabled: number } {
  if (typeof value === "boolean") {
    return { total: 1, enabled: value ? 1 : 0 };
  }
  if (Array.isArray(value) || !value || typeof value !== "object") {
    return { total: 0, enabled: 0 };
  }
  let total = 0;
  let enabled = 0;
  Object.entries(value).forEach(([key, entry]) => {
    if (skipVisibility && key === "visibility") return;
    const child = countBooleanFields(entry, skipVisibility);
    total += child.total;
    enabled += child.enabled;
  });
  return { total, enabled };
}

function countVisibilityModes(value: unknown): Record<FeatureVisibilityMode, number> {
  const counts: Record<FeatureVisibilityMode, number> = { public: 0, user: 0, admin: 0 };
  const walk = (entry: unknown) => {
    if (isVisibilityMode(entry)) {
      counts[entry] += 1;
      return;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;
    Object.values(entry).forEach(walk);
  };
  walk(value);
  return counts;
}

export function WidgetTemplateSettingsEditor({ controller }: WidgetTemplateSettingsEditorProps) {
  const [bulkEnabledSelection, setBulkEnabledSelection] = useState<boolean | null>(null);
  const [bulkVisibilitySelection, setBulkVisibilitySelection] = useState<FeatureVisibilityMode | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const bulkDisabled = controller.policyLoading || controller.policySaving || !controller.draft?.id;
  const canApplyBulk =
    !bulkDisabled && (bulkEnabledSelection !== null || bulkVisibilitySelection !== null);

  const bulkSummary = useMemo(() => {
    if (!controller.policyValue) return null;
    const resolved = resolveConversationPageFeatures(WIDGET_PAGE_KEY, controller.policyValue);
    const { total, enabled } = countBooleanFields(resolved, true);
    const visibilityCounts = countVisibilityModes(resolved.visibility);
    const activeModes = (Object.keys(visibilityCounts) as FeatureVisibilityMode[]).filter(
      (key) => visibilityCounts[key] > 0
    );
    return {
      total,
      enabled,
      visibilityCounts,
      currentVisibilityMode: activeModes.length === 1 ? activeModes[0] : "",
    };
  }, [controller.policyValue]);

  const bulkSelectionText = useMemo(() => {
    const parts: string[] = [];
    if (bulkEnabledSelection !== null) {
      parts.push(`on/off: ${bulkEnabledSelection ? "ON" : "OFF"}`);
    }
    if (bulkVisibilitySelection) {
      parts.push(`visibility: ${bulkVisibilitySelection}`);
    }
    return parts.length ? parts.join(", ") : "선택 없음";
  }, [bulkEnabledSelection, bulkVisibilitySelection]);

  const applyBulkChanges = useCallback(() => {
    if (!canApplyBulk) return;
    controller.setPolicyValue((current) => {
      let next = current;
      if (bulkEnabledSelection !== null) {
        next = applyConversationFeatureBulkToggle(next, WIDGET_PAGE_KEY, bulkEnabledSelection);
      }
      if (bulkVisibilitySelection) {
        next = applyConversationFeatureVisibilityMode(next, WIDGET_PAGE_KEY, bulkVisibilitySelection);
      }
      return next;
    });
    setBulkConfirmOpen(false);
  }, [bulkEnabledSelection, bulkVisibilitySelection, canApplyBulk, controller]);

  if (!controller.draft) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        좌측 목록에서 템플릿을 선택하면 대화 정책 편집기가 열립니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 border-slate-200 bg-white p-4">
        <div>
          <div className="text-xs font-semibold text-slate-700">템플릿 테마 기본값</div>
          <div className="mt-1 text-[11px] text-slate-500">
            기존 `template` 탭에서 관리하던 theme 기본값도 같은 정책 저장 흐름에 포함합니다.
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-xs text-slate-600">theme.greeting</div>
            <Input
              value={String(controller.theme.greeting || "")}
              onChange={(event) => controller.setThemeField("greeting", event.target.value)}
              className="h-10"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs text-slate-600">theme.input_placeholder</div>
            <Input
              value={String(controller.theme.input_placeholder || "")}
              onChange={(event) => controller.setThemeField("input_placeholder", event.target.value)}
              className="h-10"
            />
          </label>
        </div>
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">theme.launcher_icon_url</div>
          <Input
            value={String(controller.theme.launcher_icon_url || "")}
            onChange={(event) => controller.setThemeField("launcher_icon_url", event.target.value)}
            className="h-10"
          />
        </label>
      </Card>

      <Card className="space-y-3 border-slate-200 bg-white p-4">
        <div>
          <div className="text-xs font-semibold text-slate-900">대화 정책 일괄 설정</div>
          <div className="text-[11px] text-slate-500">
            전체 항목의 on/off와 public/user/admin 가시성을 같은 계약으로 일괄 적용합니다.
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">일괄 on/off</span>
            <Button
              type="button"
              variant={bulkEnabledSelection === true ? "default" : "outline"}
              size="sm"
              onClick={() => setBulkEnabledSelection(true)}
              disabled={bulkDisabled}
            >
              전체 ON
            </Button>
            <Button
              type="button"
              variant={bulkEnabledSelection === false ? "default" : "outline"}
              size="sm"
              onClick={() => setBulkEnabledSelection(false)}
              disabled={bulkDisabled}
            >
              전체 OFF
            </Button>
            <button
              type="button"
              onClick={() => setBulkEnabledSelection(null)}
              disabled={bulkDisabled || bulkEnabledSelection === null}
              className="text-[11px] font-semibold text-slate-500 disabled:text-slate-300"
            >
              선택 해제
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">가시성</span>
            <Button
              type="button"
              variant={bulkVisibilitySelection === "public" ? "default" : "outline"}
              size="sm"
              onClick={() => setBulkVisibilitySelection("public")}
              disabled={bulkDisabled}
            >
              public
            </Button>
            <Button
              type="button"
              variant={bulkVisibilitySelection === "user" ? "default" : "outline"}
              size="sm"
              onClick={() => setBulkVisibilitySelection("user")}
              disabled={bulkDisabled}
            >
              user
            </Button>
            <Button
              type="button"
              variant={bulkVisibilitySelection === "admin" ? "default" : "outline"}
              size="sm"
              onClick={() => setBulkVisibilitySelection("admin")}
              disabled={bulkDisabled}
            >
              admin
            </Button>
            <button
              type="button"
              onClick={() => setBulkVisibilitySelection(null)}
              disabled={bulkDisabled || bulkVisibilitySelection === null}
              className="text-[11px] font-semibold text-slate-500 disabled:text-slate-300"
            >
              선택 해제
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            <span>
              현재 on/off:{" "}
              <span className="font-semibold text-slate-700">
                {bulkSummary ? `${bulkSummary.enabled}/${bulkSummary.total}` : "-"}
              </span>
            </span>
            <span>
              현재 가시성:{" "}
              <span className="font-semibold text-slate-700">
                {bulkSummary?.currentVisibilityMode || "혼합"}
              </span>
            </span>
            <span>
              public {bulkSummary?.visibilityCounts.public ?? 0} / user {bulkSummary?.visibilityCounts.user ?? 0} /
              admin {bulkSummary?.visibilityCounts.admin ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-500">선택한 항목만 적용됩니다. 적용 전 확인이 필요합니다.</div>
            <Button type="button" size="sm" onClick={() => setBulkConfirmOpen(true)} disabled={!canApplyBulk}>
              적용
            </Button>
          </div>
        </div>
      </Card>

      {controller.policyLoading ? (
        <Card className="border-slate-200 bg-white p-4 text-xs text-slate-500">정책을 불러오는 중...</Card>
      ) : (
        <ChatSettingsPanel
          value={controller.policyValue}
          onChange={(next) => controller.setPolicyValue(next)}
          pageScope={[WIDGET_PAGE_KEY]}
          agents={controller.editableAgents}
          hiddenLabels={[
            "widget.name",
            "widget.agent_id",
            "widget.setup_config",
            "setup_config.kb.mode",
            "setup_config.kb.kb_id",
            "setup_config.kb.admin_kb_ids",
            "setup_config.mcp.provider_keys",
            "setup_config.mcp.tool_ids",
            "setup_config.llm.default",
          ]}
          widgetNameValue={controller.draft.name ?? ""}
          onWidgetNameChange={controller.updateDraftName}
          widgetNameLabel="B_chat_widgets.name"
          kbOptions={controller.userKbOptions}
          inlineKbSampleOptions={controller.inlineKbSampleOptions}
          adminKbOptions={controller.adminKbOptions}
          routeOptions={controller.routeOptions}
          mcpProviderOptions={controller.mcpProviderOptions}
          mcpToolOptions={controller.mcpToolOptions}
          widgetActiveValue={controller.draft.is_active ?? null}
          onWidgetActiveChange={controller.updateDraftActive}
          widgetActiveLabel="B_chat_widgets.is_active"
          preserveNulls
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="text-sm">
          {controller.policySaving
            ? "저장 중입니다."
            : controller.hasUnsavedChanges
              ? "저장되지 않은 변경 사항이 있습니다."
              : "변경 사항이 없습니다."}
        </div>
        <Button
          type="button"
          onClick={() => void controller.saveAll()}
          disabled={controller.policySaving || !controller.hasUnsavedChanges}
          className="rounded-xl bg-white px-4 text-xs font-semibold text-slate-900 hover:bg-slate-100"
        >
          {controller.policySaving ? "저장중" : "저장하기"}
        </Button>
      </div>

      {bulkConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">일괄 적용 확인</div>
              <button
                type="button"
                onClick={() => setBulkConfirmOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                닫기
              </button>
            </div>
            <div className="text-xs text-slate-600">적용 내용: {bulkSelectionText}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
              <div>
                현재 on/off:{" "}
                <span className="font-semibold text-slate-700">
                  {bulkSummary ? `${bulkSummary.enabled}/${bulkSummary.total}` : "-"}
                </span>
              </div>
              <div>
                현재 가시성:{" "}
                <span className="font-semibold text-slate-700">
                  {bulkSummary?.currentVisibilityMode || "혼합"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setBulkConfirmOpen(false)}>
                취소
              </Button>
              <Button type="button" size="sm" onClick={applyBulkChanges} disabled={!canApplyBulk}>
                적용
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
