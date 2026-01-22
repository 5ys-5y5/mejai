import { model as geminiModel, generateEmbedding as geminiEmbedding } from "./gemini";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// 1. 사용할 모델 타입 정의
export type LLMProvider = "gemini" | "openai" | "claude";

// 2. OpenAI & Claude 클라이언트 초기화 (키가 없을 경우에 대비해 옵셔널 처리)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) 
  : null;

/**
 * 통합 답변 생성 함수
 */
export async function askBrain(
  provider: LLMProvider, 
  query: string, 
  context: string
): Promise<string> {
  const prompt = `
당신은 친절한 AI 상담원 '메제이'입니다. 
아래 제공된 [지식 베이스]의 내용을 바탕으로 고객의 질문에 답변해 주세요.

[지식 베이스]
${context}

[고객 질문]
${query}

[답변 가이드라인]
1. 반드시 지식 베이스에 있는 내용만 답변하세요.
2. 근거가 부족하다면 "죄송합니다만, 해당 부분은 확인이 필요하여 상담원 연결이 필요할 수 있습니다."라고 답변하세요.
3. 유선 전화 상담이므로 구어체(~해요, ~입니다)를 사용하고 친절하게 답변하세요.
`;

  switch (provider) {
    case "gemini":
      const geminiResult = await geminiModel.generateContent(prompt);
      return geminiResult.response.text();

    case "openai":
      if (!openai) throw new Error("OpenAI API 키가 설정되지 않았습니다.");
      const openaiResult = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });
      return openaiResult.choices[0].message.content || "";

    case "claude":
      if (!anthropic) throw new Error("Anthropic API 키가 설정되지 않았습니다.");
      const claudeResult = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });
      return (claudeResult.content[0] as any).text || "";

    default:
      throw new Error("지원하지 않는 AI 공급자입니다.");
  }
}

/**
 * 통합 임베딩 생성 함수 (RAG 검색용)
 * *중요: RAG 검색을 위해서는 지식 저장 시와 검색 시 동일한 모델을 써야 하므로 Gemini로 고정합니다.
 */
export async function getEmbedding(text: string) {
  return await geminiEmbedding(text);
}
