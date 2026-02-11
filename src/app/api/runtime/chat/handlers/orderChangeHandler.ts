import { YES_NO_QUICK_REPLIES, resolveSingleChoiceQuickReplyConfig } from "../runtime/quickReplyConfigRuntime";
import { buildYesNoConfirmationPrompt } from "../runtime/promptTemplateRuntime";
import {
  shouldRequireCandidateSelectionWhenMultipleZipcodes,
  shouldRequireAddressRetryWhenZipcodeNotFound,
  shouldRequireJibunRoadZipTripleInChoice,
  shouldResolveZipcodeViaJusoWhenAddressGiven,
} from "../policies/principles";
import {
  buildAddressCandidateChoicePrompt,
  buildAddressCandidateQuickReplies,
  extractAddressCandidatesFromSearchData,
} from "../shared/addressCandidateUtils";

function joinAddressParts(input: {
  zipcode?: string | null;
  address1?: string | null;
  address2?: string | null;
  addressFull?: string | null;
}) {
  const zipcode = String(input.zipcode || "").trim();
  const addressFull = String(input.addressFull || "").trim();
  const address1 = String(input.address1 || "").trim();
  const address2 = String(input.address2 || "").trim();
  const normalizedAddress = addressFull || [address1, address2].filter(Boolean).join(" ").trim();
  if (!normalizedAddress && !zipcode) return "-";
  if (!zipcode) return normalizedAddress || "-";
  if (!normalizedAddress) return `(${zipcode})`;
  return `(${zipcode}) ${normalizedAddress}`;
}

function computeAddressDiff(input: {
  beforeText: string;
  requestText: string;
  appliedText: string;
}) {
  const before = String(input.beforeText || "").trim();
  const request = String(input.requestText || "").trim();
  const applied = String(input.appliedText || "").trim();
  return {
    request_changed_from_before: Boolean(before && request && before !== request),
    applied_changed_from_before: Boolean(before && applied && before !== applied),
    applied_differs_from_request: Boolean(request && applied && request !== applied),
  };
}

function hasCompleteAddressTriple(input: {
  zipNo?: string | null;
  roadAddr?: string | null;
  jibunAddr?: string | null;
}) {
  return Boolean(String(input.zipNo || "").trim() && String(input.roadAddr || "").trim() && String(input.jibunAddr || "").trim());
}

type OrderChangeToolResult = { name: string; ok: boolean; data?: Record<string, unknown>; error?: unknown };

type AddressSearchResult = { status: string; data?: unknown };

type HandleOrderChangePostToolsInput = {
  toolResults: OrderChangeToolResult[];
  resolvedIntent: string;
  callAddressSearchWithAudit: (
    context: unknown,
    keyword: string,
    sessionId: string,
    turnId: string | null,
    botContext: Record<string, unknown>
  ) => Promise<AddressSearchResult>;
  context: unknown;
  currentAddress: string;
  sessionId: string;
  latestTurnId: string | null;
  policyContextEntity: Record<string, unknown>;
  resolvedOrderId: string | null;
  customerVerificationToken: string | null;
  mcpActions: string[];
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, unknown>) => Promise<unknown>;
  nextSeq: number;
  message: string;
  insertEvent: (
    context: unknown,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  respond: (payload: Record<string, unknown>, init?: ResponseInit) => Response;
  executionGuardRules: {
    updateAddress: {
      missingZipcodeCode: string;
      fallbackTicketMessage: string;
      fallbackRetryMessage: string;
    };
  };
};

type MissingZipcodeFlowInput = {
  resolvedIntent: string;
  callAddressSearchWithAudit: (
    context: unknown,
    keyword: string,
    sessionId: string,
    turnId: string | null,
    botContext: Record<string, unknown>
  ) => Promise<AddressSearchResult>;
  context: unknown;
  currentAddress: string;
  sessionId: string;
  latestTurnId: string | null;
  policyContextEntity: Record<string, unknown>;
  resolvedOrderId: string | null;
  customerVerificationToken: string | null;
  mcpActions: string[];
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, unknown>) => Promise<unknown>;
  nextSeq: number;
  message: string;
  insertEvent: (
    context: unknown,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  respond: (payload: Record<string, unknown>, init?: ResponseInit) => Response;
  guardReason: string;
  guardTool: string;
  guardError: string;
  choiceCriteria: string;
  confirmCriteria: string;
};

async function handleMissingZipcodeAddressFlow(input: MissingZipcodeFlowInput): Promise<Response> {
  const {
    resolvedIntent,
    callAddressSearchWithAudit,
    context,
    currentAddress,
    sessionId,
    latestTurnId,
    policyContextEntity,
    resolvedOrderId,
    customerVerificationToken,
    mcpActions,
    makeReply,
    insertTurn,
    nextSeq,
    message,
    insertEvent,
    respond,
    guardReason,
    guardTool,
    guardError,
    choiceCriteria,
    confirmCriteria,
  } = input;

  if (!shouldResolveZipcodeViaJusoWhenAddressGiven()) {
    const directZipReply = makeReply("우편번호 5자리를 입력해 주세요.");
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "ADDRESS_FLOW_POLICY_DECISION",
      {
        action: "REQUEST_ZIPCODE_DIRECT",
        reason: "PRINCIPLE_DISABLED_RESOLVE_ZIPCODE_VIA_JUSO",
      },
      { intent_name: resolvedIntent }
    );
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: directZipReply,
      final_answer: directZipReply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: policyContextEntity,
        selected_order_id: resolvedOrderId,
        address_pending: true,
        address_stage: "awaiting_zipcode",
        pending_address: currentAddress || null,
        customer_verification_token: customerVerificationToken,
        mcp_actions: mcpActions,
      },
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "EXECUTION_GUARD_TRIGGERED",
      { reason: guardReason, tool: guardTool, error: guardError },
      { intent_name: resolvedIntent }
    );
    return respond({ session_id: sessionId, step: "confirm", message: directZipReply, mcp_actions: mcpActions });
  }

  await insertEvent(
    context,
    sessionId,
    latestTurnId,
    "ADDRESS_SEARCH_STARTED",
    { query_text: currentAddress || "" },
    { intent_name: resolvedIntent }
  );
  if (!mcpActions.includes("search_address")) mcpActions.push("search_address");
  const search = await callAddressSearchWithAudit(
    context,
    currentAddress || "",
    sessionId,
    latestTurnId,
    { intent_name: resolvedIntent, entity: policyContextEntity as Record<string, unknown> }
  );
  if (search.status === "success") {
    const candidates = extractAddressCandidatesFromSearchData(search.data, 5);
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "ADDRESS_SEARCH_COMPLETED",
      {
        query_text: currentAddress || "",
        result_count: candidates.length,
        candidate_count: candidates.length,
      },
      { intent_name: resolvedIntent }
    );
    if (candidates.length >= 2 && shouldRequireCandidateSelectionWhenMultipleZipcodes()) {
      const prompt = buildAddressCandidateChoicePrompt({
        candidates,
        originalAddress: currentAddress || "",
      });
      const reply = makeReply(prompt);
      const quickReplies = buildAddressCandidateQuickReplies(candidates);
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: quickReplies.length,
        criteria: choiceCriteria,
        sourceFunction: "handleOrderChangePostTools",
        sourceModule: "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        contextText: reply,
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "ADDRESS_CANDIDATES_PRESENTED",
        {
          query_text: currentAddress || "",
          candidate_count: candidates.length,
          candidates,
        },
        { intent_name: resolvedIntent }
      );
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContextEntity,
          selected_order_id: resolvedOrderId,
          address_pending: true,
          address_stage: "awaiting_zipcode_choice",
          pending_address: currentAddress || null,
          pending_candidates: candidates,
          pending_candidate_count: candidates.length,
          pending_order_id: resolvedOrderId,
          customer_verification_token: customerVerificationToken,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "EXECUTION_GUARD_TRIGGERED",
        { reason: guardReason, tool: guardTool, error: guardError },
        { intent_name: resolvedIntent }
      );
      return respond({
        session_id: sessionId,
        step: "confirm",
        message: reply,
        mcp_actions: mcpActions,
        quick_replies: quickReplies,
        quick_reply_config: quickReplyConfig,
      });
    }
    const first = candidates[0];
    if (
      first?.zip_no &&
      (!shouldRequireJibunRoadZipTripleInChoice() ||
        hasCompleteAddressTriple({
          zipNo: first.zip_no,
          roadAddr: first.road_addr,
          jibunAddr: first.jibun_addr,
        }))
    ) {
      const prompt = buildYesNoConfirmationPrompt(
        `입력하신 주소를 확인했습니다.\n- 지번주소: ${first.jibun_addr || currentAddress}\n- 도로명주소: ${first.road_addr || "-"}\n- 우편번호: ${first.zip_no}\n위 정보가 맞는지 확인해 주세요.`,
        { entity: policyContextEntity }
      );
      const reply = makeReply(prompt);
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: confirmCriteria,
        sourceFunction: "handleOrderChangePostTools",
        sourceModule: "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        contextText: reply,
      });
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContextEntity,
          selected_order_id: resolvedOrderId,
          address_pending: true,
          address_stage: "awaiting_zipcode_confirm",
          pending_address: currentAddress || null,
          pending_zipcode: first.zip_no || null,
          pending_road_addr: first.road_addr || null,
          pending_jibun_addr: first.jibun_addr || null,
          pending_candidates: [first],
          pending_candidate_count: 1,
          customer_verification_token: customerVerificationToken,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "EXECUTION_GUARD_TRIGGERED",
        { reason: guardReason, tool: guardTool, error: guardError },
        { intent_name: resolvedIntent }
      );
      return respond({
        session_id: sessionId,
        step: "confirm",
        message: reply,
        mcp_actions: mcpActions,
        quick_replies: YES_NO_QUICK_REPLIES,
        quick_reply_config: quickReplyConfig,
      });
    }
    if (first?.zip_no && shouldRequireJibunRoadZipTripleInChoice()) {
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "ADDRESS_FLOW_ANOMALY_DETECTED",
        {
          anomaly_key: "ADDRESS_TRIPLE_INCOMPLETE",
          reason: "GUARD_SEARCH_RESULT_TOP1_MISSING_TRIPLE",
          query_text: currentAddress || "",
          candidate: first,
        },
        { intent_name: resolvedIntent }
      );
    }
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "ADDRESS_FLOW_POLICY_DECISION",
      {
        action: "REQUIRE_ADDRESS_RETRY",
        reason: "ADDRESS_SEARCH_NO_RESULT",
        query_text: currentAddress || "",
      },
      { intent_name: resolvedIntent }
    );
  }
  const prompt = shouldRequireAddressRetryWhenZipcodeNotFound()
    ? "입력하신 주소와 일치하는 결과를 찾지 못했습니다. 도로명/지번 주소를 다시 입력해 주세요."
    : "입력하신 주소와 일치하는 결과를 찾지 못했습니다. 우편번호 5자리를 입력해 주세요.";
  const reply = makeReply(prompt);
  await insertTurn({
    session_id: sessionId,
    seq: nextSeq,
    transcript_text: message,
    answer_text: reply,
    final_answer: reply,
    bot_context: {
      intent_name: resolvedIntent,
      entity: policyContextEntity,
      selected_order_id: resolvedOrderId,
      address_pending: true,
      address_stage: shouldRequireAddressRetryWhenZipcodeNotFound() ? "awaiting_address_retry" : "awaiting_zipcode",
      pending_address: currentAddress || null,
      customer_verification_token: customerVerificationToken,
      mcp_actions: mcpActions,
    },
  });
  await insertEvent(
    context,
    sessionId,
    latestTurnId,
    "EXECUTION_GUARD_TRIGGERED",
    { reason: guardReason, tool: guardTool, error: guardError },
    { intent_name: resolvedIntent }
  );
  return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
}

export async function handleOrderChangePostTools(input: HandleOrderChangePostToolsInput): Promise<Response | null> {
  const {
    toolResults,
    resolvedIntent,
    callAddressSearchWithAudit,
    context,
    currentAddress,
    sessionId,
    latestTurnId,
    policyContextEntity,
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
  } = input;

    const currentZipcode =
      typeof policyContextEntity?.zipcode === "string" ? String(policyContextEntity.zipcode).trim() : "";
    const hasUpdateAttempt = toolResults.some((tool) => tool.name === "update_order_shipping_address");
    if (resolvedIntent === "order_change" && currentAddress && !currentZipcode && !hasUpdateAttempt) {
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        {
          stage: "tool",
          action: "ENFORCE_RUNTIME_PRINCIPLE_ADDRESS_ZIPCODE_RESOLUTION",
          reason: "ADDRESS_PRESENT_ZIPCODE_MISSING",
          resolver: "search_address",
        },
        { intent_name: resolvedIntent }
      );
      return handleMissingZipcodeAddressFlow({
        resolvedIntent,
        callAddressSearchWithAudit,
        context,
        currentAddress,
        sessionId,
        latestTurnId,
        policyContextEntity,
        resolvedOrderId,
        customerVerificationToken,
        mcpActions,
        makeReply,
        insertTurn,
        nextSeq,
        message,
        insertEvent,
        respond,
        guardReason: "MISSING_ZIPCODE",
        guardTool: "search_address",
        guardError: "ADDRESS_PRESENT_ZIPCODE_MISSING",
        choiceCriteria: "guard:RUNTIME_PRINCIPLE_MISSING_ZIPCODE_CHOICE",
        confirmCriteria: "guard:RUNTIME_PRINCIPLE_MISSING_ZIPCODE_CONFIRM",
      });
    }

    const updateFailures = toolResults.filter(
      (tool) => tool.name === "update_order_shipping_address" && !tool.ok
    );
    if (resolvedIntent === "order_change" && updateFailures.length > 0) {
      const firstUpdateError = String(updateFailures[0].error || "UPDATE_ORDER_SHIPPING_ADDRESS_FAILED");
      const missingZipcode = firstUpdateError.includes(executionGuardRules.updateAddress.missingZipcodeCode);
      if (missingZipcode) {
        return handleMissingZipcodeAddressFlow({
          resolvedIntent,
          callAddressSearchWithAudit,
          context,
          currentAddress,
          sessionId,
          latestTurnId,
          policyContextEntity,
          resolvedOrderId,
          customerVerificationToken,
          mcpActions,
          makeReply,
          insertTurn,
          nextSeq,
          message,
          insertEvent,
          respond,
          guardReason: "MISSING_ZIPCODE",
          guardTool: "update_order_shipping_address",
          guardError: firstUpdateError,
          choiceCriteria: "guard:MISSING_ZIPCODE_CHOICE",
          confirmCriteria: "guard:MISSING_ZIPCODE_CONFIRM",
        });
      }

      const ticketSuccess = toolResults.some((tool) => tool.name === "create_ticket" && tool.ok);
      const fallbackReply = ticketSuccess
        ? executionGuardRules.updateAddress.fallbackTicketMessage
        : executionGuardRules.updateAddress.fallbackRetryMessage;
      const reply = makeReply(fallbackReply);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContextEntity,
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
        { reason: "UPDATE_FAILED", tool: "update_order_shipping_address", error: firstUpdateError, ticket_success: ticketSuccess },
        { intent_name: resolvedIntent }
      );
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
    }

    const updateSuccess = toolResults.find(
      (tool) => tool.name === "update_order_shipping_address" && tool.ok
    );
    if (resolvedIntent === "order_change" && updateSuccess) {
      const requestAddressRaw =
        typeof policyContextEntity?.address === "string" ? String(policyContextEntity.address).trim() : "";
      const requestZipRaw =
        typeof policyContextEntity?.zipcode === "string" ? String(policyContextEntity.zipcode).trim() : "";
      const requestZip = typeof policyContextEntity?.shipping_request_zipcode === "string"
        ? String(policyContextEntity.shipping_request_zipcode).trim()
        : requestZipRaw;
      const requestAddress1 = typeof policyContextEntity?.shipping_request_address1 === "string"
        ? String(policyContextEntity.shipping_request_address1).trim()
        : requestAddressRaw;
      const requestAddress2 = typeof policyContextEntity?.shipping_request_address2 === "string"
        ? String(policyContextEntity.shipping_request_address2).trim()
        : "";
      const beforeZip = typeof policyContextEntity?.shipping_before_zipcode === "string"
        ? String(policyContextEntity.shipping_before_zipcode).trim()
        : "";
      const beforeAddress1 = typeof policyContextEntity?.shipping_before_address1 === "string"
        ? String(policyContextEntity.shipping_before_address1).trim()
        : "";
      const beforeAddress2 = typeof policyContextEntity?.shipping_before_address2 === "string"
        ? String(policyContextEntity.shipping_before_address2).trim()
        : "";
      const beforeAddressFull = typeof policyContextEntity?.shipping_before_address_full === "string"
        ? String(policyContextEntity.shipping_before_address_full).trim()
        : "";
      const updateData = (updateSuccess.data || {}) as Record<string, unknown>;
      const updateReceivers = Array.isArray((updateData as { receivers?: unknown }).receivers)
        ? ((updateData as { receivers?: unknown }).receivers as Array<Record<string, unknown>>)
        : [];
      const appliedReceiver = (updateReceivers[0] || {}) as Record<string, unknown>;
      const appliedZip = String(appliedReceiver.zipcode || "").trim();
      const appliedAddress1 = String(appliedReceiver.address1 || "").trim();
      const appliedAddress2 = String(appliedReceiver.address2 || "").trim();
      const appliedAddressFull = String(appliedReceiver.address_full || "").trim();
      const beforeText = joinAddressParts({
        zipcode: beforeZip,
        address1: beforeAddress1,
        address2: beforeAddress2,
        addressFull: beforeAddressFull,
      });
      const requestText = joinAddressParts({
        zipcode: requestZip,
        address1: requestAddress1,
        address2: requestAddress2,
      });
      const appliedText = joinAddressParts({
        zipcode: appliedZip || requestZip,
        address1: appliedAddress1 || requestAddress1,
        address2: appliedAddress2,
        addressFull: appliedAddressFull,
      });
      const diff = computeAddressDiff({
        beforeText,
        requestText,
        appliedText,
      });
      const hasSemanticMismatch =
        Boolean(requestZip && appliedZip && requestZip !== appliedZip) ||
        Boolean((requestAddress2 || appliedAddress2) && requestAddress2 !== appliedAddress2) ||
        Boolean(!requestAddress2 && beforeAddress2 && appliedAddress2 && appliedAddress2 === beforeAddress2);
      const lines = [
        "요약: 배송지 변경이 완료되었습니다.",
        `상세: 주문번호 ${resolvedOrderId || "-"}의 배송지 변경 요청이 정상 처리되었습니다.`,
        `- 기존값: ${beforeText}`,
        `- 변경요청값: ${requestText}`,
        `- 최종반영값: ${appliedText}`,
        hasSemanticMismatch
          ? "- 주의: 변경요청값과 최종반영값이 다릅니다. address1/address2 분리 반영 여부를 확인해 주세요."
          : null,
        "다음 액션: 추가 변경이 필요하면 주소를 다시 알려주세요.",
      ].filter(Boolean) as string[];
      const reply = makeReply(lines.join("\n"));
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContextEntity,
          selected_order_id: resolvedOrderId,
          customer_verification_token: customerVerificationToken,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        {
          answer: reply,
          model: "deterministic_order_change_success",
          change_audit: {
            tool: "cafe24:update_order_shipping_address",
            before: {
              zipcode: beforeZip || null,
              address1: beforeAddress1 || null,
              address2: beforeAddress2 || null,
              address_full: beforeAddressFull || null,
              rendered: beforeText,
            },
            request: {
              zipcode: requestZip || null,
              address1: requestAddress1 || null,
              address2: requestAddress2 || null,
              rendered: requestText,
            },
            after: {
              zipcode: appliedZip || requestZip || null,
              address1: appliedAddress1 || requestAddress1 || null,
              address2: appliedAddress2 || null,
              address_full: appliedAddressFull || null,
              rendered: appliedText,
            },
            diff: {
              ...diff,
              applied_differs_from_request: hasSemanticMismatch,
            },
          },
        },
        { intent_name: resolvedIntent }
      );
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
    }


  return null;
}
