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
  quickReplyConfig?: {
    selection_mode: "single" | "multi";
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
    criteria?: string;
    source_function?: string;
    source_module?: string;
  };
  renderPlan?: {
    view: "text" | "choice" | "cards";
    enable_quick_replies: boolean;
    enable_cards: boolean;
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
  includePrincipleHeader?: boolean;
  includeResponseSchema?: boolean;
  includeRenderPlan?: boolean;
  includeQuickReplyRule?: boolean;
  includeTurnLogs?: boolean;
  includeTokenUnused?: boolean;
  includeTurnId?: boolean;
  auditBotScope?: "all_bot_messages" | "runtime_turns_only";
};

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

function getDebugEntryMap(log: NonNullable<LogBundle["debug_logs"]>[number]) {
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
    const error = (log.response_payload as any)?.error;
    if (error?.message) summary.add(`${log.tool_name}: ${String(error.message)}`);
    else if (error?.code) summary.add(`${log.tool_name}: ${String(error.code)}`);
    else if (String(log.status || "").toLowerCase() !== "success") {
      summary.add(`${log.tool_name}: status=${log.status}`);
    }
  });
  (bundle.event_logs || []).forEach((log) => {
    const payloadError = (log.payload as any)?.error;
    if (payloadError) summary.add(`${log.event_type}: ${String(payloadError)}`);
  });
  if (bundle.logsError) summary.add(`MCP 로그 오류: ${bundle.logsError}`);
  return Array.from(summary);
}

function formatLogBundle(bundle?: LogBundle, turnId?: string | null) {
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
    lines.push("이벤트 로그:");
    (bundle.event_logs || []).forEach((log) => {
      const turnLabel = log.turn_id || turnId || "-";
      const safePayload = sanitizeEventPayloadForDisplay(log.event_type, log.payload || {});
      lines.push(`- ${log.id || "-"} ${log.event_type} (${log.created_at || "-"}) (turn_id=${turnLabel})`);
      lines.push("  payload:");
      lines.push(indentBlock(stringifyPretty(safePayload), 4));
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
    lines.push("이벤트 로그:");
    (bundle.event_logs || []).forEach((log) => {
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
  const entryMap = new Map(entries.map((entry: any) => [String(entry.key), String(entry.value ?? "")]));
  const lastStatus = (entryMap.get("MCP.last_status") || "").toLowerCase();
  const lastError = entryMap.get("MCP.last_error") || "";
  return lastStatus === "error" || (lastError && lastError !== "-");
}

function isMcpIssue(log: NonNullable<LogBundle["mcp_logs"]>[number]) {
  if (String(log.status || "").toLowerCase() !== "success") return true;
  const error = (log.response_payload as any)?.error;
  return Boolean(error);
}

function isEventIssue(log: NonNullable<LogBundle["event_logs"]>[number]) {
  const type = String(log.event_type || "").toUpperCase();
  if (type.includes("FAILED") || type.includes("ERROR")) return true;
  return Boolean((log.payload as any)?.error);
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
  const options = input.options || {};
  const includePrincipleHeader = options.includePrincipleHeader ?? true;
  const includeResponseSchema = options.includeResponseSchema ?? true;
  const includeRenderPlan = options.includeRenderPlan ?? true;
  const includeQuickReplyRule = options.includeQuickReplyRule ?? true;
  const includeTurnLogs = options.includeTurnLogs ?? true;
  const includeTokenUnused = options.includeTokenUnused ?? true;
  const includeTurnId = options.includeTurnId ?? true;
  const runtimeUsage = inferRuntimeUsageSummary(visibleMessages, input.messageLogs || {});
  const auditStatus = buildAuditStatus(visibleMessages, input.messageLogs || {}, options);

  const corePrinciple = [
    "디버그 대원칙:",
    "- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)",
    "- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.",
    "- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).",
    "- 실패 지점의 직전/직후 로그를 반드시 기록한다.",
    "",
    `기대 목록(MCP): ${auditStatus.expected.mcp_tools.join(", ") || "-"}`,
    `기대 목록(Event): ${auditStatus.expected.event_types.join(", ") || "-"}`,
    `기대 목록(Debug): ${auditStatus.expected.debug_functions.join(", ") || "-"}`,
    "",
    `사용 모듈(Runtime): ${runtimeUsage.runtime.join(", ") || "-"}`,
    `사용 모듈(Handlers): ${runtimeUsage.handlers.join(", ") || "-"}`,
    `사용 모듈(Services): ${runtimeUsage.services.join(", ") || "-"}`,
    `사용 모듈(Policies): ${runtimeUsage.policies.join(", ") || "-"}`,
    `사용 모듈(Shared): ${runtimeUsage.shared.join(", ") || "-"}`,
    "",
    `점검 완료 항목: ${auditStatus.completed.join(", ") || "-"}`,
    `점검 미완료: ${auditStatus.incomplete.map((item) => `${item.key}(${item.reasons.join(", ")})`).join(", ") || "-"}`,
    `점검 불가: ${auditStatus.blocked.join(", ") || "-"}`,
    "",
  ].join("\n");

  const formatBody = (msg: TranscriptMessage) => {
    const answerText = msg.content.includes("debug_prefix") ? extractDebugText(msg.content) : msg.content;
    if ((!msg.responseSchema || !includeResponseSchema) && (!msg.renderPlan || !includeRenderPlan)) return answerText;
    const lines: string[] = [answerText];
    if (msg.responseSchema && includeResponseSchema) {
      const schema = msg.responseSchema;
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
    if (msg.renderPlan && includeRenderPlan) {
      const plan = msg.renderPlan;
      lines.push(
        `RENDER_PLAN: view=${plan.view}, quick_replies=${plan.enable_quick_replies}, cards=${plan.enable_cards}, mode=${plan.selection_mode}, min=${plan.min_select}, max=${plan.max_select}, submit=${plan.submit_format}, prompt=${plan.prompt_kind || "-"}`
      );
      lines.push("RENDER_PLAN_DETAIL:");
      lines.push(indentBlock(stringifyPretty(plan), 2));
    }
    if (msg.quickReplyConfig && includeQuickReplyRule) {
      const rule = msg.quickReplyConfig;
      lines.push(
        `QUICK_REPLY_RULE: mode=${rule.selection_mode}, min=${rule.min_select ?? "-"}, max=${rule.max_select ?? "-"}, submit=${rule.submit_format ?? "-"}, criteria=${rule.criteria || "-"}, source=${rule.source_module || "-"}#${rule.source_function || "-"}`
      );
    }
    return lines.join("\n");
  };

  const turnBlocks: string[] = [];
  let bufferedUsers: TranscriptMessage[] = [];
  visibleMessages.forEach((msg) => {
    if (msg.role === "user") {
      bufferedUsers.push(msg);
      return;
    }
    const usedLines = [
      "[TOKEN_USED]",
      ...bufferedUsers.map((u) => `USER:\n${formatBody(u)}`),
      `BOT:\n${formatBody(msg)}`,
    ].join("\n\n");
    const unusedLines = includeTokenUnused ? ["[TOKEN_UNUSED]"].join("\n") : "";
    const logText = includeTurnLogs ? formatLogBundle(input.messageLogs[msg.id], msg.turnId) : "";
    const turnId = includeTurnId ? (msg.turnId ? `TURN_ID: ${msg.turnId}` : "TURN_ID: -") : "";
    const tail = logText ? `\n${logText}` : "";
    const body = includeTokenUnused ? `${usedLines}\n\n${unusedLines}${tail}` : `${usedLines}${tail}`;
    turnBlocks.push(turnId ? `${turnId}\n\n${body}` : body);
    bufferedUsers = [];
  });
  if (bufferedUsers.length > 0) {
    const usedLines = ["[TOKEN_USED]", ...bufferedUsers.map((u) => `USER:\n${formatBody(u)}`)].join("\n\n");
    const turnId = includeTurnId ? "TURN_ID: -" : "";
    const tokenUnusedTail = includeTokenUnused ? "\n\n[TOKEN_UNUSED]\n-" : "";
    const block = `${usedLines}${tokenUnusedTail}`;
    turnBlocks.push(turnId ? `${turnId}\n\n${block}` : block);
  }

  if (includePrincipleHeader) {
    return [corePrinciple.trimEnd(), ...turnBlocks].join("\n\n\n");
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
