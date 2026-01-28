import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  return new OpenAI({ apiKey });
}

export async function createEmbedding(input: string) {
  const client = getOpenAIClient();
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });
  const embedding = res.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("EMBEDDING_FAILED");
  }
  return { embedding, model: EMBEDDING_MODEL };
}
