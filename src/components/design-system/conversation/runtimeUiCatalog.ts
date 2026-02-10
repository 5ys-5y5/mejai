export type RuntimePromptKind =
  | "lead_day"
  | "intent_disambiguation"
  | "restock_product_choice"
  | "restock_subscribe_confirm"
  | "restock_subscribe_phone"
  | "restock_post_subscribe"
  | "restock_alternative_confirm"
  | null;

export type RuntimeUiTypeId =
  | "text.default"
  | "choice.generic"
  | "choice.lead_day"
  | "choice.intent_disambiguation"
  | "cards.generic"
  | "cards.restock_product_choice";

export const RUNTIME_UI_TYPE_IDS: RuntimeUiTypeId[] = [
  "text.default",
  "choice.generic",
  "choice.lead_day",
  "choice.intent_disambiguation",
  "cards.generic",
  "cards.restock_product_choice",
];

export const RUNTIME_UI_TYPE_HIERARCHY: ReadonlyArray<{
  parent: "text" | "choice" | "cards";
  children: RuntimeUiTypeId[];
}> = [
  { parent: "text", children: ["text.default"] },
  { parent: "choice", children: ["choice.generic", "choice.lead_day", "choice.intent_disambiguation"] },
  { parent: "cards", children: ["cards.generic", "cards.restock_product_choice"] },
] as const;

export const RUNTIME_UI_PROMPT_RULES = {
  leadDayPromptKeyword: "예약 알림일을 선택해 주세요",
  intentDisambiguationKeywords: ["의도 확인", "복수 선택 가능"],
  minSelectRegex: /최소\s*(\d+)/,
  criteriaMap: {
    lead_day: ["ASK_RESTOCK_SUBSCRIBE_LEAD_DAYS", "restock_subscribe_lead_days"],
    intent_disambiguation: ["ASK_INTENT_DISAMBIGUATION", "intent_disambiguation"],
    restock_product_choice: ["ASK_RESTOCK_PRODUCT_CHOICE", "restock_product_choice", "not_in_target_fallback_choice"],
    restock_subscribe_confirm: ["ASK_RESTOCK_SUBSCRIBE_CONFIRM", "awaiting_subscribe_confirm"],
    restock_subscribe_phone: ["ASK_RESTOCK_SUBSCRIBE_PHONE", "awaiting_subscribe_phone"],
    restock_post_subscribe: ["post_subscribe_next_step"],
    restock_alternative_confirm: ["ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM", "awaiting_non_target_alternative_confirm"],
  },
} as const;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildIntentDisambiguationTableHtmlFromText(message: unknown): string | null {
  const text = typeof message === "string" ? message : "";
  if (!text) return null;
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const title = lines[0];
  const itemRows = lines
    .map((line) => {
      const match = line.match(/^-\s*(\d{1,2})번\s*\|\s*(.+)$/);
      if (!match) return null;
      const index = match[1];
      const cols = String(match[2] || "")
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      if (cols.length === 0) return null;
      return { index, cols };
    })
    .filter((row): row is { index: string; cols: string[] } => Boolean(row));
  if (itemRows.length === 0) return null;

  const example = lines.find((line) => /^예\s*:/.test(line)) || "";
  const rowsHtml = itemRows
    .map((row) => {
      const name = row.cols[0] || "-";
      const schedule = row.cols.slice(1).join(" | ") || "-";
      return `<tr><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;text-align:center;color:#0f172a;font-size:11px;font-weight:700;white-space:nowrap;">${escapeHtml(row.index)}</td><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:inherit;font-size:12px;line-height:1.35;">${escapeHtml(name)}</td><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:11px;line-height:1.35;white-space:nowrap;">${escapeHtml(schedule)}</td></tr>`;
    })
    .join("");

  const exampleHtml = example
    ? `<div style="margin-top:8px;color:inherit;"><strong>입력 예시</strong>: ${escapeHtml(
        example.replace(/^예\s*:\s*/, "")
      )}</div>`
    : "";

  return `<div style="display:block;margin:0;padding:0;color:inherit;font:inherit;line-height:inherit;"><div style="margin:0;padding:0;color:inherit;font:inherit;line-height:inherit;">${escapeHtml(
    title
  )}</div><div style="margin-top:4px;overflow:hidden;border:1px solid #e2e8f0;border-radius:8px;background:rgba(255,255,255,0.55);"><table style="width:100%;border-collapse:collapse;table-layout:fixed;color:inherit;font:inherit;margin:0;"><thead><tr><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:center;width:42px;">번호</th><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;">항목명</th><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;width:110px;">일정</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>${exampleHtml}</div>`;
}
