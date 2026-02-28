export type InlineKbSampleItem = {
  id: string;
  title: string;
  content: string;
};

function normalizeTokens(line: string) {
  return line
    .toLowerCase()
    .replace(/[^\w\uAC00-\uD7A3\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function detectPolarity(line: string): "positive" | "negative" | "neutral" {
  const normalized = line.toLowerCase();
  const negative = /(\uBD88\uB9CC|\uBD80\uC815|\uBD80\uC2E0|\uBD88\uD3B8|\uBB38\uC81C|\uC5B4\uB824\uC6C0|\uC548\uB418|\uC624\uB958)/;
  const positive = /(\uAC10\uC0AC|\uB9CC\uC871|\uC88B\uC74C|\uAE0D\uC815|\uC720\uC6A9|\uC778\uC0C1|\uB9CC\uB4E4|\uD1B5\uACFC)/;
  if (negative.test(normalized)) return "negative";
  if (positive.test(normalized)) return "positive";
  return "neutral";
}

function toTopicKey(line: string) {
  const ignore = new Set([
    "\uCD08\uAE30",
    "\uAE30\uBCF8",
    "\uAD6C\uBD84",
    "\uC784\uC2DC",
    "\uC9C4\uD589",
    "\uAD8C\uC7A5",
    "\uC120\uD0DD",
    "\uC644\uB8CC",
    "\uC694\uCCAD",
    "\uACF5\uD1B5",
    "\uC77C\uBC18",
    "\uC815\uBCF4",
    "\uAE30\uD0C0",
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
