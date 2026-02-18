type TemplateKey =
  | "confirm_yes_no_suffix"
  | "intent_disambiguation_title"
  | "intent_disambiguation_example"
  | "restock_lead_days_title"
  | "restock_lead_days_selectable"
  | "restock_lead_days_example"
  | "restock_lead_days_retry_title"
  | "restock_product_choice_title"
  | "order_choice_title"
  | "order_choice_header"
  | "numbered_choice_example";

const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  confirm_yes_no_suffix: "네/아니오로 답해주세요.",
  intent_disambiguation_title: "원하시는 문의 유형을 선택해주세요. (번호로 답변)",
  intent_disambiguation_example: "예) 1,2",
  restock_lead_days_title: "재입고 알림을 언제부터 받을까요? (최소 {min}일 전)",
  restock_lead_days_selectable: "선택 가능: {options}",
  restock_lead_days_example: "예) {example}",
  restock_lead_days_retry_title: "선택이 부족해요. 최소 {min}개를 골라주세요. (가능: {options})",
  restock_product_choice_title: "다음 중 어떤 상품의 재입고 알림을 원하시나요?",
  order_choice_title: "다음 주문 중 어떤 주문을 조회/변경하시나요?",
  order_choice_header: "주문 번호를 선택해주세요.",
  numbered_choice_example: "예) 1",
};

type ResolveTemplateInput = {
  key: TemplateKey;
  botContext?: Record<string, any> | null;
  entity?: Record<string, any> | null;
};

function readOverride(target: Record<string, any> | null | undefined, key: TemplateKey) {
  if (!target || typeof target !== "object") return null;
  const map = (target as Record<string, any>).template_overrides;
  if (map && typeof map === "object") {
    const fromMap = String((map as Record<string, any>)[key] || "").trim();
    if (fromMap) return fromMap;
  }
  const direct = String((target as Record<string, any>)[`template_${key}`] || "").trim();
  return direct || null;
}

export function resolveRuntimeTemplate(input: ResolveTemplateInput) {
  const fromContext = readOverride(input.botContext || null, input.key);
  if (fromContext) return fromContext;
  const fromEntity = readOverride(input.entity || null, input.key);
  if (fromEntity) return fromEntity;
  return DEFAULT_TEMPLATES[input.key];
}

export function buildYesNoConfirmationPrompt(
  question: string,
  input?: {
    botContext?: Record<string, any> | null;
    entity?: Record<string, any> | null;
  }
) {
  const suffix = resolveRuntimeTemplate({
    key: "confirm_yes_no_suffix",
    botContext: input?.botContext || null,
    entity: input?.entity || null,
  });
  return `${String(question || "").trim()}\n${suffix}`;
}

export function resolveRuntimeTemplateOverridesFromPolicy(templates: Record<string, any> | null | undefined) {
  const source = templates && typeof templates === "object" ? templates : {};
  const keysByPriority: Record<TemplateKey, string[]> = {
    confirm_yes_no_suffix: ["confirm_yes_no_suffix", "yes_no_suffix", "confirmation_yes_no_suffix"],
    intent_disambiguation_title: [
      "intent_disambiguation_title",
      "intent_disambiguation_prompt_title",
      "ask_intent_disambiguation_title",
    ],
    intent_disambiguation_example: [
      "intent_disambiguation_example",
      "intent_disambiguation_prompt_example",
      "ask_intent_disambiguation_example",
    ],
    restock_lead_days_title: ["restock_lead_days_title", "ask_restock_lead_days_title"],
    restock_lead_days_selectable: ["restock_lead_days_selectable", "ask_restock_lead_days_selectable"],
    restock_lead_days_example: ["restock_lead_days_example", "ask_restock_lead_days_example"],
    restock_lead_days_retry_title: ["restock_lead_days_retry_title", "ask_restock_lead_days_retry_title"],
    restock_product_choice_title: ["restock_product_choice_title", "ask_restock_product_choice_title"],
    order_choice_title: ["order_choice_title", "order_choices_prompt", "ask_order_choice_title"],
    order_choice_header: ["order_choice_header", "order_choices_header", "ask_order_choice_header"],
    numbered_choice_example: ["numbered_choice_example", "choice_example"],
  };
  const out: Partial<Record<TemplateKey, string>> = {};
  (Object.keys(keysByPriority) as TemplateKey[]).forEach((key) => {
    const aliases = keysByPriority[key];
    for (const alias of aliases) {
      const value = String((source as Record<string, any>)[alias] || "").trim();
      if (value) {
        out[key] = value;
        break;
      }
    }
  });
  return out;
}

export function mergeRuntimeTemplateOverrides(
  botContext: Record<string, any> | null | undefined,
  overrides: Partial<Record<TemplateKey, string>>
) {
  const base = botContext && typeof botContext === "object" ? botContext : {};
  const existing = (base as Record<string, any>).template_overrides;
  const existingMap =
    existing && typeof existing === "object"
      ? (Object.fromEntries(
          Object.entries(existing as Record<string, any>).map(([k, v]) => [k, String(v ?? "").trim()])
        ) as Record<string, string>)
      : {};
  const normalizedOverrides = Object.fromEntries(
    Object.entries(overrides || {})
      .map(([k, v]) => [k, String(v || "").trim()])
      .filter(([, v]) => Boolean(v))
  ) as Record<string, string>;
  return {
    ...base,
    template_overrides: {
      ...existingMap,
      ...normalizedOverrides,
    },
  } as Record<string, any>;
}

export function buildRestockLeadDaysPrompt(input: {
  minRequired: number;
  options: number[];
  exampleValues: number[];
  botContext?: Record<string, any> | null;
  entity?: Record<string, any> | null;
  retryMode?: boolean;
}) {
  const optionText = (input.options || []).map((v) => `D-${v}`).join(", ") || "-";
  const exampleText = (input.exampleValues || []).join(",") || "-";
  const titleTemplate = resolveRuntimeTemplate({
    key: input.retryMode ? "restock_lead_days_retry_title" : "restock_lead_days_title",
    botContext: input.botContext || null,
    entity: input.entity || null,
  });
  const selectableTemplate = resolveRuntimeTemplate({
    key: "restock_lead_days_selectable",
    botContext: input.botContext || null,
    entity: input.entity || null,
  });
  const exampleTemplate = resolveRuntimeTemplate({
    key: "restock_lead_days_example",
    botContext: input.botContext || null,
    entity: input.entity || null,
  });
  const replaceVars = (raw: string) =>
    String(raw || "")
      .replaceAll("{min}", String(Math.max(1, Number(input.minRequired || 1))))
      .replaceAll("{options}", optionText)
      .replaceAll("{example}", exampleText);
  const lines = [replaceVars(titleTemplate)];
  if (!input.retryMode) lines.push(replaceVars(selectableTemplate));
  lines.push(replaceVars(exampleTemplate));
  return lines.join("\n");
}

export function buildNumberedChoicePrompt(input: {
  titleKey: "restock_product_choice_title" | "order_choice_title";
  lines: string[];
  botContext?: Record<string, any> | null;
  entity?: Record<string, any> | null;
  headerKey?: "order_choice_header";
  includeExample?: boolean;
}) {
  const title = resolveRuntimeTemplate({
    key: input.titleKey,
    botContext: input.botContext || null,
    entity: input.entity || null,
  });
  const output = [title, ...(Array.isArray(input.lines) ? input.lines : [])];
  if (input.headerKey) {
    const header = resolveRuntimeTemplate({
      key: input.headerKey,
      botContext: input.botContext || null,
      entity: input.entity || null,
    });
    output.splice(1, 0, header);
  }
  if (input.includeExample) {
    const example = resolveRuntimeTemplate({
      key: "numbered_choice_example",
      botContext: input.botContext || null,
      entity: input.entity || null,
    });
    output.push(example);
  }
  return output.filter(Boolean).join("\n");
}
