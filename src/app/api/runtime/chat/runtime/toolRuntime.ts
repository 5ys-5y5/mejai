import {
  YES_NO_QUICK_REPLIES,
  maybeBuildYesNoQuickReplyRule,
  resolveQuickReplyConfig,
} from "./quickReplyConfigRuntime";
import { buildNumberedChoicePrompt, resolveRuntimeTemplateOverridesFromPolicy } from "./promptTemplateRuntime";
import { splitAddressForUpdate } from "../shared/slotUtils";

export function createToolAccessEvaluator(denied: Set<string>, allowed: Set<string>) {
  return (name: string) => {
    if (denied.has("*") || denied.has(name)) return false;
    if (allowed.size > 0 && !allowed.has(name)) return false;
    return true;
  };
}

export function filterForcedCallsByPolicy(
  forcedCalls: Array<{ name: string; args?: Record<string, unknown> }>,
  denied: Set<string>,
  allowed: Set<string>,
  noteSkip: (name: string, reason: string, detail?: Record<string, unknown>, args?: Record<string, unknown>) => void
) {
  return forcedCalls.filter((call) => {
    if (denied.has("*") || denied.has(call.name)) {
      noteSkip(call.name, "DENY_RULE", { denied: true }, call.args || {});
      return false;
    }
    if (allowed.size > 0 && !allowed.has(call.name)) {
      noteSkip(call.name, "ALLOWLIST_MISMATCH", { allowed: Array.from(allowed) }, call.args || {});
      return false;
    }
    return true;
  });
}

export async function normalizeAndFilterFinalCalls(input: Record<string, any>) {
  const {
    finalCalls: sourceCalls,
    buildDefaultOrderRange,
    policyContext,
    resolvedIntent,
    noteMcpSkip,
    compiledPolicy,
    usedToolPolicies,
    customerVerificationToken,
    isLikelyOrderId,
    noteContamination,
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    validateToolArgs,
  } = input;

  let finalCalls = (sourceCalls || []).map((call: any) => {
    if (call.name === "list_orders") {
      const nextArgs = { ...(call.args || {}) };
      if (!nextArgs.start_date || !nextArgs.end_date) {
        Object.assign(nextArgs, buildDefaultOrderRange());
      }
      const phone = typeof policyContext?.entity?.phone === "string" ? policyContext.entity.phone : null;
      const memberId =
        typeof policyContext?.entity?.member_id === "string" ? String(policyContext.entity.member_id) : null;
      if (!nextArgs.member_id && !nextArgs.memberId && memberId) {
        nextArgs.member_id = memberId;
      }
      if (!nextArgs.member_id && !nextArgs.memberId && phone && !nextArgs.cellphone) {
        nextArgs.cellphone = phone;
      }
      return { ...call, args: nextArgs };
    }
    return call;
  });

  finalCalls = finalCalls.filter((call: any) => {
    if (resolvedIntent === "restock_subscribe" && call.name === "subscribe_restock") {
      noteMcpSkip(call.name, "DEFERRED_TO_DETERMINISTIC_RESTOCK_SUBSCRIBE", { intent: resolvedIntent }, call.args || {});
      return false;
    }
    if (compiledPolicy?.toolPolicies?.[call.name]) {
      usedToolPolicies.push(call.name);
    }
    if (call.name === "list_orders") {
      const hasMember = typeof call?.args?.member_id === "string" || typeof call?.args?.memberId === "string";
      const hasPhone = typeof call?.args?.cellphone === "string";
      if (!hasMember && !hasPhone) {
        noteMcpSkip(call.name, "MISSING_MEMBER_OR_PHONE", { hasMember, hasPhone }, call.args || {});
        return false;
      }
    }
    if ((call.name === "lookup_order" || call.name === "update_order_shipping_address") && customerVerificationToken) {
      call.args = { ...(call.args || {}), customer_verification_token: customerVerificationToken };
    }
    if (call.name === "update_order_shipping_address") {
      const entity = (policyContext?.entity || {}) as Record<string, unknown>;
      const rawAddressFromArgs = String(call?.args?.address1 || "").trim();
      const rawAddressFromEntity = typeof entity.address === "string" ? String(entity.address).trim() : "";
      const rawAddress = rawAddressFromArgs || rawAddressFromEntity;
      if (rawAddress) {
        const resolvedRoad = typeof entity.resolved_road_address === "string" ? String(entity.resolved_road_address).trim() : "";
        const resolvedJibun = typeof entity.resolved_jibun_address === "string" ? String(entity.resolved_jibun_address).trim() : "";
        const fallbackBase = typeof entity.shipping_before_address1 === "string" ? String(entity.shipping_before_address1).trim() : "";
        const split = splitAddressForUpdate(rawAddress, {
          baseAddress: resolvedRoad || resolvedJibun || null,
          baseAddressCandidates: [resolvedRoad, resolvedJibun],
          fallbackBaseAddress: fallbackBase || null,
        });
        call.args = {
          ...(call.args || {}),
          address1: String(split.address1 || rawAddress).trim(),
          address2: String(split.address2 || "").trim(),
        };
      }
    }
    if (call.name === "lookup_order" || call.name === "update_order_shipping_address") {
      const candidateOrderId = String(call?.args?.order_id || "").trim();
      if (candidateOrderId && !isLikelyOrderId(candidateOrderId)) {
        noteContamination({
          slot: "order_id",
          candidate: candidateOrderId,
          reason: "FORCED_CALL_INVALID_ORDER_ID",
          action: "CALL_SKIPPED",
        });
        noteMcpSkip(call.name, "CONTEXT_CONTAMINATION_ORDER_ID", { candidate_order_id: candidateOrderId }, call.args || {});
        void insertEvent(
          context,
          sessionId,
          latestTurnId,
          "CONTEXT_CONTAMINATION_DETECTED",
          {
            slot: "order_id",
            candidate: candidateOrderId,
            reason: "FORCED_CALL_INVALID_ORDER_ID",
            action: "CALL_SKIPPED",
          },
          { intent_name: resolvedIntent, entity: (policyContext?.entity || {}) as Record<string, unknown> }
        );
        return false;
      }
    }
    const validation = validateToolArgs(call.name, call.args, compiledPolicy);
    if (!validation.ok) {
      noteMcpSkip(call.name, "INVALID_TOOL_ARGS", { validation_error: validation.error || "INVALID_TOOL_ARGS" }, call.args || {});
    }
    return validation.ok;
  });

  return finalCalls;
}


export async function executeFinalToolCalls(input: Record<string, any>) {
  const {
    finalCalls,
    hasAllowedToolName,
    noteMcpSkip,
    allowedToolNames,
    resolvedIntent,
    refundConfirmAcceptedThisTurn,
    resolvedOrderId,
    callMcpTool,
    context,
    sessionId,
    latestTurnId,
    policyContext,
    allowedTools,
    noteMcp,
    toolResults,
    CHAT_PRINCIPLES,
    canUseTool,
    buildLookupOrderArgs,
    customerVerificationToken,
    readLookupOrderView,
    mcpActions,
    toOrderDateShort,
    toMoneyText,
  } = input;

  let mcpSummary = "";
  let listOrdersCalled = false;
  let listOrdersEmpty = false;
  let listOrdersChoices: Array<Record<string, unknown>> = [];
  const shouldPreserveOriginalEntity = Boolean(
    (CHAT_PRINCIPLES as any)?.audit?.preserveOriginalEntityForMutationTargets
  );
  const isMutationToolCall = (name: string) => {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized) return false;
    return (
      normalized.startsWith("update_") ||
      normalized.startsWith("delete_") ||
      normalized.includes(":update_") ||
      normalized.includes(":delete_")
    );
  };

  for (const call of finalCalls) {
    if (!hasAllowedToolName(call.name)) {
      noteMcpSkip(
        call.name,
        "TOOL_NOT_ALLOWED_FOR_AGENT",
        { allowed_tool_names: Array.from(allowedToolNames) },
        call.args as Record<string, unknown>
      );
      continue;
    }
    if (resolvedIntent === "refund_request" && call.name === "create_ticket" && !refundConfirmAcceptedThisTurn) {
      noteMcpSkip(
        "create_ticket",
        "DEFERRED_TO_REFUND_CONFIRM",
        { intent: resolvedIntent, order_id: resolvedOrderId || null },
        call.args as Record<string, unknown>
      );
      continue;
    }
    if (call.name === "update_order_shipping_address") {
      const entity = ((policyContext?.entity || {}) as Record<string, unknown>);
      const requestZipcode = String(call?.args?.zipcode || "").trim();
      const requestAddress1 = String(call?.args?.address1 || "").trim();
      const requestAddress2 = String(call?.args?.address2 || "").trim();
      policyContext.entity = {
        ...entity,
        shipping_request_zipcode: requestZipcode || null,
        shipping_request_address1: requestAddress1 || null,
        shipping_request_address2: requestAddress2 || null,
      };
    }
    if (shouldPreserveOriginalEntity && isMutationToolCall(call.name)) {
      const entity = ((policyContext?.entity || {}) as Record<string, unknown>);
      const byTool =
        entity.original_entity_before_by_tool && typeof entity.original_entity_before_by_tool === "object"
          ? ({ ...(entity.original_entity_before_by_tool as Record<string, unknown>) } as Record<string, unknown>)
          : {};
      if (!byTool[call.name]) {
        byTool[call.name] = { ...entity };
      }
      policyContext.entity = {
        ...entity,
        original_entity_before_all_mutations:
          entity.original_entity_before_all_mutations && typeof entity.original_entity_before_all_mutations === "object"
            ? entity.original_entity_before_all_mutations
            : { ...entity },
        original_entity_before_by_tool: byTool,
        original_entity_before_last_tool: call.name,
      };
    }
    const result = await callMcpTool(
      context,
      call.name,
      call.args,
      sessionId,
      latestTurnId,
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
      allowedTools
    );
    noteMcp(call.name, result);
    toolResults.push({
      name: call.name,
      ok: result.ok,
      data: result.ok ? (result.data as Record<string, unknown>) : undefined,
      error: result.ok ? undefined : result.error,
    });

    if (call.name === "list_orders") {
      listOrdersCalled = true;
      if (result.ok) {
        const orders = (result.data as any)?.orders || (result.data as any)?.orders?.order || [];
        const items = Array.isArray(orders) ? orders : [];
        if (items.length > 0) {
          const slice = items.slice(0, CHAT_PRINCIPLES.response.orderLookupPreviewMax);
          const detailMap = new Map<string, { name: string; option: string; qty: string; price: string }>();
          if (canUseTool("lookup_order") && hasAllowedToolName("lookup_order")) {
            for (const item of slice) {
              const id = String(item?.order_id || item?.order_no || "").trim();
              if (!id || detailMap.has(id)) continue;
              const detail = await callMcpTool(
                context,
                "lookup_order",
                buildLookupOrderArgs(id, customerVerificationToken),
                sessionId,
                latestTurnId,
                { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
                allowedTools
              );
              noteMcp("lookup_order", detail);
              toolResults.push({
                name: "lookup_order",
                ok: detail.ok,
                data: detail.ok ? (detail.data as Record<string, unknown>) : undefined,
                error: detail.ok ? undefined : detail.error,
              });
              mcpActions.push("lookup_order");
              if (detail.ok) {
                const parsed = readLookupOrderView(detail.data);
                const core = parsed.core || {};
                const itemsData = parsed.items;
                const first = Array.isArray(itemsData) ? itemsData[0] : itemsData;
                const name = first?.product_name || first?.name || first?.product_name_default || "상품 정보 확인 필요";
                const option = first?.option_name || first?.option_value || first?.option_value_default || "기본 옵션";
                const qty = first?.quantity || first?.qty || "1";
                const priceRaw =
                  first?.price ||
                  first?.product_price ||
                  first?.unit_price ||
                  first?.supply_price ||
                  core.order_price_amount ||
                  core.payment_amount ||
                  core.total_amount ||
                  core.total_price ||
                  "-";
                detailMap.set(id, {
                  name: String(name),
                  option: String(option),
                  qty: String(qty),
                  price: String(priceRaw),
                });
              }
            }
          }
          listOrdersChoices = slice
            .map((o: any, idx: number) => {
              const id = String(o.order_id || o.order_no || "").trim();
              if (!id) return null;
              const date = o.order_date || "";
              const fallbackName = o.first_product_name || o.product_name || "상품 정보 확인 필요";
              const fallbackPrice =
                o?.actual_order_amount?.order_price_amount ||
                o?.actual_order_amount?.payment_amount ||
                o?.payment_amount ||
                o?.total_supply_price ||
                "-";
              const detail = detailMap.get(id) || {
                name: String(fallbackName || "상품 정보 확인 필요"),
                option: "확인 필요",
                qty: "확인 필요",
                price: String(fallbackPrice),
              };
              const label = `${idx + 1}번 주문
  주문일시: ${toOrderDateShort(date)}
  주문번호: ${id}
  상품명: ${detail.name}
  옵션: ${detail.option}
  수량: ${detail.qty}
  금액: ${toMoneyText(detail.price)}원`;
              return {
                index: idx + 1,
                order_id: id,
                order_date: date,
                order_date_short: toOrderDateShort(date),
                product_name: detail.name,
                option_name: detail.option,
                quantity: detail.qty,
                price: detail.price,
                label,
              };
            })
            .filter(Boolean) as Array<Record<string, unknown>>;
        } else {
          listOrdersEmpty = true;
        }
      }
    }

    if (result.ok) {
      mcpSummary += `${call.name}: success. `;
    } else {
      mcpSummary += `${call.name}: error ${String(result.error)}. `;
    }
    mcpActions.push(call.name);
  }

  return { mcpSummary, listOrdersCalled, listOrdersEmpty, listOrdersChoices };
}

export function summarizeToolResults(input: {
  toolResults: Array<{ name: string; ok: boolean; data?: Record<string, unknown>; error?: unknown }>;
  readLookupOrderView: (data: unknown) => any;
}) {
  const { toolResults, readLookupOrderView } = input;
  if (!toolResults || toolResults.length === 0) return "";

  const summaries: string[] = [];
  toolResults.forEach((tool) => {
    if (!tool.ok) {
      summaries.push(`${tool.name}: 실패`);
      return;
    }
    if (tool.name === "lookup_order") {
      const parsed = readLookupOrderView(tool.data);
      const core = parsed.core || {};
      const summary = parsed.summary || {};
      const orderInfo = [
        core.order_id || core.order_no,
        core.order_date || summary.order_date,
        summary.shipping_status || core.shipping_status,
        summary.total_amount_due ?? core.total_amount_due ?? core.payment_amount,
      ]
        .filter(Boolean)
        .join(", ");
      summaries.push(`lookup_order: ${orderInfo || "성공"}`);
      return;
    }
    if (tool.name === "track_shipment") {
      const shipments = (tool.data as any)?.shipments || (tool.data as any)?.shipments?.shipment || [];
      const count = Array.isArray(shipments) ? shipments.length : 0;
      summaries.push(`track_shipment: ${count}건`);
      return;
    }
    if (tool.name === "create_ticket") {
      const ticketId = (tool.data as any)?.ticket_id || (tool.data as any)?.id || "";
      summaries.push(`create_ticket: ${ticketId || "성공"}`);
      return;
    }
    if (tool.name === "update_order_shipping_address") {
      const resultOrderId = (tool.data as any)?.order_id || (tool.data as any)?.order_no || "";
      summaries.push(`update_order_shipping_address: ${resultOrderId || "성공"}`);
      return;
    }
    if (tool.name === "list_orders") {
      const orders = (tool.data as any)?.orders || (tool.data as any)?.orders?.order || [];
      const count = Array.isArray(orders) ? orders.length : 0;
      summaries.push(`list_orders: ${count}건`);
      return;
    }
    summaries.push(`${tool.name}: 성공`);
  });

  return summaries.join(" | ");
}

export function updateMcpTracking(input: {
  name: string;
  result: { ok: boolean; error?: string; data?: Record<string, unknown> };
  toolProviderMap: Record<string, string>;
  usedProviders: string[];
}) {
  const { name, result, toolProviderMap, usedProviders } = input;
  let lastMcpCount: number | null = null;
  if (result.ok) {
    const data = result.data as any;
    if (Array.isArray(data)) {
      lastMcpCount = data.length;
    } else if (data && typeof data === "object") {
      if (typeof data.count === "number") lastMcpCount = data.count;
      else if (Array.isArray(data.items)) lastMcpCount = data.items.length;
      else lastMcpCount = Object.keys(data).length;
    }
  }
  const provider = toolProviderMap[name];
  if (provider) usedProviders.push(provider);
  return {
    lastMcpFunction: name,
    lastMcpStatus: result.ok ? "success" : "error",
    lastMcpError: result.ok ? null : result.error || "MCP_ERROR",
    lastMcpCount,
  };
}

export async function flushMcpSkipLogsWithAudit(input: {
  mcpSkipQueue: Array<{
    tool: string;
    reason: string;
    args?: Record<string, unknown>;
    detail?: Record<string, unknown>;
  }>;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  context: any;
  sessionId: string;
  latestTurnId: string | null;
  resolvedIntent: string;
  policyEntity: Record<string, unknown>;
  allowedToolIdByName: Map<string, string>;
  allowedToolVersionByName: Map<string, string | null>;
  nowIso: () => string;
}) {
  const {
    mcpSkipQueue,
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    resolvedIntent,
    policyEntity,
    allowedToolIdByName,
    allowedToolVersionByName,
    nowIso,
  } = input;
  const traceId = String((context as any)?.runtimeTraceId || "").trim();
  for (const skip of mcpSkipQueue) {
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "MCP_CALL_SKIPPED",
      {
        tool: skip.tool,
        reason: skip.reason,
        args: skip.args || {},
        detail: skip.detail || null,
      },
      { intent_name: resolvedIntent, entity: policyEntity }
    );
    const toolId = allowedToolIdByName.get(skip.tool);
    const toolVersion = allowedToolVersionByName.get(skip.tool) || null;
    try {
      await context.supabase.from("F_audit_mcp_tools").insert({
        org_id: context.orgId,
        session_id: sessionId,
        turn_id: latestTurnId,
        tool_id: toolId || null,
        tool_version: toolVersion,
        tool_name: skip.tool,
        request_payload: skip.args || {},
        response_payload: { skipped: true, reason: skip.reason, detail: skip.detail || null },
        status: "skipped",
        latency_ms: 0,
        masked_fields: [],
        policy_decision: { allowed: false, reason: skip.reason },
        created_at: nowIso(),
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyEntity,
          ...(traceId ? { trace_id: traceId } : {}),
        },
      });
    } catch (error) {
      console.warn("[runtime/chat_mk2] failed to insert MCP skip audit", {
        tool: skip.tool,
        reason: skip.reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  mcpSkipQueue.length = 0;
}

export async function handleToolForcedResponse(input: Record<string, any>): Promise<Response | null> {
  const {
    toolGate,
    conversationMode,
    resolvedIntent,
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    normalizeOrderChangeAddressPrompt,
    compiledPolicy,
    usedTemplateIds,
    isOrderChangeZipcodeTemplateText,
    policyContext,
    makeReply,
    insertTurn,
    nextSeq,
    message,
    resolvedOrderId,
    productDecisionRes,
    customerVerificationToken,
    respond,
  } = input;

  if (!toolGate?.actions?.forcedResponse) return null;
  const markDeferredTemplate = (reason: string, templateKey: string) => {
    const conversation =
      policyContext.conversation && typeof policyContext.conversation === "object"
        ? (policyContext.conversation as Record<string, unknown>)
        : {};
    const flags =
      conversation.flags && typeof conversation.flags === "object"
        ? (conversation.flags as Record<string, unknown>)
        : {};
    policyContext.conversation = {
      ...conversation,
      flags: {
        ...flags,
        deferred_force_response_template: true,
        deferred_force_response_reason: reason,
        deferred_force_response_template_key: templateKey,
      },
    };
  };

  if (conversationMode === "natural" && resolvedIntent === "order_change") {
    markDeferredTemplate("NATURAL_MODE_ORDER_CHANGE", "tool_forced_response");
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "POLICY_DECISION",
      {
        stage: "tool",
        action: "DEFER_FORCE_RESPONSE_TEMPLATE",
        reason: "NATURAL_MODE_ORDER_CHANGE",
      },
      { intent_name: resolvedIntent }
    );
    return null;
  }

  const rawForcedText = String(toolGate.actions.forcedResponse || "");
  const forcedText = normalizeOrderChangeAddressPrompt(resolvedIntent, rawForcedText);
  const isNeedZipcodeTemplate =
    rawForcedText === (compiledPolicy.templates?.order_change_need_zipcode || "") ||
    forcedText === (compiledPolicy.templates?.order_change_need_zipcode || "") ||
    usedTemplateIds.includes("order_change_need_zipcode") ||
    isOrderChangeZipcodeTemplateText(rawForcedText) ||
    isOrderChangeZipcodeTemplateText(forcedText);
  const currentAddress = typeof policyContext.entity?.address === "string" ? String(policyContext.entity.address).trim() : "";
  const shouldDeferZipcodeTemplate = isNeedZipcodeTemplate && resolvedIntent === "order_change" && Boolean(currentAddress);

  if (shouldDeferZipcodeTemplate) {
    markDeferredTemplate("ORDER_AND_ADDRESS_ALREADY_AVAILABLE", "order_change_need_zipcode");
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "POLICY_DECISION",
      {
        stage: "tool",
        action: "DEFER_FORCE_RESPONSE_TEMPLATE",
        reason: "ORDER_AND_ADDRESS_ALREADY_AVAILABLE",
        template: "order_change_need_zipcode",
      },
      { intent_name: resolvedIntent }
    );
    return null;
  }

  const reply = makeReply(forcedText);
  await insertTurn({
    session_id: sessionId,
    seq: nextSeq,
    transcript_text: message,
    answer_text: reply,
    final_answer: reply,
    bot_context: {
      intent_name: resolvedIntent,
      entity: policyContext.entity,
      selected_order_id: resolvedOrderId,
      product_decision: productDecisionRes.decision || null,
      policy_matched: toolGate.matched.map((rule: any) => rule.id),
      address_pending: isNeedZipcodeTemplate ? true : undefined,
      address_stage: isNeedZipcodeTemplate ? "awaiting_zipcode" : undefined,
      pending_address: isNeedZipcodeTemplate ? currentAddress || null : undefined,
      customer_verification_token: isNeedZipcodeTemplate ? customerVerificationToken : undefined,
    },
  });
  await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "tool" }, { intent_name: resolvedIntent });
  const quickReplyConfig = maybeBuildYesNoQuickReplyRule({
    message: reply,
    criteria: "policy:tool_forced_response_yes_no_prompt",
    sourceFunction: "handleForcedToolResponseIfAny",
    sourceModule: "src/app/api/runtime/chat/runtime/toolRuntime.ts",
  });
  return respond({
    session_id: sessionId,
    step: "final",
    message: reply,
    mcp_actions: [],
    ...(quickReplyConfig ? { quick_replies: YES_NO_QUICK_REPLIES, quick_reply_config: quickReplyConfig } : {}),
  });
}

export function maybeQueueListOrdersSkip(input: {
  finalCalls: Array<{ name: string; args?: Record<string, unknown> }>;
  mcpCandidateCalls: string[];
  resolvedOrderId: string | null;
  resolvedIntent: string;
  policyContext: any;
  compiledPolicy: any;
  hasAllowedToolName: (name: string) => boolean;
  canUseTool: (name: string) => boolean;
  noteMcpSkip: (name: string, reason: string, detail?: Record<string, unknown>, args?: Record<string, unknown>) => void;
  maskPhone: (value?: string | null) => string;
  buildDefaultOrderRange: () => { start_date: string; end_date: string };
}) {
  const {
    finalCalls,
    mcpCandidateCalls,
    resolvedOrderId,
    resolvedIntent,
    policyContext,
    compiledPolicy,
    hasAllowedToolName,
    canUseTool,
    noteMcpSkip,
    maskPhone,
    buildDefaultOrderRange,
  } = input;

  if (
    finalCalls.length === 0 &&
    mcpCandidateCalls.length === 0 &&
    !resolvedOrderId &&
    (resolvedIntent === "order_change" || resolvedIntent === "shipping_inquiry" || resolvedIntent === "refund_request")
  ) {
    const phone = typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null;
    const hasListOrdersPolicy = Boolean(compiledPolicy.toolPolicies?.list_orders);
    if (phone && hasListOrdersPolicy && hasAllowedToolName("list_orders") && canUseTool("list_orders")) {
      noteMcpSkip(
        "list_orders",
        "NO_FORCED_TOOL_CALLS",
        { intent: resolvedIntent, phone_masked: maskPhone(phone) },
        { cellphone: phone, ...buildDefaultOrderRange() }
      );
    }
  }
}

export async function emitPreMcpDecisionEvent(input: {
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  context: any;
  sessionId: string;
  latestTurnId: string | null;
  resolvedIntent: string;
  effectiveMessageForIntent: string;
  message: string;
  forcedCalls: Array<{ name: string; args?: Record<string, unknown> }>;
  finalCalls: Array<{ name: string; args?: Record<string, unknown> }>;
  denied: Set<string>;
  allowed: Set<string>;
  allowedToolNames: Set<string>;
  activePolicyConflicts: any[];
  resolvedOrderId: string | null;
  policyContext: any;
  maskPhone: (value?: string | null) => string;
}) {
  const {
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    resolvedIntent,
    effectiveMessageForIntent,
    message,
    forcedCalls,
    finalCalls,
    denied,
    allowed,
    allowedToolNames,
    activePolicyConflicts,
    resolvedOrderId,
    policyContext,
    maskPhone,
  } = input;
  const conversation =
    policyContext.conversation && typeof policyContext.conversation === "object"
      ? (policyContext.conversation as Record<string, unknown>)
      : {};
  const flags =
    conversation.flags && typeof conversation.flags === "object"
      ? (conversation.flags as Record<string, unknown>)
      : {};
  const blockedByMissingSlots = Boolean(flags.intent_scope_gate_blocked);
  const missingSlots = Array.isArray(flags.intent_scope_missing_slots) ? flags.intent_scope_missing_slots : [];
  const resolvedSlots =
    flags.intent_scope_resolved_slots && typeof flags.intent_scope_resolved_slots === "object"
      ? (flags.intent_scope_resolved_slots as Record<string, unknown>)
      : {};

  await insertEvent(
    context,
    sessionId,
    latestTurnId,
    "PRE_MCP_DECISION",
    {
      intent: resolvedIntent,
      query_source:
        effectiveMessageForIntent !== message
          ? "intent_disambiguation_source_text"
          : "current_message",
      query_text:
        effectiveMessageForIntent !== message
          ? effectiveMessageForIntent
          : message,
      forced_calls: forcedCalls.map((call) => ({ name: call.name, args: call.args })),
      final_calls: finalCalls.map((call) => ({ name: call.name, args: call.args })),
      denied: Array.from(denied),
      allowed: Array.from(allowed),
      allowed_tool_names: Array.from(allowedToolNames),
      policy_conflicts: activePolicyConflicts,
      blocked_by_missing_slots: blockedByMissingSlots,
      missing_slots: missingSlots,
      resolved_slots: resolvedSlots,
      entity: {
        order_id: resolvedOrderId || null,
        phone_masked:
          typeof policyContext.entity?.phone === "string" ? maskPhone(policyContext.entity.phone) : "-",
        has_address: Boolean(policyContext.entity?.address),
      },
    },
    { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
  );
}

export async function emitToolPolicyConflictIfAny(input: {
  toolGate: any;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  context: any;
  sessionId: string;
  latestTurnId: string | null;
  resolvedIntent: string;
  policyContext: any;
}) {
  const { toolGate, insertEvent, context, sessionId, latestTurnId, resolvedIntent, policyContext } = input;
  const toolGateHasForcedResponse = toolGate.matched.some((rule: any) =>
    (rule.enforce?.actions || []).some((action: any) => String(action.type || "") === "force_response_template")
  );
  const toolGateHasForcedTool = toolGate.matched.some((rule: any) =>
    (rule.enforce?.actions || []).some((action: any) => String(action.type || "") === "force_tool_call")
  );
  if (toolGateHasForcedResponse && toolGateHasForcedTool) {
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "POLICY_CONFLICT_DETECTED",
      {
        stage: "tool",
        matched_rule_ids: toolGate.matched.map((rule: any) => rule.id),
        conflict: "force_response_template vs force_tool_call",
        resolution: "force_response_template_precedence",
      },
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
    );
  }
}


export async function handleOrderSelectionAndListOrdersGuards(input: Record<string, any>) {
  let { resolvedOrderId, policyContext } = input;
  const {
    listOrdersChoices,
    toolResults,
    normalizePhoneDigits,
    readLookupOrderView,
    maskPhone,
    makeReply,
    insertTurn,
    sessionId,
    nextSeq,
    message,
    resolvedIntent,
    mcpActions,
    insertEvent,
    context,
    latestTurnId,
    respond,
    hasUniqueAnswerCandidate,
    hasChoiceAnswerCandidates,
    compiledPolicy,
    CHAT_PRINCIPLES,
    listOrdersCalled,
    listOrdersEmpty,
    customerVerificationToken,
  } = input;

  if (!resolvedOrderId && hasUniqueAnswerCandidate(listOrdersChoices.length)) {
    const selected = listOrdersChoices[0];
    const phoneFromSlot = typeof policyContext.entity?.phone === "string" ? normalizePhoneDigits(policyContext.entity.phone) : "";
    const selectedOrderId = String(selected.order_id || "").trim();
    const successfulLookupTools = toolResults.filter(
      (tool: any) => tool.name === "lookup_order" && tool.ok && tool.data
    );
    const getLookupOrderId = (tool: any) => {
      const parsed = readLookupOrderView(tool?.data);
      const core = (parsed?.core || {}) as Record<string, unknown>;
      const order = (parsed?.order || {}) as Record<string, unknown>;
      return String(
        core.order_id ||
        core.order_no ||
        order.order_id ||
        order.order_no ||
        ""
      ).trim();
    };
    const lookupForSelected =
      successfulLookupTools.find((tool: any) => getLookupOrderId(tool) === selectedOrderId) ||
      (successfulLookupTools.length === 1 ? successfulLookupTools[0] : null);
    const receiverPhoneFromLookup = (() => {
      if (!lookupForSelected?.data) return "";
      const parsed = readLookupOrderView(lookupForSelected.data);
      const receivers = Array.isArray((parsed.order as any)?.receivers) ? (parsed.order as any).receivers : [];
      const first = receivers[0] || {};
      return normalizePhoneDigits(String(first?.cellphone || first?.phone || ""));
    })();
    const mismatch = Boolean(phoneFromSlot) && Boolean(receiverPhoneFromLookup) && phoneFromSlot !== receiverPhoneFromLookup;
    if (mismatch) {
      const reply = makeReply("인증한 번호와 주문 수신자 정보가 달라 주문번호 확인이 필요합니다. 주문번호를 입력해 주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          selected_order_id: null,
          order_choices: listOrdersChoices,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "MCP_CALL_SKIPPED",
        {
          tool: "auto_select_order",
          reason: "PHONE_ORDER_MISMATCH",
          detail: {
            phone_masked: maskPhone(phoneFromSlot),
            receiver_phone_masked: maskPhone(receiverPhoneFromLookup),
          },
        },
        { intent_name: resolvedIntent }
      );
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions }), resolvedOrderId, policyContext };
    }

    resolvedOrderId = selected.order_id;
    const shippingBeforeSnapshot = (() => {
      if (!lookupForSelected?.data) return null;
      const parsed = readLookupOrderView(lookupForSelected.data);
      const orderObj = (parsed.order || {}) as any;
      const receivers = Array.isArray(orderObj.receivers) ? orderObj.receivers : [];
      const first = (receivers[0] || {}) as Record<string, unknown>;
      const zipcode = String(first.zipcode || "").trim();
      const address1 = String(first.address1 || "").trim();
      const address2 = String(first.address2 || "").trim();
      const addressFull = String(first.address_full || "").trim();
      if (!zipcode && !address1 && !address2 && !addressFull) return null;
      return {
        shipping_before_zipcode: zipcode || null,
        shipping_before_address1: address1 || null,
        shipping_before_address2: address2 || null,
        shipping_before_address_full: addressFull || null,
      };
    })();
    policyContext = {
      ...policyContext,
      entity: {
        ...(policyContext.entity || {}),
        order_id: selected.order_id,
        ...(shippingBeforeSnapshot || {}),
      },
    };
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "ORDER_CHOICES_PRESENTED",
      { choices: listOrdersChoices, auto_selected: true, selected_order_id: selected.order_id },
      { intent_name: resolvedIntent }
    );
  }

  if (hasChoiceAnswerCandidates(listOrdersChoices.length)) {
    const templateOverrides = resolveRuntimeTemplateOverridesFromPolicy((compiledPolicy as any)?.templates || {});
    const lines = listOrdersChoices.map((o: any) => (o.label ? o.label : `${o.index}번 주문`));
    const replyText = buildNumberedChoicePrompt({
      titleKey: "order_choice_title",
      headerKey: "order_choice_header",
      lines,
      includeExample: false,
      botContext: { template_overrides: templateOverrides },
      entity: policyContext.entity,
    });
    const reply = makeReply(replyText);
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: policyContext.entity,
        selected_order_id: resolvedOrderId,
        order_choices: listOrdersChoices,
        mcp_actions: mcpActions,
      },
    });
    await insertEvent(context, sessionId, latestTurnId, "ORDER_CHOICES_PRESENTED", { choices: listOrdersChoices }, { intent_name: resolvedIntent });
    const quickReplies = listOrdersChoices
      .slice(0, CHAT_PRINCIPLES.response.quickReplyMax)
      .map((item: any) => ({ label: `${item.index}번`, value: String(item.index) }));
    const quickReplyConfig = resolveQuickReplyConfig({
      optionsCount: quickReplies.length,
      minSelectHint: 1,
      maxSelectHint: 1,
      explicitMode: "single",
      criteria: "policy:ORDER_CHOICES_PRESENTED",
      sourceFunction: "runToolRuntime",
      sourceModule: "src/app/api/runtime/chat/runtime/toolRuntime.ts",
      contextText: replyText,
    });
    return {
      response: respond({
        session_id: sessionId,
        step: "final",
        message: reply,
        mcp_actions: mcpActions,
        quick_replies: quickReplies,
        quick_reply_config: quickReplyConfig,
      }),
      resolvedOrderId,
      policyContext,
    };
  }

  if (listOrdersCalled && listOrdersEmpty) {
    const reply = makeReply("주문 내역을 찾지 못했습니다. 주문번호를 알려주세요.");
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: policyContext.entity,
        selected_order_id: resolvedOrderId,
        mcp_actions: mcpActions,
      },
    });
    await insertEvent(context, sessionId, latestTurnId, "ORDER_CHOICES_EMPTY", {}, { intent_name: resolvedIntent });
    return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions }), resolvedOrderId, policyContext };
  }

  const listOrdersScopeFailure = toolResults.find(
    (tool: any) => tool.name === "list_orders" && !tool.ok && String(tool.error || "").toUpperCase().includes("SCOPE_ERROR")
  );
  if (listOrdersScopeFailure) {
    const maskedPhone = typeof policyContext.entity?.phone === "string" ? maskPhone(policyContext.entity.phone) : "-";
    const reply = makeReply(
      `입력하신 번호(${maskedPhone})로 주문 조회를 시도했지만 현재 연동 권한에 \`mall.read_order\` 스코프가 없어 조회할 수 없습니다.
관리자에게 Cafe24 연동 권한(주문 조회)을 추가해 달라고 요청해 주세요. 권한 추가 전에는 주문번호를 직접 알려주시면 이어서 처리할 수 있습니다.`
    );
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: policyContext.entity,
        selected_order_id: resolvedOrderId,
        customer_verification_token: customerVerificationToken,
        mcp_actions: mcpActions,
      },
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "EXECUTION_GUARD_TRIGGERED",
      {
        reason: "MCP_SCOPE_MISSING",
        tool: "list_orders",
        required_scope: "mall.read_order",
        error: String(listOrdersScopeFailure.error || "SCOPE_ERROR"),
      },
      { intent_name: resolvedIntent }
    );
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "FINAL_ANSWER_READY",
      { answer: reply, model: "deterministic_scope_guard" },
      { intent_name: resolvedIntent }
    );
    return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions }), resolvedOrderId, policyContext };
  }

  const listOrdersTokenRefreshFailure = toolResults.find((tool: any) => {
    if (tool.name !== "list_orders" || tool.ok) return false;
    const errorText = String(tool.error || "").toUpperCase();
    return (
      errorText.includes("TOKEN_REFRESH_FAILED") ||
      errorText.includes("INVALID_GRANT") ||
      errorText.includes("INVALID_REFRESH_TOKEN")
    );
  });
  if (listOrdersTokenRefreshFailure) {
    const maskedPhone = typeof policyContext.entity?.phone === "string" ? maskPhone(policyContext.entity.phone) : "-";
    const reply = makeReply(
      `입력하신 번호(${maskedPhone})로 주문 조회를 시도했지만 Cafe24 인증 갱신에 실패해 조회를 완료하지 못했습니다.
관리자에게 Cafe24 앱 재연동(토큰 재발급)을 요청해 주세요. 재연동 전에는 주문번호를 직접 알려주시면 이어서 처리할 수 있습니다.`
    );
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: policyContext.entity,
        selected_order_id: resolvedOrderId,
        customer_verification_token: customerVerificationToken,
        mcp_actions: mcpActions,
      },
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "EXECUTION_GUARD_TRIGGERED",
      {
        reason: "MCP_TOKEN_REFRESH_FAILED",
        tool: "list_orders",
        error: String(listOrdersTokenRefreshFailure.error || "TOKEN_REFRESH_FAILED"),
      },
      { intent_name: resolvedIntent }
    );
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "FINAL_ANSWER_READY",
      { answer: reply, model: "deterministic_token_refresh_guard" },
      { intent_name: resolvedIntent }
    );
    return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions }), resolvedOrderId, policyContext };
  }

  return { response: null, resolvedOrderId, policyContext };
}
