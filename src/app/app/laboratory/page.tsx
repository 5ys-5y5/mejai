"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Bot, Check, Copy, CornerDownRight, ExternalLink, Info, Loader2, Minus, Plus, RefreshCw, Send, Settings2, Trash2, User, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MultiSelectPopover, SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { formatKstDateTime } from "@/lib/kst";
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
  tool_key?: string;
  provider_key?: string;
  name: string;
  description?: string | null;
  provider?: string;
};

type McpProvider = {
  key: string;
  title: string;
  description?: string;
  action_count?: number;
  actions?: MpcTool[];
};

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  richHtml?: string;
  turnId?: string | null;
  isLoading?: boolean;
  loadingLogs?: string[];
  quickReplies?: Array<{ label: string; value: string }>;
  quickReplyConfig?: {
    selection_mode: "single" | "multi";
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
    criteria?: string;
    source_function?: string;
    source_module?: string;
  };
  productCards?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    value: string;
  }>;
  responseSchema?: {
    message: string | null;
    ui_hints?: {
      view?: "text" | "choice" | "cards";
      choice_mode?: "single" | "multi";
    };
    quick_replies?: Array<{ label: string; value: string }>;
    quick_reply_config?: {
      selection_mode: "single" | "multi";
      min_select?: number;
      max_select?: number;
      submit_format?: "single" | "csv";
      criteria?: string;
      source_function?: string;
      source_module?: string;
    } | null;
    cards?: Array<Record<string, unknown>>;
  };
  responseSchemaIssues?: string[];
};

type AgentItem = {
  id: string;
  parent_id?: string | null;
  name: string;
  llm: "chatgpt" | "gemini" | null;
  kb_id: string | null;
  mcp_tool_ids?: string[] | null;
  version?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type SessionItem = {
  id: string;
  session_code: string | null;
  started_at: string | null;
  agent_id: string | null;
  caller_masked?: string | null;
  metadata?: Record<string, unknown> | null;
};

type TurnRow = {
  id: string;
  seq: number | null;
  transcript_text: string | null;
  answer_text: string | null;
  final_answer: string | null;
};

type ConversationMode = "history" | "edit" | "new";
type SetupMode = "existing" | "new";

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
    tool_version?: string | null;
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
  mcpProviderKeys: string[];
  mcpToolIds: string[];
  route: string;
};

type ModelState = {
  id: string;
  config: ModelConfig;
  sessionId: string | null;
  messages: ChatMessage[];
  selectedMessageIds: string[];
  messageLogs: Record<string, MessageLogBundle>;
  lastLogAt: string | null;
  layoutExpanded: boolean;
  detailsOpen: {
    llm: boolean;
    kb: boolean;
    adminKb: boolean;
    mcp: boolean;
    route: boolean;
  };
  input: string;
  sending: boolean;
  selectedAgentGroupId: string;
  selectedAgentId: string;
  sessions: SessionItem[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  selectedSessionId: string | null;
  historyMessages: ChatMessage[];
  conversationMode: ConversationMode;
  editSessionId: string | null;
  setupMode: SetupMode;
  adminLogControlsOpen: boolean;
  showAdminLogs: boolean;
  chatSelectionEnabled: boolean;
};

const MAX_MODELS = 5;
const WS_URL = process.env.NEXT_PUBLIC_CALL_WS_URL || "";
const EXPANDED_PANEL_HEIGHT = 600;
function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeTraceId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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

function renderStructuredChoiceContent(content: string) {
  if (!content) return null;
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const items = lines
    .map((line) => {
      const match = line.match(/^-\s*(\d{1,2})번\s*\|\s*(.+)$/);
      if (!match) return null;
      const idx = match[1];
      const cols = String(match[2] || "")
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      if (cols.length === 0) return null;
      return { idx, cols };
    })
    .filter((row): row is { idx: string; cols: string[] } => Boolean(row));
  if (items.length === 0) return null;
  const example = lines.find((line) => /^예\s*:/.test(line));
  return (
    <div className="space-y-2">
      <div className="font-semibold text-slate-700">{lines[0]}</div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full table-fixed border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="w-12 border-b border-slate-200 px-2 py-1.5 text-center font-semibold">번호</th>
              <th className="border-b border-slate-200 px-2 py-1.5 text-left font-semibold">항목</th>
              <th className="w-28 border-b border-slate-200 px-2 py-1.5 text-left font-semibold">상세</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const main = row.cols[0] || "";
              const detail = row.cols.slice(1).join(" / ");
              return (
                <tr key={`${row.idx}-${row.cols.join("|")}`} className="text-slate-700">
                  <td className="border-b border-slate-100 px-2 py-1.5 text-center font-semibold">{row.idx}</td>
                  <td className="border-b border-slate-100 px-2 py-1.5 break-words">{main}</td>
                  <td className="border-b border-slate-100 px-2 py-1.5 text-slate-500 break-words">{detail || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {example ? <div className="text-[11px] text-slate-500">입력 예시: {example.replace(/^예\s*:\s*/, "")}</div> : null}
    </div>
  );
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

function stringifyPretty(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return JSON.stringify({ error: "SERIALIZE_FAILED" }, null, 2);
  }
}

function indentBlock(value: string, spaces = 2) {
  const pad = " ".repeat(Math.max(0, spaces));
  return String(value || "")
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
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
      const codeRef = formatDecisionCodeRef((log.prefix_json as any)?.decision);
      if (codeRef) lines.push(`  code_ref: ${codeRef}`);
      lines.push("  prefix_json:");
      lines.push(indentBlock(stringifyPretty(log.prefix_json || {}), 4));
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
      lines.push(
        `- ${log.id || "-"} ${log.tool_name}@${log.tool_version || "-"}: ${log.status} (${log.created_at || "-"}) (turn_id=${turnLabel})`
      );
      lines.push("  request:");
      lines.push(indentBlock(stringifyPretty(log.request_payload || {}), 4));
      lines.push("  response:");
      lines.push(indentBlock(stringifyPretty(log.response_payload || log.policy_decision || {}), 4));
    });
  }
  if (bundle.event_logs.length > 0) {
    lines.push("이벤트 로그:");
    bundle.event_logs.forEach((log) => {
      const turnLabel = log.turn_id || turnId || "-";
      const safePayload = sanitizeEventPayloadForDisplay(log.event_type, log.payload || {});
      lines.push(`- ${log.id || "-"} ${log.event_type} (${log.created_at || "-"}) (turn_id=${turnLabel})`);
      const codeRef = formatDecisionCodeRef((safePayload as any)?._decision);
      if (codeRef) lines.push(`  code_ref: ${codeRef}`);
      lines.push("  payload:");
      lines.push(indentBlock(stringifyPretty(safePayload), 4));
    });
  }
  return lines.join("\n");
}

function extractCallToolNames(input: unknown) {
  if (!Array.isArray(input)) return [] as string[];
  return input
    .map((call) => {
      if (!call || typeof call !== "object") return "";
      const name = (call as Record<string, unknown>).name;
      return typeof name === "string" ? name.trim() : "";
    })
    .filter(Boolean);
}

function normalizeToolNameFromKey(value: string) {
  const raw = String(value || "").trim();
  if (!raw.includes(":")) return raw;
  const parts = raw.split(":");
  return parts.slice(1).join(":").trim() || raw;
}

function sanitizeEventPayloadForDisplay(eventType: string, payload: Record<string, unknown>) {
  const type = String(eventType || "").toUpperCase();
  if (type !== "PRE_MCP_DECISION") return payload;
  const allowed = Array.isArray(payload.allowed_tool_names) ? payload.allowed_tool_names.map(String) : [];
  if (allowed.length === 0) return payload;
  const used = new Set<string>([
    ...extractCallToolNames(payload.final_calls),
    ...extractCallToolNames(payload.forced_calls),
  ]);
  const filtered = allowed.filter((key) => used.has(normalizeToolNameFromKey(key)));
  return {
    ...payload,
    allowed_tool_names_total: allowed.length,
    allowed_tool_names: filtered.slice(0, 30),
  };
}

function formatDecisionCodeRef(decision: any) {
  if (!decision || typeof decision !== "object") return null;
  const modulePath = String(decision.module_path || "").trim();
  const functionName = String(decision.function_name || "").trim();
  const line = Number(decision.line || 0);
  const column = Number(decision.column || 0);
  if (!modulePath || modulePath === "unknown") return null;
  const fnPart = functionName ? `#${functionName}` : "";
  const linePart = line > 0 ? `:${line}${column > 0 ? `:${column}` : ""}` : "";
  return `${modulePath}${linePart}${fnPart}`;
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
  const map = new Map(entries.map((entry: any) => [String(entry.key), String(entry.value ?? "")]));
  const prefix = (log.prefix_json || {}) as Record<string, unknown>;
  const mcp = (prefix.mcp || {}) as Record<string, unknown>;
  const mcpLast = (mcp.last || {}) as Record<string, unknown>;
  if (!map.has("MCP.last_function") && typeof mcpLast.function === "string") {
    map.set("MCP.last_function", String(mcpLast.function));
  }
  if (!map.has("MCP.last_status") && typeof mcpLast.status === "string") {
    map.set("MCP.last_status", String(mcpLast.status));
  }
  if (!map.has("MCP.last_error") && mcpLast.error !== undefined && mcpLast.error !== null) {
    map.set("MCP.last_error", String(mcpLast.error));
  }
  return map;
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
      const codeRef = formatDecisionCodeRef((log.prefix_json as any)?.decision);
      if (codeRef) lines.push(`  code_ref: ${codeRef}`);
      lines.push("  prefix_json:");
      lines.push(indentBlock(stringifyPretty(log.prefix_json || {}), 4));
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
      lines.push(
        `- ${log.id || "-"} ${log.tool_name}@${log.tool_version || "-"}: ${log.status} (${log.created_at || "-"}) (turn_id=${turnLabel})`
      );
      lines.push("  request:");
      lines.push(indentBlock(stringifyPretty(log.request_payload || {}), 4));
      lines.push("  response:");
      lines.push(indentBlock(stringifyPretty(log.response_payload || log.policy_decision || {}), 4));
    });
  }
  const eventLogs = bundle.event_logs.filter((log) => isEventIssue(log));
  if (eventLogs.length > 0) {
    lines.push("이벤트 로그:");
    eventLogs.forEach((log) => {
      const turnLabel = log.turn_id || turnId || "-";
      const safePayload = sanitizeEventPayloadForDisplay(log.event_type, log.payload || {});
      lines.push(`- ${log.id || "-"} ${log.event_type} (${log.created_at || "-"}) (turn_id=${turnLabel})`);
      const codeRef = formatDecisionCodeRef((safePayload as any)?._decision);
      if (codeRef) lines.push(`  code_ref: ${codeRef}`);
      lines.push("  payload:");
      lines.push(indentBlock(stringifyPretty(safePayload), 4));
    });
  }
  return lines.join("\n");
}

function inferRuntimeUsageSummary(
  selectedMessages: ChatMessage[],
  messageLogs: Record<string, MessageLogBundle>
) {
  const buckets = {
    runtime: new Set<string>(),
    handlers: new Set<string>(),
    services: new Set<string>(),
    policies: new Set<string>(),
    shared: new Set<string>(),
  };
  const add = (bucket: keyof typeof buckets, path: string) => buckets[bucket].add(path);
  const addByPath = (rawPath?: string | null) => {
    const path = String(rawPath || "").trim().replace(/\\/g, "/");
    if (!path) return false;
    if (!path.includes("/src/app/api/runtime/chat/")) return false;
    if (path.includes("/runtime/")) add("runtime", path.slice(path.indexOf("/src/") + 1));
    else if (path.includes("/handlers/")) add("handlers", path.slice(path.indexOf("/src/") + 1));
    else if (path.includes("/services/")) add("services", path.slice(path.indexOf("/src/") + 1));
    else if (path.includes("/policies/")) add("policies", path.slice(path.indexOf("/src/") + 1));
    else if (path.includes("/shared/")) add("shared", path.slice(path.indexOf("/src/") + 1));
    else return false;
    return true;
  };

  const botMessages = selectedMessages.filter((msg) => msg.role === "bot");
  const bundles = botMessages
    .map((msg) => messageLogs[msg.id])
    .filter((bundle): bundle is MessageLogBundle => Boolean(bundle));
  const allMcpLogs = bundles.flatMap((bundle) => bundle.mcp_logs || []);
  const allEventLogs = bundles.flatMap((bundle) => bundle.event_logs || []);
  const allDebugLogs = bundles.flatMap((bundle) => bundle.debug_logs || []);
  let tracedCount = 0;
  allEventLogs.forEach((log) => {
    const decision = (log.payload as any)?._decision;
    if (addByPath(typeof decision?.module_path === "string" ? decision.module_path : null)) tracedCount += 1;
  });
  allDebugLogs.forEach((log) => {
    const decision = (log.prefix_json as any)?.decision;
    if (addByPath(typeof decision?.module_path === "string" ? decision.module_path : null)) tracedCount += 1;
  });

  if (tracedCount === 0) {
    const eventTypes = new Set(allEventLogs.map((log) => String(log.event_type || "").toUpperCase()).filter(Boolean));
    const toolNames = new Set(allMcpLogs.map((log) => String(log.tool_name || "").trim()).filter(Boolean));

    add("runtime", "src/app/api/runtime/chat/route.ts");
    add("runtime", "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts");

    if (allDebugLogs.length > 0) {
      add("runtime", "src/app/api/runtime/chat/runtime/runtimeConversationIoRuntime.ts");
      add("runtime", "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts");
      add("runtime", "src/app/api/runtime/chat/runtime/runtimeSupport.ts");
    }
    if (allEventLogs.length > 0) {
      add("services", "src/app/api/runtime/chat/services/auditRuntime.ts");
      add("runtime", "src/app/api/runtime/chat/presentation/ui-runtimeResponseRuntime.ts");
    }
    if (allMcpLogs.length > 0) {
      add("runtime", "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts");
      add("runtime", "src/app/api/runtime/chat/runtime/toolRuntime.ts");
      add("runtime", "src/app/api/runtime/chat/runtime/runtimeMcpOpsRuntime.ts");
      add("services", "src/app/api/runtime/chat/services/mcpRuntime.ts");
    }

    if (eventTypes.has("SLOT_EXTRACTED") || eventTypes.has("POLICY_STATIC_CONFLICT")) {
      add("runtime", "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts");
      add("runtime", "src/app/api/runtime/chat/runtime/policyInputRuntime.ts");
    }
    if (eventTypes.has("PRE_MCP_DECISION") || eventTypes.has("MCP_CALL_SKIPPED")) {
      add("runtime", "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts");
    }
    if (eventTypes.has("FINAL_ANSWER_READY")) {
      add("runtime", "src/app/api/runtime/chat/runtime/finalizeRuntime.ts");
    }
    if (eventTypes.has("CONTEXT_CONTAMINATION_DETECTED")) {
      add("runtime", "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts");
    }

    const hasRestockSignal =
      Array.from(toolNames).some((name) => ["resolve_product", "read_product", "subscribe_restock"].includes(name)) ||
      botMessages.some((msg) => /재입고|유사한 상품|입고 예정/.test(msg.content));
    if (hasRestockSignal) {
      add("handlers", "src/app/api/runtime/chat/handlers/restockHandler.ts");
      add("policies", "src/app/api/runtime/chat/policies/restockResponsePolicy.ts");
    }
    if (toolNames.has("update_order_shipping_address")) {
      add("handlers", "src/app/api/runtime/chat/handlers/orderChangeHandler.ts");
    }
    if (toolNames.has("create_ticket")) {
      add("handlers", "src/app/api/runtime/chat/handlers/refundHandler.ts");
    }

    add("runtime", "src/app/api/runtime/chat/runtime/runtimeBootstrap.ts");
    add("runtime", "src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts");
    add("runtime", "src/app/api/runtime/chat/runtime/runtimeStepContracts.ts");
    add("runtime", "src/app/api/runtime/chat/runtime/runtimePipelineState.ts");
    add("policies", "src/app/api/runtime/chat/policies/principles.ts");
    add("policies", "src/app/api/runtime/chat/policies/intentSlotPolicy.ts");
    add("shared", "src/app/api/runtime/chat/shared/slotUtils.ts");
    add("shared", "src/app/api/runtime/chat/shared/types.ts");
    add("services", "src/app/api/runtime/chat/services/dataAccess.ts");
  }

  return {
    runtime: Array.from(buckets.runtime),
    handlers: Array.from(buckets.handlers),
    services: Array.from(buckets.services),
    policies: Array.from(buckets.policies),
    shared: Array.from(buckets.shared),
  };
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
      mcpProviderKeys: [],
      mcpToolIds: [],
      route: "shipping",
    },
    sessionId: null,
    messages: [],
    selectedMessageIds: [],
    messageLogs: {},
    lastLogAt: null,
    layoutExpanded: false,
    detailsOpen: {
      llm: false,
      kb: false,
      adminKb: false,
      mcp: false,
      route: false,
    },
    input: "",
    sending: false,
    selectedAgentGroupId: "",
    selectedAgentId: "",
    sessions: [],
    sessionsLoading: false,
    sessionsError: null,
    selectedSessionId: null,
    historyMessages: [],
    conversationMode: "new",
    editSessionId: null,
    setupMode: "existing",
    adminLogControlsOpen: false,
    showAdminLogs: false,
    chatSelectionEnabled: false,
  };
}

function parseVersionParts(value?: string | null) {
  if (!value) return null;
  const raw = value.trim();
  const match = raw.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/i);
  if (!match) return null;
  const major = Number(match[1] || 0);
  const minor = Number(match[2] || 0);
  const patch = Number(match[3] || 0);
  return [major, minor, patch];
}

function compareAgentVersions(a: AgentItem, b: AgentItem) {
  const aParts = parseVersionParts(a.version);
  const bParts = parseVersionParts(b.version);
  if (aParts && bParts) {
    for (let i = 0; i < 3; i += 1) {
      if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i];
    }
  } else if (aParts && !bParts) {
    return -1;
  } else if (!aParts && bParts) {
    return 1;
  }
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bTime - aTime;
}

function makeSnippet(value?: string | null, max = 90) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text) return "내용 없음";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function describeRoute(route: string) {
  if (route === "shipping") {
    return "Core Runtime /api/runtime/chat (배송/주문 실행 엔진).";
  }
  return "Core Runtime /api/runtime/chat (배송/주문 실행 엔진).";
}

function describeLlm(llm: string) {
  if (llm === "chatgpt") return "OpenAI ChatGPT 모델 계열.";
  if (llm === "gemini") return "Google Gemini 모델 계열.";
  return "모델 정보 없음.";
}

function parseLeadDayValue(value: string) {
  const m = String(value || "").match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isLeadDaySelectionPrompt(content: string, quickReplies: Array<{ label: string; value: string }>) {
  if (!content || !quickReplies || quickReplies.length === 0) return false;
  if (content.includes("예약 알림일을 선택해 주세요")) return true;
  return quickReplies.every((item) => /^D-\d+$/i.test(String(item.label || "").trim()));
}

function isIntentDisambiguationMultiSelectPrompt(content: string, quickReplies: Array<{ label: string; value: string }>) {
  if (!content || !quickReplies || quickReplies.length === 0) return false;
  if (!content.includes("의도 확인") || !content.includes("복수 선택 가능")) return false;
  return quickReplies.every((item) => /^\d{1,2}$/.test(String(item.value || "").trim()));
}

function parseMinLeadDayRequired(content: string) {
  const m = String(content || "").match(/최소\s*(\d+)/);
  const n = m ? Number(m[1]) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default function LabolatoryPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [mcpProviders, setMcpProviders] = useState<McpProvider[]>([]);
  const [tools, setTools] = useState<MpcTool[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [wsStatus, setWsStatus] = useState("연결 대기");
  const wsRef = useRef<WebSocket | null>(null);

  const [models, setModels] = useState<ModelState[]>(() => [createDefaultModel()]);
  const [quickReplyDrafts, setQuickReplyDrafts] = useState<Record<string, string[]>>({});
  const [lockedReplySelections, setLockedReplySelections] = useState<Record<string, string[]>>({});
  const initialAgentSelectionAppliedRef = useRef(false);
  const chatScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const leftPaneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevMessageSignatureRefs = useRef<Record<string, string>>({});
  const [leftPaneHeights, setLeftPaneHeights] = useState<Record<string, number>>({});
  const [viewportTick, setViewportTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [kbRes, agentRes, profileRes] = await Promise.all([
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
          apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200").catch(() => ({ items: [] })),
          apiFetch<{ is_admin?: boolean }>("/api/user-profile").catch(() => ({ is_admin: false })),
        ]);
        const mcpRes = await apiFetch<{ providers?: McpProvider[] }>("/api/mcp").catch(() => ({
          providers: [],
        }));
        if (!mounted) return;
        setKbItems(kbRes.items || []);
        setAgents(agentRes.items || []);
        setIsAdminUser(Boolean(profileRes?.is_admin));
        const providers = mcpRes.providers || [];
        setMcpProviders(providers);
        const flattened = providers.flatMap((provider) =>
          (provider.actions || []).map((tool) => ({ ...tool, provider: provider.key }))
        );
        setTools(flattened);
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

  const connectWs = useCallback(() => {
    if (!WS_URL) {
      setWsStatus("WS URL 미설정");
      return;
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setWsStatus("연결 중");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.addEventListener("open", () => {
      setWsStatus("연결됨");
      ws.send(JSON.stringify({ type: "join" }));
    });
    ws.addEventListener("close", () => {
      setWsStatus("연결 종료");
    });
    ws.addEventListener("error", () => {
      setWsStatus("연결 오류");
    });
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      const ws = wsRef.current;
      if (ws) ws.close();
    };
  }, [connectWs]);

  useEffect(() => {
    const onResize = () => setViewportTick((v) => v + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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

  useEffect(() => {
    if (!mcpProviders.length) return;
    const allProviderKeys = mcpProviders.map((provider) => provider.key);
    setModels((prev) =>
      prev.map((model) => ({
        ...model,
        config:
          model.config.mcpProviderKeys.length === 0
            ? { ...model.config, mcpProviderKeys: allProviderKeys }
            : model.config,
      }))
    );
  }, [mcpProviders]);

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
      setLeftPaneHeights((prev) => {
        const next: Record<string, number> = {};
        const modelIds = new Set(models.map((m) => m.id));
        models.forEach((model) => {
          const leftEl = leftPaneRefs.current[model.id];
          if (!leftEl) {
            if (prev[model.id] != null) next[model.id] = prev[model.id];
            return;
          }
          // Keep the "original" height as the content-driven left pane height
          // while not expanded; when expanded, preserve last original height.
          if (model.layoutExpanded) {
            if (prev[model.id] != null) next[model.id] = prev[model.id];
            return;
          }
          next[model.id] = Math.round(leftEl.getBoundingClientRect().height);
        });
        Object.keys(prev).forEach((id) => {
          if (!modelIds.has(id)) delete next[id];
        });

        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length === nextKeys.length && nextKeys.every((k) => prev[k] === next[k])) {
          return prev;
        }
        return next;
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [models, viewportTick]);

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
  const adminKbIdSet = useMemo(() => new Set(kbItems.filter((kb) => kb.is_admin).map((kb) => kb.id)), [kbItems]);
  const latestAdminKbId = useMemo(
    () => kbItems.find((kb) => kb.is_admin && kb.applies_to_user !== false)?.id || kbItems.find((kb) => kb.is_admin)?.id || "",
    [kbItems]
  );

  const providerOptions = useMemo<SelectOption[]>(() => {
    return mcpProviders.map((provider) => ({
      id: provider.key,
      label: provider.title,
      description: provider.description || `${provider.action_count || 0} actions`,
    }));
  }, [mcpProviders]);

  const toolOptions = useMemo<SelectOption[]>(() => {
    const providerTitleByKey = new Map<string, string>();
    mcpProviders.forEach((provider) => {
      providerTitleByKey.set(provider.key, provider.title);
    });
    return tools.map((tool) => ({
      id: tool.id,
      label: tool.tool_key || (tool.provider_key ? `${tool.provider_key}:${tool.name}` : tool.name),
      description: tool.description || undefined,
      group: tool.provider ? providerTitleByKey.get(tool.provider) || tool.provider : "기타",
    }));
  }, [mcpProviders, tools]);

  const providerByKey = useMemo(() => {
    const map = new Map<string, McpProvider>();
    mcpProviders.forEach((provider) => map.set(provider.key, provider));
    return map;
  }, [mcpProviders]);

  const llmOptions = useMemo<SelectOption[]>(
    () => [
      { id: "chatgpt", label: "ChatGPT" },
      { id: "gemini", label: "Gemini" },
    ],
    []
  );

  const routeOptions = useMemo<SelectOption[]>(
    () => [
      { id: "shipping", label: "Core Runtime", description: "/api/runtime/chat" },
    ],
    []
  );

  const toolById = useMemo(() => {
    const map = new Map<string, MpcTool>();
    tools.forEach((tool) => map.set(tool.id, tool));
    return map;
  }, [tools]);

  const wsStatusDot = useMemo(() => {
    if (wsStatus === "연결됨") return "bg-emerald-500";
    if (wsStatus === "연결 중") return "bg-amber-400";
    if (wsStatus === "연결 종료" || wsStatus === "연결 오류") return "bg-rose-500";
    return "bg-slate-400";
  }, [wsStatus]);

  const agentVersionsByGroup = useMemo(() => {
    const map = new Map<string, AgentItem[]>();
    agents.forEach((agent) => {
      const groupId = agent.parent_id ?? agent.id;
      const list = map.get(groupId) || [];
      list.push(agent);
      map.set(groupId, list);
    });
    for (const [groupId, list] of map.entries()) {
      map.set(groupId, [...list].sort(compareAgentVersions));
    }
    return map;
  }, [agents]);

  const agentById = useMemo(() => {
    const map = new Map<string, AgentItem>();
    agents.forEach((agent) => map.set(agent.id, agent));
    return map;
  }, [agents]);

  const agentGroupOptions = useMemo<SelectOption[]>(() => {
    const options: SelectOption[] = [];
    for (const [groupId, versions] of agentVersionsByGroup.entries()) {
      const active = versions.find((item) => item.is_active) || versions[0];
      options.push({
        id: groupId,
        label: active?.name || groupId,
        description: `${versions.length}개 버전`,
      });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [agentVersionsByGroup]);

  const buildHistoryMessages = (turns: TurnRow[]) => {
    const acc: ChatMessage[] = [];
    turns.forEach((turn) => {
      if (turn.transcript_text) {
        acc.push({ id: `${turn.id}-user`, role: "user", content: turn.transcript_text });
      }
      const answer = turn.final_answer || turn.answer_text;
      if (answer) {
        acc.push({ id: `${turn.id}-bot`, role: "bot", content: answer });
      }
    });
    return acc;
  };

  const updateModel = (id: string, updater: (model: ModelState) => ModelState) => {
    setModels((prev) => prev.map((model) => (model.id === id ? updater(model) : model)));
  };

  const expandModelLayout = (id: string) => {
    updateModel(id, (model) => ({
      ...model,
      layoutExpanded: true,
    }));
  };

  const collapseModelLayout = (id: string) => {
    updateModel(id, (model) => ({
      ...model,
      layoutExpanded: false,
    }));
  };

  const resetModel = (id: string) => {
    updateModel(id, (model) => ({
      ...model,
      sessionId: null,
      messages: [],
      selectedMessageIds: [],
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
        selectedMessageIds: [],
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

  useEffect(() => {
    if (!isAdminUser || !latestAdminKbId) return;
    setModels((prev) => {
      let changed = false;
      const next = prev.map((model) => {
        if (model.setupMode !== "new") return model;
        const hasValidAdminKb =
          model.config.adminKbIds.length > 0 &&
          model.config.adminKbIds.some((id) => adminKbIdSet.has(id));
        if (hasValidAdminKb) return model;
        changed = true;
        return {
          ...model,
          config: {
            ...model.config,
            adminKbIds: [latestAdminKbId],
          },
        };
      });
      return changed ? next : prev;
    });
  }, [adminKbIdSet, isAdminUser, latestAdminKbId]);

  const handleRemoveModel = (id: string) => {
    setModels((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((model) => model.id !== id);
    });
  };

  const loadModelSessions = async (modelId: string, agentId: string) => {
    updateModel(modelId, (model) => ({
      ...model,
      sessionsLoading: true,
      sessionsError: null,
      sessions: [],
      selectedSessionId: null,
      historyMessages: [],
      editSessionId: null,
      sessionId: null,
      messages: [],
      selectedMessageIds: [],
      messageLogs: {},
      lastLogAt: null,
    }));
    try {
      const res = await apiFetch<{ items: SessionItem[] }>("/api/sessions?limit=100&order=started_at.desc");
      const filtered = (res.items || []).filter((s) => s.agent_id === agentId);
      updateModel(modelId, (model) => ({
        ...model,
        sessions: filtered,
        sessionsLoading: false,
        selectedSessionId: null,
        conversationMode: filtered.length === 0 ? "new" : model.conversationMode,
      }));
    } catch {
      updateModel(modelId, (model) => ({
        ...model,
        sessions: [],
        sessionsLoading: false,
        sessionsError: "세션 목록을 불러오지 못했습니다.",
      }));
    }
  };

  const handleSelectAgentGroup = (modelId: string, groupId: string) => {
    updateModel(modelId, (model) => ({
      ...model,
      selectedAgentGroupId: groupId,
      selectedAgentId: "",
      sessions: [],
      sessionsLoading: false,
      sessionsError: null,
      selectedSessionId: null,
      historyMessages: [],
      editSessionId: null,
      sessionId: null,
      messages: [],
      selectedMessageIds: [],
      messageLogs: {},
      lastLogAt: null,
      conversationMode: "history",
      input: "",
    }));
  };

  const handleSelectAgentVersion = async (modelId: string, agentId: string) => {
    const agent = agentById.get(agentId);
    const derivedProviderKeys = Array.from(
      new Set(
        (agent?.mcp_tool_ids || [])
          .map((toolId) => toolById.get(toolId)?.provider || "")
          .filter(Boolean)
      )
    );
    updateModel(modelId, (model) => ({
      ...model,
      selectedAgentId: agentId,
      config: {
        ...model.config,
        llm: (agent?.llm as "chatgpt" | "gemini" | null) || model.config.llm,
        kbId: agent?.kb_id || model.config.kbId,
        mcpToolIds: agent?.mcp_tool_ids?.length ? [...agent.mcp_tool_ids] : [],
        mcpProviderKeys: derivedProviderKeys.length > 0 ? derivedProviderKeys : model.config.mcpProviderKeys,
      },
      conversationMode: "history",
      input: "",
    }));
    resetModel(modelId);
    if (!agentId) return;
    await loadModelSessions(modelId, agentId);
  };

  useEffect(() => {
    if (initialAgentSelectionAppliedRef.current) return;
    const preselectedAgentId = searchParams.get("agentId")?.trim();
    if (!preselectedAgentId) {
      initialAgentSelectionAppliedRef.current = true;
      return;
    }
    if (!agents.length || models.length === 0) return;
    const targetAgent = agents.find((item) => item.id === preselectedAgentId);
    if (!targetAgent) {
      initialAgentSelectionAppliedRef.current = true;
      return;
    }
    initialAgentSelectionAppliedRef.current = true;
    const modelId = models[0].id;
    const groupId = targetAgent.parent_id ?? targetAgent.id;
    handleSelectAgentGroup(modelId, groupId);
    void handleSelectAgentVersion(modelId, targetAgent.id);
  }, [agents, models, searchParams, handleSelectAgentGroup, handleSelectAgentVersion]);

  const handleSelectSession = async (modelId: string, sessionId: string) => {
    updateModel(modelId, (model) => ({
      ...model,
      selectedSessionId: sessionId || null,
      historyMessages: [],
      editSessionId: null,
      sessionId: null,
      messages: [],
      selectedMessageIds: [],
      messageLogs: {},
      lastLogAt: null,
    }));
    if (!sessionId) return;
    try {
      const turns = await apiFetch<TurnRow[]>(`/api/sessions/${sessionId}/turns`);
      updateModel(modelId, (model) => ({
        ...model,
        historyMessages: buildHistoryMessages(turns || []),
      }));
    } catch {
      updateModel(modelId, (model) => ({
        ...model,
        sessionsError: "대화 기록을 불러오지 못했습니다.",
      }));
    }
  };

  const handleChangeConversationMode = (modelId: string, mode: ConversationMode) => {
    updateModel(modelId, (model) => ({
      ...model,
      conversationMode: mode,
      messages: mode === "new" ? [] : model.messages,
      selectedMessageIds: mode === "new" ? [] : model.selectedMessageIds,
      messageLogs: mode === "new" ? {} : model.messageLogs,
      lastLogAt: mode === "new" ? null : model.lastLogAt,
      sessionId: mode === "new" ? null : model.sessionId,
      editSessionId: mode === "new" ? null : model.editSessionId,
      input: "",
    }));
  };

  const ensureEditableSession = async (target: ModelState) => {
    if (target.conversationMode !== "edit") return target.sessionId;
    if (target.editSessionId) return target.editSessionId;
    if (!target.selectedSessionId) return target.sessionId;
    const sourceSession = target.sessions.find((item) => item.id === target.selectedSessionId);
    const turns = await apiFetch<TurnRow[]>(`/api/sessions/${target.selectedSessionId}/turns`).catch(() => []);
    const cloned = await apiFetch<SessionItem>("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        started_at: new Date().toISOString(),
        channel: "runtime",
        caller_masked: sourceSession?.caller_masked || null,
        agent_id: target.selectedAgentId || sourceSession?.agent_id || null,
        metadata: {
          ...(sourceSession?.metadata || {}),
          copied_from_session_id: target.selectedSessionId,
          copied_at: new Date().toISOString(),
          copied_by_mode: "edit",
        },
      }),
    });
    for (let idx = 0; idx < turns.length; idx += 1) {
      const turn = turns[idx];
      await apiFetch(`/api/sessions/${cloned.id}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seq: turn.seq ?? idx + 1,
          transcript_text: turn.transcript_text,
          answer_text: turn.answer_text,
          final_answer: turn.final_answer,
        }),
      }).catch(() => null);
    }
    updateModel(target.id, (model) => ({
      ...model,
      editSessionId: cloned.id,
      sessionId: cloned.id,
    }));
    return cloned.id;
  };

  const sendMessage = async (
    config: ModelConfig,
    sessionId: string | null,
    message: string,
    selectedAgentId?: string,
    hooks?: { onProgress?: (line: string) => void }
  ) => {
    const traceId = makeTraceId("labc");
    const startedAt = performance.now();
    hooks?.onProgress?.(`요청 시작 (trace=${traceId})`);
    console.info("[laboratory/client][timing]", {
      trace_id: traceId,
      phase: "request_start",
      is_first_turn: !sessionId,
      has_agent_id: Boolean(selectedAgentId),
      message_len: message.length,
    });
    try {
      const res = await apiFetch<{
        session_id: string;
        trace_id?: string;
        message?: string;
        rich_message_html?: string;
        turn_id?: string | null;
        quick_replies?: Array<{ label?: string; value?: string }>;
        quick_reply_config?: {
          selection_mode?: "single" | "multi";
          min_select?: number;
          max_select?: number;
          submit_format?: "single" | "csv";
          criteria?: string;
          source_function?: string;
          source_module?: string;
        };
        product_cards?: Array<{
          id?: string;
          title?: string;
          subtitle?: string;
          description?: string;
          image_url?: string | null;
          value?: string;
        }>;
        response_schema?: {
          message?: string | null;
          ui_hints?: { view?: "text" | "choice" | "cards"; choice_mode?: "single" | "multi" };
          quick_replies?: Array<{ label?: string; value?: string }>;
          quick_reply_config?: {
            selection_mode?: "single" | "multi";
            min_select?: number;
            max_select?: number;
            submit_format?: "single" | "csv";
            criteria?: string;
            source_function?: string;
            source_module?: string;
          } | null;
          cards?: Array<Record<string, unknown>>;
        };
        response_schema_issues?: string[];
      }>("/api/laboratory/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-runtime-trace-id": traceId,
        },
        body: JSON.stringify({
          route: config.route,
          llm: config.llm,
          kb_id: config.kbId,
          admin_kb_ids: config.adminKbIds,
          mcp_tool_ids: config.mcpToolIds,
          mcp_provider_keys: config.mcpProviderKeys,
          message,
          session_id: sessionId || undefined,
          agent_id: selectedAgentId || undefined,
        }),
      });
      console.info("[laboratory/client][timing]", {
        trace_id: traceId,
        phase: "request_done",
        total_ms: Number((performance.now() - startedAt).toFixed(1)),
        session_id: res.session_id || null,
        turn_id: res.turn_id || null,
      });
      hooks?.onProgress?.(
        `응답 수신 (${Number((performance.now() - startedAt).toFixed(1))}ms, session=${res.session_id || "-"})`
      );
      return res;
    } catch (error) {
      console.info("[laboratory/client][timing]", {
        trace_id: traceId,
        phase: "request_failed",
        total_ms: Number((performance.now() - startedAt).toFixed(1)),
        error: error instanceof Error ? error.message : String(error),
      });
      hooks?.onProgress?.(`요청 실패: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };

  const submitMessage = async (modelId: string, text: string) => {
    const target = models.find((model) => model.id === modelId);
    if (!target) return;
    if (!text) return;
    if (target.setupMode === "existing" && !target.selectedAgentId) {
      toast.error("에이전트를 선택하세요.");
      return;
    }
    if (target.setupMode === "existing" && target.conversationMode !== "new" && !target.selectedSessionId) {
      toast.error("세션을 선택하세요.");
      return;
    }
    if (target.conversationMode === "history") return;
    if (target.setupMode === "existing" && !target.config.kbId) {
      toast.error("KB를 선택하세요.");
      return;
    }
    updateModel(modelId, (model) => ({
      ...model,
      input: "",
      sending: true,
    }));

    const userMessage = { id: makeId(), role: "user" as const, content: text };
    const loadingMessageId = makeId();
    const loadingStartedAt = Date.now();
    const appendLoadingLog = (line: string) => {
      if (!isAdminUser) return;
      const safe = String(line || "").trim();
      if (!safe) return;
      updateModel(modelId, (model) => ({
        ...model,
        messages: model.messages.map((msg) => {
          if (msg.id !== loadingMessageId || msg.role !== "bot" || !msg.isLoading) return msg;
          const nextLogs = [...(msg.loadingLogs || []), `${new Date().toLocaleTimeString("ko-KR")} ${safe}`].slice(-12);
          return { ...msg, loadingLogs: nextLogs };
        }),
      }));
    };
    updateModel(modelId, (model) => ({
      ...model,
      messages: [
        ...model.messages,
        userMessage,
        {
          id: loadingMessageId,
          role: "bot",
          content: "답변 생성 중...",
          isLoading: true,
          loadingLogs: isAdminUser ? ["요청 준비 중..."] : undefined,
        },
      ],
    }));
    appendLoadingLog("요청 페이로드 구성 완료");

    const loadingTicker = isAdminUser
      ? window.setInterval(() => {
        const elapsedSec = Math.max(1, Math.floor((Date.now() - loadingStartedAt) / 1000));
        appendLoadingLog(`응답 대기 중... ${elapsedSec}s`);
      }, 2500)
      : null;

    try {
      // In "new" mode, the first turn creates a session, and subsequent turns must reuse it.
      const activeSessionId =
        target.conversationMode === "new" ? target.sessionId : await ensureEditableSession(target);
      appendLoadingLog(activeSessionId ? `기존 세션 사용: ${activeSessionId}` : "신규 세션으로 요청");

      const result = await sendMessage(
        target.config,
        activeSessionId,
        text,
        target.selectedAgentId,
        { onProgress: appendLoadingLog }
      ).then(
        (value) => ({ status: "fulfilled" as const, value }),
        (reason) => ({ status: "rejected" as const, reason })
      );

      if (result.status === "fulfilled") {
        const res = result.value;
        const botMessageId = res.message ? loadingMessageId : null;
        const quickReplies = Array.isArray(res.quick_replies)
          ? res.quick_replies
            .map((item) => ({
              label: String(item?.label || item?.value || "").trim(),
              value: String(item?.value || item?.label || "").trim(),
            }))
            .filter((item) => item.label && item.value)
          : [];
        const quickReplyConfig: ChatMessage["quickReplyConfig"] = res.quick_reply_config
          ? {
            selection_mode: res.quick_reply_config.selection_mode === "multi" ? "multi" : "single",
            min_select: Number.isFinite(Number(res.quick_reply_config.min_select))
              ? Number(res.quick_reply_config.min_select)
              : undefined,
            max_select: Number.isFinite(Number(res.quick_reply_config.max_select))
              ? Number(res.quick_reply_config.max_select)
              : undefined,
            submit_format: res.quick_reply_config.submit_format === "csv" ? "csv" : "single",
            criteria: String(res.quick_reply_config.criteria || "").trim() || undefined,
            source_function: String(res.quick_reply_config.source_function || "").trim() || undefined,
            source_module: String(res.quick_reply_config.source_module || "").trim() || undefined,
          }
          : undefined;
        const productCards = Array.isArray(res.product_cards)
          ? res.product_cards
            .map((item, idx) => ({
              id: String(item?.id || `card-${idx}`).trim(),
              title: String(item?.title || "").trim(),
              subtitle: String(item?.subtitle || "").trim(),
              description: String(item?.description || "").trim(),
              imageUrl: String(item?.image_url || "").trim(),
              value: String(item?.value || "").trim(),
            }))
            .filter((item) => item.title && item.value)
          : [];
        const responseSchema: ChatMessage["responseSchema"] =
          res.response_schema && typeof res.response_schema === "object"
            ? {
              message:
                typeof res.response_schema.message === "string" || res.response_schema.message === null
                  ? res.response_schema.message
                  : null,
              ui_hints:
                res.response_schema.ui_hints && typeof res.response_schema.ui_hints === "object"
                  ? {
                    view:
                      res.response_schema.ui_hints.view === "choice" ||
                      res.response_schema.ui_hints.view === "cards"
                        ? res.response_schema.ui_hints.view
                        : "text",
                    choice_mode: res.response_schema.ui_hints.choice_mode === "multi" ? "multi" : "single",
                  }
                  : undefined,
              quick_replies: Array.isArray(res.response_schema.quick_replies)
                ? res.response_schema.quick_replies
                  .map((item: any) => ({
                    label: String(item?.label || item?.value || "").trim(),
                    value: String(item?.value || item?.label || "").trim(),
                  }))
                  .filter((item) => item.label && item.value)
                : undefined,
              quick_reply_config:
                res.response_schema.quick_reply_config && typeof res.response_schema.quick_reply_config === "object"
                  ? {
                    selection_mode:
                      res.response_schema.quick_reply_config.selection_mode === "multi" ? "multi" : "single",
                    min_select: Number.isFinite(Number(res.response_schema.quick_reply_config.min_select))
                      ? Number(res.response_schema.quick_reply_config.min_select)
                      : undefined,
                    max_select: Number.isFinite(Number(res.response_schema.quick_reply_config.max_select))
                      ? Number(res.response_schema.quick_reply_config.max_select)
                      : undefined,
                    submit_format: res.response_schema.quick_reply_config.submit_format === "csv" ? "csv" : "single",
                    criteria: String(res.response_schema.quick_reply_config.criteria || "").trim() || undefined,
                    source_function:
                      String(res.response_schema.quick_reply_config.source_function || "").trim() || undefined,
                    source_module: String(res.response_schema.quick_reply_config.source_module || "").trim() || undefined,
                  }
                  : null,
              cards: Array.isArray(res.response_schema.cards)
                ? (res.response_schema.cards as Array<Record<string, unknown>>)
                : undefined,
            }
            : undefined;
        const responseSchemaIssues = Array.isArray(res.response_schema_issues)
          ? res.response_schema_issues.map((item: unknown) => String(item || "").trim()).filter(Boolean)
          : undefined;
        updateModel(modelId, (model) => ({
          ...model,
          sessionId: res.session_id || model.sessionId,
          messages: model.messages
            .map((msg): ChatMessage => {
              if (msg.id !== loadingMessageId || msg.role !== "bot") return msg;
              if (!res.message) {
                return { ...msg, role: "bot", isLoading: false, content: "" };
              }
              const persistedLogs = isAdminUser
                ? [...(msg.loadingLogs || []), `${new Date().toLocaleTimeString("ko-KR")} 답변 생성 완료`].slice(-20)
                : undefined;
              return {
                id: loadingMessageId,
                role: "bot",
                content: res.message || "",
                richHtml: typeof res.rich_message_html === "string" ? res.rich_message_html : undefined,
                turnId: res.turn_id || null,
                isLoading: false,
                loadingLogs: persistedLogs,
                quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
                quickReplyConfig: quickReplies.length > 0 ? quickReplyConfig : undefined,
                productCards: productCards.length > 0 ? productCards : undefined,
                responseSchema,
                responseSchemaIssues: responseSchemaIssues && responseSchemaIssues.length > 0 ? responseSchemaIssues : undefined,
              };
            })
            .filter((msg) => !(msg.id === loadingMessageId && msg.role === "bot" && !msg.content)),
          sending: false,
        }));
        if (botMessageId) {
          await loadLogs(modelId, botMessageId, res.session_id || target.sessionId);
        }
      } else {
        updateModel(modelId, (model) => ({
          ...model,
          messages: model.messages.map((msg) =>
            msg.id === loadingMessageId && msg.role === "bot"
              ? {
                ...msg,
                isLoading: false,
                content: "응답 실패",
                loadingLogs: isAdminUser
                  ? [...(msg.loadingLogs || []), `${new Date().toLocaleTimeString("ko-KR")} 응답 실패`].slice(-20)
                  : undefined,
              }
              : msg
          ),
          sending: false,
        }));
        toast.error("응답에 실패했습니다.");
      }
    } catch (err) {
      updateModel(modelId, (model) => ({
        ...model,
        messages: model.messages.map((msg) =>
          msg.id === loadingMessageId && msg.role === "bot"
            ? {
              ...msg,
              isLoading: false,
              content: err instanceof Error ? `응답 실패: ${err.message}` : "응답 실패",
              loadingLogs: isAdminUser
                ? [...(msg.loadingLogs || []), `${new Date().toLocaleTimeString("ko-KR")} 예외 발생`].slice(-20)
                : undefined,
            }
            : msg
        ),
        sending: false,
      }));
      toast.error("응답에 실패했습니다.");
    } finally {
      if (loadingTicker) {
        window.clearInterval(loadingTicker);
      }
    }
  };

  const toggleMessageSelection = (modelId: string, messageId: string) => {
    updateModel(modelId, (model) => {
      if (!model.chatSelectionEnabled) return model;
      const exists = model.selectedMessageIds.includes(messageId);
      return {
        ...model,
        selectedMessageIds: exists
          ? model.selectedMessageIds.filter((id) => id !== messageId)
          : [...model.selectedMessageIds, messageId],
      };
    });
  };

  const handleSend = async (e: React.FormEvent, modelId: string) => {
    e.preventDefault();
    const target = models.find((model) => model.id === modelId);
    if (!target) return;
    const text = target.input.trim();
    await submitMessage(modelId, text);
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
        `/api/laboratory/logs?session_id=${encodeURIComponent(sessionId)}&limit=30`
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
    const visibleMessages =
      target.conversationMode === "history"
        ? target.historyMessages
        : target.conversationMode === "edit"
          ? [...target.historyMessages, ...target.messages]
          : target.messages;
    const selectedIds = new Set(target.selectedMessageIds || []);
    const selectedMessages =
      selectedIds.size > 0 ? visibleMessages.filter((msg) => selectedIds.has(msg.id)) : visibleMessages;
    const runtimeUsage = inferRuntimeUsageSummary(selectedMessages, target.messageLogs || {});
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
          const map = getDebugEntryMap(log);
          const lastFunction = map.get("MCP.last_function");
          if (lastFunction && lastFunction !== "-" && lastFunction !== "none") {
            functions.add(lastFunction);
          }
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
              const map = getDebugEntryMap(log);
              return map.get("MCP.last_function") === fn;
            });
            const missing = logs.some((log) => {
              const prefix = log.prefix_json as any;
              const entries = Array.isArray(prefix?.entries) ? prefix.entries : [];
              const map = getDebugEntryMap(log);
              return !prefix || (entries.length === 0 && !map.get("MCP.last_function"));
            });
            if (missing) {
              const reasons = ["MCP.last_function 누락"];
              incomplete.set(`debug.${fn}`, reasons);
            } else {
              completed.add(`debug.${fn}`);
            }
          });
        }
      }

      const botTurns = selectedMessages.filter((msg) => msg.role === "bot" && !msg.isLoading);
      if (botTurns.length > 0) {
        const missingResponseSchema = botTurns.filter((msg) => !msg.responseSchema);
        const hasSchemaIssues = botTurns.filter((msg) => (msg.responseSchemaIssues || []).length > 0);
        if (missingResponseSchema.length > 0) {
          incomplete.set("response_schema.missing", [`response_schema 누락 turn=${missingResponseSchema.length}`]);
        } else {
          completed.add("response_schema.present");
        }
        if (hasSchemaIssues.length > 0) {
          const issues = Array.from(new Set(hasSchemaIssues.flatMap((msg) => msg.responseSchemaIssues || [])));
          incomplete.set("response_schema.invalid", issues.length > 0 ? issues : ["response_schema_issues 존재"]);
        } else if (missingResponseSchema.length === 0) {
          completed.add("response_schema.valid");
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
      `사용 모듈(Runtime): ${runtimeUsage.runtime.length ? runtimeUsage.runtime.join(", ") : "-"}`,
      `사용 모듈(Handlers): ${runtimeUsage.handlers.length ? runtimeUsage.handlers.join(", ") : "-"}`,
      `사용 모듈(Services): ${runtimeUsage.services.length ? runtimeUsage.services.join(", ") : "-"}`,
      `사용 모듈(Policies): ${runtimeUsage.policies.length ? runtimeUsage.policies.join(", ") : "-"}`,
      `사용 모듈(Shared): ${runtimeUsage.shared.length ? runtimeUsage.shared.join(", ") : "-"}`,
      "",
      `점검 완료 항목: ${auditStatus.completed.length ? auditStatus.completed.join(", ") : "-"}`,
      `점검 미완료: ${auditStatus.incomplete.length
        ? auditStatus.incomplete.map((item) => `${item.key}(${item.reasons.join(", ")})`).join(", ")
        : "-"
      }`,
      `점검 불가: ${auditStatus.blocked.length ? auditStatus.blocked.join(", ") : "-"}`,
      "",
    ].join("\n");
    const formatUsedBody = (msg: ChatMessage) => {
      if (msg.role !== "bot") return msg.content;
      if (!msg.content.includes("debug_prefix")) return msg.content;
      const { answerText } = getDebugParts(msg.content);
      return answerText || extractDebugText(msg.content);
    };
    const formatTurnUnused = (botMsg?: ChatMessage) => {
      if (!botMsg) return "-";
      const lines: string[] = [];
      if (botMsg.responseSchema) {
        const schema = botMsg.responseSchema;
        const schemaView = schema.ui_hints?.view || "text";
        const schemaChoiceMode = schema.ui_hints?.choice_mode || "-";
        const schemaQuickReplyCount = Array.isArray(schema.quick_replies) ? schema.quick_replies.length : 0;
        const schemaCardCount = Array.isArray(schema.cards) ? schema.cards.length : 0;
        lines.push(
          `RESPONSE_SCHEMA: view=${schemaView}, choice_mode=${schemaChoiceMode}, quick_replies=${schemaQuickReplyCount}, cards=${schemaCardCount}`
        );
        lines.push("RESPONSE_SCHEMA_DETAIL:");
        lines.push(indentBlock(stringifyPretty(schema), 2));
      }
      if (botMsg.responseSchemaIssues && botMsg.responseSchemaIssues.length > 0) {
        lines.push(`RESPONSE_SCHEMA_ISSUES: ${botMsg.responseSchemaIssues.join(", ")}`);
      }
      if (botMsg.quickReplyConfig) {
        const rule = botMsg.quickReplyConfig;
        lines.push(
          `QUICK_REPLY_RULE: mode=${rule.selection_mode}, min=${rule.min_select ?? "-"}, max=${rule.max_select ?? "-"}, submit=${rule.submit_format ?? "-"}, criteria=${rule.criteria || "-"}, source=${rule.source_module || "-"}#${rule.source_function || "-"}`
        );
      }
      if (botMsg.content.includes("debug_prefix")) {
        const { prefixText } = getDebugParts(botMsg.content);
        if (prefixText) lines.push(`DEBUG_PREFIX:\n${prefixText}`);
      }
      const logText = formatLogBundle(target.messageLogs[botMsg.id], botMsg.turnId);
      if (logText) lines.push(logText);
      return lines.join("\n").trim() || "-";
    };

    const turnBlocks: string[] = [];
    let bufferedUsers: ChatMessage[] = [];
    selectedMessages.forEach((msg) => {
      if (msg.role === "user") {
        bufferedUsers.push(msg);
        return;
      }
      const usedLines = [
        "[TOKEN_USED]",
        ...bufferedUsers.map((u) => `USER:\n${formatUsedBody(u)}`),
        `BOT:\n${formatUsedBody(msg)}`,
      ].join("\n\n");
      const unusedLines = ["[TOKEN_UNUSED]", formatTurnUnused(msg)].join("\n");
      turnBlocks.push(`TURN_ID: ${msg.turnId || "-"}\n\n${usedLines}\n\n${unusedLines}`);
      bufferedUsers = [];
    });
    if (bufferedUsers.length > 0) {
      const usedLines = [
        "[TOKEN_USED]",
        ...bufferedUsers.map((u) => `USER:\n${formatUsedBody(u)}`),
      ].join("\n\n");
      turnBlocks.push(`TURN_ID: -\n\n${usedLines}\n\n[TOKEN_UNUSED]\n-`);
    }

    const transcript = [corePrinciple.trimEnd(), ...turnBlocks].join("\n\n\n");
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
    const visibleMessages =
      target.conversationMode === "history"
        ? target.historyMessages
        : target.conversationMode === "edit"
          ? [...target.historyMessages, ...target.messages]
          : target.messages;
    const lines: string[] = [];
    visibleMessages.forEach((msg, index) => {
      if (msg.role !== "bot") return;
      const bundle = target.messageLogs[msg.id];
      if (!hasIssue(bundle, msg.turnId)) return;
      const prev = visibleMessages[index - 1];
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
    const deleteSessionId =
      target.conversationMode === "history"
        ? target.selectedSessionId
        : target.conversationMode === "edit"
          ? target.editSessionId || target.sessionId
          : target.sessionId;
    if (!deleteSessionId) {
      updateModel(id, (model) => ({
        ...model,
        messages: [],
        selectedMessageIds: [],
        messageLogs: {},
        lastLogAt: null,
        sessionId: null,
        editSessionId: null,
        historyMessages: [],
        selectedSessionId: null,
      }));
      toast.success("세션이 초기화되었습니다.");
      return;
    }
    if (!window.confirm("이 세션과 관련된 대화(turns)를 삭제할까요?")) return;
    try {
      await apiFetch(`/api/sessions/${deleteSessionId}`, { method: "DELETE" });
      updateModel(id, (model) => ({
        ...model,
        sessionId: null,
        editSessionId: null,
        selectedSessionId: model.selectedSessionId === deleteSessionId ? null : model.selectedSessionId,
        sessions: model.sessions.filter((session) => session.id !== deleteSessionId),
        historyMessages: model.selectedSessionId === deleteSessionId ? [] : model.historyMessages,
        messages: [],
        selectedMessageIds: [],
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
            <div className="max-w-full w-max flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <span className={cn("h-2 w-2 rounded-full", wsStatusDot)} />
              <span>WS {wsStatus}</span>
              <button
                type="button"
                onClick={connectWs}
                title="새로 고침"
                aria-label="웹소켓 새로 고침"
                className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
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
            <div className="text-sm text-slate-500">
              비교할 KB가 없습니다. 신규 모델은 KB 없이도 실행할 수 있고, 기존 모델은 KB/에이전트가 필요합니다.
            </div>
          ) : null}
          {!loading && !error ? (
            models.map((model, index) => {
              const filteredToolOptions = toolOptions.filter((option) => {
                if (model.config.mcpProviderKeys.length === 0) return false;
                const providerKey = toolById.get(option.id)?.provider;
                return providerKey ? model.config.mcpProviderKeys.includes(providerKey) : false;
              });
              const sessionOptions: SelectOption[] = model.sessions.map((session) => ({
                id: session.id,
                label: session.session_code || session.id,
                description: formatKstDateTime(session.started_at),
              }));
              const versionOptions: SelectOption[] = (
                agentVersionsByGroup.get(model.selectedAgentGroupId) || []
              ).map((item) => ({
                id: item.id,
                label: `${item.is_active ? "🟢 " : "⚪ "}${item.version || "-"} (${item.name || item.id})`,
                description: item.is_active ? "현재 활성 버전" : "비활성 버전",
              }));
              const visibleMessages =
                model.conversationMode === "history"
                  ? model.historyMessages
                  : model.conversationMode === "edit"
                    ? [...model.historyMessages, ...model.messages]
                    : model.messages;
              const matchedPaneHeight = model.layoutExpanded
                ? EXPANDED_PANEL_HEIGHT
                : (leftPaneHeights[model.id] || 0);
              const activeSessionId =
                model.conversationMode === "history"
                  ? model.selectedSessionId
                  : model.conversationMode === "edit"
                    ? model.editSessionId || model.sessionId
                    : model.sessionId;
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
                        onClick={() => handleCopySessionId(activeSessionId)}
                        disabled={!activeSessionId}
                        aria-label="세션 ID 복사"
                      >
                        {activeSessionId || "-"}
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        onClick={() => {
                          if (activeSessionId) {
                            window.open(`/app/calls/${encodeURIComponent(activeSessionId)}`, "_blank", "noopener,noreferrer");
                          }
                        }}
                        disabled={!activeSessionId}
                        aria-label="새탭 열기"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        onClick={() => handleDeleteSession(model.id)}
                        disabled={!activeSessionId && visibleMessages.length === 0}
                        aria-label="세션 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        onClick={() => handleCopyTranscript(model.id)}
                        disabled={visibleMessages.length === 0}
                        aria-label="대화 복사"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        onClick={() => handleCopyIssueTranscript(model.id)}
                        disabled={visibleMessages.length === 0}
                        aria-label="문제 로그 복사"
                        title="문제 로그 복사"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid items-stretch gap-0 lg:grid-cols-[1fr_1.2fr]">
                    <div
                      ref={(el) => {
                        leftPaneRefs.current[model.id] = el;
                      }}
                      className="p-4"
                      style={model.layoutExpanded ? { minHeight: EXPANDED_PANEL_HEIGHT } : undefined}
                    >
                      <div className="space-y-3">
                        <div className="border-b border-slate-200 bg-white pb-3">
                          <div className="grid grid-cols-2 gap-2 w-full">
                            <button
                              type="button"
                              onClick={() =>
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  setupMode: "existing",
                                  conversationMode: "history",
                                }))
                              }
                              className={cn(
                                "w-full rounded-xl border px-3 py-1.5 text-xs font-semibold",
                                model.setupMode === "existing"
                                  ? "border-slate-300 bg-slate-100 text-slate-900"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              기존 모델
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  setupMode: "new",
                                  conversationMode: "new",
                                  selectedAgentGroupId: "",
                                  selectedAgentId: "",
                                  sessions: [],
                                  selectedSessionId: null,
                                  historyMessages: [],
                                  editSessionId: null,
                                  sessionId: null,
                                  config: {
                                    ...m.config,
                                    adminKbIds: isAdminUser && latestAdminKbId ? [latestAdminKbId] : [],
                                  },
                                }))
                              }
                              className={cn(
                                "w-full rounded-xl border px-3 py-1.5 text-xs font-semibold",
                                model.setupMode === "new"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              신규 모델
                            </button>
                          </div>
                        </div>
                        {model.setupMode === "existing" ? (
                          <div className="space-y-3">
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-slate-600">에이전트 선택</div>
                              <SelectPopover
                                value={model.selectedAgentGroupId}
                                onChange={(value) => {
                                  handleSelectAgentGroup(model.id, value);
                                }}
                                options={agentGroupOptions}
                                searchable
                                className="flex-1 min-w-0"
                              />
                            </div>
                            {model.selectedAgentGroupId ? (
                              <div>
                                <div className="mb-1 text-[11px] font-semibold text-slate-600">버전 선택</div>
                                <SelectPopover
                                  value={model.selectedAgentId}
                                  onChange={(value) => {
                                    void handleSelectAgentVersion(model.id, value);
                                  }}
                                  options={versionOptions}
                                  searchable
                                  className="flex-1 min-w-0"
                                />
                              </div>
                            ) : null}
                            {model.selectedAgentId ? (
                              <div>
                                <div className="mb-1 text-[11px] font-semibold text-slate-600">세션 선택</div>
                                <SelectPopover
                                  value={model.selectedSessionId || ""}
                                  onChange={(value) => {
                                    void handleSelectSession(model.id, value);
                                  }}
                                  options={sessionOptions}
                                  searchable
                                  className="flex-1 min-w-0"
                                />
                                {model.sessionsLoading ? (
                                  <div className="mt-1 text-[11px] text-slate-500">세션 불러오는 중...</div>
                                ) : null}
                                {model.sessionsError ? (
                                  <div className="mt-1 text-[11px] text-rose-600">{model.sessionsError}</div>
                                ) : null}
                              </div>
                            ) : null}
                            {model.selectedAgentId && (model.selectedSessionId || model.sessions.length === 0) ? (
                              <div className="space-y-1">
                                <div className="mb-1 text-[11px] font-semibold text-slate-600">모드 선택</div>
                                <div className="grid grid-cols-3 gap-2 w-full">
                                  <button
                                    type="button"
                                    onClick={() => handleChangeConversationMode(model.id, "history")}
                                    disabled={model.sessions.length === 0}
                                    className={cn(
                                      "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                                      model.sessions.length === 0 && "cursor-not-allowed opacity-50",
                                      model.conversationMode === "history"
                                        ? "border-slate-300 bg-slate-100 text-slate-900"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                  >
                                    히스토리 모드
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleChangeConversationMode(model.id, "new")}
                                    className={cn(
                                      "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                                      model.conversationMode === "new"
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                  >
                                    신규 대화
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleChangeConversationMode(model.id, "edit")}
                                    disabled={model.sessions.length === 0}
                                    className={cn(
                                      "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                                      model.sessions.length === 0 && "cursor-not-allowed opacity-50",
                                      model.conversationMode === "edit"
                                        ? "border-amber-300 bg-amber-50 text-amber-800"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    )}
                                  >
                                    수정 모드
                                  </button>
                                </div>
                                {model.sessions.length === 0 ? (
                                  <div className="text-[11px] text-slate-500">
                                    선택한 에이전트/버전에 세션이 없어 신규 대화만 가능합니다.
                                  </div>
                                ) : null}
                                {model.conversationMode === "edit" ? (
                                  <div className="text-[11px] text-amber-700">
                                    수정 모드 첫 전송 시 기존 세션을 복제한 새 세션으로 이어집니다.
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {model.setupMode === "new" ? (
                          <div className="space-y-3">
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-slate-600">LLM 선택</div>
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
                              <div className="mb-1 text-[11px] font-semibold text-slate-600">KB 선택</div>
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
                            {isAdminUser ? (
                              <div>
                                <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                                  <span>관리자 KB 선택</span>
                                  <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
                                    ADMIN
                                  </span>
                                </div>
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
                            ) : null}
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-slate-600">MCP 프로바이더 선택</div>
                              <div className="flex items-center gap-2">
                                <MultiSelectPopover
                                  values={model.config.mcpProviderKeys}
                                  onChange={(values) => {
                                    const allowedToolIds = new Set(
                                      tools
                                        .filter((tool) => (tool.provider ? values.includes(tool.provider) : false))
                                        .map((tool) => tool.id)
                                    );
                                    updateModel(model.id, (m) => ({
                                      ...m,
                                      config: {
                                        ...m.config,
                                        mcpProviderKeys: values,
                                        mcpToolIds: m.config.mcpToolIds.filter((id) => allowedToolIds.has(id)),
                                      },
                                    }));
                                    resetModel(model.id);
                                  }}
                                  options={providerOptions}
                                  placeholder="MCP 프로바이더 선택"
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
                            </div>
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-slate-600">MCP 액션 선택</div>
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
                                  options={filteredToolOptions}
                                  placeholder="MCP 액션 선택"
                                  displayMode="count"
                                  showBulkActions
                                  className="flex-1 min-w-0"
                                />
                              </div>
                              {model.detailsOpen.mcp ? (
                                <textarea
                                  readOnly
                                  value={
                                    [
                                      `선택된 프로바이더: ${model.config.mcpProviderKeys.length === 0
                                        ? "없음"
                                        : model.config.mcpProviderKeys
                                          .map((key) => providerByKey.get(key)?.title || key)
                                          .join(", ")
                                      }`,
                                      "",
                                      model.config.mcpToolIds.length === 0
                                        ? "선택된 액션 없음"
                                        : model.config.mcpToolIds
                                          .map((id) => {
                                            const tool = toolById.get(id);
                                            if (!tool) return null;
                                            const desc = tool.description ? tool.description : "설명 없음";
                                            return `• ${tool.name}: ${desc}`;
                                          })
                                          .filter(Boolean)
                                          .join("\n"),
                                    ].join("\n")
                                  }
                                  className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
                                />
                              ) : null}
                            </div>
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-slate-600">Runtime 선택</div>
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
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "relative h-full border-t border-slate-200 p-4 lg:border-l lg:border-t-0 flex flex-col overflow-visible"
                      )}
                      style={
                        matchedPaneHeight > 0
                          ? { height: matchedPaneHeight }
                          : model.layoutExpanded
                            ? { minHeight: EXPANDED_PANEL_HEIGHT }
                            : undefined
                      }
                    >
                      <div className="relative flex-1 min-h-0 overflow-hidden">
                        {isAdminUser ? (
                          <div className="absolute right-2 top-2 z-20">
                            <button
                              type="button"
                              onClick={() =>
                                updateModel(model.id, (m) => ({
                                  ...m,
                                  adminLogControlsOpen: !m.adminLogControlsOpen,
                                }))
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                              aria-label="로그 설정"
                              title="로그 설정"
                            >
                              <Settings2 className="h-4 w-4" />
                            </button>
                            {model.adminLogControlsOpen ? (
                              <div className="absolute right-0 mt-1 w-36 rounded-md border border-slate-200 bg-white p-1.5 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateModel(model.id, (m) => ({
                                      ...m,
                                      chatSelectionEnabled: !m.chatSelectionEnabled,
                                      selectedMessageIds: !m.chatSelectionEnabled ? m.selectedMessageIds : [],
                                    }))
                                  }
                                  className={cn(
                                    "mb-1 w-full rounded-md border px-2 py-1 text-[11px] font-semibold",
                                    model.chatSelectionEnabled
                                      ? "border-slate-900 bg-slate-900 text-white"
                                      : "border-slate-300 bg-white text-slate-600"
                                  )}
                                >
                                  선택 {model.chatSelectionEnabled ? "ON" : "OFF"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateModel(model.id, (m) => ({
                                      ...m,
                                      showAdminLogs: !m.showAdminLogs,
                                    }))
                                  }
                                  className={cn(
                                    "w-full rounded-md border px-2 py-1 text-[11px] font-semibold",
                                    model.showAdminLogs
                                      ? "border-slate-900 bg-slate-900 text-white"
                                      : "border-slate-300 bg-white text-slate-600"
                                  )}
                                >
                                  로그 {model.showAdminLogs ? "ON" : "OFF"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <div
                          ref={(el) => {
                            chatScrollRefs.current[model.id] = el;
                          }}
                          className={cn(
                            "relative z-0 h-full overflow-auto pr-2 pl-2 pb-4 scrollbar-hide bg-slate-50 rounded-t-xl rounded-b-none",
                            isAdminUser ? "pt-10" : "pt-2"
                          )}
                        >
                          {(() => {
                            const latestVisibleMessageId = visibleMessages[visibleMessages.length - 1]?.id || "";
                            return visibleMessages.map((msg, index) => {
                              const prev = visibleMessages[index - 1];
                              const isGrouped = prev?.role === msg.role;
                              const rowGap = "gap-3";
                              const rowSpacing = index === 0 ? "" : isGrouped ? "mt-1" : "mt-3";
                              const showAvatar = !isGrouped;
                              const isLatestVisibleMessage = msg.id === latestVisibleMessageId;
                              const hasDebug = msg.role === "bot" && msg.content.includes("debug_prefix");
                              const debugParts = hasDebug ? getDebugParts(msg.content) : null;
                              const isSelected = model.selectedMessageIds.includes(msg.id);
                              return (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    "flex",
                                    rowGap,
                                    rowSpacing,
                                    msg.role === "user" ? "justify-end" : "justify-start",
                                    model.chatSelectionEnabled && isSelected && "rounded-xl bg-amber-200 px-1 py-1"
                                  )}
                                >

                                  {msg.role === "bot" && showAvatar ? (
                                    <div
                                      className={cn(
                                        "h-8 w-8 rounded-full border flex items-center justify-center",
                                        isSelected
                                          ? "border-slate-900 bg-slate-900"
                                          : "border-slate-200 bg-white"
                                      )}
                                    >
                                      {isSelected ? (
                                        <Check className="h-4 w-4 text-white" />
                                      ) : (
                                        <Bot className="h-4 w-4 text-slate-500" />
                                      )}
                                    </div>
                                  ) : msg.role === "bot" ? (
                                    <div
                                      className="h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white opacity-0"
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                  <div className="relative max-w-[75%]">
                                    <div
                                      onClick={() => {
                                        if (model.chatSelectionEnabled) {
                                          toggleMessageSelection(model.id, msg.id);
                                        }
                                      }}
                                      className={cn(
                                        "relative whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm transition",
                                        model.chatSelectionEnabled ? "cursor-pointer" : "cursor-default",
                                        msg.role === "user"
                                          ? "bg-slate-900 text-white"
                                          : "bg-slate-100 text-slate-700 border border-slate-200"
                                      )}
                                    >
                                      {hasDebug && debugParts ? (
                                        debugParts.answerHtml ? (
                                          <div
                                            style={{ margin: 0, padding: 0, lineHeight: "inherit", whiteSpace: "normal" }}
                                            dangerouslySetInnerHTML={{ __html: debugParts.answerHtml }}
                                          />
                                        ) : (
                                          debugParts.answerText || ""
                                        )
                                      ) : msg.role === "bot" && msg.isLoading ? (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-slate-700">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>답변 생성 중...</span>
                                          </div>
                                        </div>
                                      ) : msg.role === "bot" ? (
                                        msg.richHtml ? (
                                          <div
                                            style={{ margin: 0, padding: 0, lineHeight: "inherit", whiteSpace: "normal" }}
                                            dangerouslySetInnerHTML={{ __html: msg.richHtml }}
                                          />
                                        ) : (
                                          renderStructuredChoiceContent(msg.content) || renderBotContent(msg.content)
                                        )
                                      ) : (
                                        msg.content
                                      )}
                                      {msg.role === "bot" &&
                                        isAdminUser &&
                                        model.showAdminLogs &&
                                        msg.loadingLogs &&
                                        msg.loadingLogs.length > 0 ? (
                                        <div className="mt-2 rounded-md border border-slate-200 bg-white/70 px-2 py-1.5">
                                          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                            <span>진행 로그</span>
                                            <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
                                              ADMIN
                                            </span>
                                          </div>
                                          <div className="space-y-1 text-[11px] text-slate-600">
                                            {msg.loadingLogs.map((line, idx) => (
                                              <div key={`${msg.id}-loading-log-${idx}`}>{line}</div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                    {msg.role === "bot" &&
                                      msg.quickReplies &&
                                      msg.quickReplies.length > 0
                                      ? (() => {
                                        const quickRule = msg.quickReplyConfig;
                                        const fallbackLeadDay = isLeadDaySelectionPrompt(msg.content, msg.quickReplies || []);
                                        const fallbackIntentMulti = isIntentDisambiguationMultiSelectPrompt(
                                          msg.content,
                                          msg.quickReplies || []
                                        );
                                        const isMultiSelectPrompt =
                                          quickRule?.selection_mode === "multi" || (!quickRule && (fallbackLeadDay || fallbackIntentMulti));
                                        const cardValues = new Set((msg.productCards || []).map((card) => String(card.value)));
                                        const allQuickRepliesMappedToCards =
                                          !isMultiSelectPrompt &&
                                          !!msg.productCards?.length &&
                                          msg.quickReplies.every((item) => cardValues.has(String(item.value)));
                                        if (allQuickRepliesMappedToCards) {
                                          return null;
                                        }

                                        const draftKey = `${model.id}:${msg.id}:quick`;
                                        const selected = quickReplyDrafts[draftKey] || [];
                                        const locked = lockedReplySelections[draftKey] || [];
                                        const effectiveSelection = locked.length > 0 ? locked : selected;
                                        const isLocked = locked.length > 0;
                                        const minRequired =
                                          Number.isFinite(Number(quickRule?.min_select || 0)) && Number(quickRule?.min_select || 0) > 0
                                            ? Number(quickRule?.min_select)
                                            : fallbackLeadDay
                                              ? parseMinLeadDayRequired(msg.content)
                                              : 1;
                                        const canConfirm = !isLocked && selected.length >= minRequired;

                                        return (
                                          <>
                                            <div className="mt-[5px]">
                                              <div
                                                className="grid gap-2"
                                                style={{
                                                  gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, msg.quickReplies.length))}, minmax(0, 1fr))`,
                                                }}
                                              >
                                                {msg.quickReplies.map((item, idx) => {
                                                  const num = parseLeadDayValue(item.value);
                                                  const normalized = num ? String(num) : String(item.value);
                                                  const picked = effectiveSelection.includes(normalized);
                                                  return (
                                                    <button
                                                      key={`${msg.id}-quick-${idx}-${item.value}`}
                                                      type="button"
                                                      onClick={() => {
                                                        if (isLocked || !isLatestVisibleMessage) return;
                                                        setQuickReplyDrafts((prev) => {
                                                          const now = prev[draftKey] || [];
                                                          const next = isMultiSelectPrompt
                                                            ? now.includes(normalized)
                                                              ? now.filter((v) => v !== normalized)
                                                              : [...now, normalized]
                                                            : now[0] === normalized
                                                              ? []
                                                              : [normalized];
                                                          return { ...prev, [draftKey]: next };
                                                        });
                                                      }}
                                                      disabled={model.sending || isLocked || !isLatestVisibleMessage}
                                                      className={cn(
                                                        "w-full rounded-lg border px-3 py-2 text-xs font-semibold",
                                                        picked
                                                          ? "border-slate-900 bg-slate-900 text-white"
                                                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                                                        "disabled:cursor-not-allowed disabled:opacity-50"
                                                      )}
                                                    >
                                                      {item.label}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                            {isLatestVisibleMessage && !isLocked ? (
                                              <div className="mt-[5px] flex justify-end">
                                                <button
                                                  type="button"
                                                  aria-label="선택 확인"
                                                  title="선택 확인"
                                                  onClick={() => {
                                                    const picked = isMultiSelectPrompt
                                                      ? selected
                                                        .map((v) => Number(v))
                                                        .filter((v) => Number.isFinite(v) || String(v).trim() !== "")
                                                        .map((v) => String(v))
                                                      : selected.slice(0, 1);
                                                    if (picked.length < minRequired) return;
                                                    const maxAllowed =
                                                      Number.isFinite(Number(quickRule?.max_select || 0)) && Number(quickRule?.max_select || 0) > 0
                                                        ? Number(quickRule?.max_select)
                                                        : null;
                                                    const normalizedPicked =
                                                      maxAllowed && maxAllowed > 0 ? picked.slice(0, maxAllowed) : picked;
                                                    setLockedReplySelections((prev) => ({ ...prev, [draftKey]: normalizedPicked }));
                                                    setQuickReplyDrafts((prev) => {
                                                      const next = { ...prev };
                                                      delete next[draftKey];
                                                      return next;
                                                    });
                                                    void submitMessage(
                                                      model.id,
                                                      isMultiSelectPrompt || quickRule?.submit_format === "csv"
                                                        ? normalizedPicked.join(",")
                                                        : normalizedPicked[0]
                                                    );
                                                  }}
                                                  disabled={model.sending || !canConfirm}
                                                  className={cn(
                                                    "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                                                    canConfirm
                                                      ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                                                      : "border-slate-300 bg-slate-100 text-slate-400",
                                                    "disabled:cursor-not-allowed disabled:opacity-80"
                                                  )}
                                                >
                                                  <CornerDownRight className="h-4 w-4" />
                                                </button>
                                              </div>
                                            ) : null}
                                          </>
                                        );
                                      })()
                                      : null}
                                    {msg.role === "bot" && msg.productCards && msg.productCards.length > 0 ? (
                                      (() => {
                                        const draftKey = `${model.id}:${msg.id}:card`;
                                        const selectedCard = (quickReplyDrafts[draftKey] || [])[0] || "";
                                        const lockedCard = (lockedReplySelections[draftKey] || [])[0] || "";
                                        const effectiveSelectedCard = lockedCard || selectedCard;
                                        const isLocked = Boolean(lockedCard);
                                        const canConfirm = !isLocked && Boolean(selectedCard);
                                        return (
                                          <>
                                            <div className="mt-[5px]">
                                              <div
                                                className="grid gap-2"
                                                style={{ gridTemplateColumns: `repeat(${Math.min(3, msg.productCards.length)}, minmax(0, 1fr))` }}
                                              >
                                                {msg.productCards.map((card, idx) => {
                                                  const picked = effectiveSelectedCard === String(card.value);
                                                  return (
                                                    <button
                                                      key={`${msg.id}-card-${card.id}-${idx}`}
                                                      type="button"
                                                      onClick={() => {
                                                        if (isLocked || !isLatestVisibleMessage) return;
                                                        setQuickReplyDrafts((prev) => {
                                                          const next = picked ? [] : [String(card.value)];
                                                          return { ...prev, [draftKey]: next };
                                                        });
                                                      }}
                                                      disabled={model.sending || isLocked || !isLatestVisibleMessage}
                                                      className={cn(
                                                        "relative flex w-full flex-col text-left rounded-xl border bg-white p-2 hover:bg-slate-50",
                                                        picked ? "border-slate-900 ring-2 ring-slate-300" : "border-slate-300",
                                                        "disabled:cursor-not-allowed disabled:opacity-50"
                                                      )}
                                                    >
                                                      <span className="absolute left-2 top-2 h-5 w-5 rounded-full bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center">
                                                        {card.value}
                                                      </span>
                                                      {card.imageUrl ? (
                                                        <img
                                                          src={card.imageUrl}
                                                          alt={card.title}
                                                          className="h-24 w-full rounded-md object-cover bg-slate-100"
                                                        />
                                                      ) : (
                                                        <div className="h-24 w-full rounded-md bg-slate-100 flex items-center justify-center text-[11px] text-slate-500">
                                                          이미지 없음
                                                        </div>
                                                      )}
                                                      <div
                                                        className="mt-2 flex h-10 items-start justify-center overflow-hidden text-center text-xs font-semibold leading-5 text-slate-700 whitespace-normal break-keep"
                                                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                                                      >
                                                        {card.title}
                                                      </div>
                                                      {card.subtitle ? (
                                                        <div
                                                          className="mt-0.5 overflow-hidden text-center text-[11px] leading-4 text-slate-500 whitespace-normal break-keep"
                                                          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                                                        >
                                                          {card.subtitle}
                                                        </div>
                                                      ) : null}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                            {isLatestVisibleMessage && !isLocked ? (
                                              <div className="mt-[5px] flex justify-end">
                                                <button
                                                  type="button"
                                                  aria-label="선택 확인"
                                                  title="선택 확인"
                                                  onClick={() => {
                                                    if (!selectedCard) return;
                                                    setLockedReplySelections((prev) => ({ ...prev, [draftKey]: [selectedCard] }));
                                                    setQuickReplyDrafts((prev) => {
                                                      const next = { ...prev };
                                                      delete next[draftKey];
                                                      return next;
                                                    });
                                                    void submitMessage(model.id, selectedCard);
                                                  }}
                                                  disabled={model.sending || !canConfirm}
                                                  className={cn(
                                                    "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                                                    canConfirm
                                                      ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                                                      : "border-slate-300 bg-slate-100 text-slate-400",
                                                    "disabled:cursor-not-allowed disabled:opacity-80"
                                                  )}
                                                >
                                                  <CornerDownRight className="h-4 w-4" />
                                                </button>
                                              </div>
                                            ) : null}
                                          </>
                                        );
                                      })()
                                    ) : null}
                                  </div>
                                  {msg.role === "user" && showAvatar ? (
                                    <div
                                      className={cn(
                                        "h-8 w-8 rounded-full border flex items-center justify-center",
                                        isSelected
                                          ? "border-slate-900 bg-slate-900"
                                          : "border-slate-200 bg-white"
                                      )}
                                    >
                                      {isSelected ? (
                                        <Check className="h-4 w-4 text-white" />
                                      ) : (
                                        <User className="h-4 w-4 text-slate-500" />
                                      )}
                                    </div>
                                  ) : msg.role === "user" ? (
                                    <div
                                      className="h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white opacity-0"
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                </div>
                              );
                            });
                          })()}
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-white to-transparent" />
                      </div>
                      {model.layoutExpanded ? (
                        <div className="pointer-events-none absolute left-1/2 bottom-0 z-20 -translate-x-1/2 translate-y-1/2">
                          <button
                            type="button"
                            onClick={() => collapseModelLayout(model.id)}
                            className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400 bg-white text-slate-600 hover:bg-slate-50"
                            aria-label="채팅 높이 줄이기"
                          >
                            <Minus className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (matchedPaneHeight < EXPANDED_PANEL_HEIGHT) ? (
                        <div className="pointer-events-none absolute left-1/2 bottom-0 z-20 -translate-x-1/2 translate-y-1/2">
                          <button
                            type="button"
                            onClick={() => expandModelLayout(model.id)}
                            className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400 bg-white text-slate-600 hover:bg-slate-50"
                            aria-label="채팅 높이 늘리기"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                      ) : null}
                      <form onSubmit={(e) => handleSend(e, model.id)} className="relative z-20 flex gap-2 bg-white">
                        <Input
                          value={model.input}
                          onChange={(e) =>
                            updateModel(model.id, (m) => ({
                              ...m,
                              input: e.target.value,
                            }))
                          }
                          placeholder={
                            model.setupMode === "existing" && model.conversationMode === "history"
                              ? "히스토리 모드에서는 전송할 수 없습니다."
                              : model.setupMode === "existing" && model.conversationMode === "edit"
                                ? "수정할 내용을 입력하세요 (새 세션으로 복제 후 이어집니다)"
                                : "신규 대화 질문을 입력하세요"
                          }
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          disabled={
                            (model.setupMode === "existing" && model.conversationMode === "history") ||
                            !model.input.trim() ||
                            model.sending ||
                            (model.setupMode === "existing" && !model.config.kbId) ||
                            (model.setupMode === "existing" &&
                              (!model.selectedAgentId ||
                                (model.conversationMode !== "new" && !model.selectedSessionId)))
                          }
                        >
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
