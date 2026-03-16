import { buildIntentDisambiguationTableHtmlFromText } from "@/components/design-system/conversation/runtimeUiCatalog";
import { resolveConversationPageFeatures, WIDGET_PAGE_KEY } from "@/lib/conversation/pageFeaturePolicy";
import { resolveWidgetRuntimeConfig, type WidgetTemplateRow as RuntimeWidgetTemplateRow } from "@/lib/widgetRuntimeConfig";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ChatMonitorListId =
  | "all"
  | "live"
  | "closed"
  | "rated"
  | "unrated"
  | "low_satisfaction"
  | "needs_review"
  | "orphan_ref";

export type ChatMonitorPreviewTab = "chat" | "list" | "policy" | "login";
export type ChatMonitorPreviewReason =
  | "ok"
  | "instance_missing"
  | "template_missing"
  | "public_key_missing"
  | "widget_mismatch"
  | "unknown";

export type ChatMonitorAccess = {
  userId: string;
  isAdmin: boolean;
};

export type ChatMonitorFilters = {
  templateId: string;
  instanceId: string;
  listId: ChatMonitorListId;
  limit: number;
  offset: number;
};

export type ChatMonitorPreviewTarget = {
  mode: "instance" | "template" | "fallback";
  can_preview: boolean;
  reason: ChatMonitorPreviewReason;
  template_id: string | null;
  template_public_key: string | null;
  instance_id: string | null;
  instance_public_key: string | null;
  visitor_id: string | null;
};

export type ChatMonitorPreviewTabStatus = {
  tab: ChatMonitorPreviewTab;
  label: string;
  enabled: boolean;
  visibility: string;
};

export type ChatMonitorOverviewResponse = {
  filters: {
    templates: Array<{
      id: string;
      label: string;
      session_count: number;
      missing: boolean;
    }>;
    instances: Array<{
      id: string;
      label: string;
      template_id: string | null;
      session_count: number;
      missing: boolean;
      active: boolean | null;
    }>;
    lists: Array<{
      id: ChatMonitorListId;
      label: string;
      session_count: number;
      admin_only?: boolean;
    }>;
  };
  summary: {
    session_count: number;
    live_count: number;
    closed_count: number;
    satisfaction_avg: number | null;
    satisfaction_response_rate: number;
    avg_turn_count: number;
    review_count: number;
  };
  items: Array<{
    session_id: string;
    session_code: string | null;
    page_url: string | null;
    template_id: string | null;
    template_name: string | null;
    template_missing: boolean;
    instance_id: string | null;
    instance_name: string | null;
    instance_missing: boolean;
    started_at: string | null;
    ended_at: string | null;
    last_turn_at: string | null;
    satisfaction: number | null;
    outcome: string | null;
    turn_count: number;
    preview_target: ChatMonitorPreviewTarget;
  }>;
  selection: {
    default_session_id: string | null;
  };
};

export type ChatMonitorSessionDetailResponse = {
  session: {
    id: string;
    session_code: string | null;
    started_at: string | null;
    ended_at: string | null;
    satisfaction: number | null;
    outcome: string | null;
    template_id: string | null;
    template_name: string | null;
    instance_id: string | null;
    instance_name: string | null;
    template_missing: boolean;
    instance_missing: boolean;
    review: boolean;
    metadata: Record<string, unknown> | null;
  };
  preview_target: ChatMonitorPreviewTarget;
  preview_tabs: ChatMonitorPreviewTabStatus[];
  transcript: Array<{
    role: "user" | "bot";
    content: string;
    rich_html?: string | null;
    created_at?: string | null;
    turn_id?: string | null;
  }>;
};

type SessionRow = {
  id: string;
  session_code?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  satisfaction?: number | null;
  outcome?: string | null;
  metadata?: Record<string, unknown> | null;
};

type TemplateRow = RuntimeWidgetTemplateRow & {
  public_key?: string | null;
};

type InstanceRow = {
  id: string;
  template_id: string;
  public_key?: string | null;
  name?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  editable_id?: string[] | null;
  usable_id?: string[] | null;
  created_by?: string | null;
};

type TurnRow = {
  id: string;
  session_id: string;
  created_at?: string | null;
  transcript_text?: string | null;
  answer_text?: string | null;
  final_answer?: string | null;
};

type SessionRefs = {
  templateId: string | null;
  instanceId: string | null;
  visitorId: string | null;
  pageUrl: string | null;
};

type SessionStats = {
  turnCount: number;
  lastTurnAt: string | null;
};

type SessionShape = {
  row: SessionRow;
  refs: SessionRefs;
  template: TemplateRow | null;
  instance: InstanceRow | null;
  templateMissing: boolean;
  instanceMissing: boolean;
  review: boolean;
  turnCount: number;
  lastTurnAt: string | null;
  previewTarget: ChatMonitorPreviewTarget;
  previewTabs: ChatMonitorPreviewTabStatus[];
};

const LIST_LABELS: Record<ChatMonitorListId, string> = {
  all: "전체",
  live: "진행 중",
  closed: "종료됨",
  rated: "만족도 응답",
  unrated: "만족도 미응답",
  low_satisfaction: "낮은 만족도",
  needs_review: "후속 지원 요청",
  orphan_ref: "참조 누락",
};

const PREVIEW_TAB_LABELS: Record<ChatMonitorPreviewTab, string> = {
  chat: "Conversation",
  list: "List",
  policy: "Policy",
  login: "Login",
};

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeText(value: unknown) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function normalizeIdList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => normalizeText(item))
        .filter((item): item is string => Boolean(item))
    )
  );
}

function chunkArray<T>(items: T[], size: number) {
  if (items.length === 0) return [] as T[][];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message?: string } | null }>,
  pageSize = 1000
) {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      throw new Error(error.message || "CHAT_MONITOR_QUERY_FAILED");
    }
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += page.length;
  }
  return rows;
}

function canReadInstance(row: InstanceRow, access: ChatMonitorAccess) {
  if (access.isAdmin) return true;
  const editableIds = normalizeIdList(row.editable_id);
  if (row.created_by === access.userId) return true;
  if (editableIds.includes(access.userId)) return true;
  const usableIds = normalizeIdList(row.usable_id);
  return usableIds.includes(access.userId);
}

function canReadTemplate(row: TemplateRow, access: ChatMonitorAccess) {
  if (access.isAdmin) return true;
  return row.created_by === access.userId;
}

function sortByActivityDesc(a: SessionShape, b: SessionShape) {
  const aValue = new Date(a.lastTurnAt || a.row.started_at || a.row.created_at || 0).getTime();
  const bValue = new Date(b.lastTurnAt || b.row.started_at || b.row.created_at || 0).getTime();
  return bValue - aValue;
}

function formatMissingLabel(prefix: string, id: string | null) {
  return id ? `[삭제되었거나 누락됨] ${id}` : `[삭제되었거나 누락됨] ${prefix}`;
}

function buildPreviewTabs(template: TemplateRow | null): ChatMonitorPreviewTabStatus[] {
  if (!template) {
    return (["chat", "list", "policy", "login"] as ChatMonitorPreviewTab[]).map((tab) => ({
      tab,
      label: PREVIEW_TAB_LABELS[tab],
      enabled: tab === "chat",
      visibility: tab === "chat" ? "fallback" : "hidden",
    }));
  }

  const resolved = resolveWidgetRuntimeConfig(template);
  const features = resolveConversationPageFeatures(WIDGET_PAGE_KEY, resolved.chat_policy);

  return [
    {
      tab: "chat",
      label: PREVIEW_TAB_LABELS.chat,
      enabled: Boolean(features.widget.tabBar.chat),
      visibility: String(features.visibility.widget.tabBar.chat || "hidden"),
    },
    {
      tab: "list",
      label: PREVIEW_TAB_LABELS.list,
      enabled: Boolean(features.widget.tabBar.list),
      visibility: String(features.visibility.widget.tabBar.list || "hidden"),
    },
    {
      tab: "policy",
      label: PREVIEW_TAB_LABELS.policy,
      enabled: Boolean(features.widget.tabBar.policy),
      visibility: String(features.visibility.widget.tabBar.policy || "hidden"),
    },
    {
      tab: "login",
      label: PREVIEW_TAB_LABELS.login,
      enabled: Boolean(features.widget.tabBar.login),
      visibility: String(features.visibility.widget.tabBar.login || "hidden"),
    },
  ];
}

export function extractSessionWidgetRefs(metadata: unknown): SessionRefs {
  const record = readRecord(metadata);
  return {
    templateId: normalizeText(record?.template_id),
    instanceId: normalizeText(record?.widget_instance_id),
    visitorId:
      normalizeText(record?.visitor_id) ||
      normalizeText(record?.visitorId) ||
      normalizeText(record?.external_user_id),
    pageUrl: normalizeText(record?.page_url),
  };
}

function buildPreviewTarget(refs: SessionRefs, template: TemplateRow | null, instance: InstanceRow | null): ChatMonitorPreviewTarget {
  const normalizedTemplateId = normalizeText(instance?.template_id) || refs.templateId;
  const templatePublicKey = normalizeText(template?.public_key);
  const instancePublicKey = normalizeText(instance?.public_key);

  if (instance && instance.is_active !== false) {
    if (!template || template.is_active === false || !normalizedTemplateId) {
      return {
        mode: "fallback",
        can_preview: false,
        reason: "template_missing",
        template_id: normalizedTemplateId,
        template_public_key: templatePublicKey,
        instance_id: instance.id,
        instance_public_key: instancePublicKey,
        visitor_id: refs.visitorId,
      };
    }
    if (!instancePublicKey) {
      return {
        mode: "fallback",
        can_preview: false,
        reason: "public_key_missing",
        template_id: template.id,
        template_public_key: templatePublicKey,
        instance_id: instance.id,
        instance_public_key: instancePublicKey,
        visitor_id: refs.visitorId,
      };
    }
    return {
      mode: "instance",
      can_preview: true,
      reason: "ok",
      template_id: template.id,
      template_public_key: templatePublicKey,
      instance_id: instance.id,
      instance_public_key: instancePublicKey,
      visitor_id: refs.visitorId,
    };
  }

  if (refs.instanceId && !instance) {
    return {
      mode: "fallback",
      can_preview: false,
      reason: "instance_missing",
      template_id: normalizedTemplateId,
      template_public_key: templatePublicKey,
      instance_id: refs.instanceId,
      instance_public_key: instancePublicKey,
      visitor_id: refs.visitorId,
    };
  }

  if (template && template.is_active !== false) {
    if (!templatePublicKey) {
      return {
        mode: "fallback",
        can_preview: false,
        reason: "public_key_missing",
        template_id: template.id,
        template_public_key: templatePublicKey,
        instance_id: refs.instanceId,
        instance_public_key: instancePublicKey,
        visitor_id: refs.visitorId,
      };
    }
    return {
      mode: "template",
      can_preview: true,
      reason: "ok",
      template_id: template.id,
      template_public_key: templatePublicKey,
      instance_id: refs.instanceId,
      instance_public_key: instancePublicKey,
      visitor_id: refs.visitorId,
    };
  }

  if (normalizedTemplateId) {
    return {
      mode: "fallback",
      can_preview: false,
      reason: "template_missing",
      template_id: normalizedTemplateId,
      template_public_key: templatePublicKey,
      instance_id: refs.instanceId,
      instance_public_key: instancePublicKey,
      visitor_id: refs.visitorId,
    };
  }

  return {
    mode: "fallback",
    can_preview: false,
    reason: "unknown",
    template_id: null,
    template_public_key: templatePublicKey,
    instance_id: refs.instanceId,
    instance_public_key: instancePublicKey,
    visitor_id: refs.visitorId,
  };
}

function isOrphanSession(session: SessionShape) {
  if (session.refs.instanceId && session.instanceMissing) return true;
  if (session.refs.templateId && session.templateMissing) return true;
  return !session.refs.instanceId && !session.refs.templateId;
}

function matchesListPreset(session: SessionShape, listId: ChatMonitorListId) {
  switch (listId) {
    case "all":
      return true;
    case "live":
      return !session.row.ended_at;
    case "closed":
      return Boolean(session.row.ended_at);
    case "rated":
      return typeof session.row.satisfaction === "number";
    case "unrated":
      return typeof session.row.satisfaction !== "number";
    case "low_satisfaction":
      return typeof session.row.satisfaction === "number" && session.row.satisfaction <= 2;
    case "needs_review":
      return session.review;
    case "orphan_ref":
      return isOrphanSession(session);
    default:
      return true;
  }
}

function buildSummary(items: SessionShape[]) {
  const sessionCount = items.length;
  const liveCount = items.filter((item) => !item.row.ended_at).length;
  const closedCount = sessionCount - liveCount;
  const satisfactionRows = items.filter((item) => typeof item.row.satisfaction === "number");
  const satisfactionAvg =
    satisfactionRows.length > 0
      ? satisfactionRows.reduce((sum, item) => sum + Number(item.row.satisfaction || 0), 0) / satisfactionRows.length
      : null;
  const turnCountSum = items.reduce((sum, item) => sum + item.turnCount, 0);
  const reviewCount = items.filter((item) => item.review).length;

  return {
    session_count: sessionCount,
    live_count: liveCount,
    closed_count: closedCount,
    satisfaction_avg: satisfactionAvg === null ? null : Number(satisfactionAvg.toFixed(2)),
    satisfaction_response_rate: sessionCount > 0 ? satisfactionRows.length / sessionCount : 0,
    avg_turn_count: sessionCount > 0 ? Number((turnCountSum / sessionCount).toFixed(2)) : 0,
    review_count: reviewCount,
  };
}

async function loadTemplates(supabaseAdmin: SupabaseClient, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, TemplateRow>();
  const chunks = chunkArray(uniqueIds, 200);
  const rows: TemplateRow[] = [];
  for (const chunk of chunks) {
    const { data, error } = await supabaseAdmin
      .from("B_chat_widgets")
      .select("id, name, chat_policy, is_active, is_public, created_by, public_key")
      .in("id", chunk);
    if (error) {
      throw new Error(error.message || "CHAT_MONITOR_TEMPLATE_QUERY_FAILED");
    }
    rows.push(...((data || []) as TemplateRow[]));
  }
  return new Map(rows.map((row) => [row.id, row]));
}

async function loadInstances(supabaseAdmin: SupabaseClient, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, InstanceRow>();
  const chunks = chunkArray(uniqueIds, 200);
  const rows: InstanceRow[] = [];
  for (const chunk of chunks) {
    const { data, error } = await supabaseAdmin
      .from("B_chat_widget_instances")
      .select("id, template_id, public_key, name, is_active, is_public, editable_id, usable_id, created_by")
      .in("id", chunk);
    if (error) {
      throw new Error(error.message || "CHAT_MONITOR_INSTANCE_QUERY_FAILED");
    }
    rows.push(...((data || []) as InstanceRow[]));
  }
  return new Map(rows.map((row) => [row.id, row]));
}

async function loadReviewSet(supabaseAdmin: SupabaseClient) {
  const rows = await fetchAllRows<{ session_id?: string | null }>(
    async (from, to) =>
      await supabaseAdmin
        .from("E_ops_review_queue_items")
        .select("session_id")
        .range(from, to),
    500
  );
  return new Set(
    rows
      .map((row) => normalizeText(row.session_id))
      .filter((value): value is string => Boolean(value))
  );
}

async function loadTurnStats(supabaseAdmin: SupabaseClient, sessionIds: string[]) {
  const stats = new Map<string, SessionStats>();
  const chunks = chunkArray(Array.from(new Set(sessionIds.filter(Boolean))), 200);
  for (const chunk of chunks) {
    const { data, error } = await supabaseAdmin
      .from("D_conv_turns")
      .select("session_id, created_at")
      .in("session_id", chunk)
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(error.message || "CHAT_MONITOR_TURN_QUERY_FAILED");
    }
    ((data || []) as Array<{ session_id: string; created_at?: string | null }>).forEach((row) => {
      const sessionId = normalizeText(row.session_id);
      if (!sessionId) return;
      const current = stats.get(sessionId) || { turnCount: 0, lastTurnAt: null };
      stats.set(sessionId, {
        turnCount: current.turnCount + 1,
        lastTurnAt: current.lastTurnAt || normalizeText(row.created_at),
      });
    });
  }
  return stats;
}

function canReadSession(
  refs: SessionRefs,
  templateMap: Map<string, TemplateRow>,
  instanceMap: Map<string, InstanceRow>,
  access: ChatMonitorAccess
) {
  const instance = refs.instanceId ? instanceMap.get(refs.instanceId) || null : null;
  const templateId = normalizeText(instance?.template_id) || refs.templateId;
  const template = templateId ? templateMap.get(templateId) || null : null;

  if (instance) {
    return canReadInstance(instance, access);
  }
  if (template) {
    return canReadTemplate(template, access);
  }
  return access.isAdmin;
}

function shapeSession(
  row: SessionRow,
  templateMap: Map<string, TemplateRow>,
  instanceMap: Map<string, InstanceRow>,
  reviewSet: Set<string>,
  turnStats: Map<string, SessionStats>
) {
  const refs = extractSessionWidgetRefs(row.metadata);
  const instance = refs.instanceId ? instanceMap.get(refs.instanceId) || null : null;
  const templateId = normalizeText(instance?.template_id) || refs.templateId;
  const template = templateId ? templateMap.get(templateId) || null : null;
  const stats = turnStats.get(row.id) || { turnCount: 0, lastTurnAt: null };

  return {
    row,
    refs,
    template,
    instance,
    templateMissing: Boolean(templateId && !template),
    instanceMissing: Boolean(refs.instanceId && !instance),
    review: reviewSet.has(row.id),
    turnCount: stats.turnCount,
    lastTurnAt: stats.lastTurnAt,
    previewTarget: buildPreviewTarget(refs, template, instance),
    previewTabs: buildPreviewTabs(template),
  } satisfies SessionShape;
}

function buildTemplateFilters(items: SessionShape[]) {
  const counts = new Map<string, { label: string; sessionCount: number; missing: boolean }>();
  items.forEach((item) => {
    const templateId = item.previewTarget.template_id || item.refs.templateId;
    if (!templateId) return;
    const current = counts.get(templateId) || {
      label: item.template?.name || formatMissingLabel("템플릿", templateId),
      sessionCount: 0,
      missing: !item.template,
    };
    counts.set(templateId, {
      label: current.label,
      sessionCount: current.sessionCount + 1,
      missing: current.missing,
    });
  });
  return Array.from(counts.entries())
    .map(([id, value]) => ({
      id,
      label: value.label,
      session_count: value.sessionCount,
      missing: value.missing,
    }))
    .sort((a, b) => b.session_count - a.session_count || a.label.localeCompare(b.label));
}

function buildInstanceFilters(items: SessionShape[]) {
  const counts = new Map<string, { label: string; sessionCount: number; missing: boolean; templateId: string | null; active: boolean | null }>();
  items.forEach((item) => {
    const instanceId = item.refs.instanceId;
    if (!instanceId) return;
    const current = counts.get(instanceId) || {
      label: item.instance?.name || formatMissingLabel("인스턴스", instanceId),
      sessionCount: 0,
      missing: !item.instance,
      templateId: item.instance?.template_id || item.refs.templateId,
      active: item.instance?.is_active ?? null,
    };
    counts.set(instanceId, {
      ...current,
      sessionCount: current.sessionCount + 1,
    });
  });
  return Array.from(counts.entries())
    .map(([id, value]) => ({
      id,
      label: value.label,
      template_id: value.templateId,
      session_count: value.sessionCount,
      missing: value.missing,
      active: value.active,
    }))
    .sort((a, b) => b.session_count - a.session_count || a.label.localeCompare(b.label));
}

function buildListFilters(items: SessionShape[], access: ChatMonitorAccess) {
  return (Object.keys(LIST_LABELS) as ChatMonitorListId[])
    .filter((listId) => !(listId === "orphan_ref" && !access.isAdmin))
    .map((listId) => ({
      id: listId,
      label: LIST_LABELS[listId],
      session_count: items.filter((item) => matchesListPreset(item, listId)).length,
      admin_only: listId === "orphan_ref" ? true : undefined,
    }));
}

function toOverviewItem(item: SessionShape) {
  return {
    session_id: item.row.id,
    session_code: normalizeText(item.row.session_code),
    page_url: item.refs.pageUrl,
    template_id: item.previewTarget.template_id || item.refs.templateId,
    template_name: item.template?.name || (item.refs.templateId ? formatMissingLabel("템플릿", item.refs.templateId) : null),
    template_missing: item.templateMissing,
    instance_id: item.refs.instanceId,
    instance_name: item.instance?.name || (item.refs.instanceId ? formatMissingLabel("인스턴스", item.refs.instanceId) : null),
    instance_missing: item.instanceMissing,
    started_at: normalizeText(item.row.started_at) || normalizeText(item.row.created_at),
    ended_at: normalizeText(item.row.ended_at),
    last_turn_at: item.lastTurnAt,
    satisfaction: typeof item.row.satisfaction === "number" ? item.row.satisfaction : null,
    outcome: normalizeText(item.row.outcome),
    turn_count: item.turnCount,
    preview_target: item.previewTarget,
  };
}

function buildTranscript(rows: TurnRow[]) {
  const messages: ChatMonitorSessionDetailResponse["transcript"] = [];
  rows.forEach((row) => {
    const userText = normalizeText(row.transcript_text);
    if (userText) {
      messages.push({
        role: "user",
        content: userText,
        created_at: normalizeText(row.created_at),
        turn_id: null,
      });
    }
    const botText = normalizeText(row.final_answer) || normalizeText(row.answer_text);
    if (botText) {
      messages.push({
        role: "bot",
        content: botText,
        rich_html: buildIntentDisambiguationTableHtmlFromText(botText),
        created_at: normalizeText(row.created_at),
        turn_id: normalizeText(row.id),
      });
    }
  });
  return messages;
}

export function resolveChatMonitorFilters(searchParams: URLSearchParams): ChatMonitorFilters {
  const listIdRaw = normalizeText(searchParams.get("list")) || "all";
  const validListId = (Object.keys(LIST_LABELS) as ChatMonitorListId[]).includes(listIdRaw as ChatMonitorListId)
    ? (listIdRaw as ChatMonitorListId)
    : "all";
  const parsedLimit = Number(searchParams.get("limit") || 40);
  const parsedOffset = Number(searchParams.get("offset") || 0);
  return {
    templateId: normalizeText(searchParams.get("templateId")) || "all",
    instanceId: normalizeText(searchParams.get("instanceId")) || "all",
    listId: validListId,
    limit: Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 200) : 40,
    offset: Number.isFinite(parsedOffset) ? Math.max(Math.trunc(parsedOffset), 0) : 0,
  };
}

export async function loadChatMonitorOverview(
  supabaseAdmin: SupabaseClient,
  access: ChatMonitorAccess,
  filters: ChatMonitorFilters
): Promise<ChatMonitorOverviewResponse> {
  const sessionRows = await fetchAllRows<SessionRow>(
    async (from, to) =>
      await supabaseAdmin
        .from("D_conv_sessions")
        .select("id, session_code, created_at, started_at, ended_at, satisfaction, outcome, metadata")
        .order("started_at", { ascending: false, nullsFirst: false })
        .range(from, to),
    500
  );

  const refsList = sessionRows.map((row) => extractSessionWidgetRefs(row.metadata));
  const templateMap = await loadTemplates(
    supabaseAdmin,
    refsList.map((refs) => refs.templateId).filter((value): value is string => Boolean(value))
  );
  const instanceMap = await loadInstances(
    supabaseAdmin,
    refsList.map((refs) => refs.instanceId).filter((value): value is string => Boolean(value))
  );
  const reviewSet = await loadReviewSet(supabaseAdmin);

  const accessibleRows = sessionRows.filter((row) =>
    canReadSession(extractSessionWidgetRefs(row.metadata), templateMap, instanceMap, access)
  );
  const turnStats = await loadTurnStats(
    supabaseAdmin,
    accessibleRows.map((row) => row.id)
  );

  const allItems = accessibleRows
    .map((row) => shapeSession(row, templateMap, instanceMap, reviewSet, turnStats))
    .sort(sortByActivityDesc);

  const templateScopedItems =
    filters.templateId !== "all"
      ? allItems.filter((item) => (item.previewTarget.template_id || item.refs.templateId) === filters.templateId)
      : allItems;

  const instanceScopedItems =
    filters.instanceId !== "all"
      ? templateScopedItems.filter((item) => item.refs.instanceId === filters.instanceId)
      : templateScopedItems;

  const filteredItems = instanceScopedItems.filter((item) => matchesListPreset(item, filters.listId));
  const pagedItems = filteredItems.slice(filters.offset, filters.offset + filters.limit);

  return {
    filters: {
      templates: buildTemplateFilters(allItems),
      instances: buildInstanceFilters(templateScopedItems),
      lists: buildListFilters(instanceScopedItems, access),
    },
    summary: buildSummary(filteredItems),
    items: pagedItems.map(toOverviewItem),
    selection: {
      default_session_id: pagedItems[0]?.row.id || filteredItems[0]?.row.id || null,
    },
  };
}

export async function loadChatMonitorSessionDetail(
  supabaseAdmin: SupabaseClient,
  access: ChatMonitorAccess,
  sessionId: string
): Promise<ChatMonitorSessionDetailResponse | null> {
  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from("D_conv_sessions")
    .select("id, session_code, created_at, started_at, ended_at, satisfaction, outcome, metadata")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message || "CHAT_MONITOR_SESSION_QUERY_FAILED");
  }
  if (!sessionData) return null;

  const row = sessionData as SessionRow;
  const refs = extractSessionWidgetRefs(row.metadata);
  const instanceMap = await loadInstances(
    supabaseAdmin,
    refs.instanceId ? [refs.instanceId] : []
  );
  const instance = refs.instanceId ? instanceMap.get(refs.instanceId) || null : null;
  const effectiveTemplateId = normalizeText(instance?.template_id) || refs.templateId;
  const templateMap = await loadTemplates(
    supabaseAdmin,
    effectiveTemplateId ? [effectiveTemplateId] : []
  );
  const template = effectiveTemplateId ? templateMap.get(effectiveTemplateId) || null : null;

  if (!canReadSession(refs, templateMap, instanceMap, access)) {
    return null;
  }

  const reviewSet = await loadReviewSet(supabaseAdmin);
  const { data: turnData, error: turnError } = await supabaseAdmin
    .from("D_conv_turns")
    .select("id, session_id, created_at, transcript_text, answer_text, final_answer")
    .eq("session_id", sessionId)
    .order("seq", { ascending: true });

  if (turnError) {
    throw new Error(turnError.message || "CHAT_MONITOR_DETAIL_TURN_QUERY_FAILED");
  }

  const stats = {
    turnCount: Array.isArray(turnData) ? turnData.length : 0,
    lastTurnAt:
      Array.isArray(turnData) && turnData.length > 0
        ? normalizeText(turnData[turnData.length - 1]?.created_at)
        : null,
  };

  const shaped = shapeSession(row, templateMap, instanceMap, reviewSet, new Map([[row.id, stats]]));

  return {
    session: {
      id: row.id,
      session_code: normalizeText(row.session_code),
      started_at: normalizeText(row.started_at) || normalizeText(row.created_at),
      ended_at: normalizeText(row.ended_at),
      satisfaction: typeof row.satisfaction === "number" ? row.satisfaction : null,
      outcome: normalizeText(row.outcome),
      template_id: shaped.previewTarget.template_id || refs.templateId,
      template_name: template?.name || (refs.templateId ? formatMissingLabel("템플릿", refs.templateId) : null),
      instance_id: refs.instanceId,
      instance_name: instance?.name || (refs.instanceId ? formatMissingLabel("인스턴스", refs.instanceId) : null),
      template_missing: shaped.templateMissing,
      instance_missing: shaped.instanceMissing,
      review: shaped.review,
      metadata: readRecord(row.metadata),
    },
    preview_target: shaped.previewTarget,
    preview_tabs: shaped.previewTabs,
    transcript: buildTranscript((turnData || []) as TurnRow[]),
  };
}
