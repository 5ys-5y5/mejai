export type ReplyStyleDirective = {
  forceEndingYong: boolean;
  speechLevel: "formal" | "polite" | "casual" | null;
  concise: boolean;
  calm: boolean;
  bright: boolean;
  warm: boolean;
  respectful: boolean;
};

function normalizeText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeLineBreaks(value: string) {
  return String(value || "").replace(/\r\n/g, "\n");
}

function compactWhitespaceByLine(value: string) {
  return normalizeLineBreaks(value)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const TRAILING_TAIL_CHARS = new Set([
  ".",
  "!",
  "?",
  "~",
  "…",
  ")",
  "]",
  "}",
  ">",
  "\"",
  "'",
  "”",
  "’",
  "）",
  "］",
  "｝",
  "〉",
  "》",
  "」",
  "』",
  "】",
]);

function splitTrailingTail(value: string) {
  const raw = String(value || "");
  const trailingWhitespaceMatch = raw.match(/\s+$/);
  const trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : "";
  let trimmed = trailingWhitespace ? raw.slice(0, -trailingWhitespace.length) : raw;
  let tail = "";
  while (trimmed.length > 0) {
    const ch = trimmed[trimmed.length - 1];
    if (!TRAILING_TAIL_CHARS.has(ch)) break;
    tail = ch + tail;
    trimmed = trimmed.slice(0, -1);
  }
  return { body: trimmed, tail, trailingWhitespace };
}

function hasTerminalPunctuation(value: string) {
  return /[.!?~…]/.test(value);
}

function hasForceEndingYongRule(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  const mustPattern = /(반드시|꼭|무조건|항상)/;
  const yongEndingPattern =
    /(끝(?:에|은)?\s*["'“”]?용["'“”]?\s*(?:으로)?\s*끝|["'“”]?용["'“”]?\s*으로\s*끝|종결어미\s*["'“”]?용["'“”]?)/;
  return mustPattern.test(normalized) && yongEndingPattern.test(normalized);
}

function extractFieldValues(text: string, keys: string[]) {
  if (!text || keys.length === 0) return [];
  const keyPattern = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(?:^|\\n)\\s*(?:${keyPattern})\\s*[:：]\\s*([^\\n\\r]+)`, "gi");
  const values: string[] = [];
  for (const match of text.matchAll(regex)) {
    const value = normalizeText(match[1] || "");
    if (value) values.push(value);
  }
  return values;
}

function includesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function resolveSpeechLevel(styleTexts: string[], fullText: string): ReplyStyleDirective["speechLevel"] {
  const source = `${styleTexts.join("\n")} ${fullText}`;
  if (
    includesAny(source, [/반말/, /친구처럼/, /캐주얼/, /\bcasual\b/i, /편하게\s*말/]) &&
    !includesAny(source, [/존댓말/, /정중/, /격식/])
  ) {
    return "casual";
  }
  if (includesAny(source, [/합니다체/, /격식/, /공식/, /정중/, /\bformal\b/i, /\bprofessional\b/i])) {
    return "formal";
  }
  if (includesAny(source, [/해요체/, /존댓말/, /부드러운\s*말투/, /친근한\s*존댓말/])) {
    return "polite";
  }
  return null;
}

function applyCalmPunctuation(value: string) {
  return value.replace(/!{2,}/g, "!").replace(/\?{2,}/g, "?");
}

function applyBrightPunctuation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed;
}

function normalizeLines(value: string) {
  return normalizeLineBreaks(String(value || "")).split("\n");
}

function findLastNonEmptyLineIndex(lines: string[]) {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (String(lines[i] || "").trim()) return i;
  }
  return -1;
}

function applySpeechEndingToLine(line: string, speechLevel: ReplyStyleDirective["speechLevel"]) {
  const { body, tail, trailingWhitespace } = splitTrailingTail(line);
  let core = String(body || "").trimEnd();
  if (!core) return line;

  if (hasTerminalPunctuation(tail)) return line;
  if (/(용)$/.test(core)) return line;

  if (speechLevel === "formal") {
    if (/(이에요|예요)$/.test(core)) {
      core = core.replace(/(이에요|예요)$/, "입니다");
    } else if (/(돼요|되요)$/.test(core)) {
      core = core.replace(/(돼요|되요)$/, "됩니다");
    } else if (/해요$/.test(core)) {
      core = core.replace(/해요$/, "합니다");
    } else if (/(습니다|입니다|됩니다|드립니다|다|요)$/.test(core)) {
      return line;
    } else {
      return line;
    }
  } else if (speechLevel === "polite") {
    return line;
  } else if (speechLevel === "casual") {
    return line;
  }

  return `${core}${tail}${trailingWhitespace}`;
}

function applySpeechEnding(value: string, speechLevel: ReplyStyleDirective["speechLevel"]) {
  if (!speechLevel) return value;
  const text = String(value || "");
  if (!text.trim()) return text;
  const lines = normalizeLines(text);
  const lastIndex = findLastNonEmptyLineIndex(lines);
  if (lastIndex < 0) return text;
  lines[lastIndex] = applySpeechEndingToLine(lines[lastIndex], speechLevel);
  return lines.join("\n");
}

function applyWarmTail(value: string, speechLevel: ReplyStyleDirective["speechLevel"], respectful: boolean) {
  const text = String(value || "").trim();
  if (!text) return text;
  const alreadyHasTail = /(도와드릴|도와줄|안내해드릴|안내할게|필요하시면|원하시면)/.test(text);
  if (alreadyHasTail) return text;
  const lines = normalizeLines(text);
  const lastIndex = findLastNonEmptyLineIndex(lines);
  const lastLine = lastIndex >= 0 ? String(lines[lastIndex] || "").trim() : "";
  if (!lastLine) return text;
  if (/[?？]$/.test(lastLine)) return text;
  if (/(주세요|부탁|알려|입력해|선택해|확인해)\s*[.!?~…]?$/.test(lastLine)) return text;
  if (lastLine.length < 12) return text;
  if (speechLevel === "casual") return `${text}\n필요하면 더 도와줄게.`;
  if (speechLevel === "formal" || respectful) return `${text}\n필요하시면 이어서 도와드리겠습니다.`;
  return `${text}\n필요하시면 이어서 도와드릴게요.`;
}

function applyYongEndingToSegment(value: string) {
  const text = String(value || "");
  if (!text.trim()) return text;
  const { body, tail, trailingWhitespace } = splitTrailingTail(text);
  let core = String(body || "").trimEnd();
  if (!core) return text;
  if (hasTerminalPunctuation(tail)) return text;
  if (/용$/.test(core)) return text;

  const politeConverted =
    core
      .replace(/(해요|돼요|되요|줘요|져요|세요|이에요|예요)$/, (match) => {
        const mapped = match.replace(/요$/, "용");
        return mapped;
      })
      .replace(/([가-힣]{2,})요$/, (match, stem) => {
        if (/(필|중요|개요|수요|비용|허용)$/.test(stem)) return match;
        return `${stem}용`;
      })
      .replace(/([0-9,\s]{1,})요$/, (_match, stem) => `${String(stem)}용`);

  let next = politeConverted;
  if (next === core) {
    next = core.replace(/(입니다|습니다|드립니다|됩니다)$/, (ending) => `${ending}용`);
  }

  if (next === core) return text;
  return `${next}${tail}${trailingWhitespace}`;
}

function applyYongEndingByLine(value: string) {
  return normalizeLineBreaks(String(value || ""))
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      const colonIdx = line.indexOf(":");
      if (colonIdx < 0) return applyYongEndingToSegment(line);
      const prefix = line.slice(0, colonIdx + 1);
      const tail = line.slice(colonIdx + 1);
      return `${prefix}${applyYongEndingToSegment(tail)}`;
    })
    .join("\n");
}

export function resolveReplyStyleDirective(input: {
  primaryKbContent?: string | null;
  adminKbContents?: Array<string | null | undefined>;
}): ReplyStyleDirective {
  const texts = [
    String(input.primaryKbContent || ""),
    ...((input.adminKbContents || []).map((item) => String(item || "")) as string[]),
  ];
  const merged = texts.filter(Boolean).join("\n");
  const speechFieldValues = extractFieldValues(merged, ["말투", "tone", "style", "speech"]);
  const nuanceFieldValues = extractFieldValues(merged, ["뉘앙스", "nuance"]);
  const attitudeFieldValues = extractFieldValues(merged, ["태도", "attitude"]);
  const moodFieldValues = extractFieldValues(merged, ["무드", "mood"]);
  const styleText = `${speechFieldValues.join(" ")} ${nuanceFieldValues.join(" ")} ${attitudeFieldValues.join(" ")} ${moodFieldValues.join(" ")}`;
  const forceEndingYong = texts.some((text) => hasForceEndingYongRule(text));
  const speechLevel = resolveSpeechLevel(speechFieldValues, merged);
  const concise = includesAny(`${styleText} ${merged}`, [/간결/, /짧게/, /핵심만/, /\bconcise\b/i, /\bbrief\b/i]);
  const calm = includesAny(`${styleText} ${merged}`, [/차분/, /침착/, /담백/, /\bcalm\b/i, /안정적/]);
  const bright = includesAny(`${styleText} ${merged}`, [/밝/, /경쾌/, /활기/, /\bbright\b/i, /\benergetic\b/i]);
  const warm = includesAny(`${styleText} ${merged}`, [/따뜻/, /친절/, /다정/, /\bwarm\b/i, /\bfriendly\b/i, /공감/]);
  const respectful = includesAny(`${styleText} ${merged}`, [/정중/, /존중/, /공손/, /\brespectful\b/i, /예의/]);
  return {
    forceEndingYong,
    speechLevel,
    concise,
    calm,
    bright,
    warm,
    respectful,
  };
}

export function applyReplyStyle(text: string, directive: ReplyStyleDirective): string {
  let output = compactWhitespaceByLine(String(text || ""));
  if (!output) return output;

  if (directive.concise) {
    output = compactWhitespaceByLine(output);
  }
  if (directive.calm) {
    output = applyCalmPunctuation(output);
  } else if (directive.bright) {
    output = applyBrightPunctuation(output);
  }

  output = applySpeechEnding(output, directive.speechLevel);

  if (directive.warm) {
    output = applyWarmTail(output, directive.speechLevel, directive.respectful);
  }

  if (!directive.forceEndingYong) return output;

  return applyYongEndingByLine(output).trim();
}