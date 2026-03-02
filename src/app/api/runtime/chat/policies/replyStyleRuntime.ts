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
  ")",
  "]",
  "}",
  ">",
  "\"",
  "'",
  "…",
  "—",
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
  return /[.!?~]/.test(value);
}

function hasForceEndingYongRule(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return /(용체|용으로|용\s*말투|용\s*끝맺음)/.test(normalized);
}

function extractFieldValues(text: string, keys: string[]) {
  if (!text || keys.length === 0) return [];
  const keyPattern = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(?:^|\\n)\\s*(?:${keyPattern})\\s*[:：-]?\\s*([^\\n\\r]+)`, "gi");
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
  const source = `${styleTexts.join(" ")} ${fullText}`;
  if (includesAny(source, [/반말/, /친근/, /캐주얼/, /\bcasual\b/i])) return "casual";
  if (includesAny(source, [/격식/, /공식/, /전문적/, /\bformal\b/i, /\bprofessional\b/i])) return "formal";
  if (includesAny(source, [/정중/, /공손/, /존댓말/, /\bpolite\b/i])) return "polite";
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

  if (speechLevel === "formal") {
    if (/(습니다|합니다|됩니다|입니다)$/.test(core)) return line;
    return `${core}입니다.${tail}${trailingWhitespace}`;
  }
  if (speechLevel === "polite") {
    if (/요$/.test(core)) return line;
    return `${core}요.${tail}${trailingWhitespace}`;
  }
  return line;
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
  const lines = normalizeLines(text);
  const lastIndex = findLastNonEmptyLineIndex(lines);
  const lastLine = lastIndex >= 0 ? String(lines[lastIndex] || "").trim() : "";
  if (!lastLine) return text;
  if (/[.!?]$/.test(lastLine)) return text;
  if (speechLevel === "casual") return `${text}\n필요하면 말해줘.`;
  if (speechLevel === "formal" || respectful) return `${text}\n필요하시면 말씀해 주세요.`;
  return `${text}\n필요하시면 알려 주세요.`;
}

function applyYongEndingToSegment(value: string) {
  const text = String(value || "");
  if (!text.trim()) return text;
  const { body, tail, trailingWhitespace } = splitTrailingTail(text);
  let core = String(body || "").trimEnd();
  if (!core) return text;
  if (hasTerminalPunctuation(tail)) return text;
  if (!/요$/.test(core)) return text;
  core = core.replace(/요$/, "용");
  return `${core}${tail}${trailingWhitespace}`;
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
  const concise = includesAny(`${styleText} ${merged}`, [/간결/, /짧게/, /요약/, /\bconcise\b/i, /\bbrief\b/i]);
  const calm = includesAny(`${styleText} ${merged}`, [/차분/, /침착/, /\bcalm\b/i]);
  const bright = includesAny(`${styleText} ${merged}`, [/밝/, /활기/, /\bbright\b/i, /\benergetic\b/i]);
  const warm = includesAny(`${styleText} ${merged}`, [/친절/, /따뜻/, /공감/, /\bwarm\b/i, /\bfriendly\b/i]);
  const respectful = includesAny(`${styleText} ${merged}`, [/정중/, /예의/, /\brespectful\b/i]);
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
