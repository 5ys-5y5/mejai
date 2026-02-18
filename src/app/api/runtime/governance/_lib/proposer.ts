import OpenAI from "openai";
import type { PrincipleBaseline } from "./principleBaseline";
import type { PrincipleViolation, RuntimeEvent, RuntimeTurn } from "./detector";
import { buildSelfHealGate, type ExceptionStats } from "./selfHealGate";
import {
  isActionLifecycleAuditPrinciple,
  isIntentScopedSlotGatePrinciple,
  isMcpLastFunctionAuditPrinciple,
  isNotificationDeliveryAuditPrinciple,
  isAddressSelfHealPrinciple,
  isApiContractSelfHealPrinciple,
  isContractFirstRuntimeDesignPrinciple,
} from "../selfHeal/principles";

export type PatchProposal = {
  proposal_id: string;
  violation_id: string;
  principle_key: string;
  runtime_scope: string;
  session_id: string;
  turn_id: string;
  status: "pending";
  title: string;
  why_failed: string;
  how_to_improve: string;
  rationale: string;
  target_files: string[];
  change_plan: string[];
  suggested_diff: string | null;
  confidence: number;
  created_at: string;
  self_heal_gate?: Record<string, unknown>;
  exception_reason?: string;
  exception_scope?: string;
  exception_expiry?: string;
  promotion_plan?: string;
  promotion_trigger?: string;
  blast_radius?: string;
  contract_scope?: string;
  generalization_scope?: string;
  slot_request_mapping_strategy?: string;
  response_projection_strategy?: string;
  pre_post_invariant_strategy?: string;
  contract_expectation?: string;
};

function normalizeFilePath(value: string) {
  return String(value || "").replace(/\\/g, "/").trim();
}

function isWeakGenericProposal(input: {
  targetFiles: string[];
  suggestedDiff: string | null;
  whyFailed: string;
  howToImprove: string;
}) {
  const files = input.targetFiles.map((v) => normalizeFilePath(v)).filter(Boolean);
  const onlyPrinciplesTs = files.length > 0 && files.every((v) => v.endsWith("/policies/principles.ts"));
  const genericText =
    String(input.whyFailed || "").toLowerCase().includes("fallback path") &&
    String(input.howToImprove || "").toLowerCase().includes("deterministic guard");
  return onlyPrinciplesTs && !String(input.suggestedDiff || "").trim() && genericText;
}

function qualityGateProposal(input: {
  proposal: PatchProposal;
  violation: PrincipleViolation;
}) {
  if (isApiContractSelfHealPrinciple(input.violation.principle_key)) {
    const evidence = (input.violation.evidence || {}) as Record<string, unknown>;
    const mismatchType = String(evidence.mismatch_type || "").trim();
    const toolName = String(evidence.tool_name || "").trim();
    const contractExpectation = String(evidence.contract_expectation || "").trim();
    return {
      ...input.proposal,
      title: "API contract mismatch self-heal proposal",
      why_failed:
        "Conversation slot semantics and MCP request/response contract were not aligned before tool execution/result projection.",
      how_to_improve:
        "Add explicit slot↔request mapping and response↔conversation projection validation; block/repair when semantic unit mismatch is detected.",
      rationale: `Prioritize contract-level deterministic guard over field-specific patch (tool=${toolName || "-"}, mismatch_type=${mismatchType || "-"})`,
      target_files: [
        "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
        "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
        "src/app/api/runtime/chat/policies/principles.ts",
        "src/app/api/runtime/governance/_lib/detector.ts",
      ],
      change_plan: [
        "Enforce architecture baseline: reject case-specific hardcoded fix as primary solution; require intent-driven contract runtime design.",
        "Define per-tool semantic contract (required/optional slots, decomposition rules, projection rules) for runtime tool calls.",
        "Before MCP execution, validate slot->request mapping; if mismatch detected, trigger deterministic normalization or block with explicit reason.",
        "After MCP response, validate response->conversation projection invariants and emit contract mismatch evidence for self-heal.",
        "Ensure fix scope is generalizable across tools/intents sharing the same semantic mismatch class (not one-case field patch).",
        `Persist contract expectation/evidence in proposal payload for auditability (${contractExpectation || "contract spec required"}).`,
      ],
    };
  }
  if (isContractFirstRuntimeDesignPrinciple(input.violation.principle_key)) {
    const evidence = (input.violation.evidence || {}) as Record<string, unknown>;
    const mismatchType = String(evidence.mismatch_type || "").trim();
    const toolName = String(evidence.tool_name || "").trim();
    const contractExpectation = String(evidence.contract_expectation || "").trim();
    const rejectCaseSpecificPrimaryFix = Boolean(evidence.reject_case_specific_primary_fix);
    return {
      ...input.proposal,
      title: "Contract-first runtime generalization proposal",
      why_failed:
        "Self-heal must enforce generalized intent/contract runtime fixes; case-specific hardcoding cannot be the primary fix.",
      how_to_improve:
        "Promote contract-first runtime guard as primary remediation: validate semantic slot->request mapping and response projection invariants before/after MCP execution.",
      rationale: `Reject one-case hotfix as primary solution (tool=${toolName || "-"}, mismatch_type=${mismatchType || "-"}, reject_case_specific_primary_fix=${rejectCaseSpecificPrimaryFix ? "true" : "false"})`,
      target_files: [
        "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
        "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
        "src/app/api/runtime/chat/policies/principles.ts",
        "src/app/api/runtime/governance/_lib/detector.ts",
        "src/app/api/runtime/governance/_lib/proposer.ts",
      ],
      change_plan: [
        "Keep case-specific patches as optional follow-up only; enforce contract-first runtime generalization as primary fix.",
        "Define semantic contract per tool/intents and share the same invariant checks across the mismatch class.",
        "Validate slot->request mapping before MCP call; block/normalize on contract mismatch.",
        "Validate response->conversation projection after MCP call; emit deterministic mismatch evidence.",
        `Persist explicit contract expectation/evidence in proposal payload (${contractExpectation || "contract spec required"}).`,
      ],
    };
  }
  if (isAddressSelfHealPrinciple(input.violation.principle_key)) {
    const evidence = (input.violation.evidence || {}) as Record<string, unknown>;
    const isConfirmedZipcodeNotApplied =
      String(input.violation.violation_id || "").includes("addressconfirmedzipcodenotapplied") ||
      Boolean(evidence.confirmation_context);
    if (isConfirmedZipcodeNotApplied) {
      const preMcpFinalCallsCount = Number(evidence.pre_mcp_final_calls_count || 0);
      const hasSearchAddressAction = Boolean(evidence.has_search_address_action);
      return {
        ...input.proposal,
        why_failed:
          "User confirmed zipcode candidate, but runtime did not propagate confirmed zipcode into tool execution path.",
        how_to_improve:
          "After zipcode confirmation(yes), promote pending_zipcode/pending_address to resolved entity and enforce update/search execution path before LLM finalization.",
        rationale: `Prefer state-carryover fix over prompt-only fix (pre_mcp_final_calls_count=${Number.isFinite(preMcpFinalCallsCount) ? preMcpFinalCallsCount : 0}, has_search_address_action=${hasSearchAddressAction ? "true" : "false"})`,
        target_files: [
          "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
          "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
          "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
        ],
        change_plan: [
          "At awaiting_zipcode_confirm + user yes, guarantee pending_zipcode is carried into resolved zipcode for current turn.",
          "If resolved address exists and confirmation was accepted, forbid zipcode/address re-ask fallback templates.",
          "Emit deterministic evidence around boundary: confirmation_context, pending_zipcode, resolved_zipcode, pre_mcp_final_calls_count.",
        ],
      };
    }
    const isRuntimePathMissingCase =
      String(input.violation.violation_id || "").includes("addressruntimepathmissingaftertemplatedefer") ||
      (Object.prototype.hasOwnProperty.call(evidence, "pre_mcp_final_calls_count") &&
        Object.prototype.hasOwnProperty.call(evidence, "has_search_address_action"));
    if (isRuntimePathMissingCase) {
      const preMcpFinalCallsCount = Number(evidence.pre_mcp_final_calls_count || 0);
      const hasSearchAddressAction = Boolean(evidence.has_search_address_action);
      return {
        ...input.proposal,
        why_failed:
          "Policy deferred/skipped forced template, but runtime left final tool path empty and skipped search_address execution.",
        how_to_improve:
          "Enforce runtime-first zipcode resolution path: address+no zipcode must trigger search_address and deterministic state transition before LLM finalization.",
        rationale: `Prefer runtime execution-path fix over prompt-only fix (pre_mcp_final_calls_count=${Number.isFinite(preMcpFinalCallsCount) ? preMcpFinalCallsCount : 0}, has_search_address_action=${hasSearchAddressAction ? "true" : "false"})`,
        target_files: [
          "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
          "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
          "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
        ],
        change_plan: [
          "If order_change has resolved address and missing zipcode, inject deterministic search_address path before final LLM response.",
          "When POLICY_DECISION is DEFER/SKIP_FORCE_RESPONSE_TEMPLATE(ORDER_AND_ADDRESS_ALREADY_AVAILABLE), require non-empty tool/runtime path evidence.",
          "Emit explicit failure-boundary evidence: pre_mcp_final_calls_count, has_search_address_action, policy_tool_reason, policy_final_reason.",
        ],
      };
    }
    const isUpdateSkippedAfterConfirmation =
      String(input.violation.violation_id || "").includes("addressupdateskippedafterconfirmation") ||
      (String(evidence.mcp_skipped_tool || "") === "update_order_shipping_address" &&
        String(evidence.mcp_skipped_reason || "") === "DEFERRED_TO_DETERMINISTIC_UPDATE");
    if (isUpdateSkippedAfterConfirmation) {
      return {
        ...input.proposal,
        why_failed:
          "Confirmed address/zipcode was available and update call was forced, but tool stage skipped update_order_shipping_address with DEFERRED_TO_DETERMINISTIC_UPDATE.",
        how_to_improve:
          "Remove/guard legacy skip in tool normalization so confirmed order_change updates execute deterministically when order_id/address/zipcode are resolved.",
        rationale:
          "Prefer execution-path unblock over template/prompt tuning (skip reason is deterministic and reproducible).",
        target_files: [
          "src/app/api/runtime/chat/runtime/toolRuntime.ts",
          "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
          "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        ],
        change_plan: [
          "In normalizeAndFilterFinalCalls, do not skip update_order_shipping_address for order_change when required args are present.",
          "Keep MCP_CALL_SKIPPED only for true validation failures (missing/invalid args), not intent-level blanket skips.",
          "Emit boundary evidence: forced_update_present, mcp_skipped_reason, resolved_order_id/address/zipcode.",
        ],
      };
    }
    const isUpdatePayloadStructureMismatch =
      String(input.violation.violation_id || "").includes("addressupdatepayloadstructuremismatch") ||
      (Object.prototype.hasOwnProperty.call(evidence, "request_address1") &&
        Object.prototype.hasOwnProperty.call(evidence, "response_address2") &&
        Boolean(evidence.detail_in_address1));
    if (isUpdatePayloadStructureMismatch) {
      return {
        ...input.proposal,
        why_failed:
          "update_order_shipping_address request likely put detailed unit in address1 while response still retained a non-empty address2.",
        how_to_improve:
          "Normalize address payload by splitting base address/address detail before update call (address1=base, address2=detail), then verify response structure.",
        rationale:
          "Prefer API-structure-aware fix over prompt tuning (Cafe24 receiver uses structured fields address1/address2).",
        target_files: [
          "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
          "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
          "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        ],
        change_plan: [
          "Before update_order_shipping_address, normalize parsed address into structured fields: address1(base)/address2(detail).",
          "If response address2 is already populated and request address1 contains unit detail, emit anomaly and block apply path.",
          "Emit boundary evidence in self-heal: request_address1, response_address1, response_address2, response_address_full.",
        ],
      };
    }
    const resultCount = Number(evidence.search_result_count || 0);
    const candidateCount = Number(evidence.candidate_count || evidence.search_candidate_count || 0);
    return {
      ...input.proposal,
      why_failed:
        resultCount === 0
          ? "Address search returned zero candidates, but runtime selected zipcode-question path instead of address retry path."
          : "Address search returned multiple candidates, but runtime did not transition to candidate-choice state.",
      how_to_improve:
        "Enforce address state machine: zero-result -> address retry, multi-result -> candidate choice, single-result -> confirmation.",
      rationale: `Prefer runtime state-machine fix over prompt-only fix (search_result_count=${Number.isFinite(resultCount) ? resultCount : 0}, candidate_count=${Number.isFinite(candidateCount) ? candidateCount : 0})`,
      target_files: [
        "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
        "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        "src/app/api/runtime/chat/shared/addressCandidateUtils.ts",
      ],
      change_plan: [
        "If search_address returns 0 candidates, force awaiting_address_retry and forbid zipcode-direct prompt.",
        "If search_address returns >=2 candidates, force awaiting_zipcode_choice with indexed candidate quick replies.",
        "Persist candidate list in bot_context and require user selection before zipcode confirmation.",
      ],
    };
  }
  if (isIntentScopedSlotGatePrinciple(input.violation.principle_key)) {
    const evidence = (input.violation.evidence || {}) as Record<string, unknown>;
    const intentName = String(evidence.intent_name || "").trim();
    const missingSlots = Array.isArray(evidence.missing_slots) ? evidence.missing_slots : [];
    const requiredSlots = Array.isArray(evidence.required_slots) ? evidence.required_slots : [];
    const loopDetected = Boolean(evidence.loop_detected);
    const repeatedSlot = String(evidence.repeated_slot || "").trim();
    return {
      ...input.proposal,
      title: loopDetected ? "Intent scope slot-loop regression proposal" : "Intent-scoped required-slot gate proposal",
      why_failed: loopDetected
        ? "Runtime asked the same required scope slot again after recent scope-ready progression, indicating slot-state regression."
        : "Intent progressed to execution/final-answer without satisfying required intent-scoped slots.",
      how_to_improve:
        "Introduce intent_scope_spec registry and enforce common gate engine: missing_slots => ASK_SCOPE_SLOT and stop progression.",
      rationale: loopDetected
        ? `Prevent scope-slot regression loop (intent=${intentName || "-"}, repeated_slot=${repeatedSlot || "-"}, missing_slots=${missingSlots.join(",") || "-"})`
        : `Contract-first gate required (intent=${intentName || "-"}, missing_slots=${missingSlots.join(",") || "-"}, required_slots=${requiredSlots.join(",") || "-"})`,
      target_files: [
        "src/app/api/runtime/chat/policies/principles.ts",
        "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
        "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
        "src/app/api/runtime/governance/_lib/detector.ts",
      ],
      change_plan: [
        "Define intent_scope_spec registry (required_slots, slot_extractors, prompt_template_key, ready_condition) without case-branch hardcoding.",
        "Emit POLICY_DECISION actions: INTENT_SCOPE_GATE_BLOCKED, ASK_SCOPE_SLOT, SCOPE_READY at deterministic boundaries.",
        "Persist missing_slots/resolved_slots in SLOT_EXTRACTED and blocked_by_missing_slots in PRE_MCP_DECISION.",
        "Block FINAL_ANSWER_READY whenever missing_slots is non-empty.",
        "If recently resolved required slot becomes missing again, emit explicit regression evidence and route to recovery prompt instead of same-slot re-ask loop.",
      ],
    };
  }
  if (isNotificationDeliveryAuditPrinciple(input.violation.principle_key)) {
    const evidence = (input.violation.evidence || {}) as Record<string, unknown>;
    const notificationIds = Array.isArray(evidence.notification_ids) ? evidence.notification_ids : [];
    const outcomeTypes = Array.isArray(evidence.delivery_outcome_event_types)
      ? evidence.delivery_outcome_event_types
      : [];
    return {
      ...input.proposal,
      title: "Notification delivery outcome audit proposal",
      why_failed:
        "Subscribe completion was returned without deterministic delivery STARTED/COMPLETED boundary evidence and/or outcome events.",
      how_to_improve:
        "Write delivery lifecycle audit pair and outcome evidence in runtime path and dispatch path before/after final completion guidance.",
      rationale: `Delivery audit gap (notification_ids=${notificationIds.length}, outcomes=${outcomeTypes.join(",") || "-"})`,
      target_files: [
        "src/app/api/runtime/chat/services/restockSubscriptionRuntime.ts",
        "src/app/api/runtime/restock/dispatch/route.ts",
        "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "src/app/api/runtime/governance/_lib/detector.ts",
      ],
      change_plan: [
        "Emit RESTOCK_SUBSCRIBE_DISPATCH_STARTED before Solapi send/register and RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED after persistence.",
        "Persist message_id -> delivery outcome (RESTOCK_SMS_SENT/SCHEDULED/FAILED) linkage for each notification id.",
        "Surface deterministic failure reason in audit payload when completion message is generated.",
      ],
    };
  }
  if (isActionLifecycleAuditPrinciple(input.violation.principle_key)) {
    const evidence = (input.violation.evidence || {}) as Record<string, unknown>;
    const missingCompleted = Array.isArray(evidence.missing_completed_for_started)
      ? evidence.missing_completed_for_started
      : [];
    const outcomeTypes = Array.isArray(evidence.outcome_event_types) ? evidence.outcome_event_types : [];
    return {
      ...input.proposal,
      title: "External action lifecycle outcome audit proposal",
      why_failed:
        "Completion-like user answer was emitted while external action lifecycle evidence was incomplete (STARTED/COMPLETED/outcome mismatch).",
      how_to_improve:
        "Enforce generic action lifecycle contract: STARTED -> COMPLETED and terminal outcome event before completion-like response.",
      rationale: `Lifecycle evidence gap (missing_completed=${missingCompleted.join(",") || "-"}, outcomes=${outcomeTypes.join(",") || "-"})`,
      target_files: [
        "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts",
        "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "src/app/api/runtime/governance/_lib/detector.ts",
        "src/app/api/runtime/governance/selfHeal/principles.ts",
      ],
      change_plan: [
        "Define a shared action lifecycle registry with event stem, start/completion events, and terminal outcomes.",
        "At completion-like final response branch, verify lifecycle evidence deterministically before rendering completion text.",
        "Emit normalized ACTION_* lifecycle events for non-MCP external integrations, not only SMS.",
      ],
    };
  }
  if (isMcpLastFunctionAuditPrinciple(input.violation.principle_key)) {
    const evidence = (input.violation.evidence || {}) as Record<string, unknown>;
    const lastStatus = String(evidence.mcp_last_status || "").trim();
    return {
      ...input.proposal,
      title: "MCP.last.function reasoned recording proposal",
      why_failed:
        "Debug prefix recorded MCP.last.function as none/blank, reducing root-cause traceability at failure boundaries.",
      how_to_improve:
        "Normalize debug writer to always emit reasoned function value: NO_TOOL_CALLED:<reason> or SKIPPED:<reason>.",
      rationale: `Trace precision improvement (mcp_last_status=${lastStatus || "-"})`,
      target_files: [
        "src/app/api/runtime/chat/runtime/runtimeSupport.ts",
        "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "src/app/api/runtime/governance/_lib/detector.ts",
      ],
      change_plan: [
        "Disallow literal none/blank in MCP.last.function serialization path.",
        "Derive explicit reason from mcpSkipped queue or pipeline state when no tool execution occurred.",
        "Keep before/after evidence around failure boundaries to satisfy audit determinism.",
      ],
    };
  }
  if (!isWeakGenericProposal({
    targetFiles: input.proposal.target_files,
    suggestedDiff: input.proposal.suggested_diff,
    whyFailed: input.proposal.why_failed,
    howToImprove: input.proposal.how_to_improve,
  })) {
    return input.proposal;
  }
  const evidence = (input.violation.evidence || {}) as Record<string, unknown>;
  const policyReason = String(evidence.policy_decision_reason || "").trim();
  const expectedInput = String(evidence.expected_input || "").trim();
  const forceTemplateMisapplied = Boolean(evidence.force_template_misapplied);
  const forcedTemplateApplied = String(evidence.final_response_forced_template_applied || "").trim();
  const finalResolvedAddress = String(evidence.final_response_resolved_address || "").trim();
  const targetFiles = [
    "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
    "src/app/api/runtime/chat/handlers/restockHandler.ts",
    "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
  ];
  return {
    ...input.proposal,
    why_failed: forceTemplateMisapplied
      ? `Forced response template was applied despite resolved address (template=${forcedTemplateApplied || "-"}, resolved_address=${finalResolvedAddress || "-"})`
      : policyReason === "ORDER_AND_ADDRESS_ALREADY_AVAILABLE"
        ? "Policy decided ORDER_AND_ADDRESS_ALREADY_AVAILABLE, but final response still asked for address again."
        : "Address slot was already resolved, but final response selection re-asked address.",
    how_to_improve:
      "Use finalized slot/policy decision evidence to block address re-ask in final response path; add guard in runtime finalize/handler path.",
    rationale: `Prefer runtime decision-path fix over principle text changes (force_template_misapplied=${forceTemplateMisapplied ? "true" : "false"}, expected_input=${expectedInput || "-"}, policy_reason=${policyReason || "-"})`,
    target_files: targetFiles,
    change_plan: [
      "At final response stage, if expected_input=address and resolved address exists, forbid address prompt template.",
      "If policy decision is DEFER_FORCE_RESPONSE_TEMPLATE with ORDER_AND_ADDRESS_ALREADY_AVAILABLE, preserve decision through finalization.",
      "Emit explicit debug evidence (resolved_address / policy_decision_reason / final_template) around failure boundary.",
    ],
  };
}

function nowIso() {
  return new Date().toISOString();
}

function modelName() {
  return String(process.env.RUNTIME_GOVERNANCE_MODEL || "gpt-4o-mini");
}

function fallbackProposal(input: {
  violation: PrincipleViolation;
  baseline: PrincipleBaseline;
  recentTurns: RuntimeTurn[];
  recentEvents: RuntimeEvent[];
}): PatchProposal {
  const { violation, baseline } = input;
  const proposalId = `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const mcpFailed = input.recentEvents.some((event) => event.event_type === "MCP_TOOL_FAILED");
  const defaultFiles =
    violation.runtime_scope === "chat"
      ? [
          "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
          "src/app/api/runtime/chat/runtime/toolRuntime.ts",
          "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
        ]
      : ["src/app/api/runtime/restock/dispatch/route.ts"];
  const plan = [
    "Add deterministic guard for known slot reuse before fallback prompt generation.",
    "If MCP failure happens, provide failure-aware guidance without re-asking already known user slots.",
    "Emit explicit PRINCIPLE_REUSE_APPLIED or PRINCIPLE_REUSE_BLOCKED event with before/after evidence.",
  ];
  return {
    proposal_id: proposalId,
    violation_id: violation.violation_id,
    principle_key: violation.principle_key,
    runtime_scope: violation.runtime_scope,
    session_id: violation.session_id,
    turn_id: violation.turn_id,
    status: "pending",
    title: mcpFailed
      ? "Prevent repeated slot question after MCP failure"
      : "Enforce no-repeat slot question rule",
    why_failed: mcpFailed
      ? "MCP failure path fell back to a generic prompt that re-asked an already known slot."
      : "Fallback prompt ignored previously confirmed slot context.",
    how_to_improve:
      "Add deterministic no-repeat guard before fallback response selection and emit explicit reuse-decision audit events.",
    rationale: `Align runtime output with ${baseline.source} memory principle.`,
    target_files: defaultFiles,
    change_plan: plan,
    suggested_diff: null,
    confidence: mcpFailed ? 0.86 : 0.72,
    created_at: nowIso(),
  };
}

function buildPrompt(input: {
  violation: PrincipleViolation;
  baseline: PrincipleBaseline;
  recentTurns: RuntimeTurn[];
  recentEvents: RuntimeEvent[];
}) {
  return [
    "You are a runtime governance engineer.",
    "Generate a compact JSON patch proposal for a principle violation.",
    "Rules:",
    "- Use principle baseline as source of truth.",
    "- Focus on deterministic fix first, then optional LLM prompt fix.",
    "- Include target_files, change_plan, suggested_diff (unified diff or null).",
    "- Keep only JSON, no markdown.",
    `Principle baseline: ${JSON.stringify(input.baseline)}`,
    `Violation: ${JSON.stringify(input.violation)}`,
    `Recent turns: ${JSON.stringify(input.recentTurns)}`,
    `Recent events: ${JSON.stringify(input.recentEvents)}`,
  ].join("\n");
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function buildPatchProposal(input: {
  violation: PrincipleViolation;
  baseline: PrincipleBaseline;
  recentTurns: RuntimeTurn[];
  recentEvents: RuntimeEvent[];
  exceptionStats?: ExceptionStats;
}): Promise<PatchProposal> {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    const fallback = fallbackProposal(input);
    const quality = qualityGateProposal({ proposal: fallback, violation: input.violation });
    return {
      ...quality,
      self_heal_gate: buildSelfHealGate({
        proposal: quality as unknown as Record<string, unknown>,
        violation: input.violation,
        exceptionStats: input.exceptionStats,
      }),
    };
  }

  const proposalId = `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const client = new OpenAI({ apiKey });
  const prompt = buildPrompt(input);
  try {
    const completion = await client.chat.completions.create({
      model: modelName(),
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return strict JSON only." },
        { role: "user", content: prompt },
      ],
    });
    const content = String(completion.choices[0]?.message?.content || "").trim();
    const parsed = parseJson(content);
    if (!parsed) {
      const fallback = fallbackProposal(input);
      const quality = qualityGateProposal({ proposal: fallback, violation: input.violation });
      return {
        ...quality,
        self_heal_gate: buildSelfHealGate({
          proposal: quality as unknown as Record<string, unknown>,
          violation: input.violation,
          exceptionStats: input.exceptionStats,
        }),
      };
    }
    const parsedProposal: PatchProposal = {
      proposal_id: proposalId,
      violation_id: input.violation.violation_id,
      principle_key: input.violation.principle_key,
      runtime_scope: input.violation.runtime_scope,
      session_id: input.violation.session_id,
      turn_id: input.violation.turn_id,
      status: "pending",
      title: String(parsed.title || "Principle violation patch proposal"),
      why_failed: String(
        parsed.why_failed || "Runtime fallback path did not respect memory reuse principle under current branch."
      ),
      how_to_improve: String(
        parsed.how_to_improve ||
          "Add deterministic guard to reuse known slots and avoid repeated question in fallback paths."
      ),
      rationale: String(parsed.rationale || `Align runtime behavior with ${input.baseline.source}`),
      target_files: Array.isArray(parsed.target_files)
        ? parsed.target_files.map((v) => String(v)).filter(Boolean)
        : [],
      change_plan: Array.isArray(parsed.change_plan)
        ? parsed.change_plan.map((v) => String(v)).filter(Boolean)
        : [],
      suggested_diff: typeof parsed.suggested_diff === "string" ? parsed.suggested_diff : null,
      confidence: Number(parsed.confidence || 0.7),
      created_at: nowIso(),
    };
    const quality = qualityGateProposal({ proposal: parsedProposal, violation: input.violation });
    return {
      ...quality,
      self_heal_gate: buildSelfHealGate({
        proposal: quality as unknown as Record<string, unknown>,
        violation: input.violation,
        exceptionStats: input.exceptionStats,
      }),
    };
  } catch {
    const fallback = fallbackProposal(input);
    const quality = qualityGateProposal({ proposal: fallback, violation: input.violation });
    return {
      ...quality,
      self_heal_gate: buildSelfHealGate({
        proposal: quality as unknown as Record<string, unknown>,
        violation: input.violation,
        exceptionStats: input.exceptionStats,
      }),
    };
  }
}
