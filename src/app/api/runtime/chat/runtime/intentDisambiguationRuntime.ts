import { resolveQuickReplyConfig, type RuntimeQuickReplyConfig } from "./quickReplyConfigRuntime";
import { resolveRuntimeTemplate } from "./promptTemplateRuntime";

type DisambiguationParams = {
  context: unknown;
  sessionId: string;
  nextSeq: number;
  message: string;
  prevIntent: string | null;
  prevEntity: Record<string, unknown>;
  prevBotContext: Record<string, unknown>;
  expectedInput: string | null;
  latestTurnId: string | null;
  resolvedIntent: string;
  detectIntentCandidates: (text: string) => string[];
  hasChoiceAnswerCandidates: (count: number) => boolean;
  intentLabel: (intent: string) => string;
  parseIndexedChoices: (text: string, max: number) => number[];
  isYesText: (text: string) => boolean;
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, unknown>) => Promise<unknown>;
  insertEvent: (
    context: unknown,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  respond: (payload: Record<string, unknown>, init?: ResponseInit) => unknown;
};

type DisambiguationResult = {
  forcedIntentQueue: string[];
  pendingIntentQueue: string[];
  disambiguationSelection: number[];
  intentDisambiguationSourceText: string;
  effectiveMessageForIntent: string;
  response: unknown | null;
};

function buildIntentDisambiguationPrompt(input: {
  options: string[];
  intentLabel: (intent: string) => string;
  prevBotContext: Record<string, unknown>;
}) {
  const defaultTitle = "요청이 모호해서 의도 확인이 필요합니다. 아래에서 선택해 주세요. (복수 선택 가능)";
  const defaultExample = "예: 1,2";
  const title = resolveRuntimeTemplate({
    key: "intent_disambiguation_title",
    botContext: {
      ...(input.prevBotContext || {}),
      template_intent_disambiguation_title: String(
        (input.prevBotContext as Record<string, unknown>).intent_disambiguation_prompt_title || ""
      ),
    },
  }) || defaultTitle;
  const example = resolveRuntimeTemplate({
    key: "intent_disambiguation_example",
    botContext: {
      ...(input.prevBotContext || {}),
      template_intent_disambiguation_example: String(
        (input.prevBotContext as Record<string, unknown>).intent_disambiguation_prompt_example || ""
      ),
    },
  }) || defaultExample;
  const lines = input.options.map((intent, idx) => `- ${idx + 1}번 | ${input.intentLabel(intent)}`);
  return `${title}\n${lines.join("\n")}\n${example}`;
}

function buildIndexedQuickReplies(options: string[], intentLabel: (intent: string) => string) {
  return options.map((intent, idx) => ({
    label: `${idx + 1}번 | ${intentLabel(intent)}`,
    value: String(idx + 1),
  }));
}

function resolveIntentDisambiguationQuickReplyConfig(input: {
  options: string[];
  prevBotContext: Record<string, unknown>;
  sourceText: string;
}): RuntimeQuickReplyConfig {
  const prevContext = input.prevBotContext as Record<string, unknown>;
  const configuredMinRaw = Number(prevContext.intent_disambiguation_min_select ?? 0);
  const configuredMaxRaw = Number(prevContext.intent_disambiguation_max_select ?? 0);
  const explicitMode = prevContext.intent_disambiguation_mode;
  const explicitMulti = Boolean(prevContext.intent_disambiguation_multi === true);
  const connectorSignal = /(,|\/|그리고|및|and)/i.test(String(input.sourceText || ""));
  return resolveQuickReplyConfig({
    optionsCount: input.options.length,
    minSelectHint: configuredMinRaw,
    maxSelectHint: configuredMaxRaw,
    explicitMode:
      explicitMode === "single" || explicitMode === "multi"
        ? explicitMode
        : explicitMulti
          ? "multi"
          : null,
    criteria:
      configuredMinRaw > 0 || configuredMaxRaw > 0 || explicitMode === "single" || explicitMode === "multi" || explicitMulti
        ? "bot_context:intent_disambiguation_rules"
        : connectorSignal
          ? "source_text:intent_connector_signal"
          : "policy:ASK_INTENT_DISAMBIGUATION",
    sourceFunction: "resolveIntentDisambiguationQuickReplyConfig",
    sourceModule: "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
    contextText: input.sourceText,
  });
}

export async function resolveIntentDisambiguation(params: DisambiguationParams): Promise<DisambiguationResult> {
  const {
    context,
    sessionId,
    nextSeq,
    message,
    prevIntent,
    prevEntity,
    prevBotContext,
    expectedInput,
    latestTurnId,
    resolvedIntent,
    detectIntentCandidates,
    hasChoiceAnswerCandidates,
    intentLabel,
    parseIndexedChoices,
    isYesText,
    makeReply,
    insertTurn,
    insertEvent,
    respond,
  } = params;

  let forcedIntentQueue: string[] = [];
  let pendingIntentQueue: string[] = [];
  let disambiguationSelection: number[] = [];
  const intentDisambiguationSourceText =
    typeof prevBotContext.intent_disambiguation_source_text === "string"
      ? String(prevBotContext.intent_disambiguation_source_text)
      : "";
  let effectiveMessageForIntent = message;

  if (prevBotContext.intent_disambiguation_pending) {
    const options = Array.isArray((prevBotContext as Record<string, unknown>).intent_disambiguation_options)
      ? ((prevBotContext as Record<string, unknown>).intent_disambiguation_options as string[])
          .map((v) => String(v))
          .filter(Boolean)
      : [];
    const picked = parseIndexedChoices(message, options.length);
    if (picked.length === 0) {
      const reply = makeReply(
        buildIntentDisambiguationPrompt({
          options,
          intentLabel,
          prevBotContext,
        })
      );
      const quickReplyConfig = resolveIntentDisambiguationQuickReplyConfig({
        options,
        prevBotContext,
        sourceText: intentDisambiguationSourceText || message,
      });
      const quickReplies = buildIndexedQuickReplies(options, intentLabel);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: prevIntent || "general",
          entity: prevEntity,
          intent_disambiguation_pending: true,
          intent_disambiguation_options: options,
          intent_disambiguation_source_text: intentDisambiguationSourceText || null,
        },
      });
      return {
        forcedIntentQueue,
        pendingIntentQueue,
        disambiguationSelection,
        intentDisambiguationSourceText,
        effectiveMessageForIntent,
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: quickReplies,
          quick_reply_config: quickReplyConfig,
        }),
      };
    }
    disambiguationSelection = picked;
    forcedIntentQueue = picked.map((idx) => options[idx - 1]).filter(Boolean);
    pendingIntentQueue = forcedIntentQueue.slice(1);
    const isSelectionOnlyText = /^[\d\s,./-]+$/.test(String(message || "").trim());
    if (isSelectionOnlyText && intentDisambiguationSourceText) {
      effectiveMessageForIntent = intentDisambiguationSourceText;
    }
  } else if (
    expectedInput === null &&
    !prevBotContext.restock_pending &&
    !prevBotContext.phone_reuse_pending
  ) {
    const queuedIntents = Array.isArray((prevBotContext as Record<string, unknown>).intent_queue)
      ? ((prevBotContext as Record<string, unknown>).intent_queue as string[])
          .map((v) => String(v))
          .filter(Boolean)
      : [];
    if (queuedIntents.length > 0 && (isYesText(message) || /다음|계속/.test(message))) {
      forcedIntentQueue = [queuedIntents[0]];
      pendingIntentQueue = queuedIntents.slice(1);
    }
    const candidates = detectIntentCandidates(message).filter((intent) => intent !== "general");
    if (forcedIntentQueue.length === 0 && hasChoiceAnswerCandidates(candidates.length)) {
      const reply = makeReply(
        buildIntentDisambiguationPrompt({
          options: candidates,
          intentLabel,
          prevBotContext,
        })
      );
      const quickReplyConfig = resolveIntentDisambiguationQuickReplyConfig({
        options: candidates,
        prevBotContext,
        sourceText: message,
      });
      const quickReplies = buildIndexedQuickReplies(candidates, intentLabel);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: "general",
          entity: prevEntity,
          intent_disambiguation_pending: true,
          intent_disambiguation_options: candidates,
          intent_disambiguation_source_text: message,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        { stage: "input", action: "ASK_INTENT_DISAMBIGUATION", options: candidates },
        { intent_name: "general" }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_intent_disambiguation", quick_reply_config: quickReplyConfig },
        { intent_name: "general" }
      );
      return {
        forcedIntentQueue,
        pendingIntentQueue,
        disambiguationSelection,
        intentDisambiguationSourceText,
        effectiveMessageForIntent,
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: quickReplies,
          quick_reply_config: quickReplyConfig,
        }),
      };
    }
  }

  if (disambiguationSelection.length > 0) {
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "POLICY_DECISION",
      {
        stage: "input",
        action: "INTENT_DISAMBIGUATION_SELECTED",
        selected_indexes: disambiguationSelection,
        selected_intents: forcedIntentQueue,
        source_text_present: Boolean(intentDisambiguationSourceText),
        source_text_used: effectiveMessageForIntent !== message,
      },
      { intent_name: forcedIntentQueue[0] || resolvedIntent }
    );
  }

  return {
    forcedIntentQueue,
    pendingIntentQueue,
    disambiguationSelection,
    intentDisambiguationSourceText,
    effectiveMessageForIntent,
    response: null,
  };
}
