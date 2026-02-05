export type RuntimeQuickReplyConfig = {
  selection_mode: "single" | "multi";
  min_select: number;
  max_select: number;
  submit_format: "single" | "csv";
  criteria: string;
  source_function: string;
  source_module: string;
};

export const YES_NO_QUICK_REPLIES = [
  { label: "네", value: "네" },
  { label: "아니오", value: "아니오" },
];

type ResolveQuickReplyConfigInput = {
  optionsCount: number;
  minSelectHint?: number | null;
  maxSelectHint?: number | null;
  explicitMode?: "single" | "multi" | null;
  criteria: string;
  sourceFunction: string;
  sourceModule: string;
  contextText?: string | null;
};

function toSafeInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function inferModeFromContextText(text: string, optionsCount: number) {
  const normalized = String(text || "").trim();
  if (!normalized) return optionsCount > 1 ? "multi" : "single";
  const hasDelimiterSignal = /,|\/|그리고|및|and/i.test(normalized);
  const hasExampleCsv = /\b\d+\s*,\s*\d+/.test(normalized);
  if (hasDelimiterSignal || hasExampleCsv) return "multi";
  return optionsCount > 1 ? "multi" : "single";
}

export function resolveQuickReplyConfig(input: ResolveQuickReplyConfigInput): RuntimeQuickReplyConfig {
  const optionsCount = Math.max(1, toSafeInt(input.optionsCount) || 1);
  const explicitMode = input.explicitMode === "multi" || input.explicitMode === "single" ? input.explicitMode : null;
  const inferredMode = inferModeFromContextText(String(input.contextText || ""), optionsCount);
  const selectionMode = explicitMode || inferredMode;

  const hintedMax = toSafeInt(input.maxSelectHint);
  const maxSelect =
    hintedMax > 0
      ? clamp(hintedMax, 1, optionsCount)
      : selectionMode === "multi"
        ? optionsCount
        : 1;
  const hintedMin = toSafeInt(input.minSelectHint);
  const minSelect = hintedMin > 0 ? clamp(hintedMin, 1, maxSelect) : 1;

  return {
    selection_mode: selectionMode,
    min_select: minSelect,
    max_select: maxSelect,
    submit_format: selectionMode === "multi" ? "csv" : "single",
    criteria: String(input.criteria || "runtime:quick_reply_rule"),
    source_function: input.sourceFunction,
    source_module: input.sourceModule,
  };
}

export function resolveSingleChoiceQuickReplyConfig(input: {
  optionsCount: number;
  criteria: string;
  sourceFunction: string;
  sourceModule: string;
  contextText?: string | null;
}) {
  return resolveQuickReplyConfig({
    optionsCount: input.optionsCount,
    minSelectHint: 1,
    maxSelectHint: 1,
    explicitMode: "single",
    criteria: input.criteria,
    sourceFunction: input.sourceFunction,
    sourceModule: input.sourceModule,
    contextText: input.contextText,
  });
}

export function maybeBuildYesNoQuickReplyRule(input: {
  message: string;
  criteria: string;
  sourceFunction: string;
  sourceModule: string;
}) {
  const text = String(input.message || "");
  const isYesNoPrompt = /맞으면\s*'네'[\s\S]*'아니오'/u.test(text);
  if (!isYesNoPrompt) return null;
  return resolveSingleChoiceQuickReplyConfig({
    optionsCount: YES_NO_QUICK_REPLIES.length,
    criteria: input.criteria,
    sourceFunction: input.sourceFunction,
    sourceModule: input.sourceModule,
    contextText: text,
  });
}
