export async function callMcpTool(
  context: any,
  tool: string,
  params: Record<string, unknown>,
  sessionId: string,
  turnId: string | null,
  botContext: Record<string, unknown>,
  allowedTools:
    | {
      keys: Set<string>;
      byName: Map<string, string[]>;
    }
    | undefined
) {
  const traceId = String((context as any)?.runtimeTraceId || "").trim();
  const tracedBotContext =
    botContext && typeof botContext === "object"
      ? ({
          ...(botContext as Record<string, unknown>),
          ...(traceId && !Object.prototype.hasOwnProperty.call(botContext, "trace_id")
            ? { trace_id: traceId }
            : {}),
        } as Record<string, unknown>)
      : traceId
        ? ({ trace_id: traceId } as Record<string, unknown>)
        : {};
  const auditBlocked = async (
    status: string,
    reason: string,
    toolId?: string | null,
    toolVersion?: string | null,
    responsePayload?: Record<string, unknown> | null
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
  const { callAdapter } = await import("@/lib/mcpAdapters");
  const { applyMasking, checkPolicyConditions, validateToolParams } = await import("@/lib/mcpPolicy");

  const resolvedParams: Record<string, unknown> = { ...params };
  if ((toolRow as any).endpoint_path && resolvedParams.path === undefined) {
    resolvedParams.path = (toolRow as any).endpoint_path;
  }
  if ((toolRow as any).http_method && resolvedParams.method === undefined) {
    resolvedParams.method = (toolRow as any).http_method;
  }
  if ((toolRow as any).scope_key && resolvedParams.required_scope === undefined) {
    resolvedParams.required_scope = (toolRow as any).scope_key;
  }

  const schema = (toolRow as any).schema_json || {};
  const validation = validateToolParams(schema as Record<string, unknown>, resolvedParams);
  if (!validation.ok) {
    await auditBlocked("invalid_params", "INVALID_PARAMS", toolRow.id, (toolRow as any).version || null, {
      error: validation.error || "INVALID_PARAMS",
    });
    return { ok: false, error: validation.error };
  }

  const conditionCheck = checkPolicyConditions((toolRow as any).conditions || null, resolvedParams);
  if (!conditionCheck.ok) {
    await auditBlocked("blocked", String(conditionCheck.error || "POLICY_CONDITION_BLOCK"), toolRow.id, (toolRow as any).version || null);
    return { ok: false, error: conditionCheck.error };
  }

  const start = Date.now();
  let result: any;
  let latency = 0;
  try {
    result = await callAdapter(
      String((toolRow as any).provider_key || "unknown"),
      resolvedParams,
      {
        supabase: context.supabase,
        orgId: context.orgId,
        userId: context.user.id,
      },
      { toolName: String((toolRow as any).name || "") }
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
        tool_id: toolRow.id,
        tool_version: (toolRow as any).version || null,
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
  const masked = applyMasking(responsePayload, (toolRow as any).masking_rules || null);

  const responsePayloadWithError =
    result.status === "error"
      ? { ...(masked.masked as Record<string, unknown>), error: result.error || null }
      : masked.masked;
  try {
    await context.supabase.from("F_audit_mcp_tools").insert({
      org_id: context.orgId,
      session_id: sessionId,
      turn_id: turnId,
      tool_id: toolRow.id,
      tool_version: (toolRow as any).version || null,
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
    .replace(/^(주소|배송지)\s*[:\-]?\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const out: string[] = [cleaned];
  const tokens = cleaned.split(" ").filter(Boolean);
  const isDetailToken = (token: string) =>
    /^\d{1,5}$/.test(token) ||
    /^\d{1,5}(호|층|동|실)$/.test(token) ||
    /^[A-Za-z]?\d{1,5}$/.test(token);
  // JUSO는 상세 동/호수까지 붙으면 매칭 실패가 잦아서 뒤 토큰을 단계적으로 제거하며 재시도한다.
  if (tokens.length >= 2) {
    let end = tokens.length;
    while (end > 1) {
      const last = tokens[end - 1];
      if (!isDetailToken(last)) break;
      end -= 1;
      const trimmed = tokens.slice(0, end).join(" ").trim();
      if (trimmed && !out.includes(trimmed)) out.push(trimmed);
    }
  }
  return out;
}

export async function callAddressSearchWithAudit(
  context: any,
  keyword: string,
  sessionId: string,
  turnId: string | null,
  botContext: Record<string, unknown>
) {
  const traceId = String((context as any)?.runtimeTraceId || "").trim();
  const tracedBotContext =
    botContext && typeof botContext === "object"
      ? ({
          ...(botContext as Record<string, unknown>),
          ...(traceId && !Object.prototype.hasOwnProperty.call(botContext, "trace_id")
            ? { trace_id: traceId }
            : {}),
        } as Record<string, unknown>)
      : traceId
        ? ({ trace_id: traceId } as Record<string, unknown>)
        : {};
  const { callAdapter } = await import("@/lib/mcpAdapters");
  const start = Date.now();
  const keywords = buildAddressSearchKeywords(keyword);
  let result: any = {
    status: "error",
    error: { code: "INVALID_INPUT", message: "keyword is required" },
    data: {},
  };
  const attempts: Array<{ keyword: string; status: string; total_count?: number | string; error?: string }> = [];
  let latency = 0;
  if (keywords.length > 0) {
    for (const kw of keywords) {
      try {
        const current = await callAdapter(
          "search_address",
          { keyword: kw },
          { supabase: context.supabase, orgId: context.orgId, userId: context.user.id }
        );
        attempts.push({
          keyword: kw,
          status: current?.status || "error",
          total_count: (current as any)?.data?.totalCount,
          error:
            current?.status === "error"
              ? String((current as any)?.error?.message || (current as any)?.error || "ADDRESS_SEARCH_FAILED")
              : undefined,
        });
        result = current;
        const rows = Array.isArray((current as any)?.data?.results) ? (current as any).data.results : [];
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
          error: { code: "ADDRESS_SEARCH_THROWN", message: error instanceof Error ? error.message : String(error) },
          data: {},
        };
      }
    }
  }
  latency = Date.now() - start;
  if (result?.data && typeof result.data === "object") {
    result.data = {
      ...(result.data as Record<string, unknown>),
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
