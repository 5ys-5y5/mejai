import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

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

export async function runGemini(messages: ChatMessage[]): Promise<LlmResult> {
  const systemMessage = messages.find((m) => m.role === "system");
  const historyMessages = messages.filter((m) => m.role !== "system" && m.role !== "user"); // Actually last user message should be separated
  // Gemini chat history requires alternating user/model
  // Simplified: use generateContent with all text if strictly one-shot, or startChat

  // Proper Chat implementation:
  const userMessages = messages.filter(m => m.role !== "system");
  const lastUserMsg = userMessages[userMessages.length - 1];
  const history = userMessages.slice(0, -1).map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }));

  const client = getGeminiClient();
  const modelName = pickGeminiModel(lastUserMsg?.content || "");
  const genModel = client.getGenerativeModel({
    model: modelName,
    systemInstruction: systemMessage ? { role: "system", parts: [{ text: systemMessage.content }] } : undefined
  });

  const chat = genModel.startChat({
    history: history as any, // SDK types mismatch sometimes, casting safely
  });

  const result = await chat.sendMessage(lastUserMsg?.content || "");
  const text = result.response.text();
  return { text, model: modelName };
}

export async function runLlm(
  llm: "chatgpt" | "gemini",
  messages: ChatMessage[]
): Promise<LlmResult> {
  const lastMsg = messages[messages.length - 1];
  const userText = lastMsg.role === "user" ? lastMsg.content : "";

  if (llm === "gemini") {
    return runGemini(messages);
  }
  return runOpenAI(messages, userText);
}
