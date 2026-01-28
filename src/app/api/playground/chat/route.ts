import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { runLlm } from "@/lib/llm";

type Body = {
  agent_id?: string;
  message?: string;
  session_id?: string;
};

type AgentRow = {
  id: string;
  parent_id?: string | null;
  name: string;
  llm: "chatgpt" | "gemini";
  kb_id: string | null;
  mcp_tool_ids?: string[] | null;
};

type KbRow = {
  id: string;
  title: string;
  content: string | null;
  is_active: boolean | null;
  version: string | null;
};

const YES_PATTERNS = [/^네/, /^예/, /^맞/, /^응/, /^확인/, /^yes/i, /^y$/i];

function isYes(text: string) {
  const trimmed = text.trim();
  return YES_PATTERNS.some((p) => p.test(trimmed));
}

function extractOrderId(text: string) {
  const labeled = text.match(/(?:주문번호|order)[^\dA-Za-z]{0,10}([0-9A-Za-z\-]{6,30})/i);
  if (labeled) return labeled[1];
  const hyphenId = text.match(/\b\d{4,12}-\d{3,12}(?:-\d{1,6})?\b/);
  if (hyphenId) return hyphenId[0];
  const plain = text.match(/\b\d{6,20}\b/);
  return plain ? plain[0] : null;
}

function isOrderOnlyMessage(text: string) {
  const trimmed = text.trim();
  const extracted = extractOrderId(trimmed);
  if (!extracted) return false;
  const cleaned = trimmed.replace(extracted, "").replace(/[^\p{L}\p{N}]/gu, "").trim();
  return cleaned.length <= 6;
}

function needsShipmentAction(text: string) {
  return /배송|송장|출고|운송장|배송조회/.test(text);
}

function needsTicketAction(text: string) {
  return /문의|접수|요청|처리|환불|취소|반품|교환/.test(text);
}

function isRepeatRequest(prev?: string | null, next?: string | null) {
  if (!prev || !next) return false;
  const p = prev.replace(/\s+/g, " ").trim();
  const n = next.replace(/\s+/g, " ").trim();
  if (!p || !n) return false;
  if (p === n) return true;
  const token = n.replace(/[^\p{L}\p{N}]/gu, "");
  return token.length > 4 && p.includes(token);
}

function nowIso() {
  return new Date().toISOString();
}

async function fetchAgent(context: any, agentId: string) {
  const { data, error } = await context.supabase
    .from("agent")
    .select("*")
    .eq("id", agentId)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .maybeSingle();
  if (error) return { error: error.message };
  if (data) return { data: data as AgentRow };

  const { data: parent, error: parentError } = await context.supabase
    .from("agent")
    .select("*")
    .eq("parent_id", agentId)
    .eq("is_active", true)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .maybeSingle();
  if (parentError) return { error: parentError.message };
  return { data: parent as AgentRow | null };
}

async function fetchKb(context: any, kbId: string) {
  const { data, error } = await context.supabase
    .from("knowledge_base")
    .select("id, title, content, is_active, version")
    .eq("id", kbId)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .maybeSingle();
  if (error) return { error: error.message };
  return { data: data as KbRow | null };
}

async function createSession(context: any, agentId: string) {
  const sessionCode = `p_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    org_id: context.orgId,
    session_code: sessionCode,
    started_at: nowIso(),
    channel: "playground",
    agent_id: agentId,
  };
  const { data, error } = await context.supabase.from("sessions").insert(payload).select("*").single();
  if (error) return { error: error.message };
  return { data };
}

async function getLastTurn(context: any, sessionId: string) {
  const { data, error } = await context.supabase
    .from("turns")
    .select("*")
    .eq("session_id", sessionId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { error: error.message };
  return { data };
}

async function insertEvent(context: any, sessionId: string, eventType: string, payload: Record<string, unknown>, botContext: Record<string, unknown>) {
  await context.supabase.from("event_logs").insert({
    session_id: sessionId,
    event_type: eventType,
    payload,
    created_at: nowIso(),
    bot_context: botContext,
  });
}

async function callMcpTool(
  context: any,
  tool: string,
  params: Record<string, unknown>,
  sessionId: string,
  botContext: Record<string, unknown>,
  allowedTools: Set<string>
) {
  if (!allowedTools.has(tool)) {
    return { ok: false, error: "TOOL_NOT_ALLOWED_FOR_AGENT" };
  }
  const { data: toolRow } = await context.supabase
    .from("mcp_tools")
    .select("id, name, version, schema_json")
    .eq("name", tool)
    .eq("is_active", true)
    .maybeSingle();
  if (!toolRow) {
    return { ok: false, error: "TOOL_NOT_FOUND" };
  }
  const policy = await context.supabase
    .from("mcp_tool_policies")
    .select("is_allowed, allowed_scopes, rate_limit_per_min, masking_rules, conditions, adapter_key")
    .eq("org_id", context.orgId)
    .eq("tool_id", toolRow.id)
    .maybeSingle();
  if (!policy.data || !policy.data.is_allowed) {
    return { ok: false, error: "POLICY_BLOCK" };
  }
  const { callAdapter } = await import("@/lib/mcpAdapters");
  const { applyMasking, checkPolicyConditions, validateToolParams } = await import("@/lib/mcpPolicy");

  const schema = (toolRow as any).schema_json || {};
  const validation = validateToolParams(schema as Record<string, unknown>, params);
  if (!validation.ok) return { ok: false, error: validation.error };

  const conditionCheck = checkPolicyConditions(policy.data.conditions, params);
  if (!conditionCheck.ok) return { ok: false, error: conditionCheck.error };

  const start = Date.now();
  const adapterKey = policy.data.adapter_key || tool;
  const result = await callAdapter(adapterKey, params, {
    supabase: context.supabase,
    orgId: context.orgId,
    userId: context.user.id,
  });
  const latency = Date.now() - start;
  const responsePayload = result.data ? { ...result.data } : {};
  const masked = applyMasking(responsePayload, policy.data.masking_rules);

  await context.supabase.from("mcp_tool_audit_logs").insert({
    org_id: context.orgId,
    session_id: sessionId,
    tool_id: toolRow.id,
    tool_name: toolRow.name,
    request_payload: params,
    response_payload: masked.masked,
    status: result.status,
    latency_ms: latency,
    masked_fields: masked.maskedFields,
    policy_decision: { allowed: true },
    created_at: nowIso(),
    bot_context: botContext,
  });

  if (result.status !== "success") {
    return { ok: false, error: result.error?.message || "MCP_ERROR" };
  }
  return { ok: true, data: masked.masked };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const agentId = String(body?.agent_id || "").trim();
  const message = String(body?.message || "").trim();
  if (!agentId || !message) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const agentRes = await fetchAgent(context, agentId);
  if (!agentRes.data) {
    return NextResponse.json({ error: agentRes.error || "AGENT_NOT_FOUND" }, { status: 404 });
  }
  const agent = agentRes.data;
  if (!agent.kb_id) {
    return NextResponse.json({ error: "AGENT_KB_MISSING" }, { status: 400 });
  }

  const kbRes = await fetchKb(context, agent.kb_id);
  if (!kbRes.data || !kbRes.data.is_active) {
    return NextResponse.json({ error: "KB_NOT_ACTIVE" }, { status: 400 });
  }
  const kb = kbRes.data;

  const botContext = {
    agent_version_id: agent.id,
    kb_version_id: kb.id,
    kb_version: kb.version,
    llm_provider: agent.llm,
    mcp_tool_ids: agent.mcp_tool_ids ?? [],
    ts: nowIso(),
  };

  const allowedToolNames = new Set<string>();
  if (agent.mcp_tool_ids && agent.mcp_tool_ids.length > 0) {
    const { data: tools } = await context.supabase
      .from("mcp_tools")
      .select("id, name")
      .in("id", agent.mcp_tool_ids);
    (tools || []).forEach((t) => allowedToolNames.add(String(t.name)));
  }

  let sessionId = String(body?.session_id || "").trim();
  if (!sessionId) {
    const sessionRes = await createSession(context, agent.id);
    if (!sessionRes.data) {
      return NextResponse.json({ error: sessionRes.error || "SESSION_CREATE_FAILED" }, { status: 400 });
    }
    sessionId = sessionRes.data.id;
    await context.supabase.from("sessions").update({ bot_context: botContext }).eq("id", sessionId);
  } else {
    await context.supabase.from("sessions").update({ bot_context: botContext }).eq("id", sessionId);
  }

  const lastTurnRes = await getLastTurn(context, sessionId);
  const lastTurn = lastTurnRes.data as any;
  const nextSeq = lastTurn?.seq ? Number(lastTurn.seq) + 1 : 1;

  const hasPendingConfirm =
    lastTurn && lastTurn.confirm_prompt && lastTurn.user_confirmed === null && !lastTurn.final_answer;

  if (hasPendingConfirm) {
    const confirmed = isYes(message) || isOrderOnlyMessage(message);
    const confirmUpdate = {
      confirmation_response: message,
      user_confirmed: confirmed,
      correction_text: confirmed ? null : message,
      bot_context: botContext,
    };
    await context.supabase.from("turns").update(confirmUpdate).eq("id", lastTurn.id);

    if (!confirmed) {
      const autoProceed =
        extractOrderId(message) ||
        isRepeatRequest(lastTurn?.transcript_text, message);
      if (autoProceed) {
        const confirmUpdateAuto = {
          confirmation_response: message,
          user_confirmed: true,
          correction_text: null,
          bot_context: botContext,
        };
        await context.supabase.from("turns").update(confirmUpdateAuto).eq("id", lastTurn.id);
      } else {
      const summaryPrompt = `아래 고객 정정 내용을 반영해 요약(핵심 3~5개)과 확인 질문을 만들어 주세요.
형식: 
요약: ...
확인질문: ...`;
      const summaryRes = await runLlm(agent.llm, summaryPrompt, message);
      const [summaryLine, confirmLine] = summaryRes.text.split("\n").filter(Boolean);
      const summaryText = summaryLine?.replace("요약:", "").trim() || message;
      const confirmPrompt = confirmLine?.replace("확인질문:", "").trim() || "정리한 내용이 맞나요?";

      const { data: turnRow } = await context.supabase.from("turns").insert({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        summary_text: summaryText,
        confirm_prompt: confirmPrompt,
        bot_context: botContext,
      }).select("*").single();

      await insertEvent(context, sessionId, "SUMMARY_GENERATED", { summary: summaryText, seq: nextSeq }, botContext);
      await insertEvent(context, sessionId, "CONFIRMATION_REQUESTED", { confirm_prompt: confirmPrompt, seq: nextSeq }, botContext);

        return NextResponse.json({
        session_id: sessionId,
        step: "confirm",
        message: confirmPrompt,
        turn_id: turnRow?.id || null,
        });
      }
    }
  }

  if (!hasPendingConfirm) {
    const summaryPrompt = `아래 고객 발화를 요약하고 확인 질문을 만들어 주세요.
형식:
요약: ...
확인질문: ...`;
    const summaryRes = await runLlm(agent.llm, summaryPrompt, message);
    const [summaryLine, confirmLine] = summaryRes.text.split("\n").filter(Boolean);
    const summaryText = summaryLine?.replace("요약:", "").trim() || message;
    const confirmPrompt = confirmLine?.replace("확인질문:", "").trim() || "정리한 내용이 맞나요?";

    const { data: turnRow } = await context.supabase.from("turns").insert({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      summary_text: summaryText,
      confirm_prompt: confirmPrompt,
      bot_context: botContext,
    }).select("*").single();

    await insertEvent(context, sessionId, "SUMMARY_GENERATED", { summary: summaryText, seq: nextSeq }, botContext);
    await insertEvent(context, sessionId, "CONFIRMATION_REQUESTED", { confirm_prompt: confirmPrompt, seq: nextSeq }, botContext);

    return NextResponse.json({
      session_id: sessionId,
      step: "confirm",
      message: confirmPrompt,
      turn_id: turnRow?.id || null,
    });
  }

  const questionText = hasPendingConfirm ? String(lastTurn?.transcript_text || message) : message;
  const orderId = extractOrderId(questionText);
  let mcpSummary = "";
  const mcpActions: string[] = [];
  if (orderId) {
    const lookup = await callMcpTool(
      context,
      "lookup_order",
      { order_id: orderId },
      sessionId,
      botContext,
      allowedToolNames
    );
    if (lookup.ok) {
      mcpSummary += `주문 조회 성공 (order_id: ${orderId}). `;
      if (needsShipmentAction(questionText)) {
        const shipment = await callMcpTool(
          context,
          "track_shipment",
          { order_id: orderId },
          sessionId,
          botContext,
          allowedToolNames
        );
        if (shipment.ok) mcpActions.push("배송 조회");
      }
      if (needsTicketAction(questionText)) {
        const ticket = await callMcpTool(
          context,
          "create_ticket",
          { title: `주문 ${orderId} 문의`, content: questionText },
          sessionId,
          botContext,
          allowedToolNames
        );
        if (ticket.ok) mcpActions.push("문의 티켓 생성");
      }
    } else {
      mcpSummary += "주문 조회 실패. ";
    }
  }

  const systemPrompt = `당신은 고객 상담봇입니다.
규칙:
- KB에 있는 내용만 근거로 답합니다.
- KB에 없는 내용은 추측하지 않습니다.
- 주문 조치가 수행되면 사실대로 안내합니다.
답변 형식: 요약 -> 근거 -> 상세 -> 다음 액션`;

  const userPrompt = `고객 질문: ${questionText}
KB 제목: ${kb.title}
KB 내용:
${kb.content || ""}
MCP 결과:
${mcpSummary}
조치:
${mcpActions.length ? mcpActions.join(", ") : "없음"}`;

  const answerRes = await runLlm(agent.llm, systemPrompt, userPrompt);
  const finalAnswer = answerRes.text.trim();

  await context.supabase.from("turns").insert({
    session_id: sessionId,
    seq: nextSeq + 1,
    answer_text: finalAnswer,
    final_answer: finalAnswer,
    kb_references: [
      {
        kb_id: kb.id,
        title: kb.title,
        version: kb.version,
      },
    ],
    bot_context: {
      ...botContext,
      llm_model: answerRes.model,
      mcp_actions: mcpActions,
    },
  });

  await insertEvent(
    context,
    sessionId,
    "FINAL_ANSWER_READY",
    { answer: finalAnswer, model: answerRes.model },
    botContext
  );

  return NextResponse.json({
    session_id: sessionId,
    step: "final",
    message: finalAnswer,
    mcp_actions: mcpActions,
  });
}
