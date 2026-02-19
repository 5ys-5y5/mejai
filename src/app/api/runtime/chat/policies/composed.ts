import { CHAT_PRIMITIVES } from "./primitives";

export const DEFAULT_RULE_BUNDLE = {
  architecture: CHAT_PRIMITIVES.architecture,
  safety: CHAT_PRIMITIVES.safety,
  response: CHAT_PRIMITIVES.response,
  dialogue: CHAT_PRIMITIVES.dialogue,
  address: CHAT_PRIMITIVES.address,
  mutation: CHAT_PRIMITIVES.mutation,
  targetConfirmation: CHAT_PRIMITIVES.targetConfirmation,
  substitution: CHAT_PRIMITIVES.substitution,
  memory: CHAT_PRIMITIVES.memory,
  audit: CHAT_PRIMITIVES.audit,
} as const;

export type ChatRuleBundle = typeof DEFAULT_RULE_BUNDLE;

type PartialRuleBundle = Partial<{
  [K in keyof ChatRuleBundle]: Partial<ChatRuleBundle[K]>;
}>;

export const INTENT_RULE_OVERRIDES: Record<string, PartialRuleBundle> = {};

function mergeGroup<T extends Record<string, any>>(base: T, override?: Partial<T>): T {
  if (!override) return { ...base };
  return { ...base, ...override };
}

export function composeRuleBundle(intent?: string): ChatRuleBundle {
  const base = DEFAULT_RULE_BUNDLE;
  const override = intent ? INTENT_RULE_OVERRIDES[String(intent)] : undefined;
  if (!override) return base;

  return {
    architecture: mergeGroup(base.architecture, override.architecture),
    safety: mergeGroup(base.safety, override.safety),
    response: mergeGroup(base.response, override.response),
    dialogue: mergeGroup(base.dialogue, override.dialogue),
    address: mergeGroup(base.address, override.address),
    mutation: mergeGroup(base.mutation, override.mutation),
    targetConfirmation: mergeGroup(base.targetConfirmation, override.targetConfirmation),
    substitution: mergeGroup(base.substitution, override.substitution),
    memory: mergeGroup(base.memory, override.memory),
    audit: mergeGroup(base.audit, override.audit),
  };
}
