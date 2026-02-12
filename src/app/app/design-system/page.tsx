"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode, type FormEvent } from "react";
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
  ConversationAdminMenu,
  ConversationModelChatColumnLego,
  ConversationModelComposedLego,
  ConversationModelSetupColumnLego,
  ConversationReplySelectors,
  ConversationSessionHeader,
  ConversationSetupBox,
  ConversationSetupFields,
  ConversationThread,
  ConversationWorkbenchTopBar,
  createConversationModelLegos,
  OverlayShell,
  PageActionBarShell,
  SidebarNavigationShell,
  TopHeaderShell,
  TypographyScaleShell,
  WidgetShell,
  type WidgetMessage,
  type SelectOption,
} from "@/components/design-system";
import {
  ConversationExistingSetup,
  ConversationNewModelControls,
} from "@/components/design-system/conversation/ConversationUI.parts";
import * as LucideIcons from "lucide-react";
import {
  Bot,
  CalendarDays,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RENDER_POLICY } from "@/app/api/runtime/chat/policies/renderPolicy";
import {
  getDefaultConversationPageFeatures,
  resolveConversationSetupUi,
} from "@/lib/conversation/pageFeaturePolicy";
import {
  createDefaultModel,
  type ChatMessage,
  type ModelState,
} from "@/lib/conversation/client/laboratoryPageState";
import type { InlineKbSampleItem } from "@/lib/conversation/inlineKbSamples";

type CategoryKey =
  | "all"
  | "foundation"
  | "action"
  | "input"
  | "select"
  | "conversation"
  | "widget"
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
  { key: "widget", label: "Widget" },
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

const demoAgentGroupOptions: SelectOption[] = [{ id: "grp_restock", label: "재입고 그룹" }];
const demoLlmOptions: SelectOption[] = [
  { id: "chatgpt", label: "chatgpt" },
  { id: "gemini", label: "gemini" },
];
const demoKbOptions: SelectOption[] = [
  { id: "restock", label: "재입고", description: "재입고 문의 응답 KB" },
  { id: "shipping", label: "배송", description: "배송 정책 KB" },
];
const demoAdminKbOptions: SelectOption[] = [
  { id: "mk2", label: "mk2", description: "운영 관리자 KB" },
  { id: "mk2_hotfix", label: "mk2_hotfix", description: "긴급 핫픽스 KB" },
];
const demoProviderOptions: SelectOption[] = [
  { id: "cafe24", label: "Cafe24" },
  { id: "runtime", label: "Runtime" },
];
const demoRouteOptions: SelectOption[] = [
  { id: "core_runtime", label: "Core Runtime" },
  { id: "laboratory_runtime", label: "Laboratory Runtime" },
];
const demoToolOptions: SelectOption[] = [
  { id: "list_orders", label: "list_orders", description: "주문 목록 조회" },
  { id: "restock_lite", label: "restock_lite", description: "재입고 런타임 액션" },
];
const demoTools = [
  { id: "list_orders", provider: "cafe24", name: "list_orders", description: "주문 목록 조회" },
  { id: "restock_lite", provider: "runtime", name: "restock_lite", description: "재입고 런타임 액션" },
];
const demoToolById = new Map(demoTools.map((tool) => [tool.id, tool]));
const demoProviderByKey = new Map<string, { title: string }>([
  ["cafe24", { title: "Cafe24" }],
  ["runtime", { title: "Runtime" }],
]);
const demoAgentVersionsByGroup = new Map([
  [
    "grp_restock",
    [
      { id: "agent_v1", name: "재입고 상담 에이전트", version: "v1.2.0", is_active: true },
      { id: "agent_v0", name: "재입고 상담 에이전트", version: "v1.1.4", is_active: false },
    ],
  ],
]);
const demoInlineKbSamples: InlineKbSampleItem[] = [
  { id: "policy-tone", title: "톤앤매너", content: "고객 응대는 공손한 존댓말을 사용합니다." },
  { id: "policy-return", title: "반품 정책", content: "상품 수령 후 7일 이내 반품 접수가 가능합니다." },
];
const demoKbItems = [
  { id: "restock", title: "재입고", content: "재입고 관련 QA", applies_to_user: true },
  { id: "mk2", title: "mk2", content: "관리자 전용 지식", applies_to_user: false, is_admin: true },
];

type ConversationReplyDemoMessage = {
  id: string;
  role: "user" | "bot";
  quickReplies?: Array<{ label: string; value: string }>;
  productCards?: Array<{ id: string; value: string; title: string; subtitle?: string; imageUrl?: string }>;
  renderPlan?: {
    view: "choice" | "cards" | "text";
    enable_quick_replies?: boolean;
    enable_cards?: boolean;
    selection_mode?: "single" | "multi";
    interaction_scope?: "latest_only" | "any";
    grid_columns?: { quick_replies?: number; cards?: number };
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
  };
};

type DemoSection = {
  key: string;
  category: Exclude<CategoryKey, "all">;
  node: ReactNode;
};

type DefinitionCatalogItem = {
  name: string;
  sourceLine: number;
  note: string;
};

const CONVERSATION_PARTS_FILE = "src/components/design-system/conversation/ConversationUI.parts.tsx";
const COVERAGE_HIDDEN_NAMES = new Set<string>([
  "ConversationWorkbenchTopBar",
  "ConversationSessionHeader",
  "ConversationSetupBox",
  "ConversationAdminMenu",
  "ConversationThread",
  "ConversationReplySelectors",
  "ConversationSetupFields",
  "ConversationExistingSetup",
  "ConversationNewModelControls",
  "createConversationModelLegos",
  "ConversationModelSetupColumnLego",
  "ConversationModelChatColumnLego",
  "ConversationModelComposedLego",
]);

const conversationDefinitionGroups: Array<{ label: string; items: DefinitionCatalogItem[] }> = [
  {
    label: "기본 메시지 / 스레드 관련",
    items: [
      { name: "BaseMessage", sourceLine: 263, note: "스레드 메시지 최소 타입" },
      { name: "AvatarSelectionStyle", sourceLine: 265, note: "avatar 표시/선택 스타일 타입" },
      { name: "ThreadProps", sourceLine: 267, note: "ConversationThread props 계약" },
    ],
  },
  {
    label: "어드민 메뉴",
    items: [{ name: "AdminMenuProps", sourceLine: 164, note: "ConversationAdminMenu props 계약" }],
  },
  {
    label: "Reply / Interaction 관련",
    items: [
      { name: "QuickReply", sourceLine: 610, note: "quick reply item 타입" },
      { name: "ProductCard", sourceLine: 611, note: "product card item 타입" },
      { name: "RenderPlan", sourceLine: 612, note: "응답 렌더 계획 타입(view/selection/grid)" },
      { name: "ReplyMessageShape", sourceLine: 625, note: "ConversationReplySelectors 메시지 계약" },
      { name: "ReplyProps", sourceLine: 633, note: "ConversationReplySelectors props 계약" },
    ],
  },
  {
    label: "Setup(설정) 관련",
    items: [
      { name: "SetupFieldsProps", sourceLine: 361, note: "ConversationSetupFields props 계약" },
      { name: "ConversationExistingMode", sourceLine: 805, note: "existing 모드 타입(history/edit/new)" },
      { name: "ConversationSetupMode", sourceLine: 806, note: "setup 모드 타입(existing/new)" },
      { name: "ConversationExistingSetupProps", sourceLine: 808, note: "ConversationExistingSetup props 계약" },
      { name: "ConversationNewModelControlsProps", sourceLine: 1081, note: "ConversationNewModelControls props 계약" },
    ],
  },
  {
    label: "Model / Card / Lego 관련",
    items: [
      { name: "ConversationModelMode", sourceLine: 1473, note: "Model 대화 모드 타입" },
      { name: "ConversationModelKbItem", sourceLine: 1474, note: "KB 아이템 타입" },
      { name: "ConversationModelToolShape", sourceLine: 1483, note: "MCP 도구 타입" },
      { name: "ConversationModelAgentVersionItem", sourceLine: 1530, note: "에이전트 버전 타입" },
      { name: "ConversationModelStateLike", sourceLine: 1490, note: "ModelCard 상태 계약" },
      { name: "ConversationModelCardProps", sourceLine: 1537, note: "ConversationModelCard props 계약" },
      { name: "ConversationModelSetupColumnLegoProps", sourceLine: 1592, note: "좌측 Setup Lego props 계약" },
      { name: "ConversationModelChatColumnLegoProps", sourceLine: 1808, note: "우측 Chat Lego props 계약" },
      { name: "ConversationModelLegoAssembly", sourceLine: 1909, note: "조립 결과 타입(setup/chat/visibleMessages)" },
    ],
  },
  {
    label: "조립 / 헬퍼 함수",
    items: [
      { name: "createConversationModelLegos", sourceLine: 1916, note: "모델 레고용 props/파생 데이터 조립 함수" },
      { name: "parseLeadDayValue", sourceLine: 647, note: "D-1 같은 값에서 숫자 리드데이 추출" },
    ],
  },
  {
    label: "내부 전용 컴포넌트",
    items: [{ name: "AdminBadge", sourceLine: 411, note: "ADMIN 뱃지(ConversationSetupFields 내부 사용)" }],
  },
  {
    label: "UI 컴포넌트",
    items: [
      { name: "ConversationSetupBox", sourceLine: 30, note: "설정 패널 래퍼 컴포넌트" },
      { name: "ConversationSetupFields", sourceLine: 419, note: "설정 필드 조립(LLM/MCP/인라인KB)" },
      { name: "ConversationExistingSetup", sourceLine: 842, note: "기존 모델 설정 블록" },
      { name: "ConversationNewModelControls", sourceLine: 1114, note: "신규 모델 설정 블록" },
      { name: "ConversationModelSetupColumnLego", sourceLine: 1637, note: "모델 좌측 설정 레고" },
      { name: "ConversationAdminMenu", sourceLine: 181, note: "로그/선택/복사 어드민 메뉴" },
      { name: "ConversationThread", sourceLine: 283, note: "메시지 스레드 렌더러" },
      { name: "ConversationReplySelectors", sourceLine: 654, note: "quick reply / cards 선택 및 confirm" },
      { name: "ConversationModelChatColumnLego", sourceLine: 1843, note: "모델 우측 채팅 레고(단일 채팅 UI 포함)" },
      { name: "ConversationModelComposedLego", sourceLine: 1893, note: "좌/우 레고 조합 레이아웃" },
      { name: "ConversationSessionHeader", sourceLine: 96, note: "세션 헤더(세션 ID/삭제/새탭)" },
      { name: "ConversationWorkbenchTopBar", sourceLine: 48, note: "워크벤치 상태/액션 상단 바" },
    ],
  },
];

function UsedInPages({ pages }: { pages: string[] }) {
  const uniquePages = Array.from(new Set(pages));
  return (
    <div className="mt-3 text-[11px] text-slate-500">
      <div className="mb-1">사용 페이지:</div>
      <div className="space-y-1">
        {uniquePages.map((page) => (
          <div key={page}>
            <code>{page}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function DependencyMeta({
  type,
  name,
  depends,
  role,
  returns,
  definedAt,
}: {
  type: string;
  name: string;
  depends?: string;
  role?: string;
  returns?: string;
  definedAt?: string;
}) {
  return (
    <div className="mb-2 rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-700">
      <div>
        <span className="font-semibold text-slate-900">type:</span> {type}
      </div>
      <div>
        <span className="font-semibold text-slate-900">name:</span> {name}
      </div>
      <div>
        <span className="font-semibold text-slate-900">depends:</span> {depends && depends.trim().length > 0 ? depends : "none"}
      </div>
      {returns ? (
        <div>
          <span className="font-semibold text-slate-900">returns:</span> {returns}
        </div>
      ) : null}
      {definedAt ? (
        <div>
          <span className="font-semibold text-slate-900">defined at:</span> <code>{definedAt}</code>
        </div>
      ) : null}
      {role ? (
        <div>
          <span className="font-semibold text-slate-900">role:</span> {role}
        </div>
      ) : null}
    </div>
  );
}

function getDefinitionMeta(item: DefinitionCatalogItem, groupLabel: string): {
  type: string;
  depends: string;
  returns?: string;
} {
  const byName: Record<string, { type: string; depends: string; returns?: string }> = {
    ConversationSetupBox: { type: "UI Component", depends: "ConversationSetupPanel" },
    ConversationWorkbenchTopBar: { type: "UI Component", depends: "none" },
    ConversationSessionHeader: { type: "UI Component", depends: "none" },
    ConversationAdminMenu: { type: "UI Component", depends: "AdminMenuProps" },
    ConversationThread: { type: "UI Component", depends: "BaseMessage, AvatarSelectionStyle, ThreadProps" },
    ConversationSetupFields: { type: "UI Component", depends: "SetupFieldsProps, AdminBadge" },
    ConversationReplySelectors: { type: "UI Component", depends: "QuickReply, ProductCard, RenderPlan, ReplyMessageShape, ReplyProps, parseLeadDayValue" },
    ConversationExistingSetup: { type: "UI Component", depends: "ConversationExistingMode, ConversationSetupMode, ConversationExistingSetupProps" },
    ConversationNewModelControls: { type: "UI Component", depends: "ConversationNewModelControlsProps" },
    ConversationModelSetupColumnLego: { type: "UI Component", depends: "ConversationModelSetupColumnLegoProps" },
    ConversationModelChatColumnLego: { type: "UI Component", depends: "ConversationModelChatColumnLegoProps, ConversationAdminMenu, ConversationThread, ConversationReplySelectors" },
    ConversationModelComposedLego: { type: "UI Component", depends: "ConversationModelSetupColumnLego, ConversationModelChatColumnLego" },
    createConversationModelLegos: {
      type: "Helper Function",
      depends: "ConversationModelCardProps, model state, feature flags, handler callbacks",
      returns: "ConversationModelLegoAssembly",
    },
    parseLeadDayValue: { type: "Helper Function", depends: "string input format parser", returns: "number | null" },
    AdminBadge: { type: "Internal Component", depends: "ConversationSetupFields" },
    BaseMessage: { type: "Type Alias", depends: "ConversationThread" },
    AvatarSelectionStyle: { type: "Type Alias", depends: "ConversationThread" },
    ThreadProps: { type: "Type Alias", depends: "ConversationThread" },
    AdminMenuProps: { type: "Type Alias", depends: "ConversationAdminMenu" },
    SetupFieldsProps: { type: "Type Alias", depends: "ConversationSetupFields" },
    ConversationExistingMode: { type: "Type Alias", depends: "ConversationExistingSetup" },
    ConversationSetupMode: { type: "Type Alias", depends: "ConversationExistingSetup" },
    ConversationExistingSetupProps: { type: "Type Alias", depends: "ConversationExistingSetup" },
    ConversationNewModelControlsProps: { type: "Type Alias", depends: "ConversationNewModelControls" },
    QuickReply: { type: "Type Alias", depends: "ConversationReplySelectors" },
    ProductCard: { type: "Type Alias", depends: "ConversationReplySelectors" },
    RenderPlan: { type: "Type Alias", depends: "ConversationReplySelectors" },
    ReplyMessageShape: { type: "Type Alias", depends: "ConversationReplySelectors" },
    ReplyProps: { type: "Type Alias", depends: "ConversationReplySelectors" },
    ConversationModelMode: { type: "Type Alias", depends: "ConversationModelCardProps" },
    ConversationModelKbItem: { type: "Type Alias", depends: "ConversationModelCardProps" },
    ConversationModelToolShape: { type: "Type Alias", depends: "ConversationModelCardProps" },
    ConversationModelStateLike: { type: "Type Alias", depends: "ConversationModelCardProps, createConversationModelLegos" },
    ConversationModelAgentVersionItem: { type: "Type Alias", depends: "ConversationModelCardProps" },
    ConversationModelCardProps: { type: "Type Alias", depends: "createConversationModelLegos" },
    ConversationModelSetupColumnLegoProps: { type: "Type Alias", depends: "ConversationModelSetupColumnLego" },
    ConversationModelChatColumnLegoProps: { type: "Type Alias", depends: "ConversationModelChatColumnLego" },
    ConversationModelLegoAssembly: { type: "Type Alias", depends: "createConversationModelLegos" },
  };

  const found = byName[item.name];
  if (found) return found;
  return { type: groupLabel, depends: "none" };
}

function findConversationDefinition(name: string): { groupLabel: string; item: DefinitionCatalogItem } | null {
  for (const group of conversationDefinitionGroups) {
    const item = group.items.find((entry) => entry.name === name);
    if (item) return { groupLabel: group.label, item };
  }
  return null;
}

function getConversationDepends(name: string): string {
  const found = findConversationDefinition(name);
  if (!found) return "";
  const meta = getDefinitionMeta(found.item, found.groupLabel);
  return meta.depends || "";
}

function sortConversationEntries<T extends { name: string }>(items: T[]): T[] {
  const indexByName = new Map(items.map((item, idx) => [item.name, idx]));
  const dependsByName = new Map(
    items.map((item) => [
      item.name,
      getConversationDepends(item.name)
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ])
  );
  const inDegree = new Map<string, number>();
  const edges = new Map<string, Set<string>>();

  items.forEach((item) => {
    inDegree.set(item.name, 0);
    edges.set(item.name, new Set());
  });

  items.forEach((item) => {
    const deps = dependsByName.get(item.name) || [];
    deps.forEach((dep) => {
      if (!indexByName.has(dep)) return;
      edges.get(dep)?.add(item.name);
      inDegree.set(item.name, (inDegree.get(item.name) || 0) + 1);
    });
  });

  const queue = items
    .map((item) => item.name)
    .filter((name) => (inDegree.get(name) || 0) === 0)
    .sort((a, b) => (indexByName.get(a) || 0) - (indexByName.get(b) || 0));

  const ordered: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    ordered.push(current);
    const nextSet = edges.get(current);
    if (!nextSet) continue;
    nextSet.forEach((next) => {
      inDegree.set(next, (inDegree.get(next) || 0) - 1);
      if ((inDegree.get(next) || 0) === 0) {
        queue.push(next);
        queue.sort((a, b) => (indexByName.get(a) || 0) - (indexByName.get(b) || 0));
      }
    });
  }

  if (ordered.length !== items.length) {
    return items.slice();
  }

  const byName = new Map(items.map((item) => [item.name, item]));
  return ordered.map((name) => byName.get(name)!).filter(Boolean);
}

function renderConversationDefinitionMeta(name: string) {
  const found = findConversationDefinition(name);
  if (!found) return <DependencyMeta type="Unknown" name={name} depends="none" />;
  const meta = getDefinitionMeta(found.item, found.groupLabel);
  return (
    <DependencyMeta
      type={meta.type}
      name={found.item.name}
      depends={meta.depends}
      returns={meta.returns}
      role={found.item.note}
      definedAt={`${CONVERSATION_PARTS_FILE}:${found.item.sourceLine}`}
    />
  );
}


function formatDemoKstDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR", { hour12: false, timeZone: "Asia/Seoul" });
}

function createDemoModelState(): ModelState {
  const base = createDefaultModel();
  const historyMessages: ChatMessage[] = [
    {
      id: "h1",
      role: "user",
      content: "코트 재입고 일정 알려줘",
    },
    {
      id: "h2",
      role: "bot",
      content: "옵션을 선택해 주세요.",
      quickReplies: [
        { label: "3일 이내", value: "3" },
        { label: "7일 이내", value: "7" },
      ],
      renderPlan: {
        view: "choice",
        enable_quick_replies: true,
        enable_cards: false,
        interaction_scope: "any",
        quick_reply_source: { type: "explicit" },
        selection_mode: "single",
        min_select: 1,
        max_select: 1,
        submit_format: "single",
        grid_columns: { quick_replies: 2, cards: 2 },
        prompt_kind: "lead_day",
      },
    },
  ];
  const messages: ChatMessage[] = [
    {
      id: "n1",
      role: "bot",
      content: "추천 상품입니다.",
      productCards: [
        { id: "p1", value: "1", title: "샘플 상품 A", subtitle: "03/21 입고 예정" },
        { id: "p2", value: "2", title: "샘플 상품 B", subtitle: "02/28 입고 예정" },
      ],
      renderPlan: {
        view: "cards",
        enable_quick_replies: false,
        enable_cards: true,
        interaction_scope: "any",
        quick_reply_source: { type: "none" },
        selection_mode: "single",
        min_select: 1,
        max_select: 1,
        submit_format: "single",
        grid_columns: { quick_replies: 2, cards: 2 },
        prompt_kind: "restock_product_choice",
      },
    },
  ];
  return {
    ...base,
    id: "demo-model-1",
    config: {
      ...base.config,
      llm: "chatgpt",
      kbId: "restock",
      adminKbIds: ["mk2"],
      mcpProviderKeys: ["cafe24", "runtime"],
      mcpToolIds: ["list_orders", "restock_lite"],
      route: "core_runtime",
      inlineKb: "고객 톤 가이드를 우선 적용합니다.",
    },
    setupMode: "new",
    selectedAgentGroupId: "grp_restock",
    selectedAgentId: "agent_v1",
    sessions: [{ id: "s1", session_code: "sess-demo-001", started_at: "2026-02-11T09:00:00.000Z", agent_id: "agent_v1" }],
    selectedSessionId: "s1",
    sessionId: "s1",
    historyMessages,
    messages,
    conversationMode: "new",
    input: "",
    adminLogControlsOpen: true,
    showAdminLogs: true,
    chatSelectionEnabled: false,
  };
}

function buildWidgetId() {
  return `widget_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function DesignSystemContent() {
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
  const [conversationQuickReplyDrafts, setConversationQuickReplyDrafts] = useState<Record<string, string[]>>({});
  const [conversationLockedReplySelections, setConversationLockedReplySelections] = useState<Record<string, string[]>>({});

  const [workbenchWsStatus, setWorkbenchWsStatus] = useState<"CONNECTED" | "DISCONNECTED">("CONNECTED");
  const [sessionHeaderSessionId, setSessionHeaderSessionId] = useState<string | null>("sess-demo-001");
  const [demoSetupFieldLlm, setDemoSetupFieldLlm] = useState("chatgpt");
  const [demoSetupFieldProviders, setDemoSetupFieldProviders] = useState<string[]>(["cafe24", "runtime"]);
  const [demoSetupFieldActions, setDemoSetupFieldActions] = useState<string[]>(["list_orders"]);
  const [demoSetupFieldInlineKb, setDemoSetupFieldInlineKb] = useState("고객 응대는 존댓말로 진행");
  const [demoSetupExistingMode, setDemoSetupExistingMode] = useState<"existing" | "new">("existing");
  const [demoConversationMode, setDemoConversationMode] = useState<"history" | "edit" | "new">("history");
  const [demoSelectedAgentGroupId, setDemoSelectedAgentGroupId] = useState("grp_restock");
  const [demoSelectedAgentId, setDemoSelectedAgentId] = useState("agent_v1");
  const [demoSelectedSessionId, setDemoSelectedSessionId] = useState<string | null>("s1");
  const [demoNewModelKb, setDemoNewModelKb] = useState("restock");
  const [demoNewModelAdminKb, setDemoNewModelAdminKb] = useState<string[]>(["mk2"]);
  const [demoNewModelRoute, setDemoNewModelRoute] = useState("core_runtime");
  const [demoKbInfoOpen, setDemoKbInfoOpen] = useState(false);
  const [demoAdminKbInfoOpen, setDemoAdminKbInfoOpen] = useState(false);
  const [demoRouteInfoOpen, setDemoRouteInfoOpen] = useState(false);
  const [demoModel, setDemoModel] = useState<ModelState>(() => createDemoModelState());
  const [demoQuickReplyDrafts, setDemoQuickReplyDrafts] = useState<Record<string, string[]>>({});
  const [demoLockedReplySelections, setDemoLockedReplySelections] = useState<Record<string, string[]>>({});

  const [iconSearch, setIconSearch] = useState("");
  const [iconPage, setIconPage] = useState(1);

  const [widgetBrandName, setWidgetBrandName] = useState("Mejai");
  const [widgetStatus, setWidgetStatus] = useState("연결됨");
  const [widgetIconUrl, setWidgetIconUrl] = useState("/logo.png");
  const [widgetGreeting, setWidgetGreeting] = useState("안녕하세요. 무엇을 도와드릴까요?");
  const [widgetPlaceholder, setWidgetPlaceholder] = useState("메시지를 입력하세요");
  const [widgetDisclaimer, setWidgetDisclaimer] = useState("");
  const [widgetInputValue, setWidgetInputValue] = useState("");
  const [widgetMessages, setWidgetMessages] = useState<WidgetMessage[]>(() => [
    { id: buildWidgetId(), role: "bot", content: "안녕하세요. 무엇을 도와드릴까요?" },
  ]);

  useEffect(() => {
    setWidgetMessages((prev) => {
      if (prev.length === 0) {
        return [{ id: buildWidgetId(), role: "bot", content: widgetGreeting }];
      }
      if (prev.length === 1 && prev[0].role === "bot") {
        return [{ ...prev[0], content: widgetGreeting }];
      }
      return prev;
    });
  }, [widgetGreeting]);

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

  const handleWidgetSend = (event: FormEvent) => {
    event.preventDefault();
    const text = widgetInputValue.trim();
    if (!text) return;
    setWidgetInputValue("");
    setWidgetMessages((prev) => [
      ...prev,
      { id: buildWidgetId(), role: "user", content: text },
      { id: buildWidgetId(), role: "bot", content: "샘플 응답입니다. 실제 위젯에서는 응답이 이어집니다." },
    ]);
  };

  const handleWidgetReset = () => {
    setWidgetMessages([{ id: buildWidgetId(), role: "bot", content: widgetGreeting }]);
  };

  const conversationLeadDayMessage: ConversationReplyDemoMessage = {
    id: "catalog-choice-lead-day",
    role: "bot",
    quickReplies: ["D-1", "D-2", "D-3", "D-7", "D-14"].map((value) => ({ label: value, value })),
    renderPlan: {
      view: "choice",
      enable_quick_replies: true,
      selection_mode: "single",
      interaction_scope: "any",
      grid_columns: { quick_replies: RENDER_POLICY.grid_max_columns.quick_replies },
      submit_format: "single",
    },
  };
  const parseLeadDayValueExamples = ["D-1", "D-14", "lead_7days", "x", ""].map((value) => {
    const m = String(value || "").match(/\d+/);
    const parsed = m ? Number(m[0]) : null;
    const normalized = Number.isFinite(parsed) && Number(parsed) > 0 ? Number(parsed) : null;
    return { value, parsed: normalized };
  });

  const demoPageFeatures = useMemo(() => getDefaultConversationPageFeatures("/app/laboratory"), []);
  const demoSetupUi = useMemo(() => resolveConversationSetupUi("/app/laboratory"), []);
  const demoVersionOptions = useMemo(() => {
    return (demoAgentVersionsByGroup.get(demoSelectedAgentGroupId) || []).map((item) => ({
      id: item.id,
      label: `${item.is_active ? "🟢 " : "⚪ "}${item.version || "-"} (${item.name || item.id})`,
    }));
  }, [demoSelectedAgentGroupId]);
  const demoSessionOptions = useMemo(
    () =>
      demoModel.sessions.map((session) => ({
        id: session.id,
        label: session.session_code || session.id,
        description: formatDemoKstDateTime(session.started_at),
      })),
    [demoModel.sessions]
  );
  const updateDemoModel = (updater: (prev: ModelState) => ModelState) => {
    setDemoModel((prev) => updater(prev));
  };

  const demoAssemblyProps: Parameters<typeof createConversationModelLegos>[0] = {
    index: 0,
    modelCount: 1,
    model: demoModel,
    pageFeatures: demoPageFeatures,
    setupUi: demoSetupUi,
    isAdminUser: true,
    latestAdminKbId: "mk2",
    tools: demoTools,
    toolOptions: demoToolOptions,
    toolById: demoToolById,
    providerByKey: demoProviderByKey,
    agentVersionsByGroup: demoAgentVersionsByGroup,
    formatKstDateTime: formatDemoKstDateTime,
    agentGroupOptions: demoAgentGroupOptions,
    llmOptions: demoLlmOptions,
    kbOptions: demoKbOptions,
    adminKbOptions: demoAdminKbOptions,
    providerOptions: demoProviderOptions,
    routeOptions: demoRouteOptions,
    kbItems: demoKbItems,
    inlineKbSamples: demoInlineKbSamples,
    quickReplyDrafts: demoQuickReplyDrafts,
    lockedReplySelections: demoLockedReplySelections,
    setQuickReplyDrafts: setDemoQuickReplyDrafts,
    setLockedReplySelections: setDemoLockedReplySelections,
    onRemoveModel: () => undefined,
    onCopySessionId: (sessionId) => {
      setSessionHeaderSessionId(sessionId);
    },
    onOpenSessionInNewTab: () => undefined,
    onDeleteSession: () => {
      updateDemoModel((prev) => ({ ...prev, selectedSessionId: null, sessionId: null }));
    },
    onUpdateModel: (_id, updater) => {
      updateDemoModel((prev) => updater(prev));
    },
    onResetModel: () => undefined,
    onSelectAgentGroup: (_id, groupId) => {
      updateDemoModel((prev) => ({ ...prev, selectedAgentGroupId: groupId }));
    },
    onSelectAgentVersion: (_id, agentId) => {
      updateDemoModel((prev) => ({ ...prev, selectedAgentId: agentId }));
    },
    onSelectSession: (_id, sessionId) => {
      updateDemoModel((prev) => ({ ...prev, selectedSessionId: sessionId, sessionId }));
    },
    onSearchSessionById: (_id, sessionId) => {
      updateDemoModel((prev) => ({ ...prev, selectedSessionId: sessionId, sessionId }));
    },
    onChangeConversationMode: (_id, mode) => {
      updateDemoModel((prev) => ({ ...prev, conversationMode: mode }));
    },
    onCopyConversation: () => undefined,
    onCopyIssue: () => undefined,
    onToggleMessageSelection: (_id, messageId) => {
      updateDemoModel((prev) => ({
        ...prev,
        selectedMessageIds: prev.selectedMessageIds.includes(messageId)
          ? prev.selectedMessageIds.filter((id) => id !== messageId)
          : [...prev.selectedMessageIds, messageId],
      }));
    },
    onSubmitMessage: (_id, text) => {
      if (!text.trim()) return;
      updateDemoModel((prev) => ({
        ...prev,
        input: "",
        messages: [
          ...prev.messages,
          { id: `u-${Date.now()}`, role: "user", content: text },
          { id: `b-${Date.now()}`, role: "bot", content: "샘플 응답입니다." },
        ],
      }));
    },
    onExpand: () => {
      updateDemoModel((prev) => ({ ...prev, layoutExpanded: true }));
    },
    onCollapse: () => {
      updateDemoModel((prev) => ({ ...prev, layoutExpanded: false }));
    },
    onInputChange: (_id, value) => {
      updateDemoModel((prev) => ({ ...prev, input: value }));
    },
    setLeftPaneRef: () => undefined,
    setChatScrollRef: () => undefined,
    describeLlm: (llm) => `LLM(${llm}) 샘플 설명`,
    describeRoute: (route) => `Route(${route}) 샘플 설명`,
  };
  const demoAssembly = createConversationModelLegos(demoAssemblyProps);

  const conversationDemoEntries: Array<{ name: string; node: ReactNode }> = [
    {
      name: "ConversationSetupBox",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationSetupBox")}
          <ConversationSetupBox contentClassName="p-3">
            <div className="text-xs text-slate-700">설정 영역 래퍼가 `ConversationSetupPanel`로 구성됩니다.</div>
          </ConversationSetupBox>
        </div>
      ),
    },
    {
      name: "ConversationSetupFields",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationSetupFields")}
          <ConversationSetupBox contentClassName="p-3">
            <ConversationSetupFields
              showInlineUserKbInput
              inlineKbAdminOnly
              inlineKbValue={demoSetupFieldInlineKb}
              onInlineKbChange={setDemoSetupFieldInlineKb}
              showLlmSelector
              llmAdminOnly
              llmValue={demoSetupFieldLlm}
              onLlmChange={setDemoSetupFieldLlm}
              llmOptions={demoLlmOptions}
              showMcpProviderSelector
              mcpProviderAdminOnly
              providerValues={demoSetupFieldProviders}
              onProviderChange={setDemoSetupFieldProviders}
              providerOptions={demoProviderOptions}
              showMcpActionSelector
              mcpActionAdminOnly
              actionValues={demoSetupFieldActions}
              onActionChange={setDemoSetupFieldActions}
              actionOptions={demoToolOptions}
            />
          </ConversationSetupBox>
        </div>
      ),
    },
    {
      name: "ConversationExistingSetup",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationExistingSetup")}
          <ConversationSetupBox contentClassName="p-3">
            <ConversationExistingSetup
              showModelSelector
              showAgentSelector
              showModeExisting
              showSessionIdSearch
              showModeNew
              setupMode={demoSetupExistingMode}
              onSelectExisting={() => setDemoSetupExistingMode("existing")}
              onSelectNew={() => setDemoSetupExistingMode("new")}
              selectedAgentGroupId={demoSelectedAgentGroupId}
              selectedAgentId={demoSelectedAgentId}
              selectedSessionId={demoSelectedSessionId}
              sessionsLength={demoModel.sessions.length}
              sessionsLoading={false}
              sessionsError={null}
              conversationMode={demoConversationMode}
              agentGroupOptions={demoAgentGroupOptions}
              versionOptions={demoVersionOptions}
              sessionOptions={demoSessionOptions}
              onSelectAgentGroup={setDemoSelectedAgentGroupId}
              onSelectAgentVersion={setDemoSelectedAgentId}
              onSelectSession={(value) => setDemoSelectedSessionId(value)}
              onSearchSessionById={(value) => setDemoSelectedSessionId(value)}
              onChangeConversationMode={setDemoConversationMode}
            />
          </ConversationSetupBox>
        </div>
      ),
    },
    {
      name: "ConversationNewModelControls",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationNewModelControls")}
          <ConversationSetupBox contentClassName="p-3">
            <ConversationNewModelControls
              showKbSelector
              kbValue={demoNewModelKb}
              kbOptions={demoKbOptions}
              onKbChange={setDemoNewModelKb}
              kbInfoOpen={demoKbInfoOpen}
              onToggleKbInfo={() => setDemoKbInfoOpen((prev) => !prev)}
              kbInfoText="선택된 KB에 대한 샘플 설명"
              showAdminKbSelector
              adminKbValues={demoNewModelAdminKb}
              adminKbOptions={demoAdminKbOptions}
              onAdminKbChange={setDemoNewModelAdminKb}
              adminKbInfoOpen={demoAdminKbInfoOpen}
              onToggleAdminKbInfo={() => setDemoAdminKbInfoOpen((prev) => !prev)}
              adminKbInfoText="관리자 KB 샘플 설명"
              showRouteSelector
              routeValue={demoNewModelRoute}
              routeOptions={demoRouteOptions}
              onRouteChange={setDemoNewModelRoute}
              routeInfoOpen={demoRouteInfoOpen}
              onToggleRouteInfo={() => setDemoRouteInfoOpen((prev) => !prev)}
              routeInfoText="런타임 라우트 샘플 설명"
            />
          </ConversationSetupBox>
        </div>
      ),
    },
    {
      name: "createConversationModelLegos",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("createConversationModelLegos")}
          <div className="rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600">
            <div>activeSessionId: <code>{demoAssembly.activeSessionId || "-"}</code></div>
            <div>visibleMessages: <code>{demoAssembly.visibleMessages.length}</code></div>
            <div>setupLegoProps.model.id: <code>{demoAssembly.setupLegoProps.model.id}</code></div>
            <div>chatLegoProps.model.id: <code>{demoAssembly.chatLegoProps.model.id}</code></div>
          </div>
        </div>
      ),
    },
    {
      name: "ConversationModelSetupColumnLego",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationModelSetupColumnLego")}
          <div className="h-auto overflow-visible">
            <ConversationModelSetupColumnLego {...demoAssembly.setupLegoProps} />
          </div>
        </div>
      ),
    },
    {
      name: "ConversationAdminMenu",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationAdminMenu")}
          <div className="relative min-h-[56px] rounded-lg border border-slate-200 bg-white p-3">
            <ConversationAdminMenu
              className=""
              open={conversationAdminOpen}
              onToggleOpen={() => setConversationAdminOpen((prev) => !prev)}
              selectionEnabled={conversationSelectionEnabled}
              onToggleSelection={() => setConversationSelectionEnabled((prev) => !prev)}
              showLogs={conversationShowLogs}
              onToggleLogs={() => setConversationShowLogs((prev) => !prev)}
              onCopyConversation={() => undefined}
              onCopyIssue={() => undefined}
            />
          </div>
        </div>
      ),
    },
    {
      name: "ConversationThread",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationThread")}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <ConversationThread
              messages={[
                { id: "t1", role: "user", content: "안내 부탁해" },
                { id: "t2", role: "bot", content: "원하시는 옵션을 선택해 주세요." },
              ]}
              selectedMessageIds={[]}
              selectionEnabled={false}
              onToggleSelection={() => undefined}
              avatarSelectionStyle="both"
              renderContent={(msg) => msg.content}
            />
          </div>
        </div>
      ),
    },
    {
      name: "ConversationReplySelectors",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationReplySelectors")}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <ConversationReplySelectors
              modelId="ui-demo"
              message={conversationLeadDayMessage}
              isLatest
              sending={false}
              quickReplyDrafts={conversationQuickReplyDrafts}
              lockedReplySelections={conversationLockedReplySelections}
              setQuickReplyDrafts={setConversationQuickReplyDrafts}
              setLockedReplySelections={setConversationLockedReplySelections}
              onSubmit={() => undefined}
            />
            <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
              {parseLeadDayValueExamples.map((sample) => (
                <div key={`lead-day-${sample.value || "empty"}`}>
                  <code>{sample.value || "(empty)"}</code> -&gt; <code>{sample.parsed === null ? "null" : sample.parsed}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      name: "ConversationModelChatColumnLego",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationModelChatColumnLego")}
          <div className="h-auto overflow-hidden">
            <ConversationModelChatColumnLego {...demoAssembly.chatLegoProps} />
          </div>
        </div>
      ),
    },
    {
      name: "ConversationModelComposedLego",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationModelComposedLego")}
          <ConversationModelComposedLego
            className="lg:grid-cols-1"
            leftLego={<ConversationModelSetupColumnLego {...demoAssembly.setupLegoProps} />}
            rightLego={<ConversationModelChatColumnLego {...demoAssembly.chatLegoProps} />}
          />
        </div>
      ),
    },
    {
      name: "ConversationSessionHeader",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationSessionHeader")}
          <ConversationSessionHeader
            modelIndex={1}
            canRemove
            onRemove={() => undefined}
            activeSessionId={sessionHeaderSessionId}
            onCopySessionId={(sessionId) => setSessionHeaderSessionId(sessionId)}
            onOpenSessionInNewTab={() => undefined}
            onDeleteSession={() => setSessionHeaderSessionId(null)}
            disableDelete={!sessionHeaderSessionId}
          />
        </div>
      ),
    },
    {
      name: "ConversationWorkbenchTopBar",
      node: (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {renderConversationDefinitionMeta("ConversationWorkbenchTopBar")}
          <ConversationWorkbenchTopBar
            wsStatusDot={workbenchWsStatus === "CONNECTED" ? "bg-emerald-500" : "bg-rose-500"}
            wsStatus={workbenchWsStatus}
            onRefreshWs={() => setWorkbenchWsStatus((prev) => (prev === "CONNECTED" ? "DISCONNECTED" : "CONNECTED"))}
            onResetAll={() => setDemoModel(createDemoModelState())}
            onAddModel={() => undefined}
            addModelDisabled={false}
          />
        </div>
      ),
    },
  ];

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
              <UsedInPages pages={["src/components/HelpPanel.tsx", "src/components/design-system/conversation/ConversationUI.parts.tsx"]} />
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
              <UsedInPages pages={["src/components/design-system/conversation/ConversationUI.parts.tsx", "src/components/settings/ChatSettingsPanel.tsx"]} />
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
              <UsedInPages pages={["src/components/design-system/conversation/ConversationUI.parts.tsx", "src/app/app/agents/[id]/page.tsx"]} />
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
              <UsedInPages pages={["src/components/design-system/conversation/ConversationUI.parts.tsx", "src/components/design-system/conversation/ConversationUI.parts.tsx"]} />
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
              <UsedInPages pages={["src/components/design-system/conversation/ConversationUI.parts.tsx", "src/components/design-system/conversation/ConversationUI.parts.tsx"]} />
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
          title="Conversation Dependency View"
          description="각 항목을 type / name / depends 기준으로 보여주는 페이지"
        >
          <div className="grid grid-cols-1 gap-4">
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">ChatSettingsPanel 기반 Conversation UI 구현 샘플</div>
              <div className="grid grid-cols-1 gap-3">
                {sortConversationEntries(conversationDemoEntries).map((entry) => (
                  <div key={entry.name}>{entry.node}</div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">ChatSettingsPanel Conversation Definition Coverage</div>
              <div className="mb-3 text-xs text-slate-500">
                각 항목은 type / name / depends / role 키로 정리됩니다.
              </div>
              <div className="space-y-4">
                {conversationDefinitionGroups.map((group) => (
                  <div key={group.label}>
                    <div className="mb-2 text-xs font-semibold text-slate-700">{group.label}</div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {sortConversationEntries(group.items)
                        .filter((item) => !COVERAGE_HIDDEN_NAMES.has(item.name))
                        .map((item) => (
                          <div key={item.name} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            {(() => {
                              const meta = getDefinitionMeta(item, group.label);
                              return (
                                <DependencyMeta
                                  type={meta.type}
                                  name={item.name}
                                  depends={meta.depends}
                                  returns={meta.returns}
                                  role={item.note}
                                  definedAt={`${CONVERSATION_PARTS_FILE}:${item.sourceLine}`}
                                />
                              );
                            })()}
                            {item.name === "parseLeadDayValue" ? (
                              <div className="mt-2 rounded border border-slate-200 bg-white p-2 text-[11px] text-slate-600">
                                {parseLeadDayValueExamples.map((sample) => (
                                  <div key={`${item.name}-${sample.value || "empty"}`}>
                                    <code>{sample.value || "(empty)"}</code> -&gt; <code>{sample.parsed === null ? "null" : sample.parsed}</code>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              <UsedInPages
                pages={[
                  "src/components/settings/ChatSettingsPanel.tsx",
                  "src/components/design-system/conversation/ConversationUI.parts.tsx",
                ]}
              />
            </Card>

          </div>
        </SectionBlock>
      ),
    },
    {
      key: "widget",
      category: "widget",
      node: (
        <SectionBlock
          id="widget"
          title="Widget UI"
          description="웹 위젯 UI 구성 요소를 디자인 시스템 컴포넌트로 조합하고, 입력값을 즉시 반영합니다."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Widget Controls</div>
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">브랜드 이름</div>
                <Input value={widgetBrandName} onChange={(e) => setWidgetBrandName(e.target.value)} className="h-9" />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">상태 텍스트</div>
                <Input value={widgetStatus} onChange={(e) => setWidgetStatus(e.target.value)} className="h-9" />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">아이콘 URL</div>
                <Input
                  value={widgetIconUrl}
                  onChange={(e) => setWidgetIconUrl(e.target.value)}
                  placeholder="/logo.png"
                  className="h-9"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">환영 메시지</div>
                <Input value={widgetGreeting} onChange={(e) => setWidgetGreeting(e.target.value)} className="h-9" />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">입력 안내 문구</div>
                <Input
                  value={widgetPlaceholder}
                  onChange={(e) => setWidgetPlaceholder(e.target.value)}
                  className="h-9"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">하단 안내 문구</div>
                <Input
                  value={widgetDisclaimer}
                  onChange={(e) => setWidgetDisclaimer(e.target.value)}
                  placeholder="예: 개인정보는 안전하게 처리됩니다."
                  className="h-9"
                />
              </label>
              <StateBanner
                tone="info"
                title="미리보기 안내"
                description="좌측 값을 변경하면 우측 위젯 UI에 즉시 반영됩니다."
              />
            </Card>
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Widget Preview</div>
                <Button variant="outline" size="sm" onClick={handleWidgetReset}>
                  대화 초기화
                </Button>
              </div>
              <div className="mx-auto w-full max-w-[380px]">
                <div className="h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <WidgetShell
                    brandName={widgetBrandName}
                    status={widgetStatus}
                    iconUrl={widgetIconUrl || "/logo.png"}
                    messages={widgetMessages}
                    inputPlaceholder={widgetPlaceholder}
                    disclaimer={widgetDisclaimer}
                    inputValue={widgetInputValue}
                    onInputChange={setWidgetInputValue}
                    onSend={handleWidgetSend}
                    onNewConversation={handleWidgetReset}
                    sendDisabled={!widgetInputValue.trim()}
                    fill={false}
                    className="h-full"
                  />
                </div>
              </div>
              <UsedInPages
                pages={[
                  "src/components/design-system/widget/WidgetShell.tsx",
                  "src/app/embed/[key]/page.tsx",
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
              <UsedInPages pages={["src/components/design-system/conversation/ConversationUI.parts.tsx", "src/components/settings/ChatSettingsPanel.tsx"]} />
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

        <div className="sticky top-0 z-20 flex flex-wrap rounded-3xl border border-slate-200 gap-2 bg-white/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          {categoryLabels.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                activeCategory === category.key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

      <div className="space-y-4">{visibleSections.map((section) => <div key={section.key}>{section.node}</div>)}</div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="px-5 py-6 md:px-8">
      <DesignSystemContent />
    </div>
  );
}


