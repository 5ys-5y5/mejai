import { RUNTIME_UI_PROMPT_RULES } from "@/components/design-system/conversation/runtimeUiCatalog";

export const RENDER_POLICY = {
  version: "v1",
  interaction_scope: "latest_only",
  quick_reply_sources: {
    explicit: true,
    config: true,
    fallback: true,
  },
  grid_max_columns: {
    quick_replies: 3,
    cards: 3,
  },
  prompt_rules: {
    lead_day_prompt_keyword: RUNTIME_UI_PROMPT_RULES.leadDayPromptKeyword,
    intent_disambiguation_keywords: [...RUNTIME_UI_PROMPT_RULES.intentDisambiguationKeywords],
    min_select_regex: RUNTIME_UI_PROMPT_RULES.minSelectRegex,
    criteria_map: RUNTIME_UI_PROMPT_RULES.criteriaMap,
  },
} as const;

export type RenderPolicy = typeof RENDER_POLICY;

export function getRenderPolicy() {
  return RENDER_POLICY;
}
