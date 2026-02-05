import { resolveQuickReplyConfig, YES_NO_QUICK_REPLIES } from "../runtime/quickReplyConfigRuntime";
import { extractLeadDayOptionsFromText, extractNumberedOptionIndicesFromText } from "../policies/intentSlotPolicy";

export type RuntimeQuickReply = { label: string; value: string };
export type RuntimeQuickReplyDerivation = {
  criteria: string;
  source_function: string;
  source_module: string;
};
export type RuntimeQuickReplyConfig = {
  selection_mode: "single" | "multi";
  min_select?: number;
  max_select?: number;
  submit_format?: "single" | "csv";
  criteria?: string;
  source_function?: string;
  source_module?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function deriveQuickRepliesWithTrace(
  message: unknown,
  quickReplyMax: number
): { quickReplies: RuntimeQuickReply[]; derivation: RuntimeQuickReplyDerivation | null } {
  const text = typeof message === "string" ? message : "";
  if (!text) return { quickReplies: [], derivation: null };
  // Keep fallback intentionally minimal. Runtime/handlers should emit explicit quick_replies/config.
  const numberMatches = extractNumberedOptionIndicesFromText(text, quickReplyMax);
  if (numberMatches.length > 0) {
    const uniq = numberMatches.slice(0, quickReplyMax);
    return {
      quickReplies: uniq.map((n) => ({ label: `${n}번`, value: String(n) })),
      derivation: {
        criteria: "decorator:numbered_options_text",
        source_function: "deriveQuickRepliesWithTrace",
        source_module: "src/app/api/runtime/chat/presentation/ui-responseDecorators.ts",
      },
    };
  }
  const dayMatches = extractLeadDayOptionsFromText(text, 31);
  if (dayMatches.length > 0) {
    const uniqDays = Array.from(new Set(dayMatches)).sort((a, b) => a - b);
    return {
      quickReplies: uniqDays.slice(0, 7).map((n) => ({ label: `D-${n}`, value: String(n) })),
      derivation: {
        criteria: "decorator:lead_day_options_text",
        source_function: "deriveQuickRepliesWithTrace",
        source_module: "src/app/api/runtime/chat/presentation/ui-responseDecorators.ts",
      },
    };
  }
  return { quickReplies: [], derivation: null };
}

export function deriveQuickReplies(message: unknown, quickReplyMax: number): RuntimeQuickReply[] {
  return deriveQuickRepliesWithTrace(message, quickReplyMax).quickReplies;
}

export function deriveQuickReplyConfig(
  message: unknown,
  quickReplies: RuntimeQuickReply[]
): RuntimeQuickReplyConfig | null {
  if (!Array.isArray(quickReplies) || quickReplies.length === 0) return null;
  const text = typeof message === "string" ? message : "";
  const minMatch = text.match(/최소\s*(\d+)/);
  const minSelect = minMatch ? Math.max(1, Number(minMatch[1])) : null;
  const criteria =
    /복수 선택 가능/u.test(text) || /쉼표/u.test(text) || /\b\d+\s*,\s*\d+/.test(text)
      ? "decorator:multi_signal_text"
      : "decorator:default_single";
  return resolveQuickReplyConfig({
    optionsCount: quickReplies.length,
    minSelectHint: minSelect,
    maxSelectHint: quickReplies.length,
    explicitMode: null,
    criteria,
    sourceFunction: "deriveQuickReplyConfig",
    sourceModule: "src/app/api/runtime/chat/presentation/ui-responseDecorators.ts",
    contextText: text,
  });
}

export function deriveQuickRepliesFromConfig(config: unknown): RuntimeQuickReply[] {
  if (!config || typeof config !== "object") return [];
  const criteria = String((config as any).criteria || "").toLowerCase();
  if (criteria.includes("yes_no") || criteria.includes("yes/no")) {
    return [...YES_NO_QUICK_REPLIES];
  }
  return [];
}

export function deriveRichMessageHtml(message: unknown) {
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
  const itemsHtml = itemRows
    .map((row) => {
      const productName = row.cols[0] || "-";
      const schedule = row.cols.slice(1).join(" | ") || "-";
      return `<tr><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;text-align:center;color:#0f172a;font-size:11px;font-weight:700;white-space:nowrap;">${escapeHtml(row.index)}</td><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:inherit;font-size:12px;line-height:1.35;">${escapeHtml(productName)}</td><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:11px;line-height:1.35;white-space:nowrap;">${escapeHtml(schedule)}</td></tr>`;
    })
    .join("");

  const exampleHtml = example
    ? `<div style="margin-top:8px;color:inherit;"><strong>입력 예시</strong>: ${escapeHtml(
        example.replace(/^예\s*:\s*/, "")
      )}</div>`
    : "";

  return `<div style="display:block;margin:0;padding:0;color:inherit;font:inherit;line-height:inherit;"><div style="margin:0;padding:0;color:inherit;font:inherit;line-height:inherit;">${escapeHtml(title)}</div><div style="margin-top:4px;overflow:hidden;border:1px solid #e2e8f0;border-radius:8px;background:rgba(255,255,255,0.55);"><table style="width:100%;border-collapse:collapse;table-layout:fixed;color:inherit;font:inherit;margin:0;"><thead><tr><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:center;width:42px;">번호</th><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;">항목명</th><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;width:110px;">일정</th></tr></thead><tbody>${itemsHtml}</tbody></table></div>${exampleHtml}</div>`;
}
