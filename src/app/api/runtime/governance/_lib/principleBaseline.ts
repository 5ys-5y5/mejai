import { CHAT_PRINCIPLES, getPolicyBundle } from "@/app/api/runtime/chat/policies/principles";

export type PrincipleBaseline = {
  source: string;
  version: number;
  memory: {
    enforceNoRepeatQuestions: boolean;
    reusePriority: string;
    entityReuseOrder: readonly string[];
  };
  dialogue: {
    enforceIntentScopedSlotGate: boolean;
    blockFinalAnswerUntilRequiredSlotsResolved: boolean;
    requireFollowupQuestionForMissingRequiredSlots: boolean;
    requireScopeStateTransitionLogging: boolean;
  };
  audit: {
    requireMcpLastFunctionAlwaysRecorded: boolean;
  };
};

export function getPrincipleBaseline(intent?: string | null): PrincipleBaseline {
  const policy = intent ? getPolicyBundle(intent) : CHAT_PRINCIPLES;
  return {
    source: "src/app/api/runtime/chat/policies/principles.ts",
    version: 1,
    memory: {
      enforceNoRepeatQuestions: Boolean(policy.memory.enforceNoRepeatQuestions),
      reusePriority: String(policy.memory.reusePriority || "highest"),
      entityReuseOrder: policy.memory.entityReuseOrder,
    },
    dialogue: {
      enforceIntentScopedSlotGate: Boolean(policy.dialogue.enforceIntentScopedSlotGate),
      blockFinalAnswerUntilRequiredSlotsResolved: Boolean(
        policy.dialogue.blockFinalAnswerUntilRequiredSlotsResolved
      ),
      requireFollowupQuestionForMissingRequiredSlots: Boolean(
        policy.dialogue.requireFollowupQuestionForMissingRequiredSlots
      ),
      requireScopeStateTransitionLogging: Boolean(policy.dialogue.requireScopeStateTransitionLogging),
    },
    audit: {
      requireMcpLastFunctionAlwaysRecorded: Boolean(policy.audit.requireMcpLastFunctionAlwaysRecorded),
    },
  };
}
