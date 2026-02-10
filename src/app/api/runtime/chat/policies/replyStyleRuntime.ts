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

function splitTailPunctuation(value: string) {
  const match = String(value || "").match(/^([\s\S]*?)([.!?~…]*)$/);
  if (!match) return { body: String(value || ""), punct: "" };
  return { body: match[1] || "", punct: match[2] || "" };
}

function applyCalmPunctuation(value: string) {
  return value.replace(/!+/g, ".").replace(/\?{2,}/g, "?");
}

function applyBrightPunctuation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/[!?~…]$/.test(trimmed)) return trimmed;
  if (/[.]$/.test(trimmed)) return `${trimmed.slice(0, -1)}!`;
  return `${trimmed}!`;
}

function applySpeechEnding(value: string, speechLevel: ReplyStyleDirective["speechLevel"]) {
  if (!speechLevel) return value;
  const text = String(value || "").trim();
  if (!text) return text;
  const { body, punct } = splitTailPunctuation(text);
  let nextBody = body.trim();

  if (speechLevel === "formal") {
    if (/요$/.test(nextBody)) nextBody = nextBody.replace(/요$/, "습니다");
    else if (!/(니다|다|용)$/.test(nextBody)) nextBody = `${nextBody}습니다`;
  } else if (speechLevel === "polite") {
    if (!/(요|니다|용)$/.test(nextBody)) nextBody = `${nextBody}요`;
  } else if (speechLevel === "casual") {
    if (/요$/.test(nextBody) && !/용$/.test(nextBody)) nextBody = nextBody.replace(/요$/, "");
  }

  const nextPunct = punct || ".";
  return `${nextBody}${nextPunct}`;
}

function applyWarmTail(value: string, speechLevel: ReplyStyleDirective["speechLevel"], respectful: boolean) {
  const text = String(value || "").trim();
  if (!text) return text;
  const alreadyHasTail = /(도와드릴|도와줄|안내해드릴|안내할게|필요하시면|원하시면)/.test(text);
  if (alreadyHasTail) return text;
  if (speechLevel === "casual") return `${text}\n필요하면 더 도와줄게.`;
  if (speechLevel === "formal" || respectful) return `${text}\n필요하시면 이어서 도와드리겠습니다.`;
  return `${text}\n필요하시면 이어서 도와드릴게요.`;
}

function applyYongEndingToSegment(value: string) {
  const text = String(value || "");
  if (!text.trim()) return text;
  let out = text;

  // 과거 규칙으로 생성된 중복 접미 정리 (예: "요.용" -> "용.")
  out = out.replace(/요([.!?~…]?)용(?=\s|$)/g, (_match, punct) => `용${punct || ""}`);

  // 해요체 계열: 요를 용으로 교체 (문장 종결부)
  out = out
    .replace(/(해요|돼요|되요|줘요|져요|세요|이에요|예요)([.!?~…]?)(?=\s|$)/g, (match, ending, punct) => {
      if (String(match).includes("용")) return match;
      const mapped = String(ending).replace(/요$/, "용");
      return `${mapped}${punct || ""}`;
    })
    .replace(/([가-힣]{2,})요([.!?~…]?)(?=\s|$)/g, (match, stem, punct) => {
      if (String(match).includes("용")) return match;
      // 명사형(예: 필요) 오변환 방지용 최소 예외
      if (/(필|중요|개요|수요|비용|허용)$/.test(stem)) return match;
      return `${stem}용${punct || ""}`;
    })
    .replace(/([0-9,\s]{1,})요([.!?~…]?)(?=\s|$)/g, (_match, stem, punct) => `${String(stem)}용${punct || ""}`);

  // 합니다체 계열: 문장 종결일 때만 "용" 부여
  out = out.replace(/(입니다|습니다|드립니다|됩니다)([.!?~…]?)(?=\s|$)/g, (match, ending, punct) => {
    if (String(match).includes("용")) return match;
    return `${ending}용${punct || ""}`;
  });

  return out;
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
