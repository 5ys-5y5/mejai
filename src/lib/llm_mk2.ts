import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type LlmResult = {
  text: string;
  model: string;
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");
  return new OpenAI({ apiKey });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  return new GoogleGenerativeAI(apiKey);
}

function pickOpenAIModel(text: string) {
  const trimmed = text.trim();
  if (trimmed.length > 400 || /정확|복잡|자세|긴/.test(trimmed)) {
    return "gpt-4.1";
  }
  return "gpt-4.1-mini";
}

function pickGeminiModel(text: string) {
  const trimmed = text.trim();
  if (trimmed.length > 400 || /정확|복잡|자세|긴/.test(trimmed)) {
    return "gemini-2.5-pro";
  }
  return "gemini-2.5-flash-lite";
}

export async function runOpenAI(messages: ChatMessage[], userText: string): Promise<LlmResult> {
  const model = pickOpenAIModel(userText);
  const client = getOpenAIClient();
  const res = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.2,
  });
  const text = res.choices?.[0]?.message?.content || "";
  return { text, model };
}

export async function runGemini(systemPrompt: string, userPrompt: string): Promise<LlmResult> {
  const model = pickGeminiModel(userPrompt);
  const client = getGeminiClient();
  const genModel = client.getGenerativeModel({ model });
  const result = await genModel.generateContent([systemPrompt, userPrompt]);
  const text = result.response.text();
  return { text, model };
}

export async function runLlm(
  llm: "chatgpt" | "gemini",
  systemPrompt: string,
  userPrompt: string
): Promise<LlmResult> {
  if (llm === "gemini") {
    return runGemini(systemPrompt, userPrompt);
  }
  return runOpenAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    userPrompt
  );
}
