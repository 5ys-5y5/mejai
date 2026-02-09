import type { PrincipleBaseline } from "./principleBaseline";
import {
  SELF_HEAL_PRINCIPLE_KEYS,
  SELF_HEAL_VIOLATION_KEYS,
} from "../selfHeal/principles";

export type RuntimeTurn = {
  id: string;
  session_id: string;
  seq: number | null;
  transcript_text: string | null;
  answer_text: string | null;
  final_answer: string | null;
  bot_context: Record<string, unknown> | null;
  created_at: string | null;
};

export type RuntimeEvent = {
  id: string;
  session_id: string | null;
  turn_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string | null;
};

export type RuntimeMcpAudit = {
  id: string;
  session_id: string | null;
  turn_id: string | null;
  tool_name: string | null;
  status: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  created_at: string | null;
};

export type PrincipleViolation = {
  violation_id: string;
  principle_key: string;
  runtime_scope: string;
  session_id: string;
  turn_id: string;
  severity: "medium" | "high";
  summary: string;
  evidence: Record<string, unknown>;
};

const PHONE_REGEX = /\b01[016789]-?\d{3,4}-?\d{4}\b/;
const ASK_PHONE_REGEX = /(휴대폰 번호|전화번호).*(알려|입력|적어)/;
const ASK_ADDRESS_REGEX = /(주소|배송지).*(알려|입력|적어)/;
const ASK_ZIPCODE_REGEX = /(우편번호).*(알려|입력|적어)/;
const KOREAN_ADDRESS_REGEX = /(서울|경기|인천|부산|대구|광주|대전|울산|세종|제주|강원|충북|충남|전북|전남|경북|경남).*(구|군|시|동|읍|면|로|길)/;

function normalizeDigits(value: string) {
  return String(value || "").replace(/[^\d]/g, "");
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function looksLikeAddressText(value: string) {
  const text = String(value || "").trim();
  if (text.length < 6) return false;
  return KOREAN_ADDRESS_REGEX.test(text) || /\d{2,}-\d{1,}/.test(text);
}

function inferRuntimeScope(turn: RuntimeTurn) {
  const context = (turn.bot_context || {}) as Record<string, unknown>;
  const decision = (context._decision_turn || context._decision || {}) as Record<string, unknown>;
  const modulePath = String(decision.module_path || "").trim();
  if (modulePath.startsWith("src/app/api/runtime/restock/")) return "restock";
  if (modulePath.startsWith("src/app/api/runtime/chat/")) return "chat";
  return "unknown";
}

function readBotEntity(context: Record<string, unknown> | null) {
  const entity = (context?.entity || {}) as Record<string, unknown>;
  const phone = typeof entity.phone === "string" ? normalizeDigits(entity.phone) : "";
  const address = typeof entity.address === "string" ? String(entity.address).trim() : "";
  return { phone, address };
}

function readFinalResponseDebug(context: Record<string, unknown> | null) {
  const source =
    context &&
    typeof context.final_response_debug === "object" &&
    context.final_response_debug !== null
      ? (context.final_response_debug as Record<string, unknown>)
      : {};
  const forcedTemplateApplied = String(source.forced_template_applied || "").trim();
  const forcedTemplateSkippedReason = String(source.forced_template_skipped_reason || "").trim();
  const resolvedAddress = String(source.resolved_address || "").trim();
  return {
    forcedTemplateApplied,
    forcedTemplateSkippedReason,
    resolvedAddress,
  };
}

function createViolationId(sessionId: string, turnId: string, principleKey: string) {
  return `pv_${sessionId}_${turnId}_${principleKey}`.replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 128);
}

export function detectPrincipleViolations(input: {
  turns: RuntimeTurn[];
  eventsByTurnId: Map<string, RuntimeEvent[]>;
  mcpByTurnId?: Map<string, RuntimeMcpAudit[]>;
  baseline: PrincipleBaseline;
}): PrincipleViolation[] {
  const { turns, eventsByTurnId, mcpByTurnId, baseline } = input;
  if (!baseline.memory.enforceNoRepeatQuestions) return [];
  const out: PrincipleViolation[] = [];
  const sorted = [...turns].sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));

  let knownPhones: string[] = [];
  let knownAddresses: string[] = [];
  let userProvidedAddresses: string[] = [];
  let previousAnswer = "";
  for (const turn of sorted) {
    const userText = String(turn.transcript_text || "");
    const phoneInUser = (userText.match(PHONE_REGEX) || []).map((v) => normalizeDigits(v)).filter(Boolean);
    if (phoneInUser.length > 0) knownPhones = unique([...knownPhones, ...phoneInUser]);
    const userAddressLike = looksLikeAddressText(userText);
    if (userAddressLike) {
      const normalizedUserAddress = userText.trim();
      knownAddresses = unique([...knownAddresses, normalizedUserAddress]);
      userProvidedAddresses = unique([...userProvidedAddresses, normalizedUserAddress]);
    }

    const botEntity = readBotEntity((turn.bot_context || null) as Record<string, unknown> | null);
    if (botEntity.phone) knownPhones = unique([...knownPhones, botEntity.phone]);
    if (botEntity.address) knownAddresses = unique([...knownAddresses, botEntity.address]);

    const answer = String(turn.final_answer || turn.answer_text || "");
    const previousWasZipcodeConfirmPromptForMemory =
      /우편번호[:：]/.test(previousAnswer) && /(맞는지 확인|맞으면\s*'네'|아니면\s*'아니오')/.test(previousAnswer);
    const suppressMemoryAddressRepeatViolation =
      previousWasZipcodeConfirmPromptForMemory &&
      isYesLike(userText) &&
      (ASK_ZIPCODE_REGEX.test(answer) || ASK_ADDRESS_REGEX.test(answer));
    const turnEvents = eventsByTurnId.get(turn.id) || [];
    const turnMcpLogs = mcpByTurnId?.get(turn.id) || [];
    const slotExtracted = turnEvents.find((event) => String(event.event_type || "").toUpperCase() === "SLOT_EXTRACTED");
    const slotPayload = ((slotExtracted?.payload || {}) as Record<string, unknown>) || {};
    const slotResolved =
      slotPayload.resolved && typeof slotPayload.resolved === "object"
        ? (slotPayload.resolved as Record<string, unknown>)
        : {};
    const slotResolvedAddress = String(slotResolved.address || "").trim();
    if (slotResolvedAddress) {
      knownAddresses = unique([...knownAddresses, slotResolvedAddress]);
      if (userAddressLike || String(slotPayload.expected_input || "") === "address") {
        userProvidedAddresses = unique([...userProvidedAddresses, slotResolvedAddress]);
      }
    }
    const mcpFailed = turnEvents.find((event) => String(event.event_type) === "MCP_TOOL_FAILED");
    const mcpFailurePayload = (mcpFailed?.payload || {}) as Record<string, unknown>;
    const mcpError = String(mcpFailurePayload.error || "");

    if (knownPhones.length > 0 && ASK_PHONE_REGEX.test(answer)) {
      const violationId = createViolationId(turn.session_id, turn.id, "memory.no_repeat_phone_question");
      out.push({
        violation_id: violationId,
        principle_key: SELF_HEAL_PRINCIPLE_KEYS.memoryNoRepeat,
        runtime_scope: inferRuntimeScope(turn),
        session_id: turn.session_id,
        turn_id: turn.id,
        severity: mcpError ? "high" : "medium",
        summary: "Phone was already known but the bot asked for phone again.",
        evidence: {
          known_phone_count: knownPhones.length,
          known_phone_masked_tail: knownPhones.map((v) => `***${v.slice(-4)}`),
          answer,
          mcp_failed: Boolean(mcpFailed),
          mcp_error: mcpError || null,
          expected_reuse_order: baseline.memory.entityReuseOrder,
        },
      });
    }

    const policyDecision = turnEvents.find((event) => String(event.event_type || "").toUpperCase() === "POLICY_DECISION");
    const policyPayload = ((policyDecision?.payload || {}) as Record<string, unknown>) || {};
    const policyReason = String(policyPayload.reason || "").trim();
    const policyAction = String(policyPayload.action || "").trim();
    const policyDecisions = turnEvents.filter(
      (event) => String(event.event_type || "").toUpperCase() === "POLICY_DECISION"
    );
    const toolDeferPolicyDecision = policyDecisions.find((event) => {
      const payload = ((event.payload || {}) as Record<string, unknown>) || {};
      return (
        String(payload.stage || "").trim() === "tool" &&
        String(payload.action || "").trim() === "DEFER_FORCE_RESPONSE_TEMPLATE"
      );
    });
    const finalSkipPolicyDecision = policyDecisions.find((event) => {
      const payload = ((event.payload || {}) as Record<string, unknown>) || {};
      return (
        String(payload.stage || "").trim() === "final" &&
        String(payload.action || "").trim() === "SKIP_FORCE_RESPONSE_TEMPLATE"
      );
    });
    const toolDeferPayload = ((toolDeferPolicyDecision?.payload || {}) as Record<string, unknown>) || {};
    const finalSkipPayload = ((finalSkipPolicyDecision?.payload || {}) as Record<string, unknown>) || {};

    const finalResponseDebug = readFinalResponseDebug((turn.bot_context || null) as Record<string, unknown> | null);
    const forcedTemplateLooksAddressPrompt = /(주소|배송지).*(알려|입력|적어)/.test(
      finalResponseDebug.forcedTemplateApplied
    );
    const forceTemplateMisapplied =
      Boolean(finalResponseDebug.resolvedAddress) && forcedTemplateLooksAddressPrompt;

    // Do not raise "asked address again" unless a user-provided/new address was already observed.
    const expectedInput = String(slotPayload.expected_input || "").trim();
    const suppressAddressRepeatDuringOtp =
      expectedInput === "otp_code" && !slotResolvedAddress && !finalResponseDebug.resolvedAddress;
    if (
      userProvidedAddresses.length > 0 &&
      ASK_ADDRESS_REGEX.test(answer) &&
      !suppressMemoryAddressRepeatViolation &&
      !suppressAddressRepeatDuringOtp
    ) {
      const violationId = createViolationId(
        sessionIdFor(turn),
        turn.id,
        SELF_HEAL_VIOLATION_KEYS.memoryNoRepeatAddressQuestion
      );
      out.push({
        violation_id: violationId,
        principle_key: SELF_HEAL_PRINCIPLE_KEYS.memoryNoRepeat,
        runtime_scope: inferRuntimeScope(turn),
        session_id: turn.session_id,
        turn_id: turn.id,
        severity: forceTemplateMisapplied ? "high" : "medium",
        summary: forceTemplateMisapplied
          ? "Forced response template asked for address even though resolved address already existed."
          : "Address was already known but the bot asked for address again.",
        evidence: {
          known_address_count: knownAddresses.length,
          user_provided_address_count: userProvidedAddresses.length,
          user_provided_addresses_tail: userProvidedAddresses.slice(-2),
          slot_resolved_address: slotResolvedAddress || null,
          final_response_resolved_address: finalResponseDebug.resolvedAddress || null,
          final_response_forced_template_applied: finalResponseDebug.forcedTemplateApplied || null,
          final_response_forced_template_skipped_reason: finalResponseDebug.forcedTemplateSkippedReason || null,
          force_template_misapplied: forceTemplateMisapplied,
          expected_input: expectedInput || null,
          policy_decision_action: policyAction || null,
          policy_decision_reason: policyReason || null,
          answer,
          expected_reuse_order: baseline.memory.entityReuseOrder,
        },
      });
    }

    const preMcpDecision = turnEvents.find(
      (event) => String(event.event_type || "").toUpperCase() === "PRE_MCP_DECISION"
    );
    const preMcpPayload = ((preMcpDecision?.payload || {}) as Record<string, unknown>) || {};
    const finalCalls = Array.isArray(preMcpPayload.final_calls) ? preMcpPayload.final_calls : [];
    const forcedCalls = Array.isArray(preMcpPayload.forced_calls) ? preMcpPayload.forced_calls : [];
    const turnContext = ((turn.bot_context || {}) as Record<string, unknown>) || {};
    const mcpActions = Array.isArray(turnContext.mcp_actions)
      ? (turnContext.mcp_actions as unknown[]).map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const hasSearchAddressAction = mcpActions.some((name) => name === "search_address" || name.endsWith(":search_address"));
    const slotResolvedZipcode = String(slotResolved.zipcode || "").trim();
    const intentName = String(turnContext.intent_name || "").trim();
    const hasOrderChangeAddressNoZip =
      intentName === "order_change" &&
      Boolean(slotResolvedAddress || finalResponseDebug.resolvedAddress || botEntity.address) &&
      !slotResolvedZipcode;
    const deferredWithAddressReason =
      String(toolDeferPayload.reason || "").trim() === "ORDER_AND_ADDRESS_ALREADY_AVAILABLE" ||
      String(finalSkipPayload.reason || "").trim() === "ORDER_AND_ADDRESS_ALREADY_AVAILABLE";
    const previousWasZipcodeConfirmPrompt =
      /우편번호[:：]/.test(previousAnswer) && /(맞는지 확인|맞으면\s*'네'|아니면\s*'아니오')/.test(previousAnswer);
    const confirmationContext =
      previousWasZipcodeConfirmPrompt && (isYesLike(userText) || isNoLike(userText));
    const runtimePathMissingAfterDefer =
      hasOrderChangeAddressNoZip &&
      deferredWithAddressReason &&
      finalCalls.length === 0 &&
      !hasSearchAddressAction &&
      (ASK_ZIPCODE_REGEX.test(answer) || ASK_ADDRESS_REGEX.test(answer));
    const confirmedZipcodeNotApplied =
      hasOrderChangeAddressNoZip &&
      confirmationContext &&
      finalCalls.length === 0 &&
      !hasSearchAddressAction &&
      (ASK_ZIPCODE_REGEX.test(answer) || ASK_ADDRESS_REGEX.test(answer));
    const mcpCallSkipped = turnEvents.find(
      (event) => String(event.event_type || "").toUpperCase() === "MCP_CALL_SKIPPED"
    );
    const mcpCallSkippedPayload = ((mcpCallSkipped?.payload || {}) as Record<string, unknown>) || {};
    const mcpSkippedTool = String(mcpCallSkippedPayload.tool || "").trim();
    const mcpSkippedReason = String(mcpCallSkippedPayload.reason || "").trim();
    const hasForcedUpdateCall = forcedCalls.some(
      (call) => String((call as Record<string, unknown>)?.name || "").trim() === "update_order_shipping_address"
    );
    const resolvedOrderId = String(slotResolved.order_id || "").trim();
    const updateSkippedAfterConfirmation =
      confirmationContext &&
      hasForcedUpdateCall &&
      resolvedOrderId.length > 0 &&
      slotResolvedAddress.length > 0 &&
      slotResolvedZipcode.length > 0 &&
      mcpSkippedTool === "update_order_shipping_address" &&
      mcpSkippedReason === "DEFERRED_TO_DETERMINISTIC_UPDATE";
    if (runtimePathMissingAfterDefer || confirmedZipcodeNotApplied) {
      const violationKey = confirmedZipcodeNotApplied
        ? SELF_HEAL_VIOLATION_KEYS.addressConfirmedZipcodeNotApplied
        : SELF_HEAL_VIOLATION_KEYS.addressRuntimePathMissingAfterTemplateDefer;
      out.push({
        violation_id: createViolationId(
          sessionIdFor(turn),
          turn.id,
          violationKey
        ),
        principle_key: SELF_HEAL_PRINCIPLE_KEYS.addressResolveZipcode,
        runtime_scope: inferRuntimeScope(turn),
        session_id: turn.session_id,
        turn_id: turn.id,
        severity: "high",
        summary: confirmedZipcodeNotApplied
          ? "User confirmed zipcode candidate, but runtime did not apply confirmed zipcode to execution path."
          : "Template defer/skip was decided, but runtime did not execute address->zipcode resolution path.",
        evidence: {
          intent_name: intentName || null,
          slot_resolved_address: slotResolvedAddress || null,
          slot_resolved_zipcode: slotResolvedZipcode || null,
          final_response_resolved_address: finalResponseDebug.resolvedAddress || null,
          policy_tool_action: String(toolDeferPayload.action || "") || null,
          policy_tool_reason: String(toolDeferPayload.reason || "") || null,
          policy_final_action: String(finalSkipPayload.action || "") || null,
          policy_final_reason: String(finalSkipPayload.reason || "") || null,
          pre_mcp_final_calls_count: finalCalls.length,
          pre_mcp_forced_calls_count: forcedCalls.length,
          mcp_actions: mcpActions,
          has_search_address_action: hasSearchAddressAction,
          confirmation_context: confirmationContext,
          user_confirmation_text: userText,
          previous_answer: previousAnswer || null,
          answer,
        },
      });
    }
    if (updateSkippedAfterConfirmation) {
      out.push({
        violation_id: createViolationId(
          sessionIdFor(turn),
          turn.id,
          SELF_HEAL_VIOLATION_KEYS.addressUpdateSkippedAfterConfirmation
        ),
        principle_key: SELF_HEAL_PRINCIPLE_KEYS.addressResolveZipcode,
        runtime_scope: inferRuntimeScope(turn),
        session_id: turn.session_id,
        turn_id: turn.id,
        severity: "high",
        summary:
          "Confirmed address/zipcode was ready, but update_order_shipping_address was skipped by DEFERRED_TO_DETERMINISTIC_UPDATE.",
        evidence: {
          mcp_skipped_tool: mcpSkippedTool,
          mcp_skipped_reason: mcpSkippedReason,
          forced_update_present: hasForcedUpdateCall,
          confirmation_context: confirmationContext,
          user_confirmation_text: userText,
          resolved_order_id: resolvedOrderId,
          resolved_address: slotResolvedAddress,
          resolved_zipcode: slotResolvedZipcode,
          pre_mcp_forced_calls_count: forcedCalls.length,
          answer,
        },
      });
    }
    const updateSuccessMcp = turnMcpLogs.find((row) => {
      const toolName = String(row.tool_name || "").trim().toLowerCase();
      const status = String(row.status || "").trim().toLowerCase();
      return toolName.endsWith("update_order_shipping_address") && status === "success";
    });
    if (updateSuccessMcp) {
      const requestPayload =
        updateSuccessMcp.request_payload && typeof updateSuccessMcp.request_payload === "object"
          ? (updateSuccessMcp.request_payload as Record<string, unknown>)
          : {};
      const responsePayload =
        updateSuccessMcp.response_payload && typeof updateSuccessMcp.response_payload === "object"
          ? (updateSuccessMcp.response_payload as Record<string, unknown>)
          : {};
      const requestAddress1 = String(requestPayload.address1 || "").trim();
      const requestZipcode = String(requestPayload.zipcode || "").trim();
      const receivers = Array.isArray((responsePayload as any).receivers)
        ? ((responsePayload as any).receivers as Array<Record<string, unknown>>)
        : [];
      const firstReceiver = receivers[0] || {};
      const responseAddress1 = String(firstReceiver.address1 || "").trim();
      const responseAddress2 = String(firstReceiver.address2 || "").trim();
      const responseAddressFull = String(firstReceiver.address_full || "").trim();
      const detailInAddress1 = /(\d{1,5}\s*호|호$|층$|동$|실$)/.test(requestAddress1);
      const structureMismatch =
        detailInAddress1 &&
        Boolean(requestZipcode) &&
        Boolean(responseAddress2) &&
        responseAddress1 === requestAddress1;
      if (structureMismatch) {
        out.push({
          violation_id: createViolationId(
            sessionIdFor(turn),
            turn.id,
            SELF_HEAL_VIOLATION_KEYS.apiConversationToolContractMismatch
          ),
          principle_key: SELF_HEAL_PRINCIPLE_KEYS.apiContractAlignment,
          runtime_scope: inferRuntimeScope(turn),
          session_id: turn.session_id,
          turn_id: turn.id,
          severity: "high",
          summary:
            "Conversation slot and MCP contract appear misaligned: detailed address unit was sent in base-address field.",
          evidence: {
            tool_name: "cafe24:update_order_shipping_address",
            mismatch_type: "request_base_detail_unseparated",
            contract_expectation:
              "address1=base address resolved by zipcode/search result, address2=detail unit (dong/ho/floor), response projection should preserve the same semantic split",
            resolved_fields: {
              order_id: resolvedOrderId || null,
              address: slotResolvedAddress || null,
              zipcode: slotResolvedZipcode || null,
            },
            request_fields: {
              address1: requestAddress1 || null,
              zipcode: requestZipcode || null,
            },
            response_fields: {
              address1: responseAddress1 || null,
              address2: responseAddress2 || null,
              address_full: responseAddressFull || null,
            },
            request_address1: requestAddress1 || null,
            request_zipcode: requestZipcode || null,
            response_address1: responseAddress1 || null,
            response_address2: responseAddress2 || null,
            response_address_full: responseAddressFull || null,
            detail_in_address1: detailInAddress1,
          },
        });
        out.push({
          violation_id: createViolationId(
            sessionIdFor(turn),
            turn.id,
            SELF_HEAL_VIOLATION_KEYS.caseSpecificHardcodingPrimaryFix
          ),
          principle_key: SELF_HEAL_PRINCIPLE_KEYS.contractFirstRuntimeDesign,
          runtime_scope: inferRuntimeScope(turn),
          session_id: turn.session_id,
          turn_id: turn.id,
          severity: "high",
          summary:
            "Case-specific hardcoding cannot be the primary fix; enforce intent/contract-based runtime generalization.",
          evidence: {
            tool_name: "cafe24:update_order_shipping_address",
            mismatch_type: "request_base_detail_unseparated",
            contract_expectation:
              "address1=base address resolved by zipcode/search result, address2=detail unit (dong/ho/floor), response projection should preserve the same semantic split",
            contract_scope: "slot_request_response_semantic_contract",
            generalization_scope: "all_tools_with_same_semantic_mismatch_class",
            reject_case_specific_primary_fix: true,
            slot_request_mapping_strategy: "semantic_units_contract_mapping",
            response_projection_strategy: "contract_preserving_projection",
            pre_post_invariant_strategy:
              "deterministic_contract_invariants_before_after_tool_call",
            request_fields: {
              address1: requestAddress1 || null,
              zipcode: requestZipcode || null,
            },
            response_fields: {
              address1: responseAddress1 || null,
              address2: responseAddress2 || null,
              address_full: responseAddressFull || null,
            },
            resolved_fields: {
              order_id: resolvedOrderId || null,
              address: slotResolvedAddress || null,
              zipcode: slotResolvedZipcode || null,
            },
          },
        });
      }
    }

    const addressStage = String(((turn.bot_context || {}) as Record<string, unknown>).address_stage || "").trim();
    const pendingCandidateCount = Number(
      ((turn.bot_context || {}) as Record<string, unknown>).pending_candidate_count || 0
    );
    const searchInfo = readAddressSearchEvent(turnEvents);
    const hasCandidatesPresented = turnEvents.some(
      (event) => String(event.event_type || "").toUpperCase() === "ADDRESS_CANDIDATES_PRESENTED"
    );
    if (
      searchInfo.hasCompleted &&
      searchInfo.resultCount >= 2 &&
      addressStage !== "awaiting_zipcode_choice" &&
      !hasCandidatesPresented
    ) {
      out.push({
        violation_id: createViolationId(
          sessionIdFor(turn),
          turn.id,
          SELF_HEAL_VIOLATION_KEYS.addressMultipleWithoutChoice
        ),
        principle_key: SELF_HEAL_PRINCIPLE_KEYS.addressResolveZipcode,
        runtime_scope: inferRuntimeScope(turn),
        session_id: turn.session_id,
        turn_id: turn.id,
        severity: "high",
        summary: "Address search returned multiple candidates, but selection step was skipped.",
        evidence: {
          search_result_count: searchInfo.resultCount,
          candidate_count: searchInfo.candidateCount,
          address_stage: addressStage || null,
          has_candidates_presented: hasCandidatesPresented,
          answer,
        },
      });
    }
    if (
      searchInfo.hasCompleted &&
      searchInfo.resultCount >= 2 &&
      (searchInfo.candidateCount <= 1 || pendingCandidateCount <= 1)
    ) {
      out.push({
        violation_id: createViolationId(sessionIdFor(turn), turn.id, SELF_HEAL_VIOLATION_KEYS.addressCandidateTruncated),
        principle_key: SELF_HEAL_PRINCIPLE_KEYS.addressResolveZipcode,
        runtime_scope: inferRuntimeScope(turn),
        session_id: turn.session_id,
        turn_id: turn.id,
        severity: "high",
        summary: "Multiple address candidates existed, but only one candidate was retained.",
        evidence: {
          search_result_count: searchInfo.resultCount,
          search_candidate_count: searchInfo.candidateCount,
          pending_candidate_count: pendingCandidateCount,
          address_stage: addressStage || null,
        },
      });
    }
    if (searchInfo.hasCompleted && searchInfo.resultCount === 0 && ASK_ZIPCODE_REGEX.test(answer)) {
      out.push({
        violation_id: createViolationId(sessionIdFor(turn), turn.id, SELF_HEAL_VIOLATION_KEYS.addressZeroResultWrongPrompt),
        principle_key: SELF_HEAL_PRINCIPLE_KEYS.addressResolveZipcode,
        runtime_scope: inferRuntimeScope(turn),
        session_id: turn.session_id,
        turn_id: turn.id,
        severity: "high",
        summary: "Address search returned no result, but bot requested zipcode instead of address retry.",
        evidence: {
          search_result_count: 0,
          address_stage: addressStage || null,
          answer,
        },
      });
    }
    previousAnswer = answer;
  }
  return out;
}

function sessionIdFor(turn: RuntimeTurn) {
  return String(turn.session_id || "");
}

function readAddressSearchEvent(events: RuntimeEvent[]) {
  const completed = events.find((event) => String(event.event_type || "").toUpperCase() === "ADDRESS_SEARCH_COMPLETED");
  const payload = ((completed?.payload || {}) as Record<string, unknown>) || {};
  const resultCount = Number(payload.result_count || payload.candidate_count || 0);
  const candidateCount = Number(payload.candidate_count || payload.result_count || 0);
  return {
    resultCount: Number.isFinite(resultCount) ? resultCount : 0,
    candidateCount: Number.isFinite(candidateCount) ? candidateCount : 0,
    hasCompleted: Boolean(completed),
  };
}

function isYesLike(text: string) {
  const normalized = String(text || "").trim().toLowerCase();
  return normalized === "네" || normalized === "예" || normalized === "yes" || normalized === "y";
}

function isNoLike(text: string) {
  const normalized = String(text || "").trim().toLowerCase();
  return normalized === "아니오" || normalized === "아니요" || normalized === "no" || normalized === "n";
}
