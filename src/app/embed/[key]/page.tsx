"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  WidgetConversationLayout,
  type WidgetConversationSession,
  type WidgetConversationTab,
  type ConversationModelChatColumnLegoProps,
  type ConversationModelSetupColumnLegoProps,
  type SelectOption,
} from "@/components/design-system";
import {
  applyConversationFeatureVisibility,
  isEnabledByGate,
  resolveConversationPageFeatures,
  resolveConversationSetupUi,
  WIDGET_PAGE_KEY,
  type ConversationFeaturesProviderShape,
} from "@/lib/conversation/pageFeaturePolicy";
import { useConversationAdminStatus } from "@/lib/conversation/client/useConversationAdminStatus";
import { executeTranscriptCopy } from "@/lib/conversation/client/copyExecutor";
import {
  fetchConversationDebugOptions,
  fetchSessionLogs,
  fetchWidgetSessionLogs,
  fetchWidgetTranscriptCopy,
} from "@/lib/conversation/client/runtimeClient";
import { mapRuntimeResponseToTranscriptFields } from "@/lib/runtimeResponseTranscript";
import { resolvePageConversationDebugOptions } from "@/lib/transcriptCopyPolicy";
import { extractHostFromUrl, matchAllowedDomain } from "@/lib/widgetUtils";
import type { LogBundle, TranscriptMessage } from "@/lib/debugTranscript";
import type { ChatMessage } from "@/lib/conversation/client/laboratoryPageState";

type WidgetConfig = {
  id: string;
  name?: string | null;
  agent_id?: string | null;
  theme?: Record<string, unknown> | null;
  public_key?: string | null;
  chat_policy?: ConversationFeaturesProviderShape | null;
  allowed_domains?: string[] | null;
};

type LogMap = Record<string, LogBundle>;

type WidgetHistoryMessage = {
  role?: "user" | "bot";
  content?: string;
  turn_id?: string | null;
};

type PolicyConfig = {
  llm: string;
  inlineKb: string;
};

function buildId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeLocalDebugLog(input: {
  sessionId?: string | null;
  turnId?: string | null;
  detail: Record<string, unknown>;
}): NonNullable<LogBundle["debug_logs"]>[number] {
  const detail = input.detail || {};
  const widgetError = (detail as Record<string, any>).widget_error || {};
  const stage = String(widgetError.stage || "widget_chat").trim() || "widget_chat";
  const errorValue =
    widgetError.error !== undefined && widgetError.error !== null
      ? String(widgetError.error)
      : widgetError.status !== undefined && widgetError.status !== null
        ? String(widgetError.status)
        : "REQUEST_FAILED";
  const lastFunction = `NO_TOOL_CALLED:${stage}`;
  const entries = Array.isArray((detail as Record<string, any>).entries)
    ? ([...(detail as Record<string, any>).entries] as Array<{ key: string; value: string }>)
    : [];
  if (!entries.some((entry) => entry.key === "MCP.last_function")) {
    entries.push({ key: "MCP.last_function", value: lastFunction });
  }
  if (!entries.some((entry) => entry.key === "MCP.last_status")) {
    entries.push({ key: "MCP.last_status", value: "error" });
  }
  if (!entries.some((entry) => entry.key === "MCP.last_error")) {
    entries.push({ key: "MCP.last_error", value: errorValue });
  }
  return {
    id: `widget-${buildId()}`,
    session_id: input.sessionId || null,
    turn_id: input.turnId || null,
    seq: null,
    prefix_json: {
      ...detail,
      entries,
      mcp: {
        ...((detail as Record<string, any>).mcp || {}),
        last: {
          function: lastFunction,
          status: "error",
          error: errorValue,
          result_count: null,
        },
      },
    },
    prefix_tree: null,
    created_at: new Date().toISOString(),
  };
}

function mergeLogBundles(base?: LogBundle | null, next?: LogBundle | null): LogBundle {
  return {
    mcp_logs: [...(base?.mcp_logs || []), ...(next?.mcp_logs || [])],
    event_logs: [...(base?.event_logs || []), ...(next?.event_logs || [])],
    debug_logs: [...(base?.debug_logs || []), ...(next?.debug_logs || [])],
    logsError: base?.logsError || next?.logsError || null,
    logsLoading: false,
  };
}

function groupLogsByTurn(logs: LogBundle) {
  const map = new Map<string, LogBundle>();
  (logs.mcp_logs || []).forEach((item) => {
    const turnId = String(item.turn_id || "").trim();
    if (!turnId) return;
    const current = map.get(turnId) || {};
    map.set(turnId, {
      ...current,
      mcp_logs: [...(current.mcp_logs || []), item],
    });
  });
  (logs.event_logs || []).forEach((item) => {
    const turnId = String(item.turn_id || "").trim();
    if (!turnId) return;
    const current = map.get(turnId) || {};
    map.set(turnId, {
      ...current,
      event_logs: [...(current.event_logs || []), item],
    });
  });
  (logs.debug_logs || []).forEach((item) => {
    const turnId = String(item.turn_id || "").trim();
    if (!turnId) return;
    const current = map.get(turnId) || {};
    map.set(turnId, {
      ...current,
      debug_logs: [...(current.debug_logs || []), item],
    });
  });
  return map;
}

function normalizeChatRenderPlan(plan?: TranscriptMessage["renderPlan"]): ChatMessage["renderPlan"] | undefined {
  if (!plan) return undefined;
  return {
    view: plan.view,
    enable_quick_replies: Boolean(plan.enable_quick_replies),
    enable_cards: Boolean(plan.enable_cards),
    interaction_scope: plan.interaction_scope === "any" ? "any" : "latest_only",
    quick_reply_source: {
      type:
        plan.quick_reply_source?.type === "explicit" ||
        plan.quick_reply_source?.type === "config" ||
        plan.quick_reply_source?.type === "fallback"
          ? plan.quick_reply_source.type
          : "none",
      criteria: plan.quick_reply_source?.criteria,
      source_function: plan.quick_reply_source?.source_function,
      source_module: plan.quick_reply_source?.source_module,
    },
    selection_mode: plan.selection_mode === "multi" ? "multi" : "single",
    min_select: Number.isFinite(Number(plan.min_select)) ? Number(plan.min_select) : 1,
    max_select: Number.isFinite(Number(plan.max_select)) ? Number(plan.max_select) : 1,
    submit_format: plan.submit_format === "csv" ? "csv" : "single",
    grid_columns: {
      quick_replies: Number.isFinite(Number(plan.grid_columns?.quick_replies))
        ? Number(plan.grid_columns?.quick_replies)
        : 1,
      cards: Number.isFinite(Number(plan.grid_columns?.cards)) ? Number(plan.grid_columns?.cards) : 1,
    },
    prompt_kind: plan.prompt_kind || null,
  };
}

function normalizeThemeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeOriginList(value: unknown) {
  return normalizeThemeList(value).map((item) => item.replace(/^['"]|['"]$/g, ""));
}

function normalizeAccountValue(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function collectUserIdentifiers(user?: Record<string, any> | null) {
  if (!user) return [] as string[];
  const values: Array<unknown> = [
    user.id,
    user.email,
    user.username,
    user.name,
    user.user_id,
    user.userId,
    user.account,
    user.account_id,
    user.accountId,
    user.external_id,
    user.externalId,
  ];
  const profile = user.profile;
  if (profile && typeof profile === "object") {
    const profileRecord = profile as Record<string, any>;
    values.push(profileRecord.id, profileRecord.email, profileRecord.username, profileRecord.name);
  }
  const account = user.account;
  if (account && typeof account === "object") {
    const accountRecord = account as Record<string, any>;
    values.push(accountRecord.id, accountRecord.email, accountRecord.name);
  }
  return values.map(normalizeAccountValue).filter(Boolean);
}

export default function WidgetEmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const key = useMemo(() => String(params?.key || ""), [params]);
  const visitorId = useMemo(() => String(searchParams?.get("vid") || "").trim(), [searchParams]);
  const sessionSeed = useMemo(() => String(searchParams?.get("sid") || "").trim(), [searchParams]);

  const [activeTab, setActiveTab] = useState<WidgetConversationTab>("chat");
  const [widgetToken, setWidgetToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageLogs, setMessageLogs] = useState<LogMap>({});
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("연결 중");
  const [pendingUser, setPendingUser] = useState<Record<string, any> | null>(null);
  const [pendingMeta, setPendingMeta] = useState<Record<string, any> | null>(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [showAdminLogs, setShowAdminLogs] = useState(false);
  const [chatSelectionEnabled, setChatSelectionEnabled] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [quickReplyDrafts, setQuickReplyDrafts] = useState<Record<string, string[]>>({});
  const [lockedReplySelections, setLockedReplySelections] = useState<Record<string, string[]>>({});
  const [detailsOpen, setDetailsOpen] = useState({
    llm: false,
    kb: false,
    adminKb: false,
    mcp: false,
    route: false,
  });
  const [policyConfig, setPolicyConfig] = useState<PolicyConfig>({
    llm: "chatgpt",
    inlineKb: "",
  });

  const [sessions, setSessions] = useState<WidgetConversationSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const initCalledRef = useRef(false);
  const widgetTokenRef = useRef("");
  const sessionSeedRef = useRef(sessionSeed);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const isAdminUser = useConversationAdminStatus();
  const fallbackReferrer = useMemo(
    () => (typeof document !== "undefined" ? document.referrer : ""),
    []
  );
  const fallbackAncestor = useMemo(() => {
    if (typeof window === "undefined") return "";
    const ancestor = window.location.ancestorOrigins;
    return ancestor && ancestor.length > 0 ? String(ancestor[0]) : "";
  }, []);
  const originHost = useMemo(
    () =>
      extractHostFromUrl(
        String(
          pendingMeta?.origin ||
            pendingMeta?.page_url ||
            pendingMeta?.referrer ||
            fallbackAncestor ||
            fallbackReferrer ||
            ""
        )
      ),
    [pendingMeta, fallbackAncestor, fallbackReferrer]
  );
  const debugOrigins = useMemo(
    () => normalizeOriginList(process.env.NEXT_PUBLIC_WIDGET_DEBUG_ORIGINS || ""),
    []
  );
  const debugDomainAllowed = useMemo(
    () => (originHost ? matchAllowedDomain(originHost, debugOrigins) : false),
    [debugOrigins, originHost]
  );
  const debugBypass = debugDomainAllowed;

  const providerPolicy = useMemo(
    () => (config?.chat_policy ? (config.chat_policy as ConversationFeaturesProviderShape) : null),
    [config]
  );
  const baseFeatures = useMemo(
    () => resolveConversationPageFeatures(WIDGET_PAGE_KEY, providerPolicy),
    [providerPolicy]
  );
  const pageFeatures = useMemo(
    () => applyConversationFeatureVisibility(baseFeatures, isAdminUser || debugBypass),
    [baseFeatures, debugBypass, isAdminUser]
  );
  const setupUi = useMemo(() => resolveConversationSetupUi(WIDGET_PAGE_KEY, providerPolicy), [providerPolicy]);
  const debugOptions = useMemo(
    () => resolvePageConversationDebugOptions(WIDGET_PAGE_KEY, providerPolicy),
    [providerPolicy]
  );

  const llmOptions = useMemo<SelectOption[]>(
    () =>
      ([
        { id: "chatgpt", label: "ChatGPT" },
        { id: "gemini", label: "Gemini" },
      ] as const).filter((option) => isEnabledByGate(option.id, baseFeatures.setup.llms)),
    [baseFeatures.setup.llms]
  );

  useEffect(() => {
    if (llmOptions.length === 0) return;
    const fallback =
      llmOptions.find((option) => option.id === baseFeatures.setup.defaultLlm) || llmOptions[0];
    if (!fallback) return;
    setPolicyConfig((prev) => {
      if (prev.llm && llmOptions.some((option) => option.id === prev.llm)) return prev;
      return { ...prev, llm: String(fallback.id) };
    });
  }, [llmOptions, baseFeatures.setup.defaultLlm]);

  const theme = (config?.theme || {}) as Record<string, any>;
  const brandName = String(config?.name || "Mejai");
  const launcherIconUrl = String(
    theme.launcher_icon_url || theme.launcherIconUrl || theme.icon_url || theme.iconUrl || ""
  );
  const headerIcon = launcherIconUrl || "/brand/logo.png";
  const isAdminOrDebug = isAdminUser || debugBypass;
  const statusLabel = isAdminOrDebug ? status : "";
  const allowedAccounts = useMemo(
    () => normalizeThemeList(theme.allowed_accounts || theme.allowedAccounts),
    [theme]
  );
  const allowedAccountSet = useMemo(
    () => new Set(allowedAccounts.map(normalizeAccountValue).filter(Boolean)),
    [allowedAccounts]
  );
  const userIdentifiers = useMemo(() => collectUserIdentifiers(pendingUser), [pendingUser]);
  const accountAllowed = allowedAccountSet.size > 0 && userIdentifiers.some((value) => allowedAccountSet.has(value));

  const allowedDomains = Array.isArray(config?.allowed_domains) ? config.allowed_domains : [];
  const domainAllowed = allowedDomains.length === 0 ? true : matchAllowedDomain(originHost, allowedDomains);
  const showPolicyTab = debugBypass || (domainAllowed && accountAllowed);
  const policyFeatures = useMemo(
    () => applyConversationFeatureVisibility(baseFeatures, isAdminOrDebug || showPolicyTab),
    [baseFeatures, isAdminOrDebug, showPolicyTab]
  );

  useEffect(() => {
    if (!showPolicyTab && activeTab === "policy") {
      setActiveTab("chat");
    }
  }, [showPolicyTab, activeTab]);

  useEffect(() => {
    widgetTokenRef.current = widgetToken;
  }, [widgetToken]);

  useEffect(() => {
    sessionSeedRef.current = sessionSeed;
  }, [sessionSeed]);

  const appendBotNotice = useCallback(
    (content: string, detail?: Record<string, unknown>) => {
      const id = buildId();
      setMessages((prev) => [...prev, { id, role: "bot", content }]);
      if (detail) {
        setMessageLogs((prev) => ({
          ...prev,
          [id]: mergeLogBundles(prev[id], {
            debug_logs: [
              makeLocalDebugLog({
                sessionId: sessionId || null,
                turnId: null,
                detail,
              }),
            ],
          }),
        }));
      }
      return id;
    },
    [sessionId]
  );

  const fetchHistory = useCallback(async (token: string, sessionOverride?: string | null) => {
    if (!token) return [] as ChatMessage[];
    try {
      const url = sessionOverride
        ? `/api/widget/history?session_id=${encodeURIComponent(sessionOverride)}`
        : "/api/widget/history";
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return [] as ChatMessage[];
      const data = await res.json();
      const items = Array.isArray(data?.messages) ? data.messages : [];
      return items
        .map((item: WidgetHistoryMessage) => {
          const role = item.role === "user" ? ("user" as const) : ("bot" as const);
          const content = String(item.content || "").trim();
          if (!content) return null;
          return {
            id: buildId(),
            role,
            content,
            turnId: role === "bot" ? String(item.turn_id || "").trim() || null : null,
          } satisfies ChatMessage;
        })
        .filter((msg: ChatMessage | null): msg is ChatMessage => Boolean(msg));
    } catch {
      return [] as ChatMessage[];
    }
  }, []);

  const callInit = useCallback(
    async (user?: Record<string, any> | null, options?: { forceNew?: boolean }) => {
      if (initCalledRef.current && !options?.forceNew) return;
      initCalledRef.current = true;
      setStatus(options?.forceNew ? "새 대화 준비 중" : "초기화 중");
      const referrer = typeof document !== "undefined" ? document.referrer : "";
      const meta = pendingMeta || {};
      const seedSession = options?.forceNew ? "" : sessionSeedRef.current;
      if (seedSession) sessionSeedRef.current = "";
      const payload = {
        public_key: key,
        origin: meta.origin || "",
        page_url: meta.page_url || referrer || "",
        referrer: meta.referrer || referrer || "",
        session_id: seedSession || undefined,
        visitor: {
          id: meta.visitor_id || visitorId || undefined,
          ...user,
        },
      };
      try {
        const res = await fetch("/api/widget/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("초기화 실패");
          appendBotNotice("연결에 실패했습니다. 잠시 후 다시 시도해 주세요.", {
            widget_error: {
              stage: "init",
              error: data?.error || "INIT_FAILED",
            },
          });
          return;
        }
        const nextToken = String(data.widget_token || "");
        const nextSessionId = String(data.session_id || "");
        setWidgetToken(nextToken);
        setSessionId(nextSessionId);
        setConfig(data.widget_config || null);
        setMessageLogs({});
        setSelectedMessageIds([]);
        setQuickReplyDrafts({});
        setLockedReplySelections({});
        try {
          window.parent?.postMessage?.(
            { type: "mejai_widget_session", session_id: nextSessionId },
            "*"
          );
        } catch {
          // ignore
        }
        try {
          window.parent?.postMessage?.(
            {
              type: "mejai_widget_theme",
              theme: data.widget_config?.theme || {},
              name: data.widget_config?.name || "",
            },
            "*"
          );
        } catch {
          // ignore
        }
        setStatus("대화 불러오는 중");
        const history = await fetchHistory(nextToken);
        const greeting =
          (data.widget_config?.theme && (data.widget_config.theme as Record<string, any>).greeting) ||
          "안녕하세요. 무엇을 도와드릴까요?";
        const nextMessages =
          history.length > 0
            ? history
            : [{ id: buildId(), role: "bot" as const, content: String(greeting) }];
        setMessages(nextMessages);
        setStatus("연결됨");
      } catch (error) {
        setStatus("초기화 실패");
        appendBotNotice("연결에 실패했습니다. 잠시 후 다시 시도해 주세요.", {
          widget_error: {
            stage: "init",
            error: error instanceof Error ? error.message : "INIT_FAILED",
          },
        });
      }
    },
    [appendBotNotice, fetchHistory, key, pendingMeta, visitorId]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === "mejai_widget_init") {
        if (data.user) setPendingUser(data.user);
        const nextMeta = {
          origin: data.origin,
          page_url: data.page_url,
          referrer: data.referrer,
          visitor_id: data.visitor_id,
        };
        setPendingMeta(nextMeta);
        if (!initCalledRef.current && data.session_id) {
          sessionSeedRef.current = String(data.session_id || "").trim();
        }
      }
      if (data.type === "mejai_widget_event" && data.event) {
        const token = widgetTokenRef.current;
        if (!token) return;
        void fetch("/api/widget/event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type: data.event, payload: { ts: Date.now() } }),
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const main = document.querySelector("main") as HTMLElement | null;
    const prevHtmlHeight = html.style.height;
    const prevHtmlMinHeight = html.style.minHeight;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyHeight = body.style.height;
    const prevBodyMinHeight = body.style.minHeight;
    const prevBodyMargin = body.style.margin;
    const prevBodyOverflow = body.style.overflow;
    const prevMainHeight = main?.style.height;
    const prevMainMinHeight = main?.style.minHeight;
    const prevMainDisplay = main?.style.display;
    const prevMainFlexDirection = main?.style.flexDirection;
    const prevMainOverflow = main?.style.overflow;
    html.style.height = "100%";
    html.style.minHeight = "100%";
    html.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.minHeight = "100%";
    body.style.margin = "0";
    body.style.overflow = "hidden";
    if (main) {
      main.style.height = "100%";
      main.style.minHeight = "100%";
      main.style.display = "flex";
      main.style.flexDirection = "column";
      main.style.overflow = "hidden";
    }
    return () => {
      html.style.height = prevHtmlHeight;
      html.style.minHeight = prevHtmlMinHeight;
      html.style.overflow = prevHtmlOverflow;
      body.style.height = prevBodyHeight;
      body.style.minHeight = prevBodyMinHeight;
      body.style.margin = prevBodyMargin;
      body.style.overflow = prevBodyOverflow;
      if (main) {
        main.style.height = prevMainHeight || "";
        main.style.minHeight = prevMainMinHeight || "";
        main.style.display = prevMainDisplay || "";
        main.style.flexDirection = prevMainFlexDirection || "";
        main.style.overflow = prevMainOverflow || "";
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void callInit(pendingUser);
    }, 200);
    return () => clearTimeout(timer);
  }, [callInit, pendingUser]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, activeTab]);

  const buildMergedLogs = useCallback(
    (sessionLogs: LogBundle, baseLogs: LogMap) => {
      const byTurn = groupLogsByTurn(sessionLogs);
      return messages.reduce<LogMap>((acc, msg) => {
        const current = acc[msg.id];
        if (msg.role !== "bot") return acc;
        const turnKey = String(msg.turnId || "").trim();
        if (!turnKey) return acc;
        const fromSession = byTurn.get(turnKey);
        if (!fromSession) return acc;
        acc[msg.id] = mergeLogBundles(current, fromSession);
        return acc;
      }, { ...baseLogs });
    },
    [messages]
  );

  const refreshSessionLogs = useCallback(
    async (limit = 120) => {
      if (!sessionId || !widgetToken) return;
      try {
        const sessionLogs = await fetchWidgetSessionLogs(sessionId, widgetToken, limit);
        setMessageLogs((prev) => buildMergedLogs(sessionLogs, prev));
      } catch {
        // ignore
      }
    },
    [buildMergedLogs, sessionId, widgetToken]
  );

  useEffect(() => {
    if (!showAdminLogs) return;
    void refreshSessionLogs();
  }, [showAdminLogs, messages.length, refreshSessionLogs]);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setMessageLogs({});
    setInputValue("");
    setSelectedMessageIds([]);
    setQuickReplyDrafts({});
    setLockedReplySelections({});
    setStatus("새 대화 준비 중");
    setWidgetToken("");
    setSessionId("");
    setActiveTab("chat");
    initCalledRef.current = false;
    void callInit(pendingUser, { forceNew: true });
  }, [callInit, pendingUser]);

  const handleSendText = useCallback(
    async (rawText: string, displayText?: string) => {
      const text = String(rawText || "").trim();
      const display = String(displayText ?? rawText ?? "").trim();
      if (!text || !widgetToken || !sessionId || sending) return;
      setInputValue("");
      setSending(true);
      const userId = buildId();
      const botId = buildId();
      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", content: display || text },
        { id: botId, role: "bot", content: "답변 생성 중...", isLoading: true },
      ]);
      setStatus("응답 중");
      try {
        const shouldSendLlm = policyFeatures.setup.llmSelector;
        const shouldSendInlineKb = policyFeatures.setup.inlineUserKbInput;
        const res = await fetch("/api/widget/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${widgetToken}`,
          },
          body: JSON.stringify({
            message: text,
            session_id: sessionId,
            llm: shouldSendLlm ? policyConfig.llm || undefined : undefined,
            inline_kb: shouldSendInlineKb ? policyConfig.inlineKb.trim() || undefined : undefined,
            visitor: pendingUser || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus("응답 오류");
          setSending(false);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botId
                ? {
                    ...msg,
                    content: "요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
                    isLoading: false,
                  }
                : msg
            )
          );
          setMessageLogs((prev) => ({
            ...prev,
            [botId]: mergeLogBundles(prev[botId], {
              debug_logs: [
                makeLocalDebugLog({
                  sessionId,
                  turnId: null,
                  detail: {
                    widget_error: {
                      stage: "chat",
                      status: res.status,
                      error: data?.error || res.statusText || "REQUEST_FAILED",
                      detail: data?.detail || null,
                      proxy_trace_id: data?.proxy_trace_id || null,
                    },
                  },
                }),
              ],
            }),
          }));
          return;
        }
        const mapped = mapRuntimeResponseToTranscriptFields(data || {});
        const normalizedRenderPlan = normalizeChatRenderPlan(mapped.renderPlan);
        const messageText =
          String(
            data.message ||
              data.final_answer ||
              data.answer ||
              mapped.responseSchema?.message ||
              ""
          ).trim() || "응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.";
        const nextSessionId = String(data.session_id || sessionId || "");
        setSessionId(nextSessionId);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botId
              ? {
                  ...msg,
                  content: messageText,
                  turnId: mapped.turnId || null,
                  responseSchema: mapped.responseSchema,
                  responseSchemaIssues: mapped.responseSchemaIssues,
                  renderPlan: normalizedRenderPlan,
                  quickReplies: mapped.quickReplies.length > 0 ? mapped.quickReplies : undefined,
                  productCards: mapped.productCards.length > 0 ? mapped.productCards : undefined,
                  isLoading: false,
                }
              : msg
          )
        );
        if (data.log_bundle && typeof data.log_bundle === "object") {
          setMessageLogs((prev) => ({
            ...prev,
            [botId]: mergeLogBundles(prev[botId], data.log_bundle as LogBundle),
          }));
        }
        if (showAdminLogs) {
          void refreshSessionLogs(120);
        }
        setStatus("연결됨");
        setSending(false);
      } catch (error) {
        setStatus("응답 오류");
        setSending(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botId
              ? {
                  ...msg,
                  content: "요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
                  isLoading: false,
                }
              : msg
          )
        );
        setMessageLogs((prev) => ({
          ...prev,
          [botId]: mergeLogBundles(prev[botId], {
            debug_logs: [
              makeLocalDebugLog({
                sessionId,
                turnId: null,
                detail: {
                  widget_error: {
                    stage: "chat",
                    error: error instanceof Error ? error.message : "REQUEST_FAILED",
                    detail: error instanceof Error ? error.stack || null : null,
                  },
                },
              }),
            ],
          }),
        }));
      }
    },
    [
      policyFeatures,
      pendingUser,
      policyConfig,
      refreshSessionLogs,
      sending,
      sessionId,
      showAdminLogs,
      widgetToken,
    ]
  );

  const handleToggleMessageSelection = useCallback((messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  }, []);

  const copyMessages = useMemo<TranscriptMessage[]>(
    () =>
      messages.map((msg) => ({
        id: msg.id,
        role: msg.role === "user" ? "user" : "bot",
        content: msg.content,
        turnId: msg.turnId || null,
        responseSchema: msg.responseSchema,
        responseSchemaIssues: msg.responseSchemaIssues,
        renderPlan: msg.renderPlan,
      })),
    [messages]
  );

  const copyByKind = useCallback(
    async (kind: "conversation" | "issue") => {
      if (!sessionId) {
        toast.error("\ub300\ud654 \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.");
        return false;
      }
      const latestDebugOptions =
        !widgetToken && kind === "conversation"
          ? await fetchConversationDebugOptions(WIDGET_PAGE_KEY).catch(() => null)
          : null;
      const effectiveDebugOptions = latestDebugOptions || debugOptions;
      let mergedLogs = messageLogs;
      let prebuiltTextOverride: string | null = null;
      if (widgetToken) {
        try {
          const serverCopy = await fetchWidgetTranscriptCopy({
            sessionId,
            widgetToken,
            page: "/app/laboratory",
            kind,
            limit: 500,
          });
          if (typeof serverCopy?.transcript_text === "string") {
            prebuiltTextOverride = serverCopy.transcript_text;
          }
        } catch {
          // ignore; fall back to local builder
        }
      }
      try {
        const sessionLogs = widgetToken
          ? await fetchWidgetSessionLogs(sessionId, widgetToken, 60)
          : await fetchSessionLogs(sessionId, 60);
        mergedLogs = buildMergedLogs(sessionLogs, messageLogs);
        setMessageLogs(mergedLogs);
      } catch {
        // ignore fetch failure, fall back to local logs
      }
      return executeTranscriptCopy({
        page: WIDGET_PAGE_KEY,
        kind,
        messages: copyMessages,
        messageLogs: mergedLogs,
        enabledOverride:
          kind === "conversation" ? pageFeatures.adminPanel.copyConversation : pageFeatures.adminPanel.copyIssue,
        conversationDebugOptionsOverride: kind === "conversation" ? effectiveDebugOptions : undefined,
        prebuiltTextOverride,
      });
    },
    [buildMergedLogs, copyMessages, debugOptions, messageLogs, pageFeatures, sessionId, widgetToken]
  );

  useEffect(() => {
    if (activeTab !== "list") return;
    if (!widgetToken) return;
    let active = true;
    setSessionsLoading(true);
    setSessionsError("");
    fetch("/api/widget/sessions", {
      method: "GET",
      headers: { Authorization: `Bearer ${widgetToken}` },
    })
      .then((res) =>
        res
          .json()
          .then((data) => ({ ok: res.ok, data }))
          .catch(() => ({ ok: res.ok, data: {} }))
      )
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) {
          setSessionsError(String(data?.error || "SESSION_LOAD_FAILED"));
          setSessions([]);
          setSessionsLoading(false);
          return;
        }
        const nextSessions: WidgetConversationSession[] = Array.isArray(data?.sessions) ? data.sessions : [];
        setSessions(nextSessions);
        setSessionsLoading(false);
        if (!selectedSessionId && nextSessions.length > 0) {
          setSelectedSessionId(nextSessions[0].id);
        }
      })
      .catch(() => {
        if (!active) return;
        setSessionsError("SESSION_LOAD_FAILED");
        setSessions([]);
        setSessionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, widgetToken, selectedSessionId]);

  useEffect(() => {
    if (activeTab !== "list") return;
    if (!widgetToken || !selectedSessionId) {
      setHistoryMessages([]);
      return;
    }
    let active = true;
    setHistoryLoading(true);
    fetchHistory(widgetToken, selectedSessionId)
      .then((items) => {
        if (!active) return;
        setHistoryMessages(items);
        setHistoryLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setHistoryMessages([]);
        setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, widgetToken, selectedSessionId, fetchHistory]);

  const model = useMemo<ConversationModelChatColumnLegoProps["model"]>(
    () => ({
      id: "widget",
      config: {
        llm: policyConfig.llm,
        kbId: "",
        inlineKb: policyConfig.inlineKb,
        inlineKbSampleSelectionOrder: [],
        adminKbIds: [],
        mcpProviderKeys: [],
        mcpToolIds: [],
        route: "",
      },
      detailsOpen,
      setupMode: "new",
      selectedAgentGroupId: "",
      selectedAgentId: "",
      sessions: [],
      sessionsLoading: false,
      sessionsError: null,
      selectedSessionId: null,
      historyMessages: [],
      messages,
      messageLogs,
      conversationMode: "new",
      editSessionId: null,
      sessionId: sessionId || null,
      layoutExpanded: false,
      adminLogControlsOpen: adminMenuOpen,
      showAdminLogs,
      chatSelectionEnabled,
      selectedMessageIds,
      input: inputValue,
      sending,
    }),
    [
      adminMenuOpen,
      chatSelectionEnabled,
      detailsOpen,
      inputValue,
      messages,
      messageLogs,
      policyConfig.inlineKb,
      policyConfig.llm,
      selectedMessageIds,
      sending,
      sessionId,
      showAdminLogs,
    ]
  );

  const chatLegoProps: ConversationModelChatColumnLegoProps = {
    model,
    visibleMessages: messages,
    isAdminUser: isAdminOrDebug,
    quickReplyDrafts,
    lockedReplySelections,
    setQuickReplyDrafts,
    setLockedReplySelections,
    adminFeatures: {
      enabled: pageFeatures.adminPanel.enabled,
      selectionToggle: pageFeatures.adminPanel.selectionToggle,
      logsToggle: pageFeatures.adminPanel.logsToggle,
      messageSelection: pageFeatures.adminPanel.messageSelection,
      copyConversation: pageFeatures.adminPanel.copyConversation,
      copyIssue: pageFeatures.adminPanel.copyIssue,
    },
    interactionFeatures: {
      quickReplies: pageFeatures.interaction.quickReplies,
      productCards: pageFeatures.interaction.productCards,
      prefill: pageFeatures.interaction.prefill,
      prefillMessages: pageFeatures.interaction.prefillMessages,
      inputSubmit: pageFeatures.interaction.inputSubmit,
    },
    onToggleAdminOpen: () => setAdminMenuOpen((prev) => !prev),
    onToggleSelectionMode: () =>
      setChatSelectionEnabled((prev) => {
        if (prev) setSelectedMessageIds([]);
        return !prev;
      }),
    onToggleLogs: () => setShowAdminLogs((prev) => !prev),
    onCopyConversation: () => copyByKind("conversation"),
    onCopyIssue: () => copyByKind("issue"),
    onToggleMessageSelection: handleToggleMessageSelection,
    onSubmitMessage: handleSendText,
    onExpand: () => undefined,
    onCollapse: () => undefined,
    onInputChange: setInputValue,
    onSetChatScrollRef: (el) => {
      chatScrollRef.current = el;
    },
  };

  const newModelControlOrder = useMemo<ConversationModelSetupColumnLegoProps["newModelControlOrder"]>(
    () =>
      setupUi.order.filter(
        (key): key is "kbSelector" | "adminKbSelector" | "routeSelector" =>
          key === "kbSelector" || key === "adminKbSelector" || key === "routeSelector"
      ),
    [setupUi.order]
  );

  const setupLegoProps: ConversationModelSetupColumnLegoProps = {
    model,
    pageFeatures: policyFeatures,
    setupUi,
    isAdminUser: isAdminOrDebug,
    agentGroupOptions: [],
    versionOptions: [],
    sessionOptions: [],
    inlineKbSamples: [],
    inlineKbSampleConflict: false,
    llmOptions,
    kbOptions: [],
    adminKbOptions: [],
    providerOptions: [],
    routeOptions: [],
    filteredToolOptions: [],
    kbInfoText: "선택된 KB 없음",
    adminKbInfoText: "선택된 관리자 KB 없음",
    mcpInfoText: "MCP 기능 비활성화",
    newModelControlOrder,
    onSetLeftPaneRef: () => undefined,
    onSelectExisting: () => undefined,
    onSelectNew: () => undefined,
    onSelectAgentGroup: () => undefined,
    onSelectAgentVersion: () => undefined,
    onSelectSession: () => undefined,
    onSearchSessionById: () => undefined,
    onChangeConversationMode: () => undefined,
    onInlineKbChange: (value) => setPolicyConfig((prev) => ({ ...prev, inlineKb: value })),
    onInlineKbSampleApply: () => undefined,
    onLlmChange: (value) => setPolicyConfig((prev) => ({ ...prev, llm: value })),
    onToggleLlmInfo: () => setDetailsOpen((prev) => ({ ...prev, llm: !prev.llm })),
    onKbChange: () => undefined,
    onToggleKbInfo: () => setDetailsOpen((prev) => ({ ...prev, kb: !prev.kb })),
    onAdminKbChange: () => undefined,
    onToggleAdminKbInfo: () => setDetailsOpen((prev) => ({ ...prev, adminKb: !prev.adminKb })),
    onRouteChange: () => undefined,
    onToggleRouteInfo: () => setDetailsOpen((prev) => ({ ...prev, route: !prev.route })),
    onProviderChange: () => undefined,
    onToggleMcpInfo: () => setDetailsOpen((prev) => ({ ...prev, mcp: !prev.mcp })),
    onActionChange: () => undefined,
    describeLlm: (value) =>
      llmOptions.find((option) => option.id === value)?.label || "선택된 LLM 정보 없음",
    describeRoute: (value) => (value ? `Runtime: ${value}` : "선택된 Runtime 없음"),
  };

  return (
    <div className="h-full min-h-0">
      <WidgetConversationLayout
        brandName={brandName}
        status={statusLabel}
        iconUrl={headerIcon}
        onNewConversation={handleNewConversation}
        fill={false}
        className="h-full"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showPolicyTab={showPolicyTab}
        chatLegoProps={chatLegoProps}
        setupLegoProps={setupLegoProps}
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        sessionsError={sessionsError}
        selectedSessionId={selectedSessionId}
        onSelectSession={setSelectedSessionId}
        historyMessages={historyMessages}
        historyLoading={historyLoading}
      />
    </div>
  );
}
