import { resolveQuickReplyConfig, YES_NO_QUICK_REPLIES } from "../runtime/quickReplyConfigRuntime";
import { extractLeadDayOptionsFromText, extractNumberedOptionIndicesFromText } from "../policies/intentSlotPolicy";
import { buildIntentDisambiguationTableHtmlFromText } from "@/components/design-system/conversation/runtimeUiCatalog";

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
  const criteria = String((config as Record<string, any>).criteria || "").toLowerCase();
  if (criteria.includes("yes_no") || criteria.includes("yes/no")) {
    return [...YES_NO_QUICK_REPLIES];
  }
  return [];
}

export function deriveRichMessageHtml(message: unknown) {
  return buildIntentDisambiguationTableHtmlFromText(message);
}

