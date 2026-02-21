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
      const match = line.match(/^-\s*(\d{1,2})\s*(?:\uBC88)?\s*\|\s*(.+)$/);
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

  const example = lines.find((line) => /^\uC608\s*:/.test(line)) || "";
  const hasDetailColumn = itemRows.some((row) => row.cols.length > 1);
  const headerPrimary = "\uBB38\uC758 \uC720\uD615";
  const headerDetail = hasDetailColumn ? "\uC9C0\uC6D0 \uBC94\uC704" : "";
  const clampStyle = "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;";
  const cellBaseStyle = "padding:4px 6px;border-bottom:1px solid #e2e8f0;line-height:1.35;";
  const dataCellStyle = `${cellBaseStyle}color:inherit;font-size:12px;max-width:50%;`;
  const detailCellStyle = `${cellBaseStyle}color:#475569;font-size:11px;max-width:50%;`;
  const shouldForceScroll = hasDetailColumn && itemRows.length > 0;
  const rowsHtml = itemRows
    .map((row) => {
      const name = row.cols[0] || "-";
      const detail = row.cols.slice(1).join(" | ") || "-";
      if (!hasDetailColumn) {
        return `<tr><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;text-align:center;color:#0f172a;font-size:11px;font-weight:700;white-space:nowrap;">${escapeHtml(
          row.index
        )}</td><td style="${dataCellStyle}"><div style="${clampStyle}">${escapeHtml(name)}</div></td></tr>`;
      }
      return `<tr><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;text-align:center;color:#0f172a;font-size:11px;font-weight:700;white-space:nowrap;">${escapeHtml(
        row.index
      )}</td><td style="${dataCellStyle}"><div style="${clampStyle}">${escapeHtml(name)}</div></td><td style="${detailCellStyle}"><div style="${clampStyle}">${escapeHtml(
        detail
      )}</div></td></tr>`;
    })
    .join("");

  const exampleHtml = example
    ? `<div style="margin-top:8px;color:inherit;"><strong>\uC608\uC2DC</strong>: ${escapeHtml(
        example.replace(/^\uC608\s*:\s*/, "")
      )}</div>`
    : "";

  const headerColumns = hasDetailColumn
    ? `<tr><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:center;width:42px;">\uBC88\uD638</th><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;">${escapeHtml(
        headerPrimary
      )}</th><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;width:110px;">${escapeHtml(
        headerDetail
      )}</th></tr>`
    : `<tr><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:center;width:42px;">\uBC88\uD638</th><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;">${escapeHtml(
        headerPrimary
      )}</th></tr>`;

  return `<div style="display:block;margin:0;padding:0;color:inherit;font:inherit;line-height:inherit;"><style>[data-mejai-scroll-area]{scrollbar-width:none;-ms-overflow-style:none;}[data-mejai-scroll-area]::-webkit-scrollbar{display:none;}</style><div style="margin:0;padding:0;color:inherit;font:inherit;line-height:inherit;">${escapeHtml(
    title
  )}</div><div data-mejai-scroll-table="1" style="margin-top:4px;position:relative;overflow:hidden;border:1px solid #e2e8f0;border-radius:8px;background:rgba(255,255,255,0.55);"><div data-mejai-scroll-left="1" style="position:absolute;left:0;top:0;bottom:0;display:flex;align-items:center;opacity:0;transition:opacity .2s ease;pointer-events:none;padding-left:4px;padding-right:6px;background:linear-gradient(90deg,rgba(255,255,255,0.92),rgba(255,255,255,0));"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></div><div data-mejai-scroll-right="1" style="position:absolute;right:0;top:0;bottom:0;display:flex;align-items:center;opacity:0;transition:opacity .2s ease;pointer-events:none;padding-right:4px;padding-left:6px;background:linear-gradient(270deg,rgba(255,255,255,0.92),rgba(255,255,255,0));"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div><div data-mejai-scroll-area="1" style="overflow-x:auto;overflow-y:hidden;padding:0;scrollbar-width:none;"><table style="width:max-content;min-width:${shouldForceScroll ? "calc(100% + 64px)" : "100%"};border-collapse:collapse;table-layout:auto;color:inherit;font:inherit;margin:0;"><thead>${headerColumns}</thead><tbody>${rowsHtml}</tbody></table></div></div>${exampleHtml}</div>`;
}
