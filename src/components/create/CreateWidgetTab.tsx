"use client";

import { Trash2 } from "lucide-react";
import { StateBanner } from "@/components/design-system";
import { CreateListTable, CreateResourceShell } from "@/components/create/CreateResourceShell";
import { Button } from "@/components/ui/Button";
import { WidgetTemplateSettingsEditor } from "@/components/widget-template/WidgetTemplateSettingsEditor";
import type { WidgetTemplateSettingsController } from "@/lib/conversation/client/useWidgetTemplateSettingsController";

type CreateWidgetTabProps = {
  controller: WidgetTemplateSettingsController;
};

export function CreateWidgetTab({ controller }: CreateWidgetTabProps) {
  const agentById = new Map(controller.editableAgents.map((agent) => [agent.id, agent]));

  const banner = !controller.isAdmin ? (
    <StateBanner
      tone="warning"
      title="관리자 전용 편집"
      description="템플릿 생성, 저장, 삭제와 대화 정책 편집은 관리자 권한이 필요합니다."
    />
  ) : controller.error ? (
    <StateBanner tone="danger" title="템플릿 로딩 실패" description={controller.error} />
  ) : null;

  return (
    <CreateResourceShell
      description="템플릿 선택, 대화 정책 편집, 저장을 한 화면에서 처리합니다. conversation 페이지의 대화 정책은 이 탭으로 이관됩니다."
      helperText="대화 정책, settings_ui 라벨/순서, 템플릿 theme 기본값을 같은 저장 흐름으로 유지합니다."
      banner={banner}
      listTitle="템플릿 목록"
      listCountLabel={`총 ${controller.loading ? "-" : controller.templates.length}개`}
      createLabel="새 템플릿"
      onCreate={() => void controller.createTemplate()}
      onRefresh={() => void controller.refresh()}
      refreshDisabled={controller.loading}
      createDisabled={!controller.isAdmin}
      listContent={
        <CreateListTable
          rows={controller.templates}
          getRowId={(item) => item.id}
          selectedId={controller.selectedTemplateId || null}
          onSelect={(item) => controller.selectTemplate(item.id)}
          emptyState={
            <div className="p-4 text-sm text-slate-500">
              {controller.loading ? "템플릿을 불러오는 중..." : "생성된 템플릿이 없습니다."}
            </div>
          }
          columns={[
            {
              id: "name",
              label: "템플릿",
              width: "minmax(0, 1.7fr)",
              render: (item) => <div className="truncate text-sm font-semibold text-slate-900">{item.name || item.id}</div>,
            },
            {
              id: "agent",
              label: "연결 비서",
              width: "minmax(0, 1.35fr)",
              render: (item) => {
                const linkedAgent = item.agent_id ? agentById.get(String(item.agent_id)) ?? null : null;
                return linkedAgent?.name || item.agent_id || "-";
              },
            },
            {
              id: "status",
              label: "상태",
              width: "minmax(0, 0.7fr)",
              render: (item) => (item.is_active === false ? "Inactive" : "Active"),
            },
            {
              id: "public_key",
              label: "템플릿키",
              width: "minmax(0, 1.2fr)",
              render: (item) => (
                <span className="truncate font-mono text-[11px] text-slate-500">{item.public_key || "-"}</span>
              ),
            },
          ]}
        />
      }
      detailTitle={controller.draft?.name || "템플릿을 선택하세요"}
      detailDescription={
        controller.draft
          ? "대화 정책, 템플릿 상태, settings_ui 라벨/순서를 같은 편집기에서 수정합니다."
          : "좌측 목록에서 템플릿을 선택하거나 새 템플릿을 생성해 주세요."
      }
      detailActions={
        controller.draft?.id ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void controller.deleteSelectedTemplate()}
            disabled={!controller.isAdmin}
            className="rounded-xl border-rose-200 bg-rose-50 px-3 text-xs text-rose-600 hover:bg-rose-100"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            삭제
          </Button>
        ) : null
      }
      detailContent={<WidgetTemplateSettingsEditor controller={controller} />}
    />
  );
}
