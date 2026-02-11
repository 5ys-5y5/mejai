export const SELF_HEAL_PRINCIPLES = {
  // One-file navigation for runtime self-heal policy.
  // Keep detection/proposal implementations separate, but map all contributors here.
  registry: {
    source: "src/app/api/runtime/governance/selfHeal/principles.ts",
    scope: "runtime-governance-chat",
  },
  principle: {
    memoryNoRepeat: {
      key: "memory.enforceNoRepeatQuestions",
      summary: "Do not ask again for already confirmed user data.",
      ownerModules: {
        detector: "src/app/api/runtime/governance/_lib/detector.ts",
        proposer: "src/app/api/runtime/governance/_lib/proposer.ts",
        runtimeReviewWriter: "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
      },
    },
    addressResolveZipcode: {
      key: "address.resolveZipcodeViaJusoWhenAddressGiven",
      summary: "When address is given, resolve zipcode via juso and enforce deterministic state transitions.",
      ownerModules: {
        detector: "src/app/api/runtime/governance/_lib/detector.ts",
        proposer: "src/app/api/runtime/governance/_lib/proposer.ts",
        runtimeFlow: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
        handler: "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        reproTool: "src/app/api/runtime/governance/repro/address/route.ts",
      },
    },
    apiContractAlignment: {
      key: "api.alignConversationAndToolContracts",
      summary:
        "Detect semantic mismatch between conversation slots and MCP tool request/response contracts before user-visible failure.",
      ownerModules: {
        detector: "src/app/api/runtime/governance/_lib/detector.ts",
        proposer: "src/app/api/runtime/governance/_lib/proposer.ts",
        runtimeReviewWriter: "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
      },
    },
    contractFirstRuntimeDesign: {
      key: "runtime.contractFirstGeneralization",
      summary:
        "Reject case-specific hardcoding as primary self-heal fix; enforce intent-driven semantic contract runtime design.",
      ownerModules: {
        detector: "src/app/api/runtime/governance/_lib/detector.ts",
        proposer: "src/app/api/runtime/governance/_lib/proposer.ts",
        baseline: "src/app/api/runtime/chat/policies/principles.ts",
      },
    },
    intentScopedSlotGate: {
      key: "dialogue.enforceIntentScopedSlotGate",
      summary:
        "Enforce intent-scoped required-slot gate before intent execution/final answer progression.",
      ownerModules: {
        detector: "src/app/api/runtime/governance/_lib/detector.ts",
        proposer: "src/app/api/runtime/governance/_lib/proposer.ts",
        baseline: "src/app/api/runtime/chat/policies/principles.ts",
      },
    },
    notificationDeliveryAudit: {
      key: "notification.enforceDeliveryOutcomeAudit",
      summary:
        "Require started/completed delivery audit evidence for notification subscription outcomes.",
      ownerModules: {
        detector: "src/app/api/runtime/governance/_lib/detector.ts",
        proposer: "src/app/api/runtime/governance/_lib/proposer.ts",
        runtimeFlow: "src/app/api/runtime/chat/services/restockSubscriptionRuntime.ts",
        dispatchFlow: "src/app/api/runtime/restock/dispatch/route.ts",
      },
    },
    actionLifecycleAudit: {
      key: "action.enforceLifecycleOutcomeAudit",
      summary:
        "Require generic STARTED/COMPLETED and terminal outcome evidence for external action completion claims.",
      ownerModules: {
        detector: "src/app/api/runtime/governance/_lib/detector.ts",
        proposer: "src/app/api/runtime/governance/_lib/proposer.ts",
        runtimeReviewWriter: "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
      },
    },
    mcpLastFunctionAudit: {
      key: "audit.requireMcpLastFunctionAlwaysRecorded",
      summary:
        "MCP.last.function must never be none/blank; record explicit NO_TOOL_CALLED or SKIPPED:<reason>.",
      ownerModules: {
        detector: "src/app/api/runtime/governance/_lib/detector.ts",
        proposer: "src/app/api/runtime/governance/_lib/proposer.ts",
        runtimeDebug: "src/app/api/runtime/chat/runtime/runtimeSupport.ts",
      },
    },
  },
  event: {
    violationDetected: "PRINCIPLE_VIOLATION_DETECTED",
    proposalCreated: "RUNTIME_PATCH_PROPOSAL_CREATED",
    reviewStarted: "RUNTIME_SELF_UPDATE_REVIEW_STARTED",
    reviewCompleted: "RUNTIME_SELF_UPDATE_REVIEW_COMPLETED",
  },
  violation: {
    memoryNoRepeatAddressQuestion: {
      key: "memory.no_repeat_address_question",
      summary: "Address re-ask despite already known address context.",
      severityDefault: "medium",
    },
    addressMultipleWithoutChoice: {
      key: "address.multiple_candidates_without_choice",
      summary: "Multiple address candidates exist, but no explicit selection step.",
      severityDefault: "high",
    },
    addressCandidateTruncated: {
      key: "address.candidate_truncated",
      summary: "Multiple candidates existed, but candidate set collapsed to one.",
      severityDefault: "high",
    },
    addressZeroResultWrongPrompt: {
      key: "address.zero_result_wrong_prompt",
      summary: "No address candidates, but runtime asked zipcode instead of address retry.",
      severityDefault: "high",
    },
    addressRuntimePathMissingAfterTemplateDefer: {
      key: "address.runtime_path_missing_after_template_defer",
      summary:
        "Force-response template was deferred/skipped, but runtime did not execute zipcode-resolution tool path.",
      severityDefault: "high",
    },
    addressConfirmedZipcodeNotApplied: {
      key: "address.confirmed_zipcode_not_applied",
      summary:
        "User confirmed zipcode candidate, but runtime failed to carry zipcode into execution path.",
      severityDefault: "high",
    },
    addressUpdateSkippedAfterConfirmation: {
      key: "address.update_skipped_after_confirmation",
      summary:
        "After confirmation, update_order_shipping_address was skipped by DEFERRED_TO_DETERMINISTIC_UPDATE.",
      severityDefault: "high",
    },
    addressUpdatePayloadStructureMismatch: {
      key: "address.update_payload_structure_mismatch",
      summary:
        "update_order_shipping_address used detail-unit in address1 while receiver address2 remained populated.",
      severityDefault: "high",
    },
    apiConversationToolContractMismatch: {
      key: "api.conversation_tool_contract_mismatch",
      summary:
        "Conversation slots and tool I/O contracts are semantically misaligned (missing mapping / decomposition / projection).",
      severityDefault: "high",
    },
    caseSpecificHardcodingPrimaryFix: {
      key: "runtime.case_specific_hardcoding_primary_fix",
      summary:
        "Proposal relies on one-case field hotfix as primary fix instead of generalized intent-contract runtime guard.",
      severityDefault: "high",
    },
    intentScopeRequiredSlotMissingProgressed: {
      key: "dialogue.intent_scope_required_slot_missing_progressed",
      summary:
        "Intent progressed to execution/final-answer branch while required intent-scoped slots were unresolved.",
      severityDefault: "high",
    },
    notificationDeliveryAuditMissing: {
      key: "notification.delivery_outcome_audit_missing",
      summary:
        "Notification subscribe flow completed without deterministic delivery audit lifecycle/evidence.",
      severityDefault: "high",
    },
    actionLifecycleOutcomeMissing: {
      key: "action.lifecycle_outcome_missing",
      summary:
        "External action completion-like answer was produced without deterministic action STARTED/COMPLETED/outcome evidence.",
      severityDefault: "high",
    },
    dialogueRepeatedScopeSlotAskLoop: {
      key: "dialogue.repeated_scope_slot_ask_loop",
      summary:
        "Same required scope slot ask repeated after recent resolution/progression, indicating slot-state regression loop.",
      severityDefault: "high",
    },
    mcpLastFunctionMissingReason: {
      key: "audit.mcp_last_function_missing_reason",
      summary: "Debug prefix kept MCP.last.function as none/blank instead of explicit reasoned value.",
      severityDefault: "medium",
    },
  },
  evidenceContract: {
    // Evidence fields detector/proposer rely on for cause-oriented proposals.
    requiredAddressEvidence: [
      "search_result_count",
      "candidate_count",
      "address_stage",
      "answer",
    ] as const,
    requiredMemoryEvidence: [
      "known_address_count",
      "user_provided_address_count",
      "slot_resolved_address",
      "policy_decision_reason",
      "final_response_forced_template_applied",
    ] as const,
    requiredRuntimePathEvidence: [
      "pre_mcp_final_calls_count",
      "has_search_address_action",
      "policy_tool_reason",
      "policy_final_reason",
    ] as const,
    requiredConfirmedZipcodeEvidence: [
      "confirmation_context",
      "user_confirmation_text",
      "previous_answer",
      "pre_mcp_final_calls_count",
      "has_search_address_action",
    ] as const,
    requiredUpdateSkippedEvidence: [
      "mcp_skipped_tool",
      "mcp_skipped_reason",
      "forced_update_present",
      "resolved_order_id",
      "resolved_zipcode",
      "resolved_address",
    ] as const,
    requiredUpdatePayloadEvidence: [
      "request_address1",
      "request_zipcode",
      "response_address1",
      "response_address2",
      "response_address_full",
      "detail_in_address1",
    ] as const,
    requiredContractMismatchEvidence: [
      "tool_name",
      "mismatch_type",
      "resolved_fields",
      "request_fields",
      "response_fields",
      "contract_expectation",
    ] as const,
    requiredContractFirstDesignEvidence: [
      "contract_scope",
      "generalization_scope",
      "reject_case_specific_primary_fix",
      "slot_request_mapping_strategy",
      "response_projection_strategy",
      "pre_post_invariant_strategy",
    ] as const,
    requiredIntentScopeGateEvidence: [
      "intent_name",
      "required_slots",
      "resolved_slots",
      "missing_slots",
      "policy_actions",
      "pre_mcp_blocked_by_missing_slots",
      "final_answer_allowed",
    ] as const,
    requiredNotificationDeliveryEvidence: [
      "intent_name",
      "notification_ids",
      "delivery_started_event_present",
      "delivery_completed_event_present",
      "delivery_outcome_event_types",
      "final_answer",
    ] as const,
    requiredActionLifecycleEvidence: [
      "intent_name",
      "final_answer",
      "started_event_types",
      "missing_completed_for_started",
      "outcome_event_types",
      "completion_claimed",
    ] as const,
    requiredMcpLastFunctionEvidence: [
      "mcp_last_function",
      "mcp_last_status",
      "turn_id",
      "debug_created_at",
      "mcp_skipped",
    ] as const,
  },
  scenarioMatrix: [
    {
      key: "address.zero_result.on",
      when: "search_result_count=0 and shouldRequireAddressRetryWhenZipcodeNotFound=true",
      expectedAction: "awaiting_address_retry",
      expectedPrompt: "주소 재입력 요청",
      expectedEvents: ["ADDRESS_FLOW_POLICY_DECISION"],
    },
    {
      key: "address.zero_result.off",
      when: "search_result_count=0 and shouldRequireAddressRetryWhenZipcodeNotFound=false",
      expectedAction: "awaiting_zipcode",
      expectedPrompt: "우편번호 직접 요청",
      expectedEvents: ["ADDRESS_FLOW_POLICY_DECISION"],
    },
    {
      key: "address.multi.on",
      when: "search_result_count>=2 and shouldRequireCandidateSelectionWhenMultipleZipcodes=true",
      expectedAction: "awaiting_zipcode_choice",
      expectedPrompt: "번호 선택 quick reply 제공",
      expectedEvents: ["ADDRESS_CANDIDATES_PRESENTED"],
    },
    {
      key: "address.triple.required",
      when: "shouldRequireJibunRoadZipTripleInChoice=true and candidate missing (jibun/road/zip)",
      expectedAction: "awaiting_address_retry",
      expectedPrompt: "주소 재입력 요청",
      expectedEvents: ["ADDRESS_FLOW_ANOMALY_DETECTED"],
    },
    {
      key: "address.resolve.disabled",
      when: "shouldResolveZipcodeViaJusoWhenAddressGiven=false",
      expectedAction: "awaiting_zipcode",
      expectedPrompt: "JUSO 조회 생략 후 우편번호 직접 요청",
      expectedEvents: ["ADDRESS_FLOW_POLICY_DECISION"],
    },
    {
      key: "address.defer_path_missing",
      when:
        "POLICY_DECISION(tool=DEFER_FORCE_RESPONSE_TEMPLATE, reason=ORDER_AND_ADDRESS_ALREADY_AVAILABLE) and pre_mcp_final_calls_count=0",
      expectedAction: "search_address 경로 강제 진입",
      expectedPrompt: "후보 선택 또는 확인 단계 진입",
      expectedEvents: ["PRE_MCP_DECISION", "ADDRESS_SEARCH_STARTED", "ADDRESS_SEARCH_COMPLETED"],
    },
    {
      key: "address.confirmed_zipcode_not_applied",
      when:
        "사용자 확인(네) 직전 턴이 우편번호 확인 프롬프트였고, 현재 턴에서 final_calls=0 + search_address 미실행 + 우편번호/주소 재요청",
      expectedAction: "확정된 pending_zipcode를 실행 경로로 전달",
      expectedPrompt: "주소 재질문 금지, 변경 진행 또는 실패 원인 명시",
      expectedEvents: ["PRE_MCP_DECISION", "POLICY_DECISION", "FINAL_ANSWER_READY"],
    },
    {
      key: "address.update_skipped_after_confirmation",
      when:
        "forced_calls에 update_order_shipping_address가 존재하고 slot에 order_id/address/zipcode가 있으나 MCP_CALL_SKIPPED(reason=DEFERRED_TO_DETERMINISTIC_UPDATE)",
      expectedAction: "update_order_shipping_address 실제 실행",
      expectedPrompt: "업데이트 성공/실패 결과를 결정론적으로 안내",
      expectedEvents: ["PRE_MCP_DECISION", "MCP_CALL_SKIPPED", "FINAL_ANSWER_READY"],
    },
    {
      key: "address.update_payload_structure_mismatch",
      when:
        "update_order_shipping_address 성공 응답에서 request.address1에 상세 호수가 포함되고 response.receivers[0].address2가 비어있지 않음",
      expectedAction: "address1은 기준 주소, 상세호수는 address2로 분리 후 업데이트",
      expectedPrompt: "구조 보정 후 정상 반영 결과 안내",
      expectedEvents: ["PRE_MCP_DECISION", "FINAL_ANSWER_READY"],
    },
    {
      key: "api.conversation_tool_contract_mismatch",
      when:
        "슬롯/대화 값과 tool request/response의 의미 단위가 어긋나 구조적 변환 없이 호출됨",
      expectedAction: "slot↔request↔response 계약을 정의/검증하고 mismatch를 self-heal로 제안",
      expectedPrompt: "사용자 응답 이전에 결정론적 검증/보정 경로 적용",
      expectedEvents: ["PRE_MCP_DECISION", "SLOT_EXTRACTED", "FINAL_ANSWER_READY"],
    },
    {
      key: "runtime.contract_first_generalization",
      when:
        "self-heal 제안이 단일 필드/단일 케이스 핫픽스를 주요 해결책으로 제시함",
      expectedAction:
        "핫픽스를 보조로 낮추고, intent-contract runtime(semantic mapping/projection/invariant) 일반해결을 1순위로 제안",
      expectedPrompt: "특정 케이스 대응 대신 범용 계약 기반 설계를 우선 적용",
      expectedEvents: ["PRINCIPLE_VIOLATION_DETECTED", "RUNTIME_PATCH_PROPOSAL_CREATED"],
    },
    {
      key: "dialogue.intent_scope_slot_gate",
      when:
        "의도 확정 이후 required_slots 중 missing_slots가 존재하지만 실행/최종응답 단계로 진행함",
      expectedAction: "INTENT_SCOPE_GATE_BLOCKED -> ASK_SCOPE_SLOT -> SCOPE_READY 순서 강제",
      expectedPrompt: "누락 슬롯 확인 질문을 먼저 제공하고, 슬롯 해결 전 최종답변 차단",
      expectedEvents: ["POLICY_DECISION", "SLOT_EXTRACTED", "PRE_MCP_DECISION", "FINAL_ANSWER_READY"],
    },
    {
      key: "notification.delivery.audit_missing",
      when:
        "알림 신청 완료 응답이 있으나 DELIVERY_STARTED/COMPLETED 또는 RESTOCK_SMS_* 결과 근거가 없음",
      expectedAction: "알림 발송 경로에 STARTED/COMPLETED 감사 이벤트와 결과 증거를 기록",
      expectedPrompt: "완료 안내 전에 발송/예약/실패 근거를 결정론적으로 검증",
      expectedEvents: ["POLICY_DECISION", "FINAL_ANSWER_READY", "RESTOCK_SMS_SENT"],
    },
    {
      key: "action.lifecycle.outcome_missing",
      when:
        "외부 액션 STARTED는 있으나 COMPLETED/결과 이벤트 근거 없이 완료형 답변을 출력함",
      expectedAction: "외부 액션별 STARTED/COMPLETED 및 결과 이벤트를 공통 계약으로 강제",
      expectedPrompt: "완료 안내 전에 액션 완료 신호를 결정론적으로 검증",
      expectedEvents: ["POLICY_DECISION", "PRE_MCP_DECISION", "FINAL_ANSWER_READY"],
    },
    {
      key: "dialogue.repeated_scope_slot.ask_loop",
      when:
        "의도 스코프 슬롯이 직전 N턴에서 해소/진행되었는데 같은 슬롯 질문이 다시 반복됨",
      expectedAction: "슬롯 해소값 회귀를 감지하고 반복 질문 루프를 self-heal 제안으로 승격",
      expectedPrompt: "동일 슬롯 재질문 대신 회귀 원인/대체 경로를 우선 안내",
      expectedEvents: ["POLICY_DECISION", "SLOT_EXTRACTED", "PRE_MCP_DECISION", "FINAL_ANSWER_READY"],
    },
    {
      key: "audit.mcp_last_function.reasoned",
      when: "prefix_json.mcp.last.function 값이 none 또는 공백으로 기록됨",
      expectedAction: "NO_TOOL_CALLED 또는 SKIPPED:<reason> 형식으로 항상 채움",
      expectedPrompt: "실패 지점 전/후 추적 가능한 함수 상태를 보장",
      expectedEvents: ["RUNTIME_SELF_UPDATE_REVIEW_STARTED", "RUNTIME_SELF_UPDATE_REVIEW_COMPLETED"],
    },
  ] as const,
} as const;

export const SELF_HEAL_PRINCIPLE_KEYS = {
  memoryNoRepeat: SELF_HEAL_PRINCIPLES.principle.memoryNoRepeat.key,
  addressResolveZipcode: SELF_HEAL_PRINCIPLES.principle.addressResolveZipcode.key,
  apiContractAlignment: SELF_HEAL_PRINCIPLES.principle.apiContractAlignment.key,
  contractFirstRuntimeDesign: SELF_HEAL_PRINCIPLES.principle.contractFirstRuntimeDesign.key,
  intentScopedSlotGate: SELF_HEAL_PRINCIPLES.principle.intentScopedSlotGate.key,
  notificationDeliveryAudit: SELF_HEAL_PRINCIPLES.principle.notificationDeliveryAudit.key,
  actionLifecycleAudit: SELF_HEAL_PRINCIPLES.principle.actionLifecycleAudit.key,
  mcpLastFunctionAudit: SELF_HEAL_PRINCIPLES.principle.mcpLastFunctionAudit.key,
} as const;

export const SELF_HEAL_REQUIRED_CONTRACT_FIELDS = [
  "contract_scope",
  "generalization_scope",
  "slot_request_mapping_strategy",
  "response_projection_strategy",
  "pre_post_invariant_strategy",
  "contract_expectation",
] as const;

export const SELF_HEAL_REQUIRED_EXCEPTION_FIELDS = [
  "exception_reason",
  "exception_scope",
  "exception_expiry",
  "promotion_plan",
  "promotion_trigger",
  "blast_radius",
] as const;

export const SELF_HEAL_EVENT_TYPES = {
  violationDetected: SELF_HEAL_PRINCIPLES.event.violationDetected,
  proposalCreated: SELF_HEAL_PRINCIPLES.event.proposalCreated,
  reviewStarted: SELF_HEAL_PRINCIPLES.event.reviewStarted,
  reviewCompleted: SELF_HEAL_PRINCIPLES.event.reviewCompleted,
} as const;

export const SELF_HEAL_VIOLATION_KEYS = {
  memoryNoRepeatAddressQuestion: SELF_HEAL_PRINCIPLES.violation.memoryNoRepeatAddressQuestion.key,
  addressMultipleWithoutChoice: SELF_HEAL_PRINCIPLES.violation.addressMultipleWithoutChoice.key,
  addressCandidateTruncated: SELF_HEAL_PRINCIPLES.violation.addressCandidateTruncated.key,
  addressZeroResultWrongPrompt: SELF_HEAL_PRINCIPLES.violation.addressZeroResultWrongPrompt.key,
  addressRuntimePathMissingAfterTemplateDefer:
    SELF_HEAL_PRINCIPLES.violation.addressRuntimePathMissingAfterTemplateDefer.key,
  addressConfirmedZipcodeNotApplied:
    SELF_HEAL_PRINCIPLES.violation.addressConfirmedZipcodeNotApplied.key,
  addressUpdateSkippedAfterConfirmation:
    SELF_HEAL_PRINCIPLES.violation.addressUpdateSkippedAfterConfirmation.key,
  addressUpdatePayloadStructureMismatch:
    SELF_HEAL_PRINCIPLES.violation.addressUpdatePayloadStructureMismatch.key,
  apiConversationToolContractMismatch:
    SELF_HEAL_PRINCIPLES.violation.apiConversationToolContractMismatch.key,
  caseSpecificHardcodingPrimaryFix:
    SELF_HEAL_PRINCIPLES.violation.caseSpecificHardcodingPrimaryFix.key,
  intentScopeRequiredSlotMissingProgressed:
    SELF_HEAL_PRINCIPLES.violation.intentScopeRequiredSlotMissingProgressed.key,
  notificationDeliveryAuditMissing:
    SELF_HEAL_PRINCIPLES.violation.notificationDeliveryAuditMissing.key,
  actionLifecycleOutcomeMissing:
    SELF_HEAL_PRINCIPLES.violation.actionLifecycleOutcomeMissing.key,
  dialogueRepeatedScopeSlotAskLoop:
    SELF_HEAL_PRINCIPLES.violation.dialogueRepeatedScopeSlotAskLoop.key,
  mcpLastFunctionMissingReason:
    SELF_HEAL_PRINCIPLES.violation.mcpLastFunctionMissingReason.key,
} as const;

export const SELF_HEAL_EVIDENCE_BY_PRINCIPLE: Record<string, readonly string[]> = {
  [SELF_HEAL_PRINCIPLE_KEYS.memoryNoRepeat]: SELF_HEAL_PRINCIPLES.evidenceContract.requiredMemoryEvidence,
  [SELF_HEAL_PRINCIPLE_KEYS.addressResolveZipcode]: SELF_HEAL_PRINCIPLES.evidenceContract.requiredAddressEvidence,
  [SELF_HEAL_PRINCIPLE_KEYS.apiContractAlignment]: SELF_HEAL_PRINCIPLES.evidenceContract.requiredContractMismatchEvidence,
  [SELF_HEAL_PRINCIPLE_KEYS.contractFirstRuntimeDesign]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredContractFirstDesignEvidence,
  [SELF_HEAL_PRINCIPLE_KEYS.intentScopedSlotGate]: SELF_HEAL_PRINCIPLES.evidenceContract.requiredIntentScopeGateEvidence,
  [SELF_HEAL_PRINCIPLE_KEYS.notificationDeliveryAudit]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredNotificationDeliveryEvidence,
  [SELF_HEAL_PRINCIPLE_KEYS.actionLifecycleAudit]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredActionLifecycleEvidence,
  [SELF_HEAL_PRINCIPLE_KEYS.mcpLastFunctionAudit]: SELF_HEAL_PRINCIPLES.evidenceContract.requiredMcpLastFunctionEvidence,
};

export const SELF_HEAL_EVIDENCE_BY_VIOLATION: Record<string, readonly string[]> = {
  [SELF_HEAL_VIOLATION_KEYS.memoryNoRepeatAddressQuestion]: SELF_HEAL_PRINCIPLES.evidenceContract.requiredMemoryEvidence,
  [SELF_HEAL_VIOLATION_KEYS.addressMultipleWithoutChoice]: SELF_HEAL_PRINCIPLES.evidenceContract.requiredAddressEvidence,
  [SELF_HEAL_VIOLATION_KEYS.addressCandidateTruncated]: SELF_HEAL_PRINCIPLES.evidenceContract.requiredAddressEvidence,
  [SELF_HEAL_VIOLATION_KEYS.addressZeroResultWrongPrompt]: SELF_HEAL_PRINCIPLES.evidenceContract.requiredAddressEvidence,
  [SELF_HEAL_VIOLATION_KEYS.addressRuntimePathMissingAfterTemplateDefer]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredRuntimePathEvidence,
  [SELF_HEAL_VIOLATION_KEYS.addressConfirmedZipcodeNotApplied]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredConfirmedZipcodeEvidence,
  [SELF_HEAL_VIOLATION_KEYS.addressUpdateSkippedAfterConfirmation]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredUpdateSkippedEvidence,
  [SELF_HEAL_VIOLATION_KEYS.addressUpdatePayloadStructureMismatch]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredUpdatePayloadEvidence,
  [SELF_HEAL_VIOLATION_KEYS.apiConversationToolContractMismatch]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredContractMismatchEvidence,
  [SELF_HEAL_VIOLATION_KEYS.caseSpecificHardcodingPrimaryFix]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredContractFirstDesignEvidence,
  [SELF_HEAL_VIOLATION_KEYS.intentScopeRequiredSlotMissingProgressed]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredIntentScopeGateEvidence,
  [SELF_HEAL_VIOLATION_KEYS.notificationDeliveryAuditMissing]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredNotificationDeliveryEvidence,
  [SELF_HEAL_VIOLATION_KEYS.actionLifecycleOutcomeMissing]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredActionLifecycleEvidence,
  [SELF_HEAL_VIOLATION_KEYS.dialogueRepeatedScopeSlotAskLoop]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredIntentScopeGateEvidence,
  [SELF_HEAL_VIOLATION_KEYS.mcpLastFunctionMissingReason]:
    SELF_HEAL_PRINCIPLES.evidenceContract.requiredMcpLastFunctionEvidence,
};

export function isAddressSelfHealPrinciple(principleKey: unknown) {
  return String(principleKey || "") === SELF_HEAL_PRINCIPLE_KEYS.addressResolveZipcode;
}

export function isMemorySelfHealPrinciple(principleKey: unknown) {
  return String(principleKey || "") === SELF_HEAL_PRINCIPLE_KEYS.memoryNoRepeat;
}

export function isApiContractSelfHealPrinciple(principleKey: unknown) {
  return String(principleKey || "") === SELF_HEAL_PRINCIPLE_KEYS.apiContractAlignment;
}

export function isContractFirstRuntimeDesignPrinciple(principleKey: unknown) {
  return String(principleKey || "") === SELF_HEAL_PRINCIPLE_KEYS.contractFirstRuntimeDesign;
}

export function isIntentScopedSlotGatePrinciple(principleKey: unknown) {
  return String(principleKey || "") === SELF_HEAL_PRINCIPLE_KEYS.intentScopedSlotGate;
}

export function isNotificationDeliveryAuditPrinciple(principleKey: unknown) {
  return String(principleKey || "") === SELF_HEAL_PRINCIPLE_KEYS.notificationDeliveryAudit;
}

export function isActionLifecycleAuditPrinciple(principleKey: unknown) {
  return String(principleKey || "") === SELF_HEAL_PRINCIPLE_KEYS.actionLifecycleAudit;
}

export function isMcpLastFunctionAuditPrinciple(principleKey: unknown) {
  return String(principleKey || "") === SELF_HEAL_PRINCIPLE_KEYS.mcpLastFunctionAudit;
}
