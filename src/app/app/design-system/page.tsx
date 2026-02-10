"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  AdminTag,
  AgentSelectPopover,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DateRangePopover,
  Divider,
  IconChip,
  InlineToggle,
  Input,
  Metric,
  MultiSelectPopover,
  PanelCard,
  SectionBlock,
  SelectPopover,
  Skeleton,
  StateBanner,
  ConversationGrid,
  ConversationQuickReplyButton,
  ConversationConfirmButton,
  ConversationProductCard,
  ConversationAdminMenu,
  ConversationSplitLayout,
  ConversationThread,
  OverlayShell,
  PageActionBarShell,
  SidebarNavigationShell,
  TopHeaderShell,
  TypographyScaleShell,
  type SelectOption,
} from "@/components/design-system";
import * as LucideIcons from "lucide-react";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Info,
  Layers3,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RENDER_POLICY } from "@/app/api/runtime/chat/policies/renderPolicy";
import {
  RUNTIME_UI_PROMPT_RULES,
  RUNTIME_UI_TYPE_HIERARCHY,
  buildIntentDisambiguationTableHtmlFromText,
} from "@/components/design-system/conversation/runtimeUiCatalog";

type CategoryKey =
  | "all"
  | "foundation"
  | "action"
  | "input"
  | "select"
  | "conversation"
  | "display"
  | "feedback"
  | "overlay"
  | "navigation"
  | "icon";

const categoryLabels: Array<{ key: CategoryKey; label: string }> = [
  { key: "all", label: "전체" },
  { key: "foundation", label: "Foundation" },
  { key: "action", label: "Action" },
  { key: "input", label: "Input" },
  { key: "select", label: "Select" },
  { key: "conversation", label: "Conversation" },
  { key: "display", label: "Display" },
  { key: "feedback", label: "Feedback" },
  { key: "overlay", label: "Overlay" },
  { key: "navigation", label: "Navigation" },
  { key: "icon", label: "Icon" },
];

const singleOptions: SelectOption[] = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "gemini", label: "Gemini" },
  { id: "grok", label: "Grok" },
];

const searchableSingleOptions: SelectOption[] = [
  { id: "runtime_default", label: "Runtime v1" },
  { id: "runtime_laboratory", label: "Laboratory Runtime" },
  { id: "runtime_safe", label: "Safe Runtime" },
  { id: "runtime_fast", label: "Fast Runtime" },
];

const multiToolOptions: SelectOption[] = [
  { id: "cafe24", label: "Cafe24", description: "커머스 주문/고객/상품/설정 API" },
  { id: "solapi", label: "Solapi", description: "문자 인증(OTP) 발송/검증" },
  { id: "juso", label: "Juso", description: "주소 정합성/우편번호 조회" },
  { id: "runtime", label: "Runtime", description: "로컬 런타임 기능(restock_lite)" },
  { id: "naver", label: "Naver", description: "검색 및 쇼핑 데이터" },
];

const groupedToolOptions: SelectOption[] = [
  { id: "send_otp", label: "send_otp", description: "OTP 발송", group: "solapi" },
  { id: "verify_otp", label: "verify_otp", description: "OTP 검증", group: "solapi" },
  { id: "search_address", label: "search_address", description: "Search Korean address by keyword", group: "juso" },
  { id: "list_orders", label: "list_orders", description: "주문 목록 조회", group: "cafe24" },
  { id: "get_customer", label: "get_customer", description: "고객 상세 조회", group: "cafe24" },
];

const groupedDefault = ["send_otp", "verify_otp", "search_address"];

const agentOptions = [
  { id: "a_support", name: "고객지원" },
  { id: "a_billing", name: "결제/환불" },
  { id: "a_restock", name: "재입고/알림" },
];

const followupByAgent = new Map<string, number>([
  ["a_support", 3],
  ["a_billing", 1],
  ["a_restock", 5],
]);

type ConversationSampleMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  richHtml?: string;
};

type DemoSection = {
  key: string;
  category: Exclude<CategoryKey, "all">;
  node: ReactNode;
};

function UsedInPages({ pages }: { pages: string[] }) {
  return (
    <div className="mt-3 text-[11px] text-slate-500">
      <div className="mb-1">사용 페이지:</div>
      <div className="space-y-1">
        {pages.map((page) => (
          <div key={page}>
            <code>{page}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");

  const [singleValue, setSingleValue] = useState("chatgpt");
  const [inputSelectValue, setInputSelectValue] = useState("chatgpt");
  const [searchSingleValue, setSearchSingleValue] = useState("runtime_laboratory");
  const [multiValues, setMultiValues] = useState<string[]>(["cafe24", "solapi", "juso", "runtime"]);
  const [groupedValues, setGroupedValues] = useState<string[]>(groupedDefault);
  const [dateRangeValue, setDateRangeValue] = useState("last_month");
  const [agentValue, setAgentValue] = useState("all");

  const [conversationAdminOpen, setConversationAdminOpen] = useState(false);
  const [conversationSelectionEnabled, setConversationSelectionEnabled] = useState(false);
  const [conversationShowLogs, setConversationShowLogs] = useState(false);
  const [conversationSelectedMessageIds, setConversationSelectedMessageIds] = useState<string[]>([]);
  const [conversationInput, setConversationInput] = useState("");
  const [conversationLlm, setConversationLlm] = useState("chatgpt");
  const [conversationKb, setConversationKb] = useState("restock");
  const [conversationAdminKb, setConversationAdminKb] = useState("mk2");
  const [conversationRuntime, setConversationRuntime] = useState("core_runtime");
  const [conversationProviders, setConversationProviders] = useState<string[]>(["cafe24", "solapi", "juso", "runtime"]);
  const [conversationActions, setConversationActions] = useState<string[]>(["admin_request", "send_otp", "search_address"]);

  const [iconSearch, setIconSearch] = useState("");
  const [iconPage, setIconPage] = useState(1);

  const selectedMultiLabel = useMemo(() => {
    if (!multiValues.length) return "-";
    const mapped = multiValues
      .map((id) => multiToolOptions.find((opt) => opt.id === id)?.label)
      .filter(Boolean)
      .join(", ");
    return mapped || "-";
  }, [multiValues]);

  const lucideIconEntries = useMemo(() => {
    const iconRegistry = (LucideIcons as unknown as { icons?: Record<string, unknown> }).icons ?? {};
    return Object.keys(iconRegistry)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => [name, (LucideIcons as unknown as Record<string, unknown>)[name]] as const)
      .filter(([, value]) => Boolean(value));
  }, []);

  const filteredIconEntries = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q) return lucideIconEntries;
    return lucideIconEntries.filter(([name]) => name.toLowerCase().includes(q));
  }, [iconSearch, lucideIconEntries]);

  const iconPageSize = 100;
  const iconTotalPages = Math.max(1, Math.ceil(filteredIconEntries.length / iconPageSize));
  const safeIconPage = Math.min(iconPage, iconTotalPages);
  const iconPageEntries = filteredIconEntries.slice((safeIconPage - 1) * iconPageSize, safeIconPage * iconPageSize);

  const conversationSampleMessages: ConversationSampleMessage[] = [
    { id: "m1", role: "user", content: "코트 재입고 문의" },
    {
      id: "m2",
      role: "bot",
      content: "",
      richHtml:
        "<div style='display:block;margin:0;padding:0;color:inherit;font:inherit;line-height:inherit;'><div style='margin:0;padding:0;color:inherit;font:inherit;line-height:inherit;'>요청이 모호해서 의도 확인이 필요합니다. 아래에서 선택해 주세요. (복수 선택 가능)</div><div style='margin-top:4px;overflow:hidden;border:1px solid #e2e8f0;border-radius:8px;background:rgba(255,255,255,0.55);'><table style='width:100%;border-collapse:collapse;table-layout:fixed;color:inherit;font:inherit;margin:0;'><thead><tr><th style='padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:center;width:42px;'>번호</th><th style='padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;'>항목명</th><th style='padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;width:110px;'>일정</th></tr></thead><tbody><tr><td style='padding:4px 6px;border-bottom:1px solid #e2e8f0;text-align:center;color:#0f172a;font-size:11px;font-weight:700;white-space:nowrap;'>1</td><td style='padding:4px 6px;border-bottom:1px solid #e2e8f0;color:inherit;font-size:12px;line-height:1.35;'>재입고 일정 안내</td><td style='padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:11px;line-height:1.35;white-space:nowrap;'>-</td></tr><tr><td style='padding:4px 6px;border-bottom:1px solid #e2e8f0;text-align:center;color:#0f172a;font-size:11px;font-weight:700;white-space:nowrap;'>2</td><td style='padding:4px 6px;border-bottom:1px solid #e2e8f0;color:inherit;font-size:12px;line-height:1.35;'>일반 문의</td><td style='padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:11px;line-height:1.35;white-space:nowrap;'>-</td></tr></tbody></table></div><div style='margin-top:8px;color:inherit;'><strong>입력 예시</strong>: 1,2</div></div>",
    },
    { id: "m3", role: "user", content: "1" },
    {
      id: "m4",
      role: "bot",
      content:
        "죄송하지만 요청하신 코트는 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.",
    },
  ];

  const intentDisambiguationHtml = useMemo(
    () =>
      buildIntentDisambiguationTableHtmlFromText(
        "요청이 모호해서 의도 확인이 필요합니다. 아래에서 선택해 주세요. (복수 선택 가능)\n- 1번 | 재입고 일정 안내 | -\n- 2번 | 일반 문의 | -\n예: 1,2"
      ) || "",
    []
  );

  const sections: DemoSection[] = [
    {
      key: "foundation",
      category: "foundation",
      node: (
        <SectionBlock
          id="foundation"
          title="Foundation"
          description="전역에서 반복되는 타이포/색상/상태 칩/패널 베이스"
        >
          <div className="grid grid-cols-1 gap-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <IconChip icon={Layers3} label="Single Import Entry" />
                <IconChip icon={Wrench} label="Composable Variant" />
                <Badge variant="amber">정리 단계</Badge>
                <Badge variant="green">샘플 데이터 포함</Badge>
                <AdminTag />
              </div>
              <Divider label="상태 컬러" className="mt-3" />
              <div className="flex flex-wrap gap-2">
                <Badge>default</Badge>
                <Badge variant="green">green</Badge>
                <Badge variant="amber">amber</Badge>
                <Badge variant="red">red</Badge>
                <Badge variant="slate">slate</Badge>
              </div>
              <UsedInPages pages={["src/components/HelpPanel.tsx", "src/components/design-system/conversation/ConversationUI.tsx"]} />
            </Card>

            <PanelCard className="p-4">
              <div className="text-sm font-semibold text-slate-900">PanelCard (대시보드 계열 반복 패턴)</div>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Metric label="통화 수" value="128" sub="최근 30일" />
                <Metric label="성공률" value="92%" sub="resolved / total" />
              </div>
              <UsedInPages pages={["src/app/app/page.tsx", "src/app/app/calls/[sessionId]/page.tsx"]} />
            </PanelCard>

            <Card className="p-4">
              <TypographyScaleShell />
              <UsedInPages pages={["src/components/design-system/shells.tsx", "src/app/globals.css"]} />
            </Card>
          </div>
        </SectionBlock>
      ),
    },
    {
      key: "action",
      category: "action",
      node: (
        <SectionBlock id="action" title="Action" description="버튼/토글/액션 그룹 패턴">
          <div className="grid grid-cols-1 gap-4">
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Button Variants</div>
              <div className="flex flex-wrap gap-2">
                <Button>기본</Button>
                <Button variant="outline">아웃라인</Button>
                <Button variant="secondary">세컨더리</Button>
                <Button variant="ghost">고스트</Button>
                <Button variant="destructive">삭제</Button>
              </div>
              <UsedInPages pages={["src/components/design-system/conversation/ConversationUI.tsx", "src/components/settings/ChatSettingsPanel.tsx"]} />
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Inline Toggle (설정 페이지 패턴)</div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span>알림 발송</span>
                <InlineToggle checked />
                <InlineToggle checked={false} />
              </div>
              <UsedInPages pages={["src/components/settings/ChatSettingsPanel.tsx"]} />
            </Card>

            <Card className="p-4">
              <PageActionBarShell />
              <UsedInPages pages={["src/components/design-system/shells.tsx", "src/app/app/page.tsx", "src/app/app/rules/page.tsx", "src/app/app/agents/[id]/page.tsx"]} />
            </Card>
          </div>
        </SectionBlock>
      ),
    },
    {
      key: "input",
      category: "input",
      node: (
        <SectionBlock id="input" title="Input" description="텍스트/텍스트영역/네이티브 셀렉트 패턴">
          <div className="grid grid-cols-1 gap-4">
            <Card className="p-4">
              <div className="space-y-3">
                <Input placeholder="기본 입력" className="w-full" />
                <textarea
                  className="h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  defaultValue="멀티라인 입력 샘플"
                />
                <SelectPopover
                  value={inputSelectValue}
                  onChange={setInputSelectValue}
                  options={singleOptions}
                  className="w-full"
                />
              </div>
              <UsedInPages pages={["src/components/SelectPopover.tsx", "src/app/admin/AdminClient.tsx", "src/app/onboarding/page.tsx"]} />
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold text-slate-900">폼 필드 조합</div>
              <div className="mt-3 grid grid-cols-1 gap-2 w-full">
                <label className="text-xs text-slate-600">mall_id</label>
                <Input defaultValue="samplemall" />
                <label className="text-xs text-slate-600">shop_no</label>
                <Input defaultValue="1,2,3" />
              </div>
              <UsedInPages pages={["src/app/app/settings/page.tsx"]} />
            </Card>
          </div>
        </SectionBlock>
      ),
    },
    {
      key: "select",
      category: "select",
      node: (
        <SectionBlock id="select" title="Select" description="서비스 전역 셀렉트 유형 카탈로그">
          <div className="grid grid-cols-1 gap-4">
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                <div className="text-sm font-semibold text-slate-900">Select.Single.Basic</div>
              </div>
              <SelectPopover value={singleValue} onChange={setSingleValue} options={singleOptions} className="w-full" />
              <div className="mt-2 text-xs text-slate-500">선택값: {singleValue}</div>
              <UsedInPages pages={["src/components/design-system/conversation/ConversationUI.tsx", "src/app/app/agents/[id]/page.tsx"]} />
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-500" />
                <div className="text-sm font-semibold text-slate-900">Select.Single.Searchable</div>
              </div>
              <SelectPopover
                value={searchSingleValue}
                onChange={setSearchSingleValue}
                options={searchableSingleOptions}
                searchable
                className="w-full"
              />
              <div className="mt-2 text-xs text-slate-500">선택값: {searchSingleValue}</div>
              <UsedInPages pages={["src/components/design-system/conversation/ConversationUI.tsx", "src/components/design-system/conversation/ConversationUI.tsx"]} />
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-500" />
                <div className="text-sm font-semibold text-slate-900">Select.Multi.SearchBulk</div>
              </div>
              <MultiSelectPopover
                values={multiValues}
                onChange={setMultiValues}
                options={multiToolOptions}
                displayMode="count"
                showBulkActions
                className="w-full"
              />
              <div className="mt-2 text-xs text-slate-500">선택값: {selectedMultiLabel}</div>
              <UsedInPages pages={["src/components/design-system/conversation/ConversationUI.tsx", "src/components/design-system/conversation/ConversationUI.tsx"]} />
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-slate-500" />
                <div className="text-sm font-semibold text-slate-900">Select.Multi.Grouped</div>
              </div>
              <MultiSelectPopover
                values={groupedValues}
                onChange={setGroupedValues}
                options={groupedToolOptions}
                displayMode="count"
                showBulkActions
                className="w-full"
              />
              <div className="mt-2 text-xs text-slate-500">선택 개수: {groupedValues.length}</div>
              <UsedInPages pages={["src/components/SelectPopover.tsx (group 옵션 사용 시)"]} />
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <div className="text-sm font-semibold text-slate-900">Select.DateRange</div>
              </div>
              <DateRangePopover value={dateRangeValue} onChange={setDateRangeValue} />
              <div className="mt-2 text-xs text-slate-500">선택 프리셋: {dateRangeValue}</div>
              <UsedInPages pages={["src/app/app/page.tsx"]} />
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-slate-500" />
                <div className="text-sm font-semibold text-slate-900">Select.Agent (카운트 뱃지형)</div>
              </div>
              <AgentSelectPopover
                value={agentValue}
                onChange={setAgentValue}
                options={agentOptions}
                followupCountByAgent={followupByAgent}
              />
              <div className="mt-2 text-xs text-slate-500">선택값: {agentValue}</div>
              <UsedInPages pages={["src/app/app/page.tsx"]} />
            </Card>
          </div>
        </SectionBlock>
      ),
    },
    {
      key: "conversation",
      category: "conversation",
      node: (
        <SectionBlock
          id="conversation"
          title="Conversation"
          description="대화 기능의 공통 UI 패턴과 런타임 응답 스키마 기준"
        >
          <div className="grid grid-cols-1 gap-4">
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Runtime Response Schema / Render Plan (정책 기준)</div>
              <pre className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
                {`// CASE A: 이미지 카드가 있으면 카드만 노출
{
  "response_schema": {
    "message": "유사한 상품이 여러 개입니다. 번호를 선택해 주세요.",
    "ui_hints": { "view": "cards", "choice_mode": "single" },
    "quick_replies": [{ "label": "1번", "value": "1" }, { "label": "2번", "value": "2" }],
    "quick_reply_config": { "selection_mode": "single", "submit_format": "single" },
    "cards": [{ "id": "p1", "title": "원피스", "image_url": "..." }]
  },
  "render_plan": {
    "view": "cards",
    "enable_quick_replies": false,
    "enable_cards": true
  }
}

// CASE B: 이미지 카드가 없으면 텍스트 선택지만 노출
{
  "response_schema": {
    "message": "가능한 일정을 선택해 주세요.",
    "ui_hints": { "view": "choice", "choice_mode": "multi" },
    "quick_replies": [{ "label": "내일", "value": "1" }, { "label": "3일 후", "value": "2" }],
    "quick_reply_config": { "selection_mode": "multi", "submit_format": "csv" },
    "cards": []
  },
  "render_plan": {
    "view": "choice",
    "enable_quick_replies": true,
    "enable_cards": false
  }
}`}
              </pre>
              <div className="mt-2 text-xs text-slate-500">
                기준: <code>renderPolicy.ts</code>에서 노출 모드를 단일 판단(이미지 카드 존재 여부)으로 결정합니다.
              </div>
              <UsedInPages
                pages={[
                  "src/app/api/runtime/chat/policies/renderPolicy.ts",
                  "src/app/api/runtime/chat/presentation/runtimeResponseSchema.ts",
                  "src/app/api/runtime/chat/presentation/ui-responseDecorators.ts",
                  "src/app/api/runtime/chat/presentation/ui-runtimeResponseRuntime.ts",
                ]}
              />
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Runtime UI Type Catalog (Import Source)</div>
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-900">상위 유형: `text` (일반 텍스트 응답)</div>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                    <div className="text-[11px] font-semibold text-slate-700">하위 유형: `text.default`</div>
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700">
                      주문 확인되었습니다. 추가로 필요한 항목이 있으면 말씀해 주세요.
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-900">상위 유형: `choice` (텍스트 선택형)</div>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                    <div className="text-[11px] font-semibold text-slate-700">하위 레고(원자 UI): quick reply / grid / confirm</div>
                    <div className="mt-[5px]">
                      <ConversationGrid columns={3}>
                        <ConversationQuickReplyButton label="예시 1" />
                        <ConversationQuickReplyButton label="예시 2" picked />
                        <ConversationQuickReplyButton label="예시 3" />
                      </ConversationGrid>
                    </div>
                    <div className="mt-[5px] flex justify-end">
                      <ConversationConfirmButton enabled={false} disabled />
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                    <div className="text-[11px] font-semibold text-slate-700">하위 유형 C: `choice.generic` (일반 선택)</div>
                    <div className="mt-[5px]">
                      <ConversationGrid columns={RENDER_POLICY.grid_max_columns.quick_replies}>
                      {["네", "아니오", "상담원 연결"].map((label) => (
                        <ConversationQuickReplyButton key={label} label={label} />
                      ))}
                      </ConversationGrid>
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                    <div className="text-[11px] font-semibold text-slate-700">하위 유형 A: `intent_disambiguation` (표 + 선택)</div>
                    <div
                      className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700"
                      dangerouslySetInnerHTML={{ __html: intentDisambiguationHtml }}
                    />
                  </div>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                    <div className="text-[11px] font-semibold text-slate-700">
                      하위 유형 B: `lead_day` (`D-1`, `D-2`...) / grid {RENDER_POLICY.grid_max_columns.quick_replies}
                    </div>
                    <div className="mt-[5px]">
                      <ConversationGrid columns={RENDER_POLICY.grid_max_columns.quick_replies}>
                      {["D-1", "D-2", "D-3", "D-7", "D-14"].map((label) => (
                        <ConversationQuickReplyButton key={label} label={label} />
                      ))}
                      </ConversationGrid>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-900">상위 유형: `cards` (이미지 카드 선택형)</div>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                    <div className="text-[11px] font-semibold text-slate-700">하위 레고(원자 UI): product card</div>
                    <div className="mt-[5px]">
                      <ConversationGrid columns={3}>
                        <ConversationProductCard
                          item={{
                            value: "1",
                            title: "아드헬린 린넨 플레어 원피스 그레이",
                            subtitle: "03/21 입고 예정",
                            imageUrl:
                              "https://sungjy2020.cafe24.com/web/product/tiny/202509/6eb884b4e0fc90d8c8135d93eb8e7fda.jpg",
                          }}
                        />
                        <ConversationProductCard
                          picked
                          item={{
                            value: "2",
                            title: "아드헬린 린넨 롱 원피스 그레이",
                            subtitle: "02/28 입고 예정",
                            imageUrl:
                              "https://sungjy2020.cafe24.com/web/product/tiny/202509/025624c6ca8efcbd5487d14795bf601c.jpg",
                          }}
                        />
                      </ConversationGrid>
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                    <div className="text-[11px] font-semibold text-slate-700">
                      하위 유형: `restock_product_choice` / grid {RENDER_POLICY.grid_max_columns.cards}
                    </div>
                    <div className="mt-[5px]">
                      <ConversationGrid columns={RENDER_POLICY.grid_max_columns.cards}>
                        <ConversationProductCard
                          item={{
                            value: "1",
                            title: "샘플 상품 A",
                            subtitle: "03/21 입고 예정",
                          }}
                        />
                        <ConversationProductCard
                          picked
                          item={{
                            value: "2",
                            title: "샘플 상품 B",
                            subtitle: "02/28 입고 예정",
                          }}
                        />
                      </ConversationGrid>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Prompt rule source: <code>{RUNTIME_UI_PROMPT_RULES.leadDayPromptKeyword}</code>,{" "}
                <code>{RUNTIME_UI_PROMPT_RULES.intentDisambiguationKeywords.join(", ")}</code>
              </div>
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                <div className="mb-1 font-semibold text-slate-700">`render_plan.ui_type_id` 계층</div>
                {RUNTIME_UI_TYPE_HIERARCHY.map((entry) => (
                  <div key={entry.parent} className="mb-1">
                    <code>{entry.parent}</code>: {entry.children.map((child) => <code key={child} className="mr-1">{child}</code>)}
                  </div>
                ))}
              </div>
              <UsedInPages
                pages={[
                  "src/components/design-system/conversation/runtimeUiCatalog.ts",
                  "src/app/api/runtime/chat/policies/renderPolicy.ts",
                  "src/app/api/runtime/chat/presentation/ui-responseDecorators.ts",
                ]}
              />
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Integration (Import-Only)</div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <div className="font-semibold text-slate-900">`/app/laboratory` 기준 최소 import</div>
                <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-relaxed">{`import { LaboratoryPage } from "@/components/design-system/conversation/LaboratoryPage";

export default function Page() {
  return <LaboratoryPage />;
}`}</pre>
                <div className="mt-3 text-[11px] text-slate-600">
                  페이지 컴포넌트 자체에는 하드코딩이 거의 없고, 컨테이너/컨트롤러 import로 동작합니다.
                </div>
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                  현재 남아있는 최소 정책 등록 지점:
                  <br />
                  <code>src/lib/conversation/pageFeaturePolicy.ts</code>에 페이지 키 기본 정책
                  <br />
                  <code>/app/settings?tab=chat</code>에서 페이지별 override 관리
                </div>
              </div>
              <UsedInPages
                pages={[
                  "src/app/app/laboratory/page.tsx",
                  "src/app/app/laboratory/page.tsx",
                  "src/lib/conversation/client/useLaboratoryPageController.ts",
                  "src/lib/conversation/pageFeaturePolicy.ts",
                  "src/components/settings/ChatSettingsPanel.tsx",
                ]}
              />
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Independent Panel Imports</div>
              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900">설정 박스만 import</div>
                  <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-relaxed">{`import { ConversationSetupPanel, ConversationSetupFields } from "@/components/design-system";

export default function SetupOnly() {
  return (
    <ConversationSetupPanel contentClassName="p-4">
      <ConversationSetupFields {...props} />
    </ConversationSetupPanel>
  );
}`}</pre>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900">대화 박스만 import</div>
                  <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-relaxed">{`import { ConversationChatPanel, ConversationThread, ConversationReplySelectors } from "@/components/design-system";

export default function ChatOnly() {
  return (
    <ConversationChatPanel className="border border-slate-200 bg-white p-4">
      <ConversationThread {...props} />
      <ConversationReplySelectors {...props} />
    </ConversationChatPanel>
  );
}`}</pre>
                </div>
              </div>
              <UsedInPages
                pages={[
                  "src/components/design-system/conversation/panels.tsx",
                  "src/components/design-system/conversation/ConversationUI.tsx",
                  "src/components/design-system/conversation/ConversationUI.tsx",
                  "src/components/design-system/conversation/ConversationUI.tsx",
                ]}
              />
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Conversation 2-Panel Layout + Thread (실험실형)</div>
              <div className="mb-2 text-xs text-slate-500">1행: 설정 div 박스</div>
              <ConversationSplitLayout
                className="gap-3 grid-cols-1 lg:grid-cols-1"
                leftClassName="rounded-xl border border-zinc-200 bg-white"
                rightClassName="h-full"
                leftPanel={
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="border-b border-slate-200 bg-white pb-3">
                        <div className="grid w-full grid-cols-2 gap-2">
                          <button
                            type="button"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            기존 모델
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                          >
                            신규 모델
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <span>LLM 선택</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <SelectPopover
                              value={conversationLlm}
                              onChange={setConversationLlm}
                              options={singleOptions}
                              className="flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                              aria-label="LLM 정보"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <span>KB 선택</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <SelectPopover
                              value={conversationKb}
                              onChange={setConversationKb}
                              options={[
                                { id: "restock", label: "재입고" },
                                { id: "faq", label: "FAQ" },
                                { id: "shipping", label: "배송" },
                              ]}
                              className="flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                              aria-label="KB 정보"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <span>관리자 KB 선택</span>
                            <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
                              ADMIN
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <SelectPopover
                              value={conversationAdminKb}
                              onChange={setConversationAdminKb}
                              options={[
                                { id: "mk2", label: "mk2" },
                                { id: "mk2_hotfix", label: "mk2_hotfix" },
                              ]}
                              className="flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                              aria-label="관리자 KB 정보"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <span>Runtime 선택</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <SelectPopover
                              value={conversationRuntime}
                              onChange={setConversationRuntime}
                              options={[
                                { id: "core_runtime", label: "Core Runtime" },
                                { id: "laboratory_runtime", label: "Laboratory Runtime" },
                              ]}
                              className="flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                              aria-label="Route 정보"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <span>MCP 프로바이더 선택</span>
                          </div>
                          <MultiSelectPopover
                            values={conversationProviders}
                            onChange={setConversationProviders}
                            options={multiToolOptions}
                            displayMode="count"
                            showBulkActions
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <span>MCP 액션 선택</span>
                          </div>
                          <MultiSelectPopover
                            values={conversationActions}
                            onChange={setConversationActions}
                            options={groupedToolOptions}
                            displayMode="count"
                            showBulkActions
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                }
                rightPanel={
                  <div>
                    <div className="mb-2 text-xs text-slate-500">2행: 대화 div 박스</div>
                  <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="relative h-full p-4 flex flex-col overflow-visible">
                    <div className="relative flex-1 min-h-0 overflow-hidden">
                      <ConversationAdminMenu
                        className="right-2 top-2"
                        open={conversationAdminOpen}
                        onToggleOpen={() => setConversationAdminOpen((prev) => !prev)}
                        selectionEnabled={conversationSelectionEnabled}
                        onToggleSelection={() => {
                          setConversationSelectionEnabled((prev) => !prev);
                          if (conversationSelectionEnabled) setConversationSelectedMessageIds([]);
                        }}
                        showLogs={conversationShowLogs}
                        onToggleLogs={() => setConversationShowLogs((prev) => !prev)}
                        onCopyConversation={() => undefined}
                        onCopyIssue={() => undefined}
                      />
                      <div className="relative z-0 h-full overflow-auto pr-2 pl-2 pb-4 scrollbar-hide bg-slate-50 rounded-t-xl rounded-b-none pt-10">
                        <ConversationThread
                          messages={conversationSampleMessages}
                          selectedMessageIds={conversationSelectedMessageIds}
                          selectionEnabled={conversationSelectionEnabled}
                          onToggleSelection={(messageId) => {
                            setConversationSelectedMessageIds((prev) =>
                              prev.includes(messageId)
                                ? prev.filter((id) => id !== messageId)
                                : [...prev, messageId]
                            );
                          }}
                          avatarSelectionStyle="both"
                          renderContent={(msg) =>
                            msg.richHtml ? (
                              <span style={{ whiteSpace: "normal" }} dangerouslySetInnerHTML={{ __html: msg.richHtml }} />
                            ) : (
                              msg.content
                            )
                          }
                          renderMeta={(msg) =>
                            conversationShowLogs ? (
                              <div className="mt-1 text-[10px] text-slate-500">
                                role={msg.role} id={msg.id}
                              </div>
                            ) : null
                          }
                          renderAfterBubble={(msg) =>
                            msg.id === "m2" ? (
                              <div className="mt-[5px]">
                                <ConversationGrid columns={2}>
                                  <ConversationQuickReplyButton label="1번 | 재입고 일정 안내" picked disabled />
                                  <ConversationQuickReplyButton label="2번 | 일반 문의" disabled />
                                </ConversationGrid>
                              </div>
                            ) : msg.id === "m4" ? (
                              <>
                                <div className="mt-[5px]">
                                  <ConversationGrid columns={2}>
                                    <ConversationQuickReplyButton label="네" />
                                    <ConversationQuickReplyButton label="아니오" />
                                  </ConversationGrid>
                                </div>
                                <div className="mt-[5px] flex justify-end">
                                  <ConversationConfirmButton enabled={false} disabled />
                                </div>
                              </>
                            ) : null
                          }
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-white to-transparent" />
                    </div>
                    <div className="pointer-events-none absolute left-1/2 bottom-0 z-20 -translate-x-1/2 translate-y-1/2">
                      <button
                        type="button"
                        className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400 bg-white text-slate-600 hover:bg-slate-50"
                        aria-label="채팅 높이 늘리기"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    <form
                      className="relative z-20 flex gap-2 bg-white"
                      onSubmit={(event) => {
                        event.preventDefault();
                      }}
                    >
                      <Input
                        value={conversationInput}
                        onChange={(event) => setConversationInput(event.target.value)}
                        placeholder="신규 대화 질문을 입력하세요"
                        className="flex-1"
                      />
                      <Button type="submit" className="h-9 px-4" disabled={!conversationInput.trim()}>
                        <Send className="mr-2 h-4 w-4" />
                        전송
                      </Button>
                    </form>
                  </div>
                  </div>
                  </div>
                }
              />
              <UsedInPages
                pages={[
                  "src/components/design-system/conversation/panels.tsx",
                  "src/components/design-system/conversation/ConversationUI.tsx",
                  "src/components/design-system/conversation/ConversationUI.tsx",
                  "src/components/design-system/conversation/ConversationUI.tsx",
                ]}
              />
            </Card>

          </div>
        </SectionBlock>
      ),
    },
    {
      key: "display",
      category: "display",
      node: (
        <SectionBlock id="display" title="Display" description="리스트/테이블/스켈레톤/정보 카드 패턴">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Review Queue Item List</CardTitle>
                <CardDescription>후속 지원 요청 카드 반복 형태</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold text-slate-900">rq_{100 + n}</div>
                      <Badge variant="amber">배송지 변경</Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">2026-02-10 · 미배정</div>
                  </div>
                ))}
                <UsedInPages pages={["src/components/HelpPanel.tsx", "src/app/app/review/page.tsx"]} />
              </CardContent>
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">테이블 헤더 + 스크롤 바디 패턴</div>
              <div className="max-h-52 overflow-auto rounded-xl border border-slate-200">
                <div className="sticky top-0 z-10 grid grid-cols-[120px_1fr_80px] bg-white px-2 py-2 text-[11px] font-semibold text-slate-500">
                  <span>ID</span>
                  <span>설명</span>
                  <span className="text-right">상태</span>
                </div>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="grid grid-cols-[120px_1fr_80px] border-t border-slate-100 px-2 py-2 text-xs text-slate-700">
                    <span>tool_{n}</span>
                    <span className="truncate">샘플 설명 텍스트 {n}</span>
                    <span className="text-right">활성</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
              <UsedInPages pages={["src/app/app/rules/page.tsx", "src/components/DiffViewer.tsx"]} />
            </Card>
          </div>
        </SectionBlock>
      ),
    },
    {
      key: "feedback",
      category: "feedback",
      node: (
        <SectionBlock id="feedback" title="Feedback" description="상태 배너/에러/성공 메시지 패턴">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <StateBanner tone="info" title="정보 안내" description="설정값이 기본값으로 동작 중입니다." />
              <UsedInPages pages={["src/app/app/settings/page.tsx"]} />
            </div>
            <div>
              <StateBanner tone="success" title="저장 완료" description="대화 설정이 정상적으로 저장되었습니다." />
              <UsedInPages pages={["src/components/settings/ChatSettingsPanel.tsx"]} />
            </div>
            <div>
              <StateBanner tone="warning" title="주의 필요" description="카페24 토큰 만료가 임박했습니다." />
              <UsedInPages pages={["src/app/app/page.tsx", "src/app/app/settings/page.tsx"]} />
            </div>
            <div>
              <StateBanner tone="danger" title="오류 발생" description="세션 데이터를 불러오지 못했습니다." />
              <UsedInPages pages={["src/app/app/page.tsx", "src/app/app/rules/page.tsx"]} />
            </div>
          </div>
        </SectionBlock>
      ),
    },
    {
      key: "overlay",
      category: "overlay",
      node: (
        <SectionBlock id="overlay" title="Overlay" description="모달/드롭다운/드로어 레이어 패턴">
          <Card className="p-4">
            <OverlayShell />
            <UsedInPages pages={["src/components/design-system/shells.tsx", "src/components/MobileDrawer.tsx", "src/components/settings/ChatSettingsPanel.tsx", "src/app/app/page.tsx"]} />
          </Card>
        </SectionBlock>
      ),
    },
    {
      key: "navigation",
      category: "navigation",
      node: (
        <SectionBlock id="navigation" title="Navigation" description="사이드바 링크/탭형 선택 패턴">
          <div className="grid grid-cols-1 gap-4">
            <Card className="p-4">
              <SidebarNavigationShell />
              <UsedInPages pages={["src/components/design-system/shells.tsx", "src/components/AppSidebar.tsx"]} />
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Step / Tab Selector Pattern</div>
              <div className="grid grid-cols-3 gap-2">
                <button className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900">
                  기존 모델
                </button>
                <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  신규 모델
                </button>
                <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  히스토리
                </button>
              </div>
              <div className="mt-3 text-xs text-slate-500">실험실/설정 페이지에서 반복되는 세그먼트 선택 UI</div>
              <UsedInPages pages={["src/components/design-system/conversation/ConversationUI.tsx", "src/components/settings/ChatSettingsPanel.tsx"]} />
            </Card>

            <Card className="p-4">
              <TopHeaderShell />
              <UsedInPages pages={["src/components/design-system/shells.tsx", "src/components/AppHeader.tsx", "src/components/ProfileMenu.tsx"]} />
            </Card>
          </div>
        </SectionBlock>
      ),
    },
    {
      key: "icon",
      category: "icon",
      node: (
        <SectionBlock
          id="icon"
          title="Icon"
          description="lucide-react 아이콘 전체 목록. 이름 검색 후 선택/사용 가능합니다."
        >
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
              <Input
                placeholder="아이콘 이름 검색 (예: Search, Phone, Calendar)"
                value={iconSearch}
                onChange={(e) => {
                  setIconSearch(e.target.value);
                  setIconPage(1);
                }}
              />
              <div className="text-xs text-slate-500">
                총 <span className="font-semibold text-slate-700">{filteredIconEntries.length}</span> /{" "}
                {lucideIconEntries.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeIconPage <= 1}
                  onClick={() => setIconPage((p) => Math.max(1, p - 1))}
                >
                  이전
                </Button>
                <span className="text-xs text-slate-500">
                  {safeIconPage} / {iconTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeIconPage >= iconTotalPages}
                  onClick={() => setIconPage((p) => Math.min(iconTotalPages, p + 1))}
                >
                  다음
                </Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {iconPageEntries.map(([name, IconComp]) => {
                const IconItem = IconComp as ComponentType<{ className?: string }>;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(name)}
                    className="flex w-full items-center justify-start gap-[10px] rounded-xl border border-slate-200 bg-white p-2 text-left hover:bg-slate-50"
                    title={`${name} (클릭 시 이름 복사)`}
                  >
                    <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                      <IconItem className="h-[15px] w-[15px] text-slate-700" />
                    </div>
                    <div className="min-w-0 truncate text-[11px] font-medium text-slate-700">{name}</div>
                  </button>
                );
              })}
            </div>
            <UsedInPages pages={["lucide-react (전체 export)", "src/components/AppSidebar.tsx", "src/components/AppHeader.tsx"]} />
          </Card>
        </SectionBlock>
      ),
    },
  ];

  const visibleSections = sections.filter((section) => activeCategory === "all" || section.category === activeCategory);

  return (
    <div className="px-5 py-6 md:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Design System Playground</h1>
          <p className="mt-1 text-sm text-slate-500">
            서비스 전역 반복 UI를 카테고리별로 확인하는 기준 페이지입니다.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            모든 샘플은 <code>@/components/design-system</code> 경유 import 기준으로 정리됩니다.
          </p>
        </div>

        <div className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            {categoryLabels.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveCategory(item.key)}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                  activeCategory === item.key
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">{visibleSections.map((section) => <div key={section.key}>{section.node}</div>)}</div>

        <Card className="p-4">
          <div className="text-sm font-semibold text-slate-900">정리 원칙</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li>컴포넌트 신규 추가/변경은 design-system 모듈 중심으로 진행</li>
            <li>페이지에서는 가능하면 직접 class 조합보다 design-system 조합 사용</li>
            <li>전역 반영이 필요한 UI는 먼저 이 페이지에 샘플로 등록 후 적용</li>
          </ul>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            기준점 페이지 구축 완료
          </div>
        </Card>
      </div>
    </div>
  );
}











