"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bot, Copy, ExternalLink, Info, Minus, Plus, Send, Trash2, User, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MultiSelectPopover, SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type KbItem = {
  id: string;
  title: string;
  content?: string | null;
  is_admin?: boolean | null;
  apply_groups?: Array<{ path: string; values: string[] }> | null;
  apply_groups_mode?: "all" | "any" | null;
  applies_to_user?: boolean | null;
};

type MpcTool = {
  id: string;
  name: string;
  description?: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  turnId?: string | null;
};

type MessageLogBundle = {
  mcp_logs: LabLog["mcp_logs"];
  event_logs: LabLog["event_logs"];
  debug_logs: LabLog["debug_logs"];
  logsError: string | null;
  logsLoading: boolean;
};

type LabLog = {
  mcp_logs: Array<{
    id?: string | null;
    tool_name: string;
    status: string;
    request_payload: Record<string, unknown> | null;
    response_payload: Record<string, unknown> | null;
    policy_decision?: Record<string, unknown> | null;
    latency_ms: number | null;
    created_at: string | null;
    session_id?: string | null;
    turn_id?: string | null;
  }>;
  event_logs: Array<{
    id?: string | null;
    event_type: string;
    payload: Record<string, unknown> | null;
    created_at: string | null;
    session_id?: string | null;
    turn_id?: string | null;
  }>;
  debug_logs: Array<{
    id?: string | null;
    session_id?: string | null;
    turn_id?: string | null;
    seq?: number | null;
    prefix_json?: Record<string, unknown> | null;
    prefix_tree?: Record<string, unknown> | null;
    created_at: string | null;
  }>;
};

type ModelConfig = {
  llm: string;
  kbId: string;
  adminKbIds: string[];
  mcpToolIds: string[];
  route: string;
};

type ModelState = {
  id: string;
  config: ModelConfig;
  sessionId: string | null;
  messages: ChatMessage[];
  messageLogs: Record<string, MessageLogBundle>;
  lastLogAt: string | null;
  chatExpanded: boolean;
  detailsOpen: {
    llm: boolean;
    kb: boolean;
    adminKb: boolean;
    mcp: boolean;
    route: boolean;
  };
  input: string;
  sending: boolean;
};

const MAX_MODELS = 5;
function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function renderBotContent(content: string) {
  if (!content.includes("debug_prefix")) return content;
  const html = content.replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function getDebugParts(content: string) {
  if (typeof document === "undefined" || !content.includes("debug_prefix")) {
    return { prefixText: "", answerHtml: "", answerText: content };
  }
  const holder = document.createElement("div");
  holder.innerHTML = content;
  const prefix = holder.querySelector(".debug_prefix") as HTMLElement | null;
  const answer = holder.querySelector(".debug_answer") as HTMLElement | null;
  const getLiLabel = (li: Element) => {
    const parts: string[] = [];
    li.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent || "");
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      if (el.tagName === "UL" || el.tagName === "OL") return;
      parts.push(el.innerText || "");
    });
    return parts.join(" ").replace(/\s+/g, " ").trim();
  };
  const renderList = (root: Element, depth: number) => {
    const lines: string[] = [];
    const items = Array.from(root.children).filter((el) => el.tagName === "LI");
    items.forEach((li) => {
      const label = getLiLabel(li);
      if (label) {
        lines.push(`${"  ".repeat(depth)}- ${label}`);
      }
      const nested = Array.from(li.children).find((child) => child.tagName === "UL");
      if (nested) {
        lines.push(...renderList(nested, depth + 1));
      }
    });
    return lines;
  };
  let prefixText = "";
  if (prefix) {
    const list = Array.from(prefix.children).find((child) => child.tagName === "UL");
    if (list) {
      prefixText = renderList(list, 0).join("\n");
    } else {
      prefixText = prefix.innerText.trim();
    }
  }
  const answerText = answer ? answer.innerText.trim() : holder.innerText.trim();
  const answerHtml = answer ? answer.innerHTML : "";
  return { prefixText, answerHtml, answerText };
}

function extractDebugText(content: string) {
  if (typeof document === "undefined") return content;
  const holder = document.createElement("div");
  holder.innerHTML = content;
  const prefix = holder.querySelector(".debug_prefix") as HTMLElement | null;
  const answer = holder.querySelector(".debug_answer") as HTMLElement | null;
  const getLiLabel = (li: Element) => {
    const parts: string[] = [];
    li.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent || "");
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      if (el.tagName === "UL" || el.tagName === "OL") return;
      parts.push(el.innerText || "");
    });
    return parts.join(" ").replace(/\s+/g, " ").trim();
  };
  const renderList = (root: Element, depth: number) => {
    const lines: string[] = [];
    const items = Array.from(root.children).filter((el) => el.tagName === "LI");
    items.forEach((li) => {
      const label = getLiLabel(li);
      if (label) {
        lines.push(`${"  ".repeat(depth)}- ${label}`);
      }
      const nested = Array.from(li.children).find((child) => child.tagName === "UL");
      if (nested) {
        lines.push(...renderList(nested, depth + 1));
      }
    });
    return lines;
  };
  let prefixText = "";
  if (prefix) {
    const list = Array.from(prefix.children).find((child) => child.tagName === "UL");
    if (list) {
      prefixText = renderList(list, 0).join("\n");
    } else {
      prefixText = prefix.innerText.trim();
    }
  }
  const answerText = answer ? answer.innerText.trim() : "";
  return [prefixText, answerText].filter(Boolean).join("\n");
}

function formatLogBundle(bundle?: MessageLogBundle, turnId?: string | null) {
  if (!bundle) return "";
  const lines: string[] = [];
  if (bundle.logsError) {
    lines.push(`MCP 로그 오류: ${bundle.logsError}`);
  }
  const debugLogs = turnId
    ? bundle.debug_logs.filter((log) => log.turn_id === turnId)
    : bundle.debug_logs;
  if (debugLogs.length > 0) {
    lines.push("DEBUG 로그:");
    debugLogs.forEach((log) => {
      lines.push(`- ${log.id || "-"} (turn_id=${log.turn_id || "-"}) (${log.created_at || "-"})`);
      lines.push(`  prefix_json: ${JSON.stringify(log.prefix_json || {})}`);
    });
  }
  const summary = buildIssueSummary(bundle, turnId);
  if (summary.length > 0) {
    lines.push("문제 요약:");
    summary.forEach((item) => lines.push(`- ${item}`));
  }
  if (bundle.mcp_logs.length > 0) {
    lines.push("MCP 로그:");
    bundle.mcp_logs.forEach((log) => {
      const turnLabel = log.turn_id || turnId || "-";
      lines.push(`- ${log.id || "-"} ${log.tool_name}: ${log.status} (${log.created_at || "-"}) (turn_id=${turnLabel})`);
      lines.push(`  request: ${JSON.stringify(log.request_payload || {})}`);
      lines.push(`  response: ${JSON.stringify(log.response_payload || log.policy_decision || {})}`);
    });
  }
  if (bundle.event_logs.length > 0) {
    lines.push("이벤트 로그:");
    bundle.event_logs.forEach((log) => {
      const turnLabel = log.turn_id || turnId || "-";
      lines.push(`- ${log.id || "-"} ${log.event_type} (${log.created_at || "-"}) (turn_id=${turnLabel})`);
      lines.push(`  payload: ${JSON.stringify(log.payload || {})}`);
    });
  }
  return lines.join("\n");
}

function isDebugIssue(log: MessageLogBundle["debug_logs"][number]) {
  const entries = Array.isArray(log.prefix_json?.entries) ? log.prefix_json?.entries : [];
  const entryMap = new Map(entries.map((entry: any) => [String(entry.key), String(entry.value ?? "")]));
  const lastStatus = (entryMap.get("MCP.last_status") || "").toLowerCase();
  const lastError = entryMap.get("MCP.last_error") || "";
  return lastStatus === "error" || (lastError && lastError !== "-");
}

function isMcpIssue(log: MessageLogBundle["mcp_logs"][number]) {
  if (String(log.status || "").toLowerCase() !== "success") return true;
  const error = (log.response_payload as any)?.error;
  return Boolean(error);
}

function isEventIssue(log: MessageLogBundle["event_logs"][number]) {
  const type = String(log.event_type || "").toUpperCase();
  if (type.includes("FAILED") || type.includes("ERROR")) return true;
  return Boolean((log.payload as any)?.error);
}

function getDebugEntryMap(log: MessageLogBundle["debug_logs"][number]) {
  const entries = Array.isArray(log.prefix_json?.entries) ? log.prefix_json?.entries : [];
  return new Map(entries.map((entry: any) => [String(entry.key), String(entry.value ?? "")]));
}

function buildIssueSummary(bundle?: MessageLogBundle, turnId?: string | null) {
  if (!bundle) return [];
  const summary = new Set<string>();
  const debugLogs = turnId
    ? bundle.debug_logs.filter((log) => log.turn_id === turnId)
    : bundle.debug_logs;
  debugLogs.forEach((log) => {
    const map = getDebugEntryMap(log);
    const lastError = map.get("MCP.last_error");
    if (lastError && lastError !== "-") summary.add(`MCP.last_error: ${lastError}`);
  });
  bundle.mcp_logs.forEach((log) => {
    const error = (log.response_payload as any)?.error;
    if (error?.message) summary.add(`${log.tool_name}: ${String(error.message)}`);
    else if (error?.code) summary.add(`${log.tool_name}: ${String(error.code)}`);
    else if (String(log.status || "").toLowerCase() !== "success") {
      summary.add(`${log.tool_name}: status=${log.status}`);
    }
  });
  bundle.event_logs.forEach((log) => {
    const payloadError = (log.payload as any)?.error;
    if (payloadError) summary.add(`${log.event_type}: ${String(payloadError)}`);
  });
  if (bundle.logsError) summary.add(`MCP 로그 오류: ${bundle.logsError}`);
  return Array.from(summary);
}

function formatIssueBundle(bundle?: MessageLogBundle, turnId?: string | null) {
  if (!bundle) return "";
  const lines: string[] = [];
  if (bundle.logsError) {
    lines.push(`MCP 로그 오류: ${bundle.logsError}`);
  }
  const debugLogs = turnId
    ? bundle.debug_logs.filter((log) => log.turn_id === turnId && isDebugIssue(log))
    : bundle.debug_logs.filter((log) => isDebugIssue(log));
  if (debugLogs.length > 0) {
    lines.push("DEBUG 로그:");
    debugLogs.forEach((log) => {
      lines.push(`- ${log.id || "-"} (turn_id=${log.turn_id || "-"}) (${log.created_at || "-"})`);
      lines.push(`  prefix_json: ${JSON.stringify(log.prefix_json || {})}`);
    });
  }
  const summary = buildIssueSummary(bundle, turnId);
  if (summary.length > 0) {
    lines.push("문제 요약:");
    summary.forEach((item) => lines.push(`- ${item}`));
  }
  const mcpLogs = bundle.mcp_logs.filter((log) => isMcpIssue(log));
  if (mcpLogs.length > 0) {
    lines.push("MCP 로그:");
    mcpLogs.forEach((log) => {
      const turnLabel = log.turn_id || turnId || "-";
      lines.push(`- ${log.id || "-"} ${log.tool_name}: ${log.status} (${log.created_at || "-"}) (turn_id=${turnLabel})`);
      lines.push(`  request: ${JSON.stringify(log.request_payload || {})}`);
      lines.push(`  response: ${JSON.stringify(log.response_payload || log.policy_decision || {})}`);
    });
  }
  const eventLogs = bundle.event_logs.filter((log) => isEventIssue(log));
  if (eventLogs.length > 0) {
    lines.push("이벤트 로그:");
    eventLogs.forEach((log) => {
      const turnLabel = log.turn_id || turnId || "-";
      lines.push(`- ${log.id || "-"} ${log.event_type} (${log.created_at || "-"}) (turn_id=${turnLabel})`);
      lines.push(`  payload: ${JSON.stringify(log.payload || {})}`);
    });
  }
  return lines.join("\n");
}

function hasIssue(bundle?: MessageLogBundle, turnId?: string | null) {
  if (!bundle) return false;
  const debugLogs = turnId
    ? bundle.debug_logs.filter((log) => log.turn_id === turnId)
    : bundle.debug_logs;
  if (debugLogs.some((log) => isDebugIssue(log))) return true;
  if (bundle.mcp_logs.some((log) => isMcpIssue(log))) return true;
  if (bundle.event_logs.some((log) => isEventIssue(log))) return true;
  return Boolean(bundle.logsError);
}

function createDefaultModel(): ModelState {
  return {
    id: makeId(),
    config: {
      llm: "chatgpt",
      kbId: "",
      adminKbIds: [],
      mcpToolIds: [],
      route: "mk2",
    },
    sessionId: null,
    messages: [],
    messageLogs: {},
    lastLogAt: null,
    chatExpanded: false,
    detailsOpen: {
      llm: false,
      kb: false,
      adminKb: false,
      mcp: false,
      route: false,
    },
    input: "",
    sending: false,
  };
}

function makeSnippet(value?: string | null, max = 90) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text) return "내용 없음";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function describeRoute(route: string) {
  if (route === "legacy") {
    return "기존 /api/playground/chat 파이프라인 (llm.ts, 확인/요약 흐름 포함).";
  }
  return "신규 /api/playground/chat_mk2 파이프라인 (llm_mk2, 정책 기반 단순 흐름).";
}

function describeLlm(llm: string) {
  if (llm === "chatgpt") return "OpenAI ChatGPT 모델 계열.";
  if (llm === "gemini") return "Google Gemini 모델 계열.";
  return "모델 정보 없음.";
}

export default function LabolatoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [tools, setTools] = useState<MpcTool[]>([]);

  const [models, setModels] = useState<ModelState[]>(() => [createDefaultModel()]);
  const chatScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevMessageSignatureRefs = useRef<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [kbRes, toolRes] = await Promise.all([
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
          apiFetch<{ items: MpcTool[] }>("/api/mcp/tools").catch(() => ({ items: [] })),
        ]);
        if (!mounted) return;
        setKbItems(kbRes.items || []);
        setTools(toolRes.items || []);
      } catch {
        if (!mounted) return;
        setError("실험실 데이터를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!kbItems.length) return;
    const userKbs = kbItems.filter((kb) => !kb.is_admin);
    const firstUserKb = userKbs[0]?.id;
    setModels((prev) =>
      prev.map((model) => ({
        ...model,
        config: { ...model.config, kbId: model.config.kbId || firstUserKb || "" },
      }))
    );
  }, [kbItems]);

  useEffect(() => {
    if (!tools.length) return;
    const allToolIds = tools.map((tool) => tool.id);
    setModels((prev) =>
      prev.map((model) => ({
        ...model,
        config:
          model.config.mcpToolIds.length === 0
            ? { ...model.config, mcpToolIds: allToolIds }
            : model.config,
      }))
    );
  }, [tools]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      for (const model of models) {
        const el = chatScrollRefs.current[model.id];
        if (!el) continue;

        const last = model.messages[model.messages.length - 1];
        const nextSignature = `${model.messages.length}:${last?.id ?? ""}:${last?.content?.length ?? 0}`;
        const prevSignature = prevMessageSignatureRefs.current[model.id];

        // Keep the initial viewport at the top; auto-scroll only after chat updates.
        if (prevSignature && prevSignature !== nextSignature) {
          el.scrollTop = el.scrollHeight;
        }
        prevMessageSignatureRefs.current[model.id] = nextSignature;
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [models]);

  const kbOptions = useMemo<SelectOption[]>(() => {
    return kbItems.filter((kb) => !kb.is_admin).map((kb) => ({
      id: kb.id,
      label: kb.title,
      description: makeSnippet(kb.content),
    }));
  }, [kbItems]);

  const adminKbOptions = useMemo<SelectOption[]>(() => {
    return kbItems.filter((kb) => kb.is_admin).map((kb) => ({
      id: kb.id,
      label: kb.title,
      description: `${kb.applies_to_user ? "적용됨" : "미적용"} · ${makeSnippet(kb.content)}`,
    }));
  }, [kbItems]);

  const toolOptions = useMemo<SelectOption[]>(() => {
    return tools.map((tool) => ({ id: tool.id, label: tool.name, description: tool.description || undefined }));
  }, [tools]);

  const llmOptions = useMemo<SelectOption[]>(
    () => [
      { id: "chatgpt", label: "ChatGPT" },
      { id: "gemini", label: "Gemini" },
    ],
    []
  );

  const routeOptions = useMemo<SelectOption[]>(
    () => [
      { id: "legacy", label: "Legacy", description: "/api/playground/chat" },
      { id: "mk2", label: "MK2", description: "/api/playground/chat_mk2" },
    ],
    []
  );

  const toolById = useMemo(() => {
    const map = new Map<string, MpcTool>();
    tools.forEach((tool) => map.set(tool.id, tool));
    return map;
  }, [tools]);

  const updateModel = (id: string, updater: (model: ModelState) => ModelState) => {
    setModels((prev) => prev.map((model) => (model.id === id ? updater(model) : model)));
  };

  const toggleChatExpanded = (id: string) => {
    updateModel(id, (model) => ({
      ...model,
      chatExpanded: !model.chatExpanded,
    }));
  };

  const resetModel = (id: string) => {
    updateModel(id, (model) => ({
      ...model,
      sessionId: null,
      messages: [],
      messageLogs: {},
      lastLogAt: null,
    }));
  };

  const handleResetAll = () => {
    setModels((prev) =>
      prev.map((model) => ({
        ...model,
        sessionId: null,
        messages: [],
        messageLogs: {},
        lastLogAt: null,
      }))
    );
  };

  const handleAddModel = () => {
    setModels((prev) => {
      if (prev.length >= MAX_MODELS) return prev;
      return [...prev, createDefaultModel()];
    });
  };

  const handleRemoveModel = (id: string) => {
    setModels((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((model) => model.id !== id);
    });
  };

  const sendMessage = async (config: ModelConfig, sessionId: string | null, message: string) => {
    return apiFetch<{ session_id: string; message?: string; turn_id?: string | null }>("/api/labolatory/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route: config.route,
        llm: config.llm,
        kb_id: config.kbId,
        admin_kb_ids: config.adminKbIds,
        mcp_tool_ids: config.mcpToolIds,
        message,
        session_id: sessionId || undefined,
      }),
    });
  };

  const handleSend = async (e: React.FormEvent, modelId: string) => {
    e.preventDefault();
    const target = models.find((model) => model.id === modelId);
    if (!target) return;
    const text = target.input.trim();
    if (!text) return;
    if (!target.config.kbId) {
      toast.error("KB를 선택하세요.");
      return;
    }
    updateModel(modelId, (model) => ({
      ...model,
      input: "",
      sending: true,
    }));

    const userMessage = { id: makeId(), role: "user" as const, content: text };
    updateModel(modelId, (model) => ({
      ...model,
      messages: [...model.messages, userMessage],
    }));

    const result = await sendMessage(target.config, target.sessionId, text).then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason) => ({ status: "rejected" as const, reason })
    );

    if (result.status === "fulfilled") {
      const res = result.value;
      const botMessageId = res.message ? makeId() : null;
      updateModel(modelId, (model) => ({
        ...model,
        sessionId: res.session_id || model.sessionId,
        messages: botMessageId
          ? [
            ...model.messages,
            { id: botMessageId, role: "bot", content: res.message || "", turnId: res.turn_id || null },
          ]
          : model.messages,
        sending: false,
      }));
      if (botMessageId) {
        await loadLogs(modelId, botMessageId, res.session_id || target.sessionId);
      }
    } else {
      updateModel(modelId, (model) => ({
        ...model,
        messages: [...model.messages, { id: makeId(), role: "bot", content: "응답 실패" }],
        sending: false,
      }));
      toast.error("응답에 실패했습니다.");
    }
  };

  const loadLogs = async (id: string, messageId: string, sessionIdOverride?: string | null) => {
    const target = models.find((model) => model.id === id);
    const sessionId = sessionIdOverride ?? target?.sessionId;
    if (!sessionId) return;
    updateModel(id, (model) => ({
      ...model,
      messageLogs: {
        ...model.messageLogs,
        [messageId]: {
          mcp_logs: model.messageLogs[messageId]?.mcp_logs || [],
          event_logs: model.messageLogs[messageId]?.event_logs || [],
          debug_logs: model.messageLogs[messageId]?.debug_logs || [],
          logsError: null,
          logsLoading: true,
        },
      },
    }));
    try {
      const data = await apiFetch<LabLog>(
        `/api/labolatory/logs?session_id=${encodeURIComponent(sessionId)}&limit=30`
      );
      const sinceTs = target?.lastLogAt ? toTimestamp(target.lastLogAt) : 0;
      const mcpLogs = (data.mcp_logs || []).filter((log) => toTimestamp(log.created_at) > sinceTs);
      const eventLogs = (data.event_logs || []).filter((log) => toTimestamp(log.created_at) > sinceTs);
      const debugLogs = (data.debug_logs || []).filter((log) => toTimestamp(log.created_at) > sinceTs);
      const newestTs = Math.max(
        ...[...data.mcp_logs, ...data.event_logs, ...(data.debug_logs || [])].map((log) =>
          toTimestamp(log.created_at)
        ),
        sinceTs
      );
      updateModel(id, (model) => ({
        ...model,
        messageLogs: {
          ...model.messageLogs,
          [messageId]: {
            mcp_logs: mcpLogs,
            event_logs: eventLogs,
            debug_logs: debugLogs,
            logsError: null,
            logsLoading: false,
          },
        },
        lastLogAt: newestTs > 0 ? new Date(newestTs).toISOString() : model.lastLogAt,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "로그를 불러오지 못했습니다.";
      updateModel(id, (model) => ({
        ...model,
        messageLogs: {
          ...model.messageLogs,
          [messageId]: {
            mcp_logs: [],
            event_logs: [],
            debug_logs: [],
            logsError: message,
            logsLoading: false,
          },
        },
      }));
    }
  };

  const handleCopyTranscript = async (id: string) => {
    const target = models.find((model) => model.id === id);
    if (!target) return;
    const auditStatus = (() => {
      const bundles = Object.values(target.messageLogs || {});
      const allMcpLogs = bundles.flatMap((bundle) => bundle.mcp_logs || []);
      const allEventLogs = bundles.flatMap((bundle) => bundle.event_logs || []);
      const allDebugLogs = bundles.flatMap((bundle) => bundle.debug_logs || []);
      const hasLoading = bundles.some((bundle) => bundle.logsLoading);
      const hasError = bundles.some((bundle) => Boolean(bundle.logsError));
      const blocked = new Set<string>();
      if (hasLoading || hasError) {
        blocked.add("F_audit_mcp_tools");
        blocked.add("F_audit_events");
        blocked.add("F_audit_turn_specs");
      }

      const getDebugFunctions = () => {
        const functions = new Set<string>();
        allDebugLogs.forEach((log) => {
          const entries = Array.isArray((log.prefix_json as any)?.entries) ? (log.prefix_json as any).entries : [];
          entries.forEach((entry: any) => {
            if (String(entry.key) === "MCP.last_function" && entry.value && entry.value !== "-") {
              functions.add(String(entry.value));
            }
          });
        });
        return Array.from(functions);
      };

      const expected = {
        mcp_tools: Array.from(new Set(allMcpLogs.map((log) => String(log.tool_name || "-")).filter((v) => v !== "-"))),
        event_types: Array.from(new Set(allEventLogs.map((log) => String(log.event_type || "-")).filter((v) => v !== "-"))),
        debug_functions: getDebugFunctions(),
      };

      const completed = new Set<string>();
      const incomplete = new Map<string, string[]>();

      if (!blocked.has("F_audit_mcp_tools")) {
        expected.mcp_tools.forEach((tool) => {
          const logs = allMcpLogs.filter((log) => log.tool_name === tool);
          const missing = logs.some((log) => {
            const status = String(log.status || "").trim();
            const request = log.request_payload;
            const response = log.response_payload || log.policy_decision;
            return !status || !request || !response;
          });
          if (missing) {
            const reasons: string[] = [];
            logs.forEach((log) => {
              const status = String(log.status || "").trim();
              const request = log.request_payload;
              const response = log.response_payload || log.policy_decision;
              if (!status) reasons.push("status 누락");
              if (!request) reasons.push("request_payload 누락");
              if (!response) reasons.push("response_payload/policy_decision 누락");
            });
            incomplete.set(`mcp.${tool}`, Array.from(new Set(reasons)));
          } else {
            completed.add(`mcp.${tool}`);
          }
        });
      }

      if (!blocked.has("F_audit_events")) {
        expected.event_types.forEach((eventType) => {
          const logs = allEventLogs.filter((log) => log.event_type === eventType);
          const missing = logs.some((log) => {
            const type = String(log.event_type || "").trim();
            const payload = log.payload;
            return !type || !payload;
          });
          if (missing) {
            const reasons: string[] = [];
            logs.forEach((log) => {
              const type = String(log.event_type || "").trim();
              const payload = log.payload;
              if (!type) reasons.push("event_type 누락");
              if (!payload) reasons.push("payload 누락");
            });
            incomplete.set(`event.${eventType}`, Array.from(new Set(reasons)));
          } else {
            completed.add(`event.${eventType}`);
          }
        });
      }

      if (!blocked.has("F_audit_turn_specs")) {
        if (expected.debug_functions.length === 0 && allDebugLogs.length > 0) {
          incomplete.set("debug.MCP.last_function", ["MCP.last_function 누락"]);
        } else {
          expected.debug_functions.forEach((fn) => {
            const logs = allDebugLogs.filter((log) => {
              const entries = Array.isArray((log.prefix_json as any)?.entries) ? (log.prefix_json as any).entries : [];
              return entries.some((entry: any) => entry.key === "MCP.last_function" && entry.value === fn);
            });
            const missing = logs.some((log) => {
              const prefix = log.prefix_json as any;
              const entries = Array.isArray(prefix?.entries) ? prefix.entries : [];
              return !prefix || entries.length === 0;
            });
            if (missing) {
              const reasons = ["prefix_json.entries 누락"];
              incomplete.set(`debug.${fn}`, reasons);
            } else {
              completed.add(`debug.${fn}`);
            }
          });
        }
      }

      return {
        completed: Array.from(completed),
        incomplete: Array.from(incomplete.entries()).map(([key, reasons]) => ({
          key,
          reasons,
        })),
        blocked: Array.from(blocked),
        expected,
      };
    })();
    const corePrinciple = [
      "디버그 대원칙:",
      "- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)",
      "- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.",
      "- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).",
      "- 실패 지점의 직전/직후 로그를 반드시 기록한다.",
      "",
      `기대 목록(MCP): ${auditStatus.expected.mcp_tools.length ? auditStatus.expected.mcp_tools.join(", ") : "-"}`,
      `기대 목록(Event): ${auditStatus.expected.event_types.length ? auditStatus.expected.event_types.join(", ") : "-"}`,
      `기대 목록(Debug): ${auditStatus.expected.debug_functions.length ? auditStatus.expected.debug_functions.join(", ") : "-"}`,
      "",
      `점검 완료 항목: ${auditStatus.completed.length ? auditStatus.completed.join(", ") : "-"}`,
      `점검 미완료: ${auditStatus.incomplete.length
        ? auditStatus.incomplete.map((item) => `${item.key}(${item.reasons.join(", ")})`).join(", ")
        : "-"
      }`,
      `점검 불가: ${auditStatus.blocked.length ? auditStatus.blocked.join(", ") : "-"}`,
      "",
    ].join("\n");
    const transcript = corePrinciple + target.messages
      .map((msg) => {
        const speaker = msg.role === "user" ? "USER" : "BOT";
        const body =
          msg.role === "bot" && msg.content.includes("debug_prefix")
            ? extractDebugText(msg.content)
            : msg.content;
        const logText = msg.role === "bot" ? formatLogBundle(target.messageLogs[msg.id], msg.turnId) : "";
        const turnLine = msg.role === "bot" && msg.turnId ? `\nTURN_ID: ${msg.turnId}` : "";
        return `${speaker}:\n${body}${turnLine}${logText ? `\n${logText}` : ""}`;
      })
      .join("\n\n");
    if (!transcript.trim()) {
      toast.error("복사할 대화가 없습니다.");
      return;
    }
    try {
      await navigator.clipboard.writeText(transcript);
      toast.success("대화를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleCopyIssueTranscript = async (id: string) => {
    const target = models.find((model) => model.id === id);
    if (!target) return;
    const lines: string[] = [];
    target.messages.forEach((msg, index) => {
      if (msg.role !== "bot") return;
      const bundle = target.messageLogs[msg.id];
      if (!hasIssue(bundle, msg.turnId)) return;
      const prev = target.messages[index - 1];
      if (prev && prev.role === "user") {
        lines.push(`USER:\n${prev.content}`);
      }
      const body =
        msg.content.includes("debug_prefix") ? extractDebugText(msg.content) : msg.content;
      const logText = formatIssueBundle(bundle, msg.turnId);
      const turnLine = msg.turnId ? `\nTURN_ID: ${msg.turnId}` : "";
      lines.push(`BOT:\n${body}${turnLine}${logText ? `\n${logText}` : ""}`);
    });
    const transcript = lines.join("\n\n");
    if (!transcript.trim()) {
      toast.error("복사할 오류 로그가 없습니다.");
      return;
    }
    try {
      await navigator.clipboard.writeText(transcript);
      toast.success("문제 로그를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleCopySessionId = async (sessionId?: string | null) => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.success("세션 ID를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleDeleteSession = async (id: string) => {
    const target = models.find((model) => model.id === id);
    if (!target) return;
    if (!target.sessionId) {
      updateModel(id, (model) => ({
        ...model,
        messages: [],
        messageLogs: {},
        lastLogAt: null,
        sessionId: null,
      }));
      toast.success("세션이 초기화되었습니다.");
      return;
    }
    if (!window.confirm("이 세션과 관련된 대화(turns)를 삭제할까요?")) return;
    try {
      await apiFetch(`/api/sessions/${target.sessionId}`, { method: "DELETE" });
      updateModel(id, (model) => ({
        ...model,
        sessionId: null,
        messages: [],
        messageLogs: {},
        lastLogAt: null,
      }));
      toast.success("세션이 삭제되었습니다.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "세션 삭제에 실패했습니다.";
      toast.error(message || "세션 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">실험실</h1>
            <p className="mt-1 text-sm text-slate-500">
              LLM · KB · MCP · Route 조합을 여러 개 동시에 비교해 품질을 확인하세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleResetAll}>
              초기화
            </Button>
            <Button type="button" onClick={handleAddModel} disabled={models.length >= MAX_MODELS}>
              <Plus className="mr-2 h-4 w-4" />
              모델 추가
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="text-sm text-slate-500">데이터를 불러오는 중...</div>
          ) : null}
          {error ? <div className="text-sm text-rose-600">{error}</div> : null}
          {!loading && !error && kbItems.length === 0 ? (
            <div className="text-sm text-slate-500">비교할 KB가 없습니다.</div>
          ) : null}
          {!loading && !error && kbItems.length > 0 ? (
            models.map((model, index) => {
              return (
                <Card key={`model-${model.id}`} className="overflow-visible p-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => handleRemoveModel(model.id)}
                        disabled={models.length <= 1}
                        aria-label={`Model ${index + 1} Remove`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="text-sm font-semibold text-slate-900">Model {index + 1}</div>
                      <div className=" flex items-center gap-2 text-xs text-slate-500">
                        설정을 변경하면 해당 모델의 대화가 초기화됩니다.
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <button
                        type="button"
                        className="mr-auto inline-flex h-8 items-center rounded-md border border-transparent px-2 text-left text-xs text-slate-500 hover:text-slate-700 disabled:opacity-60"
                        onClick={() => handleCopySessionId(model.sessionId)}
                        disabled={!model.sessionId}
                        aria-label="세션 ID 복사"
                      >
                        {model.sessionId || "-"}
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        onClick={() => {
                          if (model.sessionId) {
                            window.open(`/app/calls/${encodeURIComponent(model.sessionId)}`, "_blank", "noopener,noreferrer");
                          }
                        }}
                        disabled={!model.sessionId}
                        aria-label="새탭 열기"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        onClick={() => handleDeleteSession(model.id)}
                        disabled={!model.sessionId && model.messages.length === 0}
                        aria-label="세션 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        onClick={() => handleCopyTranscript(model.id)}
                        disabled={model.messages.length === 0}
                        aria-label="대화 복사"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        onClick={() => handleCopyIssueTranscript(model.id)}
                        disabled={model.messages.length === 0}
                        aria-label="문제 로그 복사"
                        title="문제 로그 복사"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-0 lg:grid-cols-[1fr_1.2fr]">
                    <div className="p-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <SelectPopover
                              value={model.config.llm}
                              onChange={(value) => {
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  config: { ...m.config, llm: value },
                                }));
                                resetModel(model.id);
                              }}
                              options={llmOptions}
                              className="flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                              onClick={() =>
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  detailsOpen: { ...m.detailsOpen, llm: !m.detailsOpen.llm },
                                }))
                              }
                              aria-label="LLM 정보"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </div>
                          {model.detailsOpen.llm ? (
                            <textarea
                              readOnly
                              value={describeLlm(model.config.llm)}
                              className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <SelectPopover
                              value={model.config.kbId}
                              onChange={(value) => {
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  config: { ...m.config, kbId: value },
                                }));
                                resetModel(model.id);
                              }}
                              options={kbOptions}
                              searchable
                              className="flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                              onClick={() =>
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  detailsOpen: { ...m.detailsOpen, kb: !m.detailsOpen.kb },
                                }))
                              }
                              aria-label="KB 정보"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </div>
                          {model.detailsOpen.kb ? (
                            <textarea
                              readOnly
                              value={kbItems.find((kb) => kb.id === model.config.kbId)?.content || "내용 없음"}
                              className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <MultiSelectPopover
                              values={model.config.adminKbIds}
                              onChange={(values) => {
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  config: { ...m.config, adminKbIds: values },
                                }));
                                resetModel(model.id);
                              }}
                              options={adminKbOptions}
                              placeholder="관리자 KB 선택"
                              displayMode="count"
                              showBulkActions
                              className="flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                              onClick={() =>
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  detailsOpen: { ...m.detailsOpen, adminKb: !m.detailsOpen.adminKb },
                                }))
                              }
                              aria-label="관리자 KB 정보"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </div>
                          {model.detailsOpen.adminKb ? (
                            <textarea
                              readOnly
                              value={
                                model.config.adminKbIds.length === 0
                                  ? "선택된 관리자 KB 없음"
                                  : model.config.adminKbIds
                                    .map((id) => {
                                      const kb = kbItems.find((item) => item.id === id);
                                      if (!kb) return null;
                                      const status = kb.applies_to_user ? "적용됨" : "미적용";
                                      return `• ${kb.title} (${status})\n${kb.content || "내용 없음"}`;
                                    })
                                    .filter(Boolean)
                                    .join("\n\n")
                              }
                              className="mt-2 min-h-[80px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <MultiSelectPopover
                              values={model.config.mcpToolIds}
                              onChange={(values) => {
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  config: { ...m.config, mcpToolIds: values },
                                }));
                                resetModel(model.id);
                              }}
                              options={toolOptions}
                              placeholder="MCP 도구 선택"
                              displayMode="count"
                              showBulkActions
                              className="flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                              onClick={() =>
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  detailsOpen: { ...m.detailsOpen, mcp: !m.detailsOpen.mcp },
                                }))
                              }
                              aria-label="MCP 정보"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </div>
                          {model.detailsOpen.mcp ? (
                            <textarea
                              readOnly
                              value={
                                model.config.mcpToolIds.length === 0
                                  ? "연결 없음"
                                  : model.config.mcpToolIds
                                    .map((id) => {
                                      const tool = toolById.get(id);
                                      if (!tool) return null;
                                      const desc = tool.description ? tool.description : "설명 없음";
                                      return `• ${tool.name}: ${desc}`;
                                    })
                                    .filter(Boolean)
                                    .join("\n")
                              }
                              className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <SelectPopover
                              value={model.config.route}
                              onChange={(value) => {
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  config: { ...m.config, route: value },
                                }));
                                resetModel(model.id);
                              }}
                              options={routeOptions}
                              className="flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                              onClick={() =>
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  detailsOpen: { ...m.detailsOpen, route: !m.detailsOpen.route },
                                }))
                              }
                              aria-label="Route 정보"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </div>
                          {model.detailsOpen.route ? (
                            <textarea
                              readOnly
                              value={describeRoute(model.config.route)}
                              className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "relative border-t border-slate-200 p-4 lg:border-l lg:border-t-0 flex flex-col overflow-visible",
                        model.chatExpanded ? "max-h-[600px]" : "max-h-[270px]"
                      )}
                    >
                      <div className="relative flex-1 min-h-0 overflow-hidden">
                        <div
                          ref={(el) => {
                            chatScrollRefs.current[model.id] = el;
                          }}
                          className="relative z-0 h-full space-y-4 overflow-auto pr-2 pl-2 pt-2 pb-4 scrollbar-hide bg-slate-50 rounded-xl"
                        >
                          {model.messages.map((msg) => {
                            const hasDebug = msg.role === "bot" && msg.content.includes("debug_prefix");
                            const debugParts = hasDebug ? getDebugParts(msg.content) : null;
                            return (
                              <div
                                key={msg.id}
                                className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                              >
                                {msg.role === "bot" ? (
                                  <div className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                                    <Bot className="h-4 w-4 text-slate-500" />
                                  </div>
                                ) : null}
                                <div
                                  className={cn(
                                    "max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm",
                                    msg.role === "user"
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-700 border border-slate-200"
                                  )}
                                >
                                  {hasDebug && debugParts ? (
                                    debugParts.answerHtml ? (
                                      <span dangerouslySetInnerHTML={{ __html: debugParts.answerHtml }} />
                                    ) : (
                                      debugParts.answerText || ""
                                    )
                                  ) : msg.role === "bot" ? (
                                    renderBotContent(msg.content)
                                  ) : (
                                    msg.content
                                  )}
                                </div>
                                {msg.role === "user" ? (
                                  <div className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                                    <User className="h-4 w-4 text-slate-500" />
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-white to-transparent" />
                      </div>
                      <div className="pointer-events-none absolute left-1/2 bottom-0 z-20 -translate-x-1/2 translate-y-1/2">
                        <button
                          type="button"
                          onClick={() => toggleChatExpanded(model.id)}
                          className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400 bg-white text-slate-600 hover:bg-slate-50"
                          aria-label={model.chatExpanded ? "채팅 높이 줄이기" : "채팅 높이 늘리기"}
                        >
                          {model.chatExpanded ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </button>
                      </div>
                      <form onSubmit={(e) => handleSend(e, model.id)} className="relative z-20 flex gap-2 bg-white">
                        <Input
                          value={model.input}
                          onChange={(e) =>
                            updateModel(model.id, (m) => ({
                              ...m,
                              input: e.target.value,
                            }))
                          }
                          placeholder="비교할 질문을 입력하세요"
                          className="flex-1"
                        />
                        <Button type="submit" disabled={!model.input.trim() || model.sending || !model.config.kbId}>
                          <Send className="mr-2 h-4 w-4" />
                          {model.sending ? "전송 중" : "전송"}
                        </Button>
                      </form>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : null}

        </div>
      </div>
    </div>
  );
}
