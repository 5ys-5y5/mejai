import type { ChatMessage } from "@/lib/llm_mk2";
import type { KbMatchResult } from "./kbMatchRuntime";

type KbSource = {
  id?: string | null;
  title?: string | null;
  content?: string | null;
};

export type KbAnswerability = {
  canAnswer: boolean;
  reason: string;
  evidenceKeys: string[];
};

export type KbAnswerPrompt = {
  messages: ChatMessage[];
  systemPrompt: string;
  userPrompt: string;
  evidenceKeys: string[];
  kbContextSize: number;
  kbContextSource: "full" | "match" | "partial" | "none";
  kbTopics: string[];
};

const MAX_KB_CONTEXT_CHARS = 8000;
const MAX_TOPIC_COUNT = 12;
const SECTION_HEADER_MAX_LEN = 30;
const KEY_MAX_LEN = 40;

function cleanText(value: string) {
  return String(value || "").trim();
}

function isSectionHeader(line: string) {
  const text = cleanText(line);
  if (!text) return false;
  if (text.startsWith("-") || text.startsWith("※")) return false;
  if (text.length > SECTION_HEADER_MAX_LEN) return false;
  if (/\t/.test(text)) return false;
  if (/[.:]/.test(text)) return false;
  if (/[(),]/.test(text) && text.length > 12) return false;
  return true;
}

function pushTopic(topics: string[], seen: Set<string>, raw: string) {
  const topic = cleanText(raw);
  if (!topic) return;
  if (topic.length > KEY_MAX_LEN) return;
  if (seen.has(topic)) return;
  seen.add(topic);
  topics.push(topic);
}

function extractTopicsFromContent(content: string) {
  const topics: string[] = [];
  const seen = new Set<string>();
  const lines = String(content || "").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = cleanText(rawLine);
    if (!line) continue;
    const tabMatch = line.match(/^([^\t]+)\t+(.+)$/);
    if (tabMatch) {
      pushTopic(topics, seen, tabMatch[1]);
      continue;
    }
    const colonMatch = line.match(/^([^:：]+)\s*[:：]\s*(.+)$/);
    if (colonMatch) {
      pushTopic(topics, seen, colonMatch[1]);
      continue;
    }
    const spaceMatch = line.match(/^(.{2,})\s{2,}(.+)$/);
    if (spaceMatch) {
      pushTopic(topics, seen, spaceMatch[1]);
      continue;
    }
    if (isSectionHeader(line)) {
      pushTopic(topics, seen, line);
    }
  }
  return topics;
}

function collectKbTopics(kb: KbSource, adminKbs: KbSource[]) {
  const topics: string[] = [];
  const seen = new Set<string>();
  const primary = extractTopicsFromContent(kb.content || "");
  primary.forEach((topic) => pushTopic(topics, seen, topic));
  adminKbs.forEach((admin) => {
    const adminTopics = extractTopicsFromContent(admin.content || "");
    adminTopics.forEach((topic) => pushTopic(topics, seen, topic));
  });
  return topics.slice(0, MAX_TOPIC_COUNT);
}

function buildCombinedKbText(kb: KbSource, adminKbs: KbSource[]) {
  const blocks: string[] = [];
  const primaryContent = cleanText(kb.content || "");
  if (primaryContent) {
    blocks.push(`# KB: ${cleanText(kb.title || "KB")}\n${primaryContent}`);
  }
  adminKbs.forEach((admin) => {
    const content = cleanText(admin.content || "");
    if (!content) return;
    const title = cleanText(admin.title || "ADMIN KB");
    blocks.push(`# ADMIN KB: ${title}\n${content}`);
  });
  return blocks.join("\n\n");
}

function buildFallbackMessage(topics: string[]) {
  if (topics.length === 0) {
    return "현재 KB에 등록된 정보가 없습니다. KB를 등록한 뒤 다시 문의해주세요.";
  }
  return [
    "KB에 해당 정보가 없습니다.",
    "아래 항목 중 궁금한 내용을 알려주세요.",
    ...topics.map((topic) => `- ${topic}`),
  ].join("\n");
}

function buildKbContext(input: {
  kb: KbSource;
  adminKbs: KbSource[];
  match: KbMatchResult | null;
}) {
  const combined = buildCombinedKbText(input.kb, input.adminKbs);
  const matchBlock =
    input.match && input.match.matched
      ? [
          `Matched key: ${input.match.key}`,
          input.match.section ? `Matched section: ${input.match.section}` : "",
          "Matched content:",
          input.match.answer,
        ]
          .filter(Boolean)
          .join("\n")
      : "";
  if (!combined) {
    return {
      text: matchBlock,
      source: matchBlock ? ("match" as const) : ("none" as const),
      size: matchBlock.length,
    };
  }
  if (combined.length <= MAX_KB_CONTEXT_CHARS) {
    const text = matchBlock ? `${matchBlock}\n\n${combined}` : combined;
    return { text, source: "full" as const, size: text.length };
  }
  if (matchBlock) {
    return { text: matchBlock, source: "match" as const, size: matchBlock.length };
  }
  const text = combined.slice(0, MAX_KB_CONTEXT_CHARS);
  return { text, source: "partial" as const, size: text.length };
}

export function buildKbAnswerPrompt(input: {
  message: string;
  kb: KbSource;
  adminKbs: KbSource[];
  match: KbMatchResult | null;
}): { prompt: KbAnswerPrompt; answerability: KbAnswerability; fallback: string } {
  const message = cleanText(input.message);
  const kbContentPresent =
    Boolean(cleanText(input.kb.content || "")) ||
    input.adminKbs.some((item) => Boolean(cleanText(item.content || "")));
  const evidenceKeys: string[] = [];
  if (input.match && input.match.matched) {
    if (input.match.key) evidenceKeys.push(input.match.key);
    if (input.match.section && input.match.section !== input.match.key) evidenceKeys.push(input.match.section);
  }
  const hasEvidence = evidenceKeys.length > 0;
  const answerability: KbAnswerability = {
    canAnswer: kbContentPresent && hasEvidence,
    reason: kbContentPresent ? (hasEvidence ? "KB_MATCHED" : "KB_NO_MATCH") : "KB_EMPTY",
    evidenceKeys,
  };
  const kbTopics = collectKbTopics(input.kb, input.adminKbs);
  const fallback = buildFallbackMessage(kbTopics);
  const context = buildKbContext({ kb: input.kb, adminKbs: input.adminKbs, match: input.match });
  const systemPrompt = [
    "You are a customer support assistant.",
    "Answer ONLY using the KB context below.",
    "Do not use outside knowledge or assumptions.",
    "If the KB context does not explicitly contain the answer, respond with the fallback message.",
    "Do not invent facts or numbers. Use dates and figures exactly as written in the KB.",
    "Keep the response concise and in the user's language.",
    "KB에 없는 내용은 답하지 말 것. KB 근거가 없으면 fallback을 그대로 사용.",
  ].join("\n");
  const topicLine =
    kbTopics.length > 0 ? `KB topics: ${kbTopics.join(", ")}` : "KB topics: (none)";
  const evidenceLine =
    evidenceKeys.length > 0 ? `Evidence keys: ${evidenceKeys.join(", ")}` : "Evidence keys: (none)";
  const fallbackLine = `Fallback response:\n${fallback}`;
  const userPrompt = [
    `User question: ${message || "-"}`,
    "KB context:",
    context.text || "(none)",
    evidenceLine,
    topicLine,
    fallbackLine,
  ].join("\n");
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return {
    prompt: {
      messages,
      systemPrompt,
      userPrompt,
      evidenceKeys,
      kbContextSize: context.size,
      kbContextSource: context.source,
      kbTopics,
    },
    answerability,
    fallback,
  };
}
