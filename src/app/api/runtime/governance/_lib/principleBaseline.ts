import { CHAT_PRINCIPLES } from "@/app/api/runtime/chat/policies/principles";

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

export function getPrincipleBaseline(): PrincipleBaseline {
  return {
    source: "src/app/api/runtime/chat/policies/principles.ts",
    version: 1,
    memory: {
      enforceNoRepeatQuestions: Boolean(CHAT_PRINCIPLES.memory.enforceNoRepeatQuestions),
      reusePriority: String(CHAT_PRINCIPLES.memory.reusePriority || "highest"),
      entityReuseOrder: CHAT_PRINCIPLES.memory.entityReuseOrder,
    },
    dialogue: {
      enforceIntentScopedSlotGate: Boolean(CHAT_PRINCIPLES.dialogue.enforceIntentScopedSlotGate),
      blockFinalAnswerUntilRequiredSlotsResolved: Boolean(
        CHAT_PRINCIPLES.dialogue.blockFinalAnswerUntilRequiredSlotsResolved
      ),
      requireFollowupQuestionForMissingRequiredSlots: Boolean(
        CHAT_PRINCIPLES.dialogue.requireFollowupQuestionForMissingRequiredSlots
      ),
      requireScopeStateTransitionLogging: Boolean(CHAT_PRINCIPLES.dialogue.requireScopeStateTransitionLogging),
    },
    audit: {
      requireMcpLastFunctionAlwaysRecorded: Boolean(CHAT_PRINCIPLES.audit.requireMcpLastFunctionAlwaysRecorded),
    },
  };
}
