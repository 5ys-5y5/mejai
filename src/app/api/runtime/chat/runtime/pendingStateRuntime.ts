import { YES_NO_QUICK_REPLIES, resolveSingleChoiceQuickReplyConfig } from "./quickReplyConfigRuntime";
import { buildYesNoConfirmationPrompt } from "./promptTemplateRuntime";
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
  parseAddressCandidateSelection,
  type AddressCandidate,
} from "../shared/addressCandidateUtils";
import type { AddressSearchResult } from "../shared/runtimeTypes";

type PendingStateParams = {
  context: any;
  prevBotContext: Record<string, any>;
  resolvedIntent: string;
  prevEntity: Record<string, any>;
  prevSelectedOrderId: string | null;
  message: string;
  sessionId: string;
  nextSeq: number;
  latestTurnId: string | null;
  derivedOrderId: string | null;
  derivedZipcode: string | null;
  derivedAddress: string | null;
  updateConfirmAcceptedThisTurn: boolean;
  refundConfirmAcceptedThisTurn: boolean;
  callAddressSearchWithAudit: (
    context: any,
    rawKeyword: string,
    sessionId: string,
    turnId: string | null,
    botContext: Record<string, any>
  ) => Promise<AddressSearchResult>;
  extractZipcode: (text: string) => string | null;
  extractAddress: (
    text: string,
    orderId: string | null,
    phone: string | null,
    zipcode: string | null
  ) => string | null;
  extractAddressDetail: (text: string) => string | null;
  isLikelyAddressDetailOnly: (text: string) => boolean;
  isLikelyOrderId: (value?: string | null) => boolean;
  isLikelyZipcode: (value?: string | null) => boolean;
  isYesText: (text: string) => boolean;
  isNoText: (text: string) => boolean;
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, any>) => Promise<unknown>;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, any>,
    botContext: Record<string, any>
  ) => Promise<unknown>;
  respond: (payload: Record<string, any>, init?: ResponseInit) => unknown;
};

type PendingStateResult = {
  response: unknown | null;
  derivedOrderId: string | null;
  derivedZipcode: string | null;
  derivedAddress: string | null;
  updateConfirmAcceptedThisTurn: boolean;
  refundConfirmAcceptedThisTurn: boolean;
};

function readPendingCandidates(raw: unknown) {
  const source = Array.isArray(raw) ? raw : [];
  return source
    .map((item, idx) => {
      const record = item as Record<string, any>;
      const zipNo = String(record.zip_no || "").trim();
      const roadAddr = String(record.road_addr || "").trim();
      const jibunAddr = String(record.jibun_addr || "").trim();
      if (!zipNo) return null;
      return {
        index: idx + 1,
        zip_no: zipNo,
        road_addr: roadAddr,
        jibun_addr: jibunAddr,
        display_label: `${jibunAddr || roadAddr || "-"} / ${roadAddr || "-"} / ${zipNo}`,
      } as AddressCandidate;
    })
    .filter(Boolean) as AddressCandidate[];
}

function hasCompleteAddressTriple(input: {
  zipNo?: string | null;
  roadAddr?: string | null;
  jibunAddr?: string | null;
}) {
  return Boolean(String(input.zipNo || "").trim() && String(input.roadAddr || "").trim() && String(input.jibunAddr || "").trim());
}

export async function handleAddressChangeRefundPending(params: PendingStateParams): Promise<PendingStateResult> {
  const {
    context,
    prevBotContext,
    resolvedIntent,
    prevEntity,
    prevSelectedOrderId,
    message,
    sessionId,
    nextSeq,
    latestTurnId,
    callAddressSearchWithAudit,
    extractZipcode,
    extractAddress,
    extractAddressDetail,
    isLikelyAddressDetailOnly,
    isLikelyOrderId,
    isLikelyZipcode,
    isYesText,
    isNoText,
    makeReply,
    insertTurn,
    insertEvent,
    respond,
  } = params;

  let nextDerivedOrderId = params.derivedOrderId;
  let nextDerivedZipcode = params.derivedZipcode;
  let nextDerivedAddress = params.derivedAddress;
  let nextUpdateConfirmAccepted = params.updateConfirmAcceptedThisTurn;
  let nextRefundConfirmAccepted = params.refundConfirmAcceptedThisTurn;

  if (prevBotContext.address_pending && prevBotContext.address_stage === "awaiting_zipcode_choice") {
    const pendingAddress = String(prevBotContext.pending_address || "").trim();
    const pendingOrderId = String(prevBotContext.pending_order_id || "").trim();
    const candidates = readPendingCandidates(prevBotContext.pending_candidates);
    if (candidates.length === 0) {
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "ADDRESS_FLOW_ANOMALY_DETECTED",
        {
          anomaly_key: "ADDRESS_SELECTION_STEP_MISSING",
          reason: "CANDIDATE_LIST_EMPTY_IN_CHOICE_STAGE",
          address_stage: "awaiting_zipcode_choice",
        },
        { intent_name: resolvedIntent }
      );
      const reply = makeReply("주소 후보를 다시 찾지 못했습니다. 도로명/지번 주소를 다시 입력해 주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          address_pending: true,
          address_stage: "awaiting_address_retry",
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
    const selected = parseAddressCandidateSelection(message, candidates.length);
    if (!selected) {
      const prompt = buildAddressCandidateChoicePrompt({ candidates, originalAddress: pendingAddress });
      const reply = makeReply(prompt);
      const quickReplies = buildAddressCandidateQuickReplies(candidates);
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: quickReplies.length,
        criteria: "state:awaiting_zipcode_choice",
        sourceFunction: "handleAddressChangeRefundPending",
        sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
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
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          address_pending: true,
          address_stage: "awaiting_zipcode_choice",
          pending_address: pendingAddress || null,
          pending_candidates: candidates,
          pending_candidate_count: candidates.length,
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
        },
      });
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: quickReplies,
          quick_reply_config: quickReplyConfig,
        }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
    const picked = candidates[selected - 1];
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "ADDRESS_CANDIDATE_SELECTED",
      {
        selected_index: selected,
        selected_candidate: picked,
        selection_source: "number_input",
      },
      { intent_name: resolvedIntent }
    );
    if (
      shouldRequireJibunRoadZipTripleInChoice() &&
      !hasCompleteAddressTriple({
        zipNo: picked.zip_no,
        roadAddr: picked.road_addr,
        jibunAddr: picked.jibun_addr,
      })
    ) {
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "ADDRESS_FLOW_ANOMALY_DETECTED",
        {
          anomaly_key: "ADDRESS_TRIPLE_INCOMPLETE",
          reason: "CHOICE_SELECTED_CANDIDATE_MISSING_TRIPLE",
          selected_index: selected,
          selected_candidate: picked,
        },
        { intent_name: resolvedIntent }
      );
      const retryReply = makeReply("주소 후보 정보가 불완전하여 확인을 진행할 수 없습니다. 도로명/지번 주소를 다시 입력해 주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: retryReply,
        final_answer: retryReply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          address_pending: true,
          address_stage: "awaiting_address_retry",
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: retryReply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
    const prompt = buildYesNoConfirmationPrompt(
      `선택하신 주소가 맞는지 확인해 주세요.\n- 지번주소: ${picked.jibun_addr || pendingAddress || "-"}\n- 도로명주소: ${picked.road_addr || "-"}\n- 우편번호: ${picked.zip_no || "-"}`,
      { botContext: prevBotContext, entity: prevEntity }
    );
    const reply = makeReply(prompt);
    const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
      optionsCount: YES_NO_QUICK_REPLIES.length,
      criteria: "state:awaiting_zipcode_confirm_from_choice",
      sourceFunction: "handleAddressChangeRefundPending",
      sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
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
        entity: prevEntity,
        selected_order_id: prevSelectedOrderId,
        address_pending: true,
        address_stage: "awaiting_zipcode_confirm",
        pending_address: pendingAddress || null,
        pending_zipcode: picked.zip_no || null,
        pending_road_addr: picked.road_addr || null,
        pending_jibun_addr: picked.jibun_addr || null,
        pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
        pending_candidates: candidates,
        pending_candidate_count: candidates.length,
        pending_selected_index: selected,
      },
    });
    return {
      response: respond({
        session_id: sessionId,
        step: "confirm",
        message: reply,
        mcp_actions: [],
        quick_replies: YES_NO_QUICK_REPLIES,
        quick_reply_config: quickReplyConfig,
      }),
      derivedOrderId: nextDerivedOrderId,
      derivedZipcode: nextDerivedZipcode,
      derivedAddress: nextDerivedAddress,
      updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
      refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
    };
  }

  if (prevBotContext.address_pending && prevBotContext.address_stage === "awaiting_zipcode_confirm") {
    const pendingAddress = String(prevBotContext.pending_address || "").trim();
    const pendingZipcode = String(prevBotContext.pending_zipcode || "").trim();
    const candidateRoad = String(prevBotContext.pending_road_addr || "").trim();
    const candidateJibun = String(prevBotContext.pending_jibun_addr || "").trim();
    const pendingOrderId = String(prevBotContext.pending_order_id || "").trim();
    if (isYesText(message) && pendingZipcode) {
      nextDerivedZipcode = pendingZipcode;
      nextDerivedAddress = pendingAddress || nextDerivedAddress;
      if (isLikelyOrderId(pendingOrderId)) {
        nextDerivedOrderId = pendingOrderId;
      }
    } else if (isNoText(message)) {
      const prompt = "주소를 다시 입력해 주세요. 입력하신 주소로 우편번호를 다시 찾아볼게요.";
      const reply = makeReply(prompt);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          address_pending: true,
          address_stage: "awaiting_address",
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    } else {
      const prompt = buildYesNoConfirmationPrompt(
        `검색된 주소가 맞는지 확인해 주세요.\n- 지번주소: ${candidateJibun || pendingAddress || "-"}\n- 도로명주소: ${candidateRoad || "-"}\n- 우편번호: ${pendingZipcode || "-"}`,
        { botContext: prevBotContext, entity: prevEntity }
      );
      const reply = makeReply(prompt);
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: "state:awaiting_zipcode_confirm",
        sourceFunction: "handlePendingStateStage",
        sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
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
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          address_pending: true,
          address_stage: "awaiting_zipcode_confirm",
          pending_address: pendingAddress || null,
          pending_zipcode: pendingZipcode || null,
          pending_road_addr: candidateRoad || null,
          pending_jibun_addr: candidateJibun || null,
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
        },
      });
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: YES_NO_QUICK_REPLIES,
          quick_reply_config: quickReplyConfig,
        }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
  }

  if (prevBotContext.address_pending && prevBotContext.address_stage === "awaiting_zipcode") {
    const pendingAddress = String(prevBotContext.pending_address || "").trim();
    const pendingOrderId = String(prevBotContext.pending_order_id || "").trim();
    const pendingDigits = message.replace(/[^\d]/g, "");
    const pendingStrictFive = /^\d{5}$/.test(pendingDigits) ? pendingDigits : "";
    const pendingZip = extractZipcode(message) || pendingStrictFive;
    if (!pendingZip) {
      if (!shouldResolveZipcodeViaJusoWhenAddressGiven()) {
        const fallbackReply = makeReply("우편번호 5자리를 입력해 주세요.");
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
          answer_text: fallbackReply,
          final_answer: fallbackReply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: prevEntity,
            selected_order_id: prevSelectedOrderId,
            address_pending: true,
            address_stage: "awaiting_zipcode",
            pending_address: pendingAddress || null,
            pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
          },
        });
        return {
          response: respond({ session_id: sessionId, step: "confirm", message: fallbackReply, mcp_actions: [] }),
          derivedOrderId: nextDerivedOrderId,
          derivedZipcode: nextDerivedZipcode,
          derivedAddress: nextDerivedAddress,
          updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
          refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
        };
      }
      if (pendingAddress) {
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "ADDRESS_SEARCH_STARTED",
          { query_text: pendingAddress },
          { intent_name: resolvedIntent }
        );
        const search = await callAddressSearchWithAudit(
          context,
          pendingAddress,
          sessionId,
          latestTurnId,
          { intent_name: resolvedIntent, entity: prevEntity as Record<string, any> }
        );
        if (search.status === "success") {
          const candidates = extractAddressCandidatesFromSearchData(search.data, 5);
          await insertEvent(
            context,
            sessionId,
            latestTurnId,
            "ADDRESS_SEARCH_COMPLETED",
            {
              query_text: pendingAddress,
              result_count: candidates.length,
              candidate_count: candidates.length,
            },
            { intent_name: resolvedIntent }
          );
          if (candidates.length >= 2 && shouldRequireCandidateSelectionWhenMultipleZipcodes()) {
            const prompt = buildAddressCandidateChoicePrompt({
              candidates,
              originalAddress: pendingAddress,
            });
            const reply = makeReply(prompt);
            const quickReplies = buildAddressCandidateQuickReplies(candidates);
            const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
              optionsCount: quickReplies.length,
              criteria: "state:awaiting_zipcode_choice_from_search",
              sourceFunction: "handleAddressChangeRefundPending",
              sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
              contextText: reply,
            });
            await insertEvent(
              context,
              sessionId,
              latestTurnId,
              "ADDRESS_CANDIDATES_PRESENTED",
              {
                query_text: pendingAddress,
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
                entity: prevEntity,
                selected_order_id: prevSelectedOrderId,
                address_pending: true,
                address_stage: "awaiting_zipcode_choice",
                pending_address: pendingAddress || null,
                pending_candidates: candidates,
                pending_candidate_count: candidates.length,
                pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
              },
            });
            return {
              response: respond({
                session_id: sessionId,
                step: "confirm",
                message: reply,
                mcp_actions: [],
                quick_replies: quickReplies,
                quick_reply_config: quickReplyConfig,
              }),
              derivedOrderId: nextDerivedOrderId,
              derivedZipcode: nextDerivedZipcode,
              derivedAddress: nextDerivedAddress,
              updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
              refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
            };
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
              `입력하신 주소로 우편번호를 찾았습니다.\n- 지번주소: ${first.jibun_addr || pendingAddress}\n- 도로명주소: ${first.road_addr || "-"}\n- 우편번호: ${first.zip_no}\n위 정보가 맞는지 확인해 주세요.`,
              { botContext: prevBotContext, entity: prevEntity }
            );
            const reply = makeReply(prompt);
            const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
              optionsCount: YES_NO_QUICK_REPLIES.length,
              criteria: "state:awaiting_zipcode_confirm_from_search",
              sourceFunction: "handlePendingStateStage",
              sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
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
                entity: prevEntity,
                selected_order_id: prevSelectedOrderId,
                address_pending: true,
                address_stage: "awaiting_zipcode_confirm",
                pending_address: pendingAddress || null,
                pending_zipcode: first.zip_no,
                pending_road_addr: first.road_addr || null,
                pending_jibun_addr: first.jibun_addr || null,
                pending_candidate_count: 1,
                pending_candidates: [first],
                pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
              },
            });
            return {
              response: respond({
                session_id: sessionId,
                step: "confirm",
                message: reply,
                mcp_actions: [],
                quick_replies: YES_NO_QUICK_REPLIES,
                quick_reply_config: quickReplyConfig,
              }),
              derivedOrderId: nextDerivedOrderId,
              derivedZipcode: nextDerivedZipcode,
              derivedAddress: nextDerivedAddress,
              updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
              refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
            };
          }
          if (first?.zip_no && shouldRequireJibunRoadZipTripleInChoice()) {
            await insertEvent(
              context,
              sessionId,
              latestTurnId,
              "ADDRESS_FLOW_ANOMALY_DETECTED",
              {
                anomaly_key: "ADDRESS_TRIPLE_INCOMPLETE",
                reason: "SEARCH_RESULT_TOP1_MISSING_TRIPLE",
                query_text: pendingAddress,
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
              query_text: pendingAddress,
            },
            { intent_name: resolvedIntent }
          );
        } else {
          await insertEvent(
            context,
            sessionId,
            latestTurnId,
            "MCP_TOOL_FAILED",
            { tool: "search_address", error: (search as { error?: unknown }).error || "ADDRESS_SEARCH_FAILED" },
            { intent_name: resolvedIntent }
          );
        }
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
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          address_pending: true,
          address_stage: shouldRequireAddressRetryWhenZipcodeNotFound() ? "awaiting_address_retry" : "awaiting_zipcode",
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
          pending_address: pendingAddress || null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
    nextDerivedZipcode = pendingZip || null;
    nextDerivedAddress = pendingAddress || nextDerivedAddress;
  }

  if (
    prevBotContext.address_pending &&
    (prevBotContext.address_stage === "awaiting_address" || prevBotContext.address_stage === "awaiting_address_retry")
  ) {
    const nextAddress = extractAddress(message, null, null, extractZipcode(message)) || message.trim();
    if (!nextAddress) {
      const prompt = "변경할 주소를 다시 입력해 주세요.";
      const reply = makeReply(prompt);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          address_pending: true,
          address_stage: "awaiting_address",
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
    if (isLikelyAddressDetailOnly(nextAddress)) {
      nextDerivedAddress = extractAddressDetail(nextAddress) || nextAddress;
    } else {
      nextDerivedAddress = nextAddress;
    }
  }

  if (prevBotContext.change_pending && prevBotContext.change_stage === "awaiting_update_confirm") {
    const pendingOrderId = String(prevBotContext.pending_order_id || "").trim();
    const pendingAddress = String(prevBotContext.pending_address || "").trim();
    const pendingZipcode = String(prevBotContext.pending_zipcode || "").trim();
    const beforeAddress = String(prevBotContext.pending_before_address || "").trim();
    if (isYesText(message)) {
      nextUpdateConfirmAccepted = true;
      if (isLikelyOrderId(pendingOrderId)) nextDerivedOrderId = pendingOrderId;
      if (pendingAddress) nextDerivedAddress = pendingAddress;
      if (isLikelyZipcode(pendingZipcode)) nextDerivedZipcode = pendingZipcode;
    } else if (isNoText(message)) {
      const reply = makeReply("변경할 주소를 다시 입력해 주세요. (예: 서울시 ...)");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          selected_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : prevSelectedOrderId,
          address_pending: true,
          address_stage: "awaiting_address",
          customer_verification_token:
            typeof prevBotContext.customer_verification_token === "string"
              ? prevBotContext.customer_verification_token
              : null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    } else {
      const reply = makeReply(
        buildYesNoConfirmationPrompt(
          `아래 내용으로 변경할까요?\n- 주문번호: ${pendingOrderId || "-"}\n- 현재 배송지: ${beforeAddress || "-"}\n- 변경 배송지: ${pendingAddress || "-"}`,
          { botContext: prevBotContext, entity: prevEntity }
        )
      );
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: "state:awaiting_update_confirm",
        sourceFunction: "handlePendingStateStage",
        sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
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
          entity: prevEntity,
          selected_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : prevSelectedOrderId,
          change_pending: true,
          change_stage: "awaiting_update_confirm",
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
          pending_address: pendingAddress || null,
          pending_zipcode: isLikelyZipcode(pendingZipcode) ? pendingZipcode : null,
          pending_before_address: beforeAddress || null,
          customer_verification_token:
            typeof prevBotContext.customer_verification_token === "string"
              ? prevBotContext.customer_verification_token
              : null,
        },
      });
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: YES_NO_QUICK_REPLIES,
          quick_reply_config: quickReplyConfig,
        }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
  }

  if (prevBotContext.refund_pending && prevBotContext.refund_stage === "awaiting_refund_confirm") {
    const pendingOrderId = String(prevBotContext.pending_order_id || "").trim();
    if (isYesText(message)) {
      nextRefundConfirmAccepted = true;
      if (isLikelyOrderId(pendingOrderId)) nextDerivedOrderId = pendingOrderId;
    } else if (isNoText(message)) {
      const reply = makeReply("취소/환불 요청을 진행하지 않았습니다. 다른 도움이 필요하면 말씀해 주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          selected_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : prevSelectedOrderId,
          customer_verification_token:
            typeof prevBotContext.customer_verification_token === "string"
              ? prevBotContext.customer_verification_token
              : null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    } else {
      const reply = makeReply(
        buildYesNoConfirmationPrompt(`주문번호 ${pendingOrderId || "-"}에 대해 취소/환불 요청을 접수할까요?`, {
          botContext: prevBotContext,
          entity: prevEntity,
        })
      );
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: "state:awaiting_refund_confirm",
        sourceFunction: "handlePendingStateStage",
        sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
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
          entity: prevEntity,
          selected_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : prevSelectedOrderId,
          refund_pending: true,
          refund_stage: "awaiting_refund_confirm",
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
          customer_verification_token:
            typeof prevBotContext.customer_verification_token === "string"
              ? prevBotContext.customer_verification_token
              : null,
        },
      });
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: YES_NO_QUICK_REPLIES,
          quick_reply_config: quickReplyConfig,
        }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
  }

  return {
    response: null,
    derivedOrderId: nextDerivedOrderId,
    derivedZipcode: nextDerivedZipcode,
    derivedAddress: nextDerivedAddress,
    updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
    refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
  };
}


