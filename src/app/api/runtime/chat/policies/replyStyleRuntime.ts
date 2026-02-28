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
  "??,
  ")",
  "]",
  "}",
  ">",
  "\"",
  "'",
  "??,
  "??,
  "??,
  "??,
  "??,
  "??,
  "??,
  "??,
  "??,
  "??,
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
  return /[.!?~??/.test(value);
}

function hasForceEndingYongRule(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  const mustPattern = /(?????????????????)/;
  const yongEndingPattern =
    /(???:???)?\s*["'?쒋????"'?쒋??\s*(?:?쇰줈)?\s*??["'?쒋????"'?쒋??\s*?쇰줈\s*??醫낃껐?대?\s*["'?쒋????"'?쒋??)/;
  return mustPattern.test(normalized) && yongEndingPattern.test(normalized);
}

function extractFieldValues(text: string, keys: string[]) {
  if (!text || keys.length === 0) return [];
  const keyPattern = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(?:^|\\n)\\s*(?:${keyPattern})\\s*[:??\\s*([^\\n\\r]+)`, "gi");
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
    includesAny(source, [/???/, /???o??/, /??????, /\bcasual\b/i, /??????s*??]) &&
    !includesAny(source, [/??????, /????/, /???/])
  ) {
    return "casual";
  }
  if (includesAny(source, [/??????u/, /???/, /????/, /????/, /\bformal\b/i, /\bprofessional\b/i])) {
    return "formal";
  }
  if (includesAny(source, [/?댁슂泥?, /議대뙎留?, /遺?쒕윭??s*留먰닾/, /移쒓렐??s*議대뙎留?])) {
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
  if (/(??$/.test(core)) return line;

  if (speechLevel === "formal") {
    if (/(?댁뿉???덉슂)$/.test(core)) {
      core = core.replace(/(?댁뿉???덉슂)$/, "?낅땲??);
    } else if (/(?쇱슂|?섏슂)$/.test(core)) {
      core = core.replace(/(?쇱슂|?섏슂)$/, "?⑸땲??);
    } else if (/?댁슂$/.test(core)) {
      core = core.replace(/?댁슂$/, "?⑸땲??);
    } else if (/(?듬땲???낅땲???⑸땲???쒕┰?덈떎|????$/.test(core)) {
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
  const alreadyHasTail = /(?꾩??쒕┫|?꾩?以??덈궡?대뱶由??덈궡?좉쾶|?꾩슂?섏떆硫??먰븯?쒕㈃)/.test(text);
  if (alreadyHasTail) return text;
  const lines = normalizeLines(text);
  const lastIndex = findLastNonEmptyLineIndex(lines);
  const lastLine = lastIndex >= 0 ? String(lines[lastIndex] || "").trim() : "";
  if (!lastLine) return text;
  if (/[???$/.test(lastLine)) return text;
  if (/(二쇱꽭??遺???뚮젮|?낅젰???좏깮???뺤씤??\s*[.!?~???$/.test(lastLine)) return text;
  if (lastLine.length < 12) return text;
  if (speechLevel === "casual") return `${text}\n?꾩슂?섎㈃ ???꾩?以꾧쾶.`;
  if (speechLevel === "formal" || respectful) return `${text}\n?꾩슂?섏떆硫??댁뼱???꾩??쒕━寃좎뒿?덈떎.`;
  return `${text}\n?꾩슂?섏떆硫??댁뼱???꾩??쒕┫寃뚯슂.`;
}

function applyYongEndingToSegment(value: string) {
  const text = String(value || "");
  if (!text.trim()) return text;
  const { body, tail, trailingWhitespace } = splitTrailingTail(text);
  let core = String(body || "").trimEnd();
  if (!core) return text;
  if (hasTerminalPunctuation(tail)) return text;
  if (/??/.test(core)) return text;

  const politeConverted =
    core
      .replace(/(?댁슂|?쇱슂|?섏슂|以섏슂|?몄슂|?몄슂|?댁뿉???덉슂)$/, (match) => {
        const mapped = match.replace(/??/, "??);
        return mapped;
      })
      .replace(/([가-??{2,})??/, (match, stem) => {
        if (/(??以묒슂|媛쒖슂|?섏슂|鍮꾩슜|?덉슜)$/.test(stem)) return match;
        return `${stem}??;
      })
      .replace(/([0-9,\s]{1,})??/, (_match, stem) => `${String(stem)}??);

  let next = politeConverted;
  if (next === core) {
    next = core.replace(/(?낅땲???듬땲???쒕┰?덈떎|?⑸땲??$/, (ending) => `${ending}??);
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
  const nuanceFieldValues = extractFieldValues(merged, ["?섏븰??, "nuance"]);
  const attitudeFieldValues = extractFieldValues(merged, ["?쒕룄", "attitude"]);
  const moodFieldValues = extractFieldValues(merged, ["무드", "mood"]);
  const styleText = `${speechFieldValues.join(" ")} ${nuanceFieldValues.join(" ")} ${attitudeFieldValues.join(" ")} ${moodFieldValues.join(" ")}`;
  const forceEndingYong = texts.some((text) => hasForceEndingYongRule(text));
  const speechLevel = resolveSpeechLevel(speechFieldValues, merged);
  const concise = includesAny(`${styleText} ${merged}`, [/????/, /????/, /??????, /\bconcise\b/i, /\bbrief\b/i]);
  const calm = includesAny(`${styleText} ${merged}`, [/????/, /????/, /????/, /\bcalm\b/i, /??????]);
  const bright = includesAny(`${styleText} ${merged}`, [/諛?, /寃쎌풄/, /?쒓린/, /\bbright\b/i, /\benergetic\b/i]);
  const warm = includesAny(`${styleText} ${merged}`, [/?곕쑜/, /移쒖젅/, /?ㅼ젙/, /\bwarm\b/i, /\bfriendly\b/i, /怨듦컧/]);
  const respectful = includesAny(`${styleText} ${merged}`, [/?뺤쨷/, /議댁쨷/, /怨듭넀/, /\brespectful\b/i, /?덉쓽/]);
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