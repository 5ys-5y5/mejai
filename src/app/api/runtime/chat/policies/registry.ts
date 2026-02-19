import { composeRuleBundle, type ChatRuleBundle } from "./composed";
import { getRenderPolicy, type RenderPolicy } from "./uiPolicy";

export const RULE_LAYER_ORDER = [
  "hard_guard",
  "intent_contract",
  "slot_gate",
  "tool_gate",
  "response",
  "render",
] as const;

export type RuleLayer = (typeof RULE_LAYER_ORDER)[number];

export const RULE_LAYER_GROUPS: Record<RuleLayer, ReadonlyArray<keyof ChatRuleBundle>> = {
  hard_guard: ["architecture", "safety", "audit"],
  intent_contract: ["dialogue"],
  slot_gate: ["substitution", "memory"],
  tool_gate: ["targetConfirmation", "mutation", "address"],
  response: ["response"],
  render: [],
};

export function getRuleBundle(intent?: string): ChatRuleBundle {
  return composeRuleBundle(intent);
}

export type UiPolicy = RenderPolicy;

export function getUiPolicy() {
  return getRenderPolicy();
}
