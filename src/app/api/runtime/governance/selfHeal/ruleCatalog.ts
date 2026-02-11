export type SelfHealRuleTrigger = {
  name: string;
  description: string;
};

export type SelfHealRuleScenario = {
  key: string;
  when: string;
  expectedAction: string;
  expectedPrompt: string;
  expectedEvents: string[];
};

export type SelfHealRuleSpec = {
  id: string;
  principleKey: string;
  violationKey: string;
  summary: string;
  severityDefault: "medium" | "high";
  scope: "generic" | "domain";
  domains: string[];
  triggerSignals: SelfHealRuleTrigger[];
  evidenceFields: string[];
  scenario: SelfHealRuleScenario;
};

// Source of truth for rule-level self-heal map rendering and scenario matrix.
// Update this catalog when adding/changing a detector rule.
export const SELF_HEAL_RULE_CATALOG: SelfHealRuleSpec[] = [
  {
    id: "dialogue.repeated_scope_slot_ask_loop",
    principleKey: "dialogue.enforceIntentScopedSlotGate",
    violationKey: "dialogue.repeated_scope_slot_ask_loop",
    summary:
      "Same required scope slot ask repeated after recent resolution/progression, indicating slot-state regression loop.",
    severityDefault: "high",
    scope: "generic",
    domains: ["dialogue", "intent", "slot"],
    triggerSignals: [
      {
        name: "policy_action",
        description: "POLICY_DECISION.action includes ASK_SCOPE_SLOT for current intent.",
      },
      {
        name: "repeated_slot",
        description: "A required slot was resolved recently but appears missing again in current turn.",
      },
      {
        name: "scope_window",
        description: "Regression detected inside recent turn window to avoid stale false positives.",
      },
    ],
    evidenceFields: [
      "intent_name",
      "missing_slots",
      "repeated_slots",
      "policy_actions",
      "resolved_slots",
      "loop_detected",
      "answer",
    ],
    scenario: {
      key: "dialogue.repeated_scope_slot.ask_loop",
      when: "의도 스코프 슬롯이 직전 N턴에서 해소/진행되었는데 같은 슬롯 질문이 다시 반복됨",
      expectedAction: "슬롯 해소값 회귀를 감지하고 반복 질문 루프를 self-heal 제안으로 승격",
      expectedPrompt: "동일 슬롯 재질문 대신 회귀 원인/대체 경로를 우선 안내",
      expectedEvents: ["POLICY_DECISION", "SLOT_EXTRACTED", "PRE_MCP_DECISION", "FINAL_ANSWER_READY"],
    },
  },
  {
    id: "action.lifecycle_outcome_missing",
    principleKey: "action.enforceLifecycleOutcomeAudit",
    violationKey: "action.lifecycle_outcome_missing",
    summary:
      "External action completion-like answer was produced without deterministic action STARTED/COMPLETED/outcome evidence.",
    severityDefault: "high",
    scope: "generic",
    domains: ["action", "lifecycle", "audit", "external"],
    triggerSignals: [
      {
        name: "completion_like_answer",
        description: "Final answer text claims completion/success semantics.",
      },
      {
        name: "started_without_completed",
        description: "Detected *_STARTED lifecycle event stem without matching *_COMPLETED.",
      },
      {
        name: "missing_terminal_outcome",
        description: "No terminal outcome event (SENT/FAILED/SUCCESS/ERROR/...) for related action ids.",
      },
      {
        name: "missing_external_response_ack",
        description: "External action requires provider/server ack but outcome payload indicates ack not received.",
      },
    ],
    evidenceFields: [
      "intent_name",
      "tool_name",
      "mismatch_type",
      "final_answer",
      "completion_claimed",
      "started_event_types",
      "missing_completed_for_started",
      "outcome_event_types",
      "context_action_ids",
      "mcp_terminal_outcome_present",
    ],
    scenario: {
      key: "action.lifecycle.outcome_missing",
      when: "외부 액션 STARTED는 있으나 COMPLETED/결과 이벤트 근거 없이 완료형 답변을 출력함",
      expectedAction: "외부 액션별 STARTED/COMPLETED 및 결과 이벤트를 공통 계약으로 강제",
      expectedPrompt: "완료 안내 전에 액션 완료 신호를 결정론적으로 검증",
      expectedEvents: ["POLICY_DECISION", "PRE_MCP_DECISION", "FINAL_ANSWER_READY"],
    },
  },
  {
    id: "dialogue.intent_scope_required_slot_missing_progressed",
    principleKey: "dialogue.enforceIntentScopedSlotGate",
    violationKey: "dialogue.intent_scope_required_slot_missing_progressed",
    summary: "Intent progressed to execution/final-answer branch while required intent-scoped slots were unresolved.",
    severityDefault: "high",
    scope: "generic",
    domains: ["dialogue", "intent", "slot"],
    triggerSignals: [
      {
        name: "missing_required_slots",
        description: "required_slots - resolved_slots leaves one or more missing slots.",
      },
      {
        name: "progress_without_block",
        description: "Execution/final-answer progressed while blocked_by_missing_slots=false.",
      },
    ],
    evidenceFields: [
      "intent_name",
      "required_slots",
      "resolved_slots",
      "missing_slots",
      "policy_actions",
      "pre_mcp_blocked_by_missing_slots",
      "final_answer_allowed",
    ],
    scenario: {
      key: "dialogue.intent_scope_slot_gate",
      when: "의도 확정 이후 required_slots 중 missing_slots가 존재하지만 실행/최종응답 단계로 진행함",
      expectedAction: "INTENT_SCOPE_GATE_BLOCKED -> ASK_SCOPE_SLOT -> SCOPE_READY 순서 강제",
      expectedPrompt: "누락 슬롯 확인 질문을 먼저 제공하고, 슬롯 해결 전 최종답변 차단",
      expectedEvents: ["POLICY_DECISION", "SLOT_EXTRACTED", "PRE_MCP_DECISION", "FINAL_ANSWER_READY"],
    },
  },
  {
    id: "notification.delivery_outcome_audit_missing",
    principleKey: "notification.enforceDeliveryOutcomeAudit",
    violationKey: "notification.delivery_outcome_audit_missing",
    summary: "Notification subscribe flow completed without deterministic delivery audit lifecycle/evidence.",
    severityDefault: "high",
    scope: "domain",
    domains: ["notification", "restock", "sms"],
    triggerSignals: [
      {
        name: "completion_like_subscribe_answer",
        description: "Subscription completion answer is shown to the user.",
      },
      {
        name: "notification_ids_present",
        description: "Context holds one or more notification ids to audit.",
      },
      {
        name: "delivery_lifecycle_gap",
        description: "Dispatch STARTED/COMPLETED and outcome events are incomplete.",
      },
      {
        name: "delivery_external_ack_gap",
        description: "Delivery outcome exists but provider/server ack is missing for one or more notification ids.",
      },
    ],
    evidenceFields: [
      "intent_name",
      "tool_name",
      "mismatch_type",
      "notification_ids",
      "delivery_started_event_present",
      "delivery_completed_event_present",
      "delivery_outcome_event_types",
      "external_ack_received_count",
      "external_ack_missing_count",
      "external_ack_missing_ids",
      "final_answer",
    ],
    scenario: {
      key: "notification.delivery.audit_missing",
      when: "알림 신청 완료 응답이 있으나 DELIVERY_STARTED/COMPLETED 또는 RESTOCK_SMS_* 결과 근거가 없음",
      expectedAction: "알림 발송 경로에 STARTED/COMPLETED 감사 이벤트와 결과 증거를 기록",
      expectedPrompt: "완료 안내 전에 발송/예약/실패 근거를 결정론적으로 검증",
      expectedEvents: ["POLICY_DECISION", "FINAL_ANSWER_READY", "RESTOCK_SMS_SENT"],
    },
  },
];

export function buildRuleDrivenViolationMap() {
  const out: Record<string, { key: string; summary: string; severityDefault: "medium" | "high" }> = {};
  for (const rule of SELF_HEAL_RULE_CATALOG) {
    out[rule.id] = {
      key: rule.violationKey,
      summary: rule.summary,
      severityDefault: rule.severityDefault,
    };
  }
  return out;
}

export function buildRuleDrivenScenarioMatrix() {
  return SELF_HEAL_RULE_CATALOG.map((rule) => ({ ...rule.scenario }));
}

export function getSelfHealRuleById(ruleId: string) {
  const key = String(ruleId || "").trim();
  if (!key) return null;
  return SELF_HEAL_RULE_CATALOG.find((rule) => rule.id === key) || null;
}
