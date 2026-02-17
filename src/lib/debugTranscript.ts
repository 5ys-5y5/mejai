export type LogBundle = {
  mcp_logs?: Array<{
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
  event_logs?: Array<{
    id?: string | null;
    event_type: string;
    payload: Record<string, unknown> | null;
    created_at: string | null;
    session_id?: string | null;
    turn_id?: string | null;
  }>;
  debug_logs?: Array<{
    id?: string | null;
    session_id?: string | null;
    turn_id?: string | null;
    seq?: number | null;
    prefix_json?: Record<string, unknown> | null;
    prefix_tree?: Record<string, unknown> | null;
    created_at: string | null;
  }>;
  logsError?: string | null;
  logsLoading?: boolean;
};

export type TranscriptMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  isLoading?: boolean;
  turnId?: string | null;
  responseSchema?: {
    message: string | null;
    ui_hints?: { view?: "text" | "choice" | "cards"; choice_mode?: "single" | "multi" };
    quick_replies?: Array<{ label: string; value: string }>;
    cards?: Array<Record<string, unknown>>;
  };
  responseSchemaIssues?: string[];
  renderPlan?: {
    view: "text" | "choice" | "cards";
    enable_quick_replies: boolean;
    enable_cards: boolean;
    interaction_scope?: "latest_only" | "any";
    selection_mode: "single" | "multi";
    min_select: number;
    max_select: number;
    submit_format: "single" | "csv";
    prompt_kind:
      | "lead_day"
      | "intent_disambiguation"
      | "restock_product_choice"
      | "restock_subscribe_confirm"
      | "restock_subscribe_phone"
      | "restock_post_subscribe"
      | "restock_alternative_confirm"
      | null;
    quick_reply_source?: {
      type?: string;
      criteria?: string;
      source_function?: string;
      source_module?: string;
    };
    grid_columns?: { quick_replies?: number; cards?: number };
    debug?: Record<string, unknown>;
  };
};

export type DebugTranscriptOptions = {
  outputMode?: "full" | "summary";
  sections?: {
    header?: {
      enabled?: boolean;
      principle?: boolean;
      expectedLists?: boolean;
      runtimeModules?: boolean;
      auditStatus?: boolean;
    };
    turn?: {
      enabled?: boolean;
      turnId?: boolean;
      tokenUsed?: boolean;
      tokenUnused?: boolean;
      responseSchemaSummary?: boolean;
      responseSchemaDetail?: boolean;
      responseSchemaDetailFields?: Record<string, boolean>;
      renderPlanSummary?: boolean;
      renderPlanDetail?: boolean;
      renderPlanDetailFields?: Record<string, boolean>;
      quickReplyRule?: boolean;
    };
    logs?: {
      enabled?: boolean;
      issueSummary?: boolean;
      debug?: {
        enabled?: boolean;
        prefixJson?: boolean;
        prefixJsonSections?: {
          requestMeta?: boolean;
          resolvedAgent?: boolean;
          kbResolution?: boolean;
          modelResolution?: boolean;
          toolAllowlist?: boolean;
          slotFlow?: boolean;
          intentScope?: boolean;
          policyConflicts?: boolean;
          conflictResolution?: boolean;
        };
      };
      mcp?: {
        enabled?: boolean;
        request?: boolean;
        response?: boolean;
        includeSuccess?: boolean;
        includeError?: boolean;
      };
      event?: {
        enabled?: boolean;
        payload?: boolean;
        allowlist?: string[];
      };
    };
  };
  includePrincipleHeader?: boolean;
  includeResponseSchema?: boolean;
  includeRenderPlan?: boolean;
  includeQuickReplyRule?: boolean;
  includeTurnLogs?: boolean;
  includeTokenUnused?: boolean;
  includeTurnId?: boolean;
  auditBotScope?: "all_bot_messages" | "runtime_turns_only";
};

type NormalizedDebugTranscriptOptions = {
  outputMode: "full" | "summary";
  auditBotScope: "all_bot_messages" | "runtime_turns_only";
  header: {
    enabled: boolean;
    principle: boolean;
    expectedLists: boolean;
    runtimeModules: boolean;
    auditStatus: boolean;
  };
  turn: {
    enabled: boolean;
    turnId: boolean;
    tokenUsed: boolean;
    tokenUnused: boolean;
    responseSchemaSummary: boolean;
    responseSchemaDetail: boolean;
    responseSchemaDetailFields: Record<string, boolean>;
    renderPlanSummary: boolean;
    renderPlanDetail: boolean;
    renderPlanDetailFields: Record<string, boolean>;
    quickReplyRule: boolean;
  };
  logs: {
    enabled: boolean;
    issueSummary: boolean;
    debug: {
      enabled: boolean;
      prefixJson: boolean;
      prefixJsonSections: {
        requestMeta: boolean;
        resolvedAgent: boolean;
        kbResolution: boolean;
        modelResolution: boolean;
        toolAllowlist: boolean;
        slotFlow: boolean;
        intentScope: boolean;
        policyConflicts: boolean;
        conflictResolution: boolean;
      };
    };
    mcp: {
      enabled: boolean;
      request: boolean;
      response: boolean;
      includeSuccess: boolean;
      includeError: boolean;
    };
    event: {
      enabled: boolean;
      payload: boolean;
      allowlist: string[];
    };
  };
};

const TRANSCRIPT_SNAPSHOT_EVENT_TYPE = "DEBUG_TRANSCRIPT_SNAPSHOT_SAVED";

function normalizeDebugTranscriptOptions(options?: DebugTranscriptOptions): NormalizedDebugTranscriptOptions {
  const input = options || {};
  const outputMode = input.outputMode === "summary" ? "summary" : "full";
  const auditBotScope = input.auditBotScope === "all_bot_messages" ? "all_bot_messages" : "runtime_turns_only";

  const includePrincipleHeader = input.includePrincipleHeader ?? true;
  const includeResponseSchema = input.includeResponseSchema ?? true;
  const includeRenderPlan = input.includeRenderPlan ?? true;
  const includeQuickReplyRule = input.includeQuickReplyRule ?? true;
  const includeTurnLogs = input.includeTurnLogs ?? true;
  const includeTokenUnused = input.includeTokenUnused ?? true;
  const includeTurnId = input.includeTurnId ?? true;

  const sectionHeader = input.sections?.header;
  const sectionTurn = input.sections?.turn;
  const sectionLogs = input.sections?.logs;
  const sectionLogDebug = sectionLogs?.debug;
  const sectionLogMcp = sectionLogs?.mcp;
  const sectionLogEvent = sectionLogs?.event;

  const headerEnabled = sectionHeader?.enabled ?? includePrincipleHeader;
  const turnEnabled = sectionTurn?.enabled ?? true;
  const logsEnabled = sectionLogs?.enabled ?? includeTurnLogs;

  const eventAllowlist = (sectionLogEvent?.allowlist || [])
    .map((value) => String(value || "").trim().toUpperCase())
    .filter(Boolean);

  return {
    outputMode,
    auditBotScope,
    header: {
      enabled: headerEnabled,
      principle: sectionHeader?.principle ?? true,
      expectedLists: sectionHeader?.expectedLists ?? true,
      runtimeModules: sectionHeader?.runtimeModules ?? true,
      auditStatus: sectionHeader?.auditStatus ?? true,
    },
    turn: {
      enabled: turnEnabled,
      turnId: sectionTurn?.turnId ?? includeTurnId,
      tokenUsed: sectionTurn?.tokenUsed ?? true,
      tokenUnused: sectionTurn?.tokenUnused ?? includeTokenUnused,
      responseSchemaSummary: sectionTurn?.responseSchemaSummary ?? includeResponseSchema,
      responseSchemaDetail: sectionTurn?.responseSchemaDetail ?? includeResponseSchema,
      responseSchemaDetailFields: sectionTurn?.responseSchemaDetailFields ?? {},
      renderPlanSummary: sectionTurn?.renderPlanSummary ?? includeRenderPlan,
      renderPlanDetail: sectionTurn?.renderPlanDetail ?? includeRenderPlan,
      renderPlanDetailFields: sectionTurn?.renderPlanDetailFields ?? {},
      quickReplyRule: sectionTurn?.quickReplyRule ?? includeQuickReplyRule,
    },
    logs: {
      enabled: logsEnabled,
      issueSummary: sectionLogs?.issueSummary ?? true,
      debug: {
        enabled: sectionLogDebug?.enabled ?? true,
        prefixJson: sectionLogDebug?.prefixJson ?? true,
        prefixJsonSections: {
          requestMeta: sectionLogDebug?.prefixJsonSections?.requestMeta ?? true,
          resolvedAgent: sectionLogDebug?.prefixJsonSections?.resolvedAgent ?? true,
          kbResolution: sectionLogDebug?.prefixJsonSections?.kbResolution ?? true,
          modelResolution: sectionLogDebug?.prefixJsonSections?.modelResolution ?? true,
          toolAllowlist: sectionLogDebug?.prefixJsonSections?.toolAllowlist ?? true,
          slotFlow: sectionLogDebug?.prefixJsonSections?.slotFlow ?? true,
          intentScope: sectionLogDebug?.prefixJsonSections?.intentScope ?? true,
          policyConflicts: sectionLogDebug?.prefixJsonSections?.policyConflicts ?? true,
          conflictResolution: sectionLogDebug?.prefixJsonSections?.conflictResolution ?? true,
        },
      },
      mcp: {
        enabled: sectionLogMcp?.enabled ?? true,
        request: sectionLogMcp?.request ?? true,
        response: sectionLogMcp?.response ?? true,
        includeSuccess: sectionLogMcp?.includeSuccess ?? true,
        includeError: sectionLogMcp?.includeError ?? true,
      },
      event: {
        enabled: sectionLogEvent?.enabled ?? true,
        payload: sectionLogEvent?.payload ?? true,
        allowlist: eventAllowlist,
      },
    },
  };
}

function compactText(value: unknown, max = 200) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function buildProblemSignalLines(bundle: LogBundle, turnId?: string | null) {
  const signals = new Set<string>();
  const issueSummary = buildIssueSummary(bundle, turnId);
  issueSummary.forEach((line) => signals.add(line));

  (bundle.event_logs || []).forEach((event) => {
    const type = String(event.event_type || "").toUpperCase();
    const payload = (event.payload || {}) as Record<string, unknown>;
    if (type === "PRINCIPLE_VIOLATION_DETECTED") {
      const summary = compactText(payload.summary, 260);
      if (summary) signals.add(`event.PRINCIPLE_VIOLATION_DETECTED: ${summary}`);
      const evidence = (payload.evidence || {}) as Record<string, unknown>;
      const answer = compactText(evidence.answer, 220);
      if (answer) signals.add(`위반 근거 answer: ${answer}`);
      return;
    }
    if (type === "RUNTIME_PATCH_PROPOSAL_CREATED") {
      const whyFailed = compactText(payload.why_failed, 260);
      if (whyFailed) signals.add(`event.RUNTIME_PATCH_PROPOSAL_CREATED: ${whyFailed}`);
      const proposalId = compactText(payload.proposal_id, 120);
      if (proposalId) signals.add(`proposal_id: ${proposalId}`);
      return;
    }
    if (type === "POLICY_DECISION") {
      const action = compactText(payload.action, 120);
      const reason = compactText(payload.reason, 160);
      if (action || reason) signals.add(`event.POLICY_DECISION: action=${action || "-"}, reason=${reason || "-"}`);
      return;
    }
    if (type === "POLICY_STATIC_CONFLICT") {
      const resolution = compactText(payload.resolution, 160);
      if (resolution) signals.add(`event.POLICY_STATIC_CONFLICT: resolution=${resolution}`);
      return;
    }
    if (type.includes("FAILED") || type.includes("ERROR") || type.includes("VIOLATION")) {
      const raw = compactText(payload.message || payload.reason || payload.summary || payload.error, 220);
      if (raw) signals.add(`event.${type}: ${raw}`);
    }
  });

  (bundle.mcp_logs || []).forEach((log) => {
    if (isMcpIssue(log)) {
      const error = readErrorPayload(log.response_payload);
      const reason = compactText(error?.message || error?.code || log.status, 200);
      signals.add(`mcp.${log.tool_name}: ${reason || "error"}`);
    }
  });

  return Array.from(signals);
}

function summarizeEventPayloadCompact(eventType: string, payload: Record<string, unknown>) {
  const type = String(eventType || "").toUpperCase();
  if (type === "PRINCIPLE_VIOLATION_DETECTED") {
    return compactText(payload.summary, 200);
  }
  if (type === "RUNTIME_PATCH_PROPOSAL_CREATED") {
    return compactText(payload.why_failed || payload.proposal_id, 200);
  }
  if (type === "POLICY_DECISION") {
    const action = compactText(payload.action, 60);
    const reason = compactText(payload.reason, 120);
    return compactText(`action=${action || "-"}, reason=${reason || "-"}`, 200);
  }
  if (type === "PRE_MCP_DECISION") {
    return compactText(payload.query_text || payload.intent, 180);
  }
  if (type === "FINAL_ANSWER_READY") {
    return compactText(payload.answer, 180);
  }
  return compactText(payload.message || payload.reason || payload.summary || "", 180);
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

function filterObjectByPathMap(
  value: unknown,
  map: Record<string, boolean> | undefined,
  basePath = ""
): unknown {
  if (!map || Object.keys(map).length === 0) return value;
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => filterObjectByPathMap(item, map, basePath));
  }
  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  Object.keys(record).forEach((key) => {
    const path = basePath ? `${basePath}.${key}` : key;
    if (map[path] === false) return;
    next[key] = filterObjectByPathMap(record[key], map, path);
  });
  return next;
}

function filterPrefixJson(
  prefix: Record<string, unknown>,
  sections: NormalizedDebugTranscriptOptions["logs"]["debug"]["prefixJsonSections"]
) {
  const filtered = { ...(prefix || {}) } as Record<string, unknown>;
  const mappings: Array<[boolean, string[]]> = [
    [sections.requestMeta, ["request_meta"]],
    [sections.resolvedAgent, ["resolved_agent"]],
    [sections.kbResolution, ["kb_resolution"]],
    [sections.modelResolution, ["model_resolution"]],
    [sections.toolAllowlist, ["tool_allowlist"]],
    [sections.slotFlow, ["slot_flow"]],
    [sections.intentScope, ["intent_scope"]],
    [sections.policyConflicts, ["policy_conflicts"]],
    [sections.conflictResolution, ["conflict_resolution"]],
  ];
  mappings.forEach(([enabled, keys]) => {
    if (enabled) return;
    keys.forEach((key) => {
      if (key in filtered) delete filtered[key];
    });
  });
  return filtered;
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

function makeStableJsonKey(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "__SERIALIZE_FAILED__";
  }
}

function dedupeLogsByIdentity<T>(logs: T[], makeIdentity: (log: T) => string) {
  const seen = new Set<string>();
  const next: T[] = [];
  logs.forEach((log) => {
    const key = makeIdentity(log);
    if (seen.has(key)) return;
    seen.add(key);
    next.push(log);
  });
  return next;
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

function readErrorPayload(value: unknown): { code?: unknown; message?: unknown } | null {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>).error;
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as { code?: unknown; message?: unknown };
}

function getDebugEntryMap(log: NonNullable<LogBundle["debug_logs"]>[number]) {
  const entries = Array.isArray(log.prefix_json?.entries) ? log.prefix_json?.entries : [];
  const map = new Map(
    entries.map((entry) => {
      const record = (entry || {}) as Record<string, unknown>;
      return [String(record.key), String(record.value ?? "")] as [string, string];
    })
  );
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

function buildIssueSummary(bundle?: LogBundle, turnId?: string | null) {
  if (!bundle) return [];
  const summary = new Set<string>();
  const debugLogs = turnId
    ? (bundle.debug_logs || []).filter((log) => log.turn_id === turnId)
    : (bundle.debug_logs || []);
  debugLogs.forEach((log) => {
    const map = getDebugEntryMap(log);
    const lastError = map.get("MCP.last_error");
    if (lastError && lastError !== "-") summary.add(`MCP.last_error: ${lastError}`);
  });
  (bundle.mcp_logs || []).forEach((log) => {
    const error = readErrorPayload(log.response_payload);
    if (error?.message) summary.add(`${log.tool_name}: ${String(error.message)}`);
    else if (error?.code) summary.add(`${log.tool_name}: ${String(error.code)}`);
    else if (String(log.status || "").toLowerCase() !== "success") {
      summary.add(`${log.tool_name}: status=${log.status}`);
    }
  });
  (bundle.event_logs || []).forEach((log) => {
    const payloadError = readErrorPayload(log.payload)?.message || readErrorPayload(log.payload)?.code;
    if (payloadError) summary.add(`${log.event_type}: ${String(payloadError)}`);
  });
  if (bundle.logsError) summary.add(`MCP 로그 오류: ${bundle.logsError}`);
  return Array.from(summary);
}

function formatLogBundle(bundle: LogBundle | undefined, turnId: string | null | undefined, options: NormalizedDebugTranscriptOptions) {
  if (!bundle) return "";
  const debugLogs = dedupeLogsByIdentity(
    turnId ? (bundle.debug_logs || []).filter((log) => log.turn_id === turnId) : (bundle.debug_logs || []),
    (log) =>
      [
        String(log.id || ""),
        String(log.turn_id || ""),
        String(log.created_at || ""),
        String(log.seq ?? ""),
        makeStableJsonKey(log.prefix_json || {}),
      ].join("|")
  );
  const mcpLogs = dedupeLogsByIdentity(
    (bundle.mcp_logs || []).filter((log) => {
      const isSuccess = String(log.status || "").toLowerCase() === "success" && !readErrorPayload(log.response_payload);
      if (isSuccess && !options.logs.mcp.includeSuccess) return false;
      if (!isSuccess && !options.logs.mcp.includeError) return false;
      return true;
    }),
    (log) =>
      [
        String(log.id || ""),
        String(log.turn_id || ""),
        String(log.created_at || ""),
        String(log.tool_name || ""),
        String(log.status || ""),
        makeStableJsonKey(log.request_payload || {}),
        makeStableJsonKey(log.response_payload || log.policy_decision || {}),
      ].join("|")
  );
  const allowedEvents = new Set(options.logs.event.allowlist || []);
  const eventLogs = dedupeLogsByIdentity(
    (bundle.event_logs || []).filter((log) => {
      if (String(log.event_type || "").toUpperCase() === TRANSCRIPT_SNAPSHOT_EVENT_TYPE) return false;
      if (allowedEvents.size === 0) return true;
      return allowedEvents.has(String(log.event_type || "").toUpperCase());
    }),
    (log) =>
      [
        String(log.id || ""),
        String(log.turn_id || ""),
        String(log.created_at || ""),
        String(log.event_type || ""),
        makeStableJsonKey(log.payload || {}),
      ].join("|")
  );
  if (options.outputMode === "summary") {
    const lines: string[] = [];
    if (bundle.logsError) lines.push(`MCP 로그 오류: ${bundle.logsError}`);

    const signals = buildProblemSignalLines(bundle, turnId);
    lines.push("문제 예상 요약:");
    if (signals.length > 0) {
      signals.forEach((item) => lines.push(`- ${item}`));
    } else {
      lines.push("- 명시적 오류 신호 없음");
    }

    if (options.logs.debug.enabled && debugLogs.length > 0) {
      lines.push("DEBUG 로그(요약):");
      debugLogs.forEach((log) => {
        const map = getDebugEntryMap(log);
        const fn = map.get("MCP.last_function") || "-";
        const status = map.get("MCP.last_status") || "-";
        const err = map.get("MCP.last_error") || "-";
        lines.push(`- ${log.id || "-"} fn=${fn}, status=${status}, error=${err}, at=${log.created_at || "-"}`);
      });
    }

    if (options.logs.mcp.enabled && mcpLogs.length > 0) {
      lines.push("MCP 로그(요약):");
      mcpLogs.forEach((log) => {
        const turnLabel = log.turn_id || turnId || "-";
        lines.push(`- ${log.tool_name}@${log.tool_version || "-"}: ${log.status} (${log.created_at || "-"}) (turn_id=${turnLabel})`);
      });
    }

    if (options.logs.event.enabled && eventLogs.length > 0) {
      lines.push("이벤트 로그(요약):");
      eventLogs.forEach((log) => {
        const turnLabel = log.turn_id || turnId || "-";
        const summary = summarizeEventPayloadCompact(log.event_type, (log.payload || {}) as Record<string, unknown>);
        lines.push(`- ${log.event_type} (${log.created_at || "-"}) (turn_id=${turnLabel})${summary ? `: ${summary}` : ""}`);
      });
    }

    return lines.join("\n");
  }

  const lines: string[] = [];
  if (bundle.logsError) {
    lines.push(`MCP 로그 오류: ${bundle.logsError}`);
  }
  if (options.logs.debug.enabled && debugLogs.length > 0) {
    lines.push("DEBUG 로그:");
    debugLogs.forEach((log) => {
        lines.push(`- ${log.id || "-"} (turn_id=${log.turn_id || "-"}) (${log.created_at || "-"})`);
        if (options.logs.debug.prefixJson) {
          lines.push("  prefix_json:");
          const filtered = filterPrefixJson(
            (log.prefix_json || {}) as Record<string, unknown>,
            options.logs.debug.prefixJsonSections
          );
          lines.push(indentBlock(stringifyPretty(filtered), 4));
        }
      });
    }
  const summary = options.logs.issueSummary ? buildIssueSummary(bundle, turnId) : [];
  if (options.logs.issueSummary && summary.length > 0) {
    lines.push("문제 요약:");
    summary.forEach((item) => lines.push(`- ${item}`));
  }
  if (options.logs.mcp.enabled && mcpLogs.length > 0) {
    lines.push("MCP 로그:");
    mcpLogs.forEach((log) => {
      const turnLabel = log.turn_id || turnId || "-";
      lines.push(
        `- ${log.id || "-"} ${log.tool_name}@${log.tool_version || "-"}: ${log.status} (${log.created_at || "-"}) (turn_id=${turnLabel})`
      );
      if (options.logs.mcp.request) {
        lines.push("  request:");
        lines.push(indentBlock(stringifyPretty(log.request_payload || {}), 4));
      }
      if (options.logs.mcp.response) {
        lines.push("  response:");
        lines.push(indentBlock(stringifyPretty(log.response_payload || log.policy_decision || {}), 4));
      }
    });
  }
  if (options.logs.event.enabled && eventLogs.length > 0) {
    lines.push("이벤트 로그:");
    eventLogs.forEach((log) => {
      const turnLabel = log.turn_id || turnId || "-";
      const safePayload = sanitizeEventPayloadForDisplay(log.event_type, log.payload || {});
      lines.push(`- ${log.id || "-"} ${log.event_type} (${log.created_at || "-"}) (turn_id=${turnLabel})`);
      if (options.logs.event.payload) {
        lines.push("  payload:");
        lines.push(indentBlock(stringifyPretty(safePayload), 4));
      }
    });
  }
  return lines.join("\n");
}

function formatIssueBundle(bundle?: LogBundle, turnId?: string | null) {
  if (!bundle) return "";
  const lines: string[] = [];
  if (bundle.logsError) {
    lines.push(`MCP 로그 오류: ${bundle.logsError}`);
  }
  const debugLogs = turnId
    ? (bundle.debug_logs || []).filter((log) => log.turn_id === turnId)
    : (bundle.debug_logs || []);
  if (debugLogs.length > 0) {
    lines.push("DEBUG 로그:");
    debugLogs.forEach((log) => {
      lines.push(`- ${log.id || "-"} (turn_id=${log.turn_id || "-"}) (${log.created_at || "-"})`);
      lines.push("  prefix_json:");
      lines.push(indentBlock(stringifyPretty(log.prefix_json || {}), 4));
    });
  }
  const summary = buildIssueSummary(bundle, turnId);
  if (summary.length > 0) {
    lines.push("문제 요약:");
    summary.forEach((item) => lines.push(`- ${item}`));
  }
  if ((bundle.mcp_logs || []).length > 0) {
    lines.push("MCP 로그:");
    (bundle.mcp_logs || []).forEach((log) => {
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
  if ((bundle.event_logs || []).length > 0) {
    const eventLogs = (bundle.event_logs || []).filter(
      (log) => String(log.event_type || "").toUpperCase() !== TRANSCRIPT_SNAPSHOT_EVENT_TYPE
    );
    if (eventLogs.length === 0) return lines.join("\n");
    lines.push("이벤트 로그:");
    eventLogs.forEach((log) => {
      const turnLabel = log.turn_id || turnId || "-";
      const safePayload = sanitizeEventPayloadForDisplay(log.event_type, log.payload || {});
      lines.push(`- ${log.id || "-"} ${log.event_type} (${log.created_at || "-"}) (turn_id=${turnLabel})`);
      lines.push("  payload:");
      lines.push(indentBlock(stringifyPretty(safePayload), 4));
    });
  }
  return lines.join("\n");
}

function isDebugIssue(log: NonNullable<LogBundle["debug_logs"]>[number]) {
  const entries = Array.isArray(log.prefix_json?.entries) ? log.prefix_json?.entries : [];
  const entryMap = new Map(
    entries.map((entry) => {
      const record = (entry || {}) as Record<string, unknown>;
      return [String(record.key), String(record.value ?? "")] as [string, string];
    })
  );
  const lastStatus = (entryMap.get("MCP.last_status") || "").toLowerCase();
  const lastError = entryMap.get("MCP.last_error") || "";
  return lastStatus === "error" || (lastError && lastError !== "-");
}

function isMcpIssue(log: NonNullable<LogBundle["mcp_logs"]>[number]) {
  if (String(log.status || "").toLowerCase() !== "success") return true;
  const error = readErrorPayload(log.response_payload);
  return Boolean(error);
}

function isEventIssue(log: NonNullable<LogBundle["event_logs"]>[number]) {
  const type = String(log.event_type || "").toUpperCase();
  if (type.includes("FAILED") || type.includes("ERROR")) return true;
  return Boolean(readErrorPayload(log.payload));
}

function hasIssue(bundle?: LogBundle, turnId?: string | null) {
  if (!bundle) return false;
  const debugLogs = turnId
    ? (bundle.debug_logs || []).filter((log) => log.turn_id === turnId)
    : (bundle.debug_logs || []);
  if (debugLogs.some((log) => isDebugIssue(log))) return true;
  if ((bundle.mcp_logs || []).some((log) => isMcpIssue(log))) return true;
  if ((bundle.event_logs || []).some((log) => isEventIssue(log))) return true;
  return Boolean(bundle.logsError);
}

function inferRuntimeUsageSummary(messages: TranscriptMessage[], messageLogs: Record<string, LogBundle>) {
  const buckets = {
    runtime: new Set<string>(),
    handlers: new Set<string>(),
    services: new Set<string>(),
    policies: new Set<string>(),
    shared: new Set<string>(),
  };
  const add = (bucket: keyof typeof buckets, value: string) => {
    if (!value) return;
    buckets[bucket].add(value);
  };
  const addByPath = (path: string | null) => {
    if (!path) return false;
    if (path.includes("/handlers/")) return add("handlers", path), true;
    if (path.includes("/policies/")) return add("policies", path), true;
    if (path.includes("/services/")) return add("services", path), true;
    if (path.includes("/shared/")) return add("shared", path), true;
    return add("runtime", path), true;
  };

  const allMessages = messages.filter((msg) => msg.role === "bot");
  const allBundles = Object.values(messageLogs || {});
  const allDebugLogs = allBundles.flatMap((bundle) => bundle.debug_logs || []);
  const allEventLogs = allBundles.flatMap((bundle) => bundle.event_logs || []);
  const allMcpLogs = allBundles.flatMap((bundle) => bundle.mcp_logs || []);

  let tracedCount = 0;
  allDebugLogs.forEach((log) => {
    const prefix = (log.prefix_json || {}) as Record<string, unknown>;
    const decision = (prefix.decision || {}) as Record<string, unknown>;
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
      allMessages.some((msg) => /재입고|유사한 상품|입고 예정/.test(msg.content));
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

function buildAuditStatus(
  messages: TranscriptMessage[],
  messageLogs: Record<string, LogBundle>,
  options?: DebugTranscriptOptions
) {
  const bundles = Object.values(messageLogs || {});
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
          const prefix = (log.prefix_json || {}) as Record<string, unknown>;
          const entries = Array.isArray(prefix.entries) ? prefix.entries : [];
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

  const auditBotScope = options?.auditBotScope || "all_bot_messages";
  const botTurns = messages.filter((msg) => {
    if (msg.role !== "bot" || msg.isLoading) return false;
    if (auditBotScope === "runtime_turns_only") return Boolean(msg.turnId);
    return true;
  });
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
    expected,
    completed: Array.from(completed),
    incomplete: Array.from(incomplete.entries()).map(([key, reasons]) => ({ key, reasons })),
    blocked: Array.from(blocked),
  };
}

export function buildDebugTranscript(input: {
  messages: TranscriptMessage[];
  messageLogs: Record<string, LogBundle>;
  options?: DebugTranscriptOptions;
}): string {
  const visibleMessages = input.messages;
  const normalized = normalizeDebugTranscriptOptions(input.options);
  const runtimeUsage = inferRuntimeUsageSummary(visibleMessages, input.messageLogs || {});
  const auditStatus = buildAuditStatus(visibleMessages, input.messageLogs || {}, input.options);

  const headerLines: string[] = [];
  if (normalized.header.principle) {
    headerLines.push(
      "디버그 대원칙:",
      "- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)",
      "- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.",
      "- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).",
      "- 실패 지점의 직전/직후 로그를 반드시 기록한다.",
      ""
    );
  }
  if (normalized.header.expectedLists) {
    headerLines.push(
      `기대 목록(MCP): ${auditStatus.expected.mcp_tools.join(", ") || "-"}`,
      `기대 목록(Event): ${auditStatus.expected.event_types.join(", ") || "-"}`,
      `기대 목록(Debug): ${auditStatus.expected.debug_functions.join(", ") || "-"}`,
      ""
    );
  }
  if (normalized.header.runtimeModules) {
    headerLines.push(
      `사용 모듈(Runtime): ${runtimeUsage.runtime.join(", ") || "-"}`,
      `사용 모듈(Handlers): ${runtimeUsage.handlers.join(", ") || "-"}`,
      `사용 모듈(Services): ${runtimeUsage.services.join(", ") || "-"}`,
      `사용 모듈(Policies): ${runtimeUsage.policies.join(", ") || "-"}`,
      `사용 모듈(Shared): ${runtimeUsage.shared.join(", ") || "-"}`,
      ""
    );
  }
  if (normalized.header.auditStatus) {
    headerLines.push(
      `점검 완료 항목: ${auditStatus.completed.join(", ") || "-"}`,
      `점검 미완료: ${auditStatus.incomplete.map((item) => `${item.key}(${item.reasons.join(", ")})`).join(", ") || "-"}`,
      `점검 불가: ${auditStatus.blocked.join(", ") || "-"}`,
      ""
    );
  }
  const corePrinciple = headerLines.join("\n").trimEnd();

  const formatBody = (msg: TranscriptMessage) => {
    const answerText = msg.content.includes("debug_prefix") ? extractDebugText(msg.content) : msg.content;
    if (!normalized.turn.enabled) return answerText;
    const lines: string[] = [];
    if (normalized.turn.tokenUsed) {
      lines.push(answerText);
    } else if (!msg.responseSchema && !msg.renderPlan) {
      return answerText;
    }
    const allowResponseSchemaDetail = normalized.outputMode === "full" && normalized.turn.responseSchemaDetail;
    if (msg.responseSchema && (normalized.turn.responseSchemaSummary || allowResponseSchemaDetail)) {
      const schema = msg.responseSchema;
      const schemaView = schema.ui_hints?.view || "text";
      const schemaChoiceMode = schema.ui_hints?.choice_mode || "-";
      const schemaQuickReplyCount = Array.isArray(schema.quick_replies) ? schema.quick_replies.length : 0;
      const schemaCardCount = Array.isArray(schema.cards) ? schema.cards.length : 0;
      if (normalized.turn.responseSchemaSummary) {
        lines.push(
          `RESPONSE_SCHEMA: view=${schemaView}, choice_mode=${schemaChoiceMode}, quick_replies=${schemaQuickReplyCount}, cards=${schemaCardCount}`
        );
      }
      if (allowResponseSchemaDetail) {
        lines.push("RESPONSE_SCHEMA_DETAIL:");
        const filtered = filterObjectByPathMap(schema, normalized.turn.responseSchemaDetailFields);
        lines.push(indentBlock(stringifyPretty(filtered), 2));
      }
    }
    const allowRenderPlanDetail = normalized.outputMode === "full" && normalized.turn.renderPlanDetail;
    if (msg.renderPlan && (normalized.turn.renderPlanSummary || allowRenderPlanDetail)) {
      const plan = msg.renderPlan;
      if (normalized.turn.renderPlanSummary) {
        lines.push(
          `RENDER_PLAN: view=${plan.view}, quick_replies=${plan.enable_quick_replies}, cards=${plan.enable_cards}, mode=${plan.selection_mode}, min=${plan.min_select}, max=${plan.max_select}, submit=${plan.submit_format}, prompt=${plan.prompt_kind || "-"}`
        );
      }
      if (allowRenderPlanDetail) {
        lines.push("RENDER_PLAN_DETAIL:");
        const filtered = filterObjectByPathMap(plan, normalized.turn.renderPlanDetailFields);
        lines.push(indentBlock(stringifyPretty(filtered), 2));
      }
    }
    if (msg.renderPlan && normalized.turn.quickReplyRule) {
      const rule = msg.renderPlan;
      lines.push(
        `QUICK_REPLY_RULE: mode=${rule.selection_mode}, min=${rule.min_select ?? "-"}, max=${rule.max_select ?? "-"}, submit=${rule.submit_format ?? "-"}, source=${rule.quick_reply_source?.type || "-"}, criteria=${rule.quick_reply_source?.criteria || "-"}, module=${rule.quick_reply_source?.source_module || "-"}, function=${rule.quick_reply_source?.source_function || "-"}`
      );
    }
    return lines.length > 0 ? lines.join("\n") : answerText;
  };

  const turnBlocks: string[] = [];
  let bufferedUsers: TranscriptMessage[] = [];
  visibleMessages.forEach((msg) => {
    if (msg.role === "user") {
      bufferedUsers.push(msg);
      return;
    }
    const turnBody = [
      ...bufferedUsers.map((u) => `USER:\n${formatBody(u)}`),
      `BOT:\n${formatBody(msg)}`,
    ].join("\n\n");
    const tokenUsedPrefix = normalized.turn.tokenUsed ? "[TOKEN_USED]\n\n" : "";
    const unusedLines = normalized.turn.enabled && normalized.turn.tokenUnused ? ["[TOKEN_UNUSED]"].join("\n") : "";
    const logText = normalized.logs.enabled ? formatLogBundle(input.messageLogs[msg.id], msg.turnId, normalized) : "";
    const turnId = normalized.turn.enabled && normalized.turn.turnId ? (msg.turnId ? `TURN_ID: ${msg.turnId}` : "TURN_ID: -") : "";
    const tail = logText ? `\n${logText}` : "";
    const bodyCore = `${tokenUsedPrefix}${turnBody}`;
    const body = unusedLines ? `${bodyCore}\n\n${unusedLines}${tail}` : `${bodyCore}${tail}`;
    turnBlocks.push(turnId ? `${turnId}\n\n${body}` : body);
    bufferedUsers = [];
  });
  if (bufferedUsers.length > 0) {
    const tokenUsedPrefix = normalized.turn.tokenUsed ? "[TOKEN_USED]\n\n" : "";
    const usedLines = bufferedUsers.map((u) => `USER:\n${formatBody(u)}`).join("\n\n");
    const turnId = normalized.turn.enabled && normalized.turn.turnId ? "TURN_ID: -" : "";
    const tokenUnusedTail = normalized.turn.enabled && normalized.turn.tokenUnused ? "\n\n[TOKEN_UNUSED]\n-" : "";
    const block = `${tokenUsedPrefix}${usedLines}${tokenUnusedTail}`;
    turnBlocks.push(turnId ? `${turnId}\n\n${block}` : block);
  }

  if (normalized.header.enabled && corePrinciple) {
    return [corePrinciple, ...turnBlocks].join("\n\n\n");
  }
  return turnBlocks.join("\n\n\n");
}

export function buildIssueTranscript(input: {
  messages: TranscriptMessage[];
  messageLogs: Record<string, LogBundle>;
}): string {
  const lines: string[] = [];
  input.messages.forEach((msg, index) => {
    if (msg.role !== "bot") return;
    const bundle = input.messageLogs[msg.id];
    if (!hasIssue(bundle, msg.turnId)) return;
    const prev = input.messages[index - 1];
    if (prev && prev.role === "user") {
      lines.push(`USER:\n${prev.content}`);
    }
    const body = msg.content.includes("debug_prefix") ? extractDebugText(msg.content) : msg.content;
    const logText = formatIssueBundle(bundle, msg.turnId);
    const turnLine = msg.turnId ? `\nTURN_ID: ${msg.turnId}` : "";
    lines.push(`BOT:\n${body}${turnLine}${logText ? `\n${logText}` : ""}`);
  });
  return lines.join("\n\n");
}
