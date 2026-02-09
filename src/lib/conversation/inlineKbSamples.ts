export type InlineKbSampleItem = {
  id: string;
  title: string;
  content: string;
};

function normalizeTokens(line: string) {
  return line
    .toLowerCase()
    .replace(/[^\w가-힣\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function detectPolarity(line: string): "positive" | "negative" | "neutral" {
  const normalized = line.toLowerCase();
  const negative = /(금지|불가|안됨|하지\s*마|하지\s*않|제한|제외|차단)/;
  const positive = /(허용|가능|진행|권장|필수|해야|적용|승인)/;
  if (negative.test(normalized)) return "negative";
  if (positive.test(normalized)) return "positive";
  return "neutral";
}

function toTopicKey(line: string) {
  const ignore = new Set([
    "금지",
    "불가",
    "안됨",
    "허용",
    "가능",
    "진행",
    "권장",
    "필수",
    "해야",
    "적용",
    "승인",
    "하지",
    "않",
  ]);
  const terms = normalizeTokens(line).filter((token) => token.length >= 2 && !ignore.has(token));
  return terms.slice(0, 6).join(" ");
}

export function appendInlineKbSample(current: string, sampleContent: string) {
  const nextChunk = sampleContent.trim();
  if (!nextChunk) return current;
  const head = current.trim();
  if (!head) return nextChunk;
  return `${head}\n\n${nextChunk}`;
}

export function hasConflictingInlineKbSamples(sampleContents: string[]) {
  const topicPolarities = new Map<string, Set<"positive" | "negative">>();
  sampleContents.forEach((content) => {
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .forEach((line) => {
        const polarity = detectPolarity(line);
        if (polarity === "neutral") return;
        const key = toTopicKey(line);
        if (!key) return;
        if (!topicPolarities.has(key)) topicPolarities.set(key, new Set());
        topicPolarities.get(key)?.add(polarity);
      });
  });
  for (const set of topicPolarities.values()) {
    if (set.has("positive") && set.has("negative")) return true;
  }
  return false;
}

