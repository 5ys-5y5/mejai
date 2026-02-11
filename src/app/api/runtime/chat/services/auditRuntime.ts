type SupabaseLike = {
  from: (table: string) => {
    insert: (...args: unknown[]) => { select: (...args: unknown[]) => { single: () => Promise<{ data?: Record<string, unknown>; error?: { message?: string } }> } };
    upsert: (...args: unknown[]) => Promise<unknown>;
  };
};

type RuntimeContext = { supabase: SupabaseLike; runtimeTraceId?: string | null };

function nowIso() {
  return new Date().toISOString();
}

const MAX_DECISION_CALL_CHAIN = 12;
const MAX_DECISION_FUNCTION_NAME = 96;

function sanitizeDecisionText(value: string) {
  const raw = String(value || "").trim();
  const maskedDigits = raw.replace(/\b\d{6,}\b/g, "<redacted>");
  return maskedDigits.length > MAX_DECISION_FUNCTION_NAME
    ? `${maskedDigits.slice(0, MAX_DECISION_FUNCTION_NAME)}...`
    : maskedDigits;
}

function inferDecisionPhase(eventType: string) {
  const type = String(eventType || "").toUpperCase();
  if (type.startsWith("PRE_")) return "before";
  if (type.startsWith("FINAL_")) return "after";
  if (type === "POLICY_DECISION" || type === "MCP_CALL_SKIPPED") return "decision";
  return "runtime";
}

function normalizeDecisionModulePath(rawPath: string) {
  const normalized = String(rawPath || "").trim().replace(/\\/g, "/");
  const srcIndex = normalized.indexOf("src/app/api/runtime/chat/");
  if (srcIndex >= 0) return normalized.slice(srcIndex);
  const dottedSrcIndex = normalized.indexOf("./src/app/api/runtime/chat/");
  if (dottedSrcIndex >= 0) return normalized.slice(dottedSrcIndex + 2);
  return normalized;
}

function isRuntimeChatSourcePath(rawPath: string) {
  const normalized = normalizeDecisionModulePath(rawPath);
  return normalized.startsWith("src/app/api/runtime/chat/");
}

function parseStackFrame(line: string) {
  const trimmed = String(line || "").trim();
  const matched =
    trimmed.match(/\bat\s+(.+?)\s+\((.+):(\d+):(\d+)\)$/) ||
    trimmed.match(/\bat\s+(.+):(\d+):(\d+)$/);
  if (!matched) return null;
  if (matched.length === 5) {
    return {
      functionName: matched[1].trim(),
      modulePath: normalizeDecisionModulePath(matched[2]),
      line: Number(matched[3]),
      column: Number(matched[4]),
    };
  }
  return {
    functionName: "anonymous",
    modulePath: normalizeDecisionModulePath(matched[1]),
    line: Number(matched[2]),
    column: Number(matched[3]),
  };
}

function inferDecisionFallback(eventType: string, payload: Record<string, unknown>) {
  const type = String(eventType || "").toUpperCase();
  const payloadRecord = payload as Record<string, unknown>;
  const stage = String(payloadRecord?.stage || "").toLowerCase();
  const action = String(payloadRecord?.action || "").toUpperCase();
  const model = String(payloadRecord?.model || "").toLowerCase();
  const reason = String(payloadRecord?.reason || "").toUpperCase();
  const tool = String(payloadRecord?.tool || "").toLowerCase();

  if (type === "SLOT_EXTRACTED") {
    return {
      module_path: "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
      function_name: "emit:SLOT_EXTRACTED",
      line: 145,
      column: 0,
    };
  }
  if (type === "PRE_MCP_DECISION" || type === "MCP_CALL_SKIPPED") {
    return {
      module_path: "src/app/api/runtime/chat/runtime/toolRuntime.ts",
      function_name: `emit:${type}`,
      line: type === "PRE_MCP_DECISION" ? 657 : 431,
      column: 0,
    };
  }
  if (type === "POLICY_STATIC_CONFLICT") {
    return {
      module_path: "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
      function_name: "emit:POLICY_STATIC_CONFLICT",
      line: 42,
      column: 0,
    };
  }
  if (type === "MCP_TOOL_FAILED") {
    if (tool === "list_orders") {
      return {
        module_path: "src/app/api/runtime/chat/runtime/postToolRuntime.ts",
        function_name: "emit:MCP_TOOL_FAILED",
        line: 47,
        column: 0,
      };
    }
    return {
      module_path: "src/app/api/runtime/chat/runtime/postToolRuntime.ts",
      function_name: "emit:MCP_TOOL_FAILED",
      line: 47,
      column: 0,
    };
  }
  if (type === "EXECUTION_GUARD_TRIGGERED") {
    if (reason === "MCP_TOKEN_REFRESH_FAILED" || reason === "MCP_SCOPE_MISSING") {
      return {
        module_path: "src/app/api/runtime/chat/runtime/toolRuntime.ts",
        function_name: "emit:EXECUTION_GUARD_TRIGGERED",
        line: reason === "MCP_SCOPE_MISSING" ? 942 : 995,
        column: 0,
      };
    }
    return {
      module_path: "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
      function_name: "emit:EXECUTION_GUARD_TRIGGERED",
      line: 125,
      column: 0,
    };
  }
  if (type === "FINAL_ANSWER_READY" && model.includes("intent_disambiguation")) {
    return {
      module_path: "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
      function_name: "emit:FINAL_ANSWER_READY",
      line: 155,
      column: 0,
    };
  }
  if (type === "FINAL_ANSWER_READY") {
    if (model.includes("deterministic_token_refresh_guard") || model.includes("deterministic_scope_guard")) {
      return {
        module_path: "src/app/api/runtime/chat/runtime/toolRuntime.ts",
        function_name: "emit:FINAL_ANSWER_READY",
        line: model.includes("deterministic_scope_guard") ? 955 : 1007,
        column: 0,
      };
    }
    if (model.includes("deterministic_escalation_guard")) {
      return {
        module_path: "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
        function_name: "emit:FINAL_ANSWER_READY",
        line: 93,
        column: 0,
      };
    }
    return {
      module_path: "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
      function_name: "emit:FINAL_ANSWER_READY",
      line: 248,
      column: 0,
    };
  }
  if (type === "POLICY_DECISION" && (action.includes("INTENT_DISAMBIGUATION") || stage === "input")) {
    return {
      module_path: "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
      function_name: "emit:POLICY_DECISION",
      line: action.includes("SELECTED") ? 175 : 147,
      column: 0,
    };
  }
  if (type === "POLICY_DECISION" && stage === "tool") {
    return {
      module_path: "src/app/api/runtime/chat/handlers/restockHandler.ts",
      function_name: "emit:POLICY_DECISION",
      line: 819,
      column: 0,
    };
  }
  if (type === "TURN_WRITE") {
    return {
      module_path: "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
      function_name: "insertTurnWithDebug",
      line: 152,
      column: 0,
    };
  }
  return null;
}

function captureDecisionTrace(eventType: string, payload: Record<string, unknown>) {
  const stack = new Error().stack || "";
  const frames = stack.split("\n").slice(1);
  const chain = frames
    .map((line) => parseStackFrame(line))
    .filter((frame): frame is { functionName: string; modulePath: string; line: number; column: number } => {
      if (!frame) return false;
      if (!isRuntimeChatSourcePath(frame.modulePath)) return false;
      if (frame.modulePath.endsWith("services/auditRuntime.ts")) return false;
      return true;
    })
    .slice(0, MAX_DECISION_CALL_CHAIN)
    .map((frame) => ({
      module_path: frame.modulePath,
      function_name: sanitizeDecisionText(frame.functionName),
      line: frame.line,
      column: frame.column,
    }));
  const picked = chain[0] || null;
  const fallback = inferDecisionFallback(eventType, payload || {});
  const fallbackChain = fallback
    ? [
        {
          module_path: String((fallback as Record<string, unknown>).module_path || "unknown"),
          function_name: sanitizeDecisionText(
            String((fallback as Record<string, unknown>).function_name || "unknown")
          ),
          line: Number((fallback as Record<string, unknown>).line || 0),
          column: Number((fallback as Record<string, unknown>).column || 0),
        },
      ]
    : [];
  const mergedChain = chain.length > 0 ? chain : fallbackChain;
  return {
    phase: inferDecisionPhase(eventType),
    ...(picked
      ? {
          module_path: picked.module_path,
          function_name: picked.function_name,
          line: picked.line,
          column: picked.column,
        }
      : fallback || { module_path: "unknown", function_name: "unknown" }),
    call_chain: mergedChain,
    recorded_at: nowIso(),
  };
}

export async function insertEvent(
  context: RuntimeContext,
  sessionId: string,
  turnId: string | null,
  eventType: string,
  payload: Record<string, unknown>,
  botContext: Record<string, unknown>
) {
  const traceId = String((context as RuntimeContext)?.runtimeTraceId || "").trim();
  const decisionRaw = captureDecisionTrace(eventType, payload || {});
  const fallback = inferDecisionFallback(eventType, payload || {});
  const decision =
    decisionRaw.module_path === "unknown" && fallback
      ? { ...decisionRaw, ...fallback }
      : decisionRaw;
  if (
    (!Array.isArray((decision as Record<string, unknown>).call_chain) ||
      (decision as Record<string, unknown>).call_chain.length === 0) &&
    fallback
  ) {
    (decision as Record<string, unknown>).call_chain = [
      {
        module_path: String((fallback as Record<string, unknown>).module_path || "unknown"),
        function_name: sanitizeDecisionText(
          String((fallback as Record<string, unknown>).function_name || "unknown")
        ),
        line: Number((fallback as Record<string, unknown>).line || 0),
        column: Number((fallback as Record<string, unknown>).column || 0),
      },
    ];
  }
  const safePayload =
    payload && typeof payload === "object"
      ? ({ ...(payload as Record<string, unknown>), _decision: decision } as Record<string, unknown>)
      : ({ _decision: decision } as Record<string, unknown>);
  const safeBotContext =
    botContext && typeof botContext === "object"
      ? ({ ...(botContext as Record<string, unknown>), _decision: decision } as Record<string, unknown>)
      : ({ _decision: decision } as Record<string, unknown>);
  if (traceId && !Object.prototype.hasOwnProperty.call(safeBotContext, "trace_id")) {
    safeBotContext.trace_id = traceId;
  }
  try {
    await context.supabase.from("F_audit_events").insert({
      session_id: sessionId,
      turn_id: turnId,
      event_type: eventType,
      payload: safePayload,
      created_at: nowIso(),
      bot_context: safeBotContext,
    });
  } catch (error) {
    console.warn("[runtime/chat_mk2] failed to insert event log", {
      eventType,
      sessionId,
      turnId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function upsertDebugLog(
  context: RuntimeContext,
  payload: { sessionId: string; turnId: string; seq?: number | null; prefixJson: Record<string, unknown> | null }
) {
  if (!payload.prefixJson) return;
  try {
    await context.supabase.from("F_audit_turn_specs").upsert(
      {
        session_id: payload.sessionId,
        turn_id: payload.turnId,
        seq: payload.seq ?? null,
        prefix_json: payload.prefixJson,
        created_at: nowIso(),
      },
      { onConflict: "turn_id" }
    );
  } catch (error) {
    console.warn("[runtime/chat_mk2] failed to upsert debug log", {
      sessionId: payload.sessionId,
      turnId: payload.turnId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function insertFinalTurn(
  context: RuntimeContext,
  payload: Record<string, unknown>,
  prefixJson: Record<string, unknown> | null
) {
  const turnDecision = captureDecisionTrace("TURN_WRITE", {});
  const nextPayload = {
    ...payload,
    bot_context: {
      ...((payload.bot_context || {}) as Record<string, unknown>),
      _decision_turn: turnDecision,
    },
  };
  const nextPrefixJson = prefixJson
    ? ({
        ...prefixJson,
        decision: turnDecision,
      } as Record<string, unknown>)
    : null;
  const { data, error } = await context.supabase.from("D_conv_turns").insert(nextPayload).select("*").single();
  if (!error && data?.id && data?.session_id) {
    await upsertDebugLog(context, {
      sessionId: data.session_id,
      turnId: data.id,
      seq: data.seq,
      prefixJson: nextPrefixJson,
    });
  }
  return { data, error };
}
