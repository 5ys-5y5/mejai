import { mapRuntimeResponseToTranscriptFields, type RuntimeRunResponseLike } from "@/lib/runtimeResponseTranscript";

type RuntimeMessagePayload = RuntimeRunResponseLike & {
  message?: string;
  final_answer?: string;
  answer?: string;
  rich_message_html?: string;
};

export function resolveRuntimeMessageText(input: RuntimeMessagePayload, fallback?: string) {
  const candidate =
    (typeof input.message === "string" && input.message) ||
    (typeof input.final_answer === "string" && input.final_answer) ||
    (typeof input.answer === "string" && input.answer) ||
    (typeof input.response_schema?.message === "string" && input.response_schema.message) ||
    (fallback || "");
  return String(candidate || "").trim();
}

export function buildRuntimeBotMessageFields(input: RuntimeMessagePayload, fallback?: string) {
  const mapped = mapRuntimeResponseToTranscriptFields(input);
  const content = resolveRuntimeMessageText(input, fallback);
  return {
    content,
    richHtml: typeof input.rich_message_html === "string" ? input.rich_message_html : undefined,
    turnId: mapped.turnId,
    responseSchema: mapped.responseSchema,
    responseSchemaIssues:
      mapped.responseSchemaIssues && mapped.responseSchemaIssues.length > 0
        ? mapped.responseSchemaIssues
        : undefined,
    renderPlan: mapped.renderPlan,
    quickReplies: mapped.quickReplies.length > 0 ? mapped.quickReplies : undefined,
    productCards: mapped.productCards.length > 0 ? mapped.productCards : undefined,
  };
}
