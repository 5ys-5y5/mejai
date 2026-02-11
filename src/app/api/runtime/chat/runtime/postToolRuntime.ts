import { handleOrderChangePostTools } from "../handlers/orderChangeHandler";
import { handleRefundRequest } from "../handlers/refundHandler";
import { handleOrderSelectionAndListOrdersGuards, summarizeToolResults } from "./toolRuntime";

export async function handlePostToolDeterministicFlows(input: Record<string, any>) {
  let { resolvedOrderId, policyContext, mcpSummary } = input;
  const {
    toolResults,
    readLookupOrderView,
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    resolvedIntent,
    listOrdersChoices,
    normalizePhoneDigits,
    maskPhone,
    makeReply,
    insertTurn,
    nextSeq,
    message,
    mcpActions,
    respond,
    hasUniqueAnswerCandidate,
    hasChoiceAnswerCandidates,
    compiledPolicy,
    CHAT_PRINCIPLES,
    listOrdersCalled,
    listOrdersEmpty,
    customerVerificationToken,
    callAddressSearchWithAudit,
    executionGuardRules,
    refundConfirmAcceptedThisTurn,
  } = input;

  const policyEntity = (policyContext.entity ?? {}) as Record<string, any>;
  const currentAddress = typeof policyEntity.address === "string" ? String(policyEntity.address).trim() : "";

  if (toolResults.length > 0) {
    toolResults.forEach((tool: { ok?: boolean; name?: string; error?: unknown }) => {
      if (tool.ok) return;
      if (
        tool.name === "lookup_order" ||
        tool.name === "update_order_shipping_address" ||
        tool.name === "create_ticket" ||
        tool.name === "list_orders"
      ) {
        insertEvent(context, sessionId, latestTurnId, "MCP_TOOL_FAILED", { tool: tool.name, error: tool.error }, { intent_name: resolvedIntent });
      }
    });
    mcpSummary = summarizeToolResults({ toolResults, readLookupOrderView });
  }

  const postToolGuards = await handleOrderSelectionAndListOrdersGuards({
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
    resolvedOrderId,
    policyContext,
  });
  if (postToolGuards.response) {
    return { response: postToolGuards.response, resolvedOrderId, policyContext, mcpSummary };
  }
  resolvedOrderId = postToolGuards.resolvedOrderId;
  policyContext = postToolGuards.policyContext;

  const orderChangeHandled = await handleOrderChangePostTools({
    toolResults,
    resolvedIntent,
    callAddressSearchWithAudit,
    context,
    currentAddress,
    sessionId,
    latestTurnId,
    policyContextEntity: (policyContext.entity || {}) as Record<string, any>,
    resolvedOrderId,
    customerVerificationToken,
    mcpActions,
    makeReply,
    insertTurn,
    nextSeq,
    message,
    insertEvent,
    respond,
    executionGuardRules,
  });
  if (orderChangeHandled) {
    return { response: orderChangeHandled, resolvedOrderId, policyContext, mcpSummary };
  }

  const createTicketSuccess = toolResults.find(
    (tool: { ok?: boolean; name?: string }) => tool.name === "create_ticket" && tool.ok
  );
  const createTicketFailure = toolResults.find(
    (tool: { ok?: boolean; name?: string }) => tool.name === "create_ticket" && !tool.ok
  );
  const refundHandled = await handleRefundRequest({
    resolvedIntent,
    resolvedOrderId,
    refundConfirmAcceptedThisTurn,
    createTicketSuccess,
    createTicketFailure,
    makeReply,
    insertTurn,
    insertEvent,
    respond,
    context,
    sessionId,
    nextSeq,
    message,
    latestTurnId,
    policyContextEntity: (policyContext.entity || {}) as Record<string, any>,
    customerVerificationToken,
    mcpActions,
  });
  if (refundHandled) {
    return { response: refundHandled, resolvedOrderId, policyContext, mcpSummary };
  }

  return { response: null, resolvedOrderId, policyContext, mcpSummary };
}

