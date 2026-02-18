import type { AddressSearchResult, RuntimeContext } from "../shared/runtimeTypes";

export async function callMcpTool(
  context: RuntimeContext,
  tool: string,
  params: Record<string, any>,
  sessionId: string,
  turnId: string | null,
  botContext: Record<string, any>,
  allowedTools:
    | {
      keys: Set<string>;
      byName: Map<string, string[]>;
    }
    | undefined
) {
  const traceId = String(context?.runtimeTraceId || "").trim();
  const tracedBotContext =
    botContext && typeof botContext === "object"
      ? ({
          ...(botContext as Record<string, any>),
          ...(traceId && !Object.prototype.hasOwnProperty.call(botContext, "trace_id")
            ? { trace_id: traceId }
            : {}),
        } as Record<string, any>)
      : traceId
        ? ({ trace_id: traceId } as Record<string, any>)
        : {};
  const auditBlocked = async (
    status: string,
    reason: string,
    toolId?: string | null,
    toolVersion?: string | null,
    responsePayload?: Record<string, any> | null
  ) => {
    try {
      await context.supabase.from("F_audit_mcp_tools").insert({
        org_id: context.orgId,
        session_id: sessionId,
        turn_id: turnId,
        tool_id: toolId || null,
        tool_version: toolVersion || null,
        tool_name: tool,
        request_payload: params,
        response_payload: responsePayload || null,
        status,
        latency_ms: 0,
        masked_fields: [],
        policy_decision: { allowed: false, reason },
        created_at: new Date().toISOString(),
        bot_context: tracedBotContext,
      });
    } catch (error) {
      console.warn("[runtime/chat_mk2] failed to audit blocked MCP call", {
        tool,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
  if (!allowedTools) {
    console.warn("[runtime/chat_mk2] allowedTools missing", { tool, sessionId, turnId });
  }
  const allowed =
    allowedTools ??
    ({
      keys: new Set<string>(),
      byName: new Map<string, string[]>(),
    } as const);
  const rawTool = String(tool || "").trim();
  const directKey = rawTool.includes(":") ? rawTool : null;
  const resolvedToolKey = (() => {
    if (directKey) return directKey;
    const candidates = allowed.byName.get(rawTool) || [];
    if (candidates.length === 1) return candidates[0];
    return null;
  })();

  if (!resolvedToolKey || !allowed.keys.has(resolvedToolKey)) {
    await auditBlocked("blocked", "TOOL_NOT_ALLOWED_FOR_AGENT");
    return { ok: false, error: "TOOL_NOT_ALLOWED_FOR_AGENT" };
  }
  const [providerKey, toolName] = resolvedToolKey.split(":");
  const { data: toolRow } = await context.supabase
    .from("C_mcp_tools")
    .select("id, name, provider_key, scope_key, endpoint_path, http_method, version, schema_json, masking_rules, conditions")
    .eq("provider_key", providerKey)
    .eq("name", toolName)
    .eq("is_active", true)
    .maybeSingle();
  if (!toolRow) {
    await auditBlocked("blocked", "TOOL_NOT_FOUND");
    return { ok: false, error: "TOOL_NOT_FOUND" };
  }
  const toolRecord = toolRow as Record<string, any>;
  const { callAdapter } = await import("@/lib/mcpAdapters");
  const { applyMasking, checkPolicyConditions, validateToolParams } = await import("@/lib/mcpPolicy");

  const resolvedParams: Record<string, any> = { ...params };
  if (toolRecord.endpoint_path && resolvedParams.path === undefined) {
    resolvedParams.path = toolRecord.endpoint_path as string;
  }
  if (toolRecord.http_method && resolvedParams.method === undefined) {
    resolvedParams.method = toolRecord.http_method as string;
  }
  if (toolRecord.scope_key && resolvedParams.required_scope === undefined) {
    resolvedParams.required_scope = toolRecord.scope_key as string;
  }

  const schema = toolRecord.schema_json || {};
  const validation = validateToolParams(schema as Record<string, any>, resolvedParams);
  if (!validation.ok) {
    await auditBlocked("invalid_params", "INVALID_PARAMS", toolRow.id as string, (toolRecord.version as string) || null, {
      error: validation.error || "INVALID_PARAMS",
    });
    return { ok: false, error: validation.error };
  }

  const conditionCheck = checkPolicyConditions(toolRecord.conditions || null, resolvedParams);
  if (!conditionCheck.ok) {
    await auditBlocked(
      "blocked",
      String(conditionCheck.error || "POLICY_CONDITION_BLOCK"),
      toolRow.id as string,
      (toolRecord.version as string) || null
    );
    return { ok: false, error: conditionCheck.error };
  }

  const start = Date.now();
  let result: { status: string; data?: Record<string, any>; error?: unknown };
  let latency = 0;
  try {
    result = await callAdapter(
      String(toolRecord.provider_key || "unknown"),
      resolvedParams,
      {
        supabase: context.supabase,
        orgId: context.orgId,
        userId: context.user.id,
      },
      { toolName: String(toolRecord.name || "") }
    );
    latency = Date.now() - start;
  } catch (error) {
    latency = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    try {
      await context.supabase.from("F_audit_mcp_tools").insert({
        org_id: context.orgId,
        session_id: sessionId,
        turn_id: turnId,
        tool_id: toolRow.id as string,
        tool_version: (toolRecord.version as string) || null,
        tool_name: tool,
        request_payload: resolvedParams,
        response_payload: { error: message },
        status: "error",
        latency_ms: latency,
        masked_fields: [],
        policy_decision: { allowed: true, reason: "ADAPTER_THROWN_ERROR" },
        created_at: new Date().toISOString(),
        bot_context: tracedBotContext,
      });
    } catch (auditError) {
      console.warn("[runtime/chat_mk2] failed to audit MCP adapter error", {
        tool,
        error: auditError instanceof Error ? auditError.message : String(auditError),
      });
    }
    return { ok: false, error: `ADAPTER_ERROR: ${message}` };
  }
  const responsePayload = result.data ? { ...result.data } : {};
  const masked = applyMasking(responsePayload, toolRecord.masking_rules || null);

  const responsePayloadWithError =
    result.status === "error"
      ? { ...(masked.masked as Record<string, any>), error: result.error || null }
      : masked.masked;
  try {
    await context.supabase.from("F_audit_mcp_tools").insert({
      org_id: context.orgId,
      session_id: sessionId,
      turn_id: turnId,
      tool_id: toolRow.id as string,
      tool_version: (toolRecord.version as string) || null,
      tool_name: `${toolRow.provider_key}:${toolRow.name}`,
      request_payload: resolvedParams,
      response_payload: responsePayloadWithError,
      status: result.status,
      latency_ms: latency,
      masked_fields: masked.maskedFields,
      policy_decision: { allowed: true },
      created_at: new Date().toISOString(),
      bot_context: tracedBotContext,
    });
  } catch (auditError) {
    console.warn("[runtime/chat_mk2] failed to audit MCP result", {
      tool,
      status: result.status,
      error: auditError instanceof Error ? auditError.message : String(auditError),
    });
  }

  if (result.status !== "success") {
    const err = result.error as { code?: string; message?: string } | string | null | undefined;
    if (err && typeof err === "object") {
      const code = err.code ? String(err.code) : "MCP_ERROR";
      const message = err.message ? String(err.message) : "UNKNOWN";
      return { ok: false, error: `${code}: ${message}` };
    }
    return { ok: false, error: typeof err === "string" && err ? err : "MCP_ERROR" };
  }
  return { ok: true, data: masked.masked };
}

export function buildAddressSearchKeywords(raw: string) {
  const cleaned = String(raw || "")
    .replace(/^(?:address|addr|shipping address|\uC8FC\uC18C|\uBC30\uC1A1\uC9C0)\s*[:\-]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const out: string[] = [];
  const pushUnique = (value: string) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;
    if (!out.includes(trimmed)) out.push(trimmed);
  };
  pushUnique(cleaned);
  const tokens = cleaned.split(" ").filter(Boolean);
  if (tokens.length < 2) return out;

  const unitSuffixRegex = /(?:\uBC88\uC9C0|\uD638|\uB3D9|\uCE35)$/u;
  const stripUnitSuffix = (token: string) => String(token || "").replace(unitSuffixRegex, "");
  const normalizeToken = (token: string) => stripUnitSuffix(String(token || "").trim());
  const isNumericLike = (token: string) => {
    const normalized = normalizeToken(token);
    if (!normalized) return false;
    return (
      /^\d{1,5}$/.test(normalized) ||
      /^\d{1,5}-\d{1,5}$/.test(normalized) ||
      /^[A-Za-z]?\d{1,5}$/.test(normalized)
    );
  };
  const isLikelyDetailToken = (token: string, prevToken: string | null) => {
    if (!token) return false;
    if (unitSuffixRegex.test(token)) return true;
    if (!isNumericLike(token)) return false;
    const prevNumeric = prevToken ? isNumericLike(prevToken) : false;
    if (prevNumeric) return true;
    const normalized = normalizeToken(token);
    return /^\d{1,5}-\d{1,5}$/.test(normalized) && Boolean(prevToken);
  };

  const pushTokens = (parts: string[]) => {
    if (parts.length === 0) return;
    pushUnique(parts.join(" "));
  };

  let current = [...tokens];
  while (current.length > 1) {
    const last = current[current.length - 1];
    const prev = current.length > 1 ? current[current.length - 2] : null;
    const isDetail = isLikelyDetailToken(last, prev);
    if (isDetail) {
      const normalizedLast = normalizeToken(last);
      if (normalizedLast && normalizedLast !== last) {
        pushTokens([...current.slice(0, -1), normalizedLast]);
      }
      if (normalizedLast.includes("-")) {
        const head = normalizedLast.split("-")[0];
        if (head && head !== normalizedLast) {
          pushTokens([...current.slice(0, -1), head]);
        }
      }
      current = current.slice(0, -1);
      pushTokens(current);
      continue;
    }
    break;
  }
  return out;
}

export async function callAddressSearchWithAudit(
  context: RuntimeContext,
  keyword: string,
  sessionId: string,
  turnId: string | null,
  botContext: Record<string, any>
) {
  const traceId = String(context?.runtimeTraceId || "").trim();
  const tracedBotContext =
    botContext && typeof botContext === "object"
      ? ({
          ...(botContext as Record<string, any>),
          ...(traceId && !Object.prototype.hasOwnProperty.call(botContext, "trace_id")
            ? { trace_id: traceId }
            : {}),
        } as Record<string, any>)
      : traceId
        ? ({ trace_id: traceId } as Record<string, any>)
        : {};
  const { callAdapter } = await import("@/lib/mcpAdapters");
  const start = Date.now();
  const keywords = buildAddressSearchKeywords(keyword);
  let result: AddressSearchResult = {
    status: "error",
    error: "INVALID_INPUT",
    data: {},
  };
  const attempts: Array<{ keyword: string; status: string; total_count?: number | string; error?: string }> = [];
  let latency = 0;
  if (keywords.length > 0) {
    for (const kw of keywords) {
      try {
        const current = (await callAdapter(
          "search_address",
          { keyword: kw },
          { supabase: context.supabase, orgId: context.orgId, userId: context.user.id }
        )) as { status?: string; data?: Record<string, any>; error?: unknown };
        const currentData = (current?.data || {}) as Record<string, any>;
        const currentError = current?.error;
        attempts.push({
          keyword: kw,
          status: current?.status || "error",
          total_count: currentData.totalCount,
          error:
            current?.status === "error"
              ? String(
                  (currentError as { message?: string } | undefined)?.message ||
                    currentError ||
                    "ADDRESS_SEARCH_FAILED"
                )
              : undefined,
        });
        result = {
          status: (current?.status === "success" ? "success" : "error"),
          data: current?.data,
          error:
            current?.status === "error"
              ? String(
                  (currentError as { message?: string } | undefined)?.message ||
                    currentError ||
                    "ADDRESS_SEARCH_FAILED"
                )
              : undefined,
        };
        const rows = Array.isArray(currentData.results)
          ? (currentData.results as Array<unknown>)
          : [];
        if (current?.status === "success" && rows.length > 0) {
          break;
        }
      } catch (error) {
        attempts.push({
          keyword: kw,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
        result = {
          status: "error",
          error: error instanceof Error ? error.message : String(error),
          data: {},
        };
      }
    }
  }
  latency = Date.now() - start;
  if (result?.data && typeof result.data === "object") {
    result.data = {
      ...(result.data as Record<string, any>),
      _search_attempts: attempts,
      _search_keywords: keywords,
    };
  }
  try {
    await context.supabase.from("F_audit_mcp_tools").insert({
      org_id: context.orgId,
      session_id: sessionId,
      turn_id: turnId,
      tool_id: null,
      tool_version: null,
      tool_name: "search_address",
      request_payload: { keyword, search_keywords: keywords },
      response_payload: result.status === "success" ? result.data || {} : { error: result.error || null },
      status: result.status,
      latency_ms: latency,
      masked_fields: [],
      policy_decision: { allowed: true, reason: "INTERNAL_FALLBACK" },
      created_at: new Date().toISOString(),
      bot_context: tracedBotContext,
    });
  } catch {
    // noop: address search audit insert failure should not block response
  }
  return result;
}



