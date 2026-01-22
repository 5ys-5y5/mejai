import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// 1. 텍스트 생성용 모델 (Gemini 2.0 Flash - 빠르고 정확함)
export const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// 2. 텍스트 벡터화용 모델 (임베딩 - RAG 필수)
export const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * 텍스트를 벡터 데이터로 변환 (RAG 검색용)
 */
export async function generateEmbedding(text: string) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

/**
 * 지식 베이스 근거를 바탕으로 답변 생성
 */
export async function generateAnswer(query: string, context: string) {
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

  const result = await model.generateContent(prompt);
  return result.response.text();
}
