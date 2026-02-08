import { CHAT_PRINCIPLES } from "@/app/api/runtime/chat/policies/principles";

export type PrincipleBaseline = {
  source: string;
  version: number;
  memory: {
    enforceNoRepeatQuestions: boolean;
    reusePriority: string;
    entityReuseOrder: readonly string[];
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
  };
}

