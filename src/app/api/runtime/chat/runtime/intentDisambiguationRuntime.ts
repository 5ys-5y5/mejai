import { resolveQuickReplyConfig, type RuntimeQuickReplyConfig } from "./quickReplyConfigRuntime";
import { resolveRuntimeTemplate } from "./promptTemplateRuntime";

type DisambiguationParams = {
  context: any;
  sessionId: string;
  nextSeq: number;
  message: string;
  prevIntent: string | null;
  prevEntity: Record<string, any>;
  prevBotContext: Record<string, any>;
  expectedInput: string | null;
  latestTurnId: string | null;
  resolvedIntent: string;
  detectIntentCandidates: (text: string) => string[];
  hasChoiceAnswerCandidates: (count: number) => boolean;
  intentLabel: (intent: string) => string;
  intentSupportScope: (intent: string) => string;
  parseIndexedChoices: (text: string, max: number) => number[];
  isYesText: (text: string) => boolean;
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, any>) => Promise<unknown>;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, any>,
    botContext: Record<string, any>
  ) => Promise<unknown>;
  respond: (payload: Record<string, any>, init?: ResponseInit) => unknown;
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
  intentSupportScope: (intent: string) => string;
  prevBotContext: Record<string, any>;
}) {
  const defaultTitle = "원하시는 문의 유형을 선택해주세요. (번호로 답변)";
  const defaultExample = "예) 1,2";
  const title =
    resolveRuntimeTemplate({
      key: "intent_disambiguation_title",
      botContext: {
        ...(input.prevBotContext || {}),
        template_intent_disambiguation_title: String(
          (input.prevBotContext as Record<string, any>).intent_disambiguation_prompt_title || ""
        ),
      },
    }) || defaultTitle;
  const example =
    resolveRuntimeTemplate({
      key: "intent_disambiguation_example",
      botContext: {
        ...(input.prevBotContext || {}),
        template_intent_disambiguation_example: String(
          (input.prevBotContext as Record<string, any>).intent_disambiguation_prompt_example || ""
        ),
      },
    }) || defaultExample;
  const lines = input.options.map((intent, idx) => {
    const label = input.intentLabel(intent);
    const scope = input.intentSupportScope(intent);
    return `- ${idx + 1}번 | ${label}${scope ? ` | ${scope}` : ""}`;
  });
  return `${title}\n${lines.join("\n")}\n${example}`;
}

function buildIndexedQuickReplies(
  options: string[],
  intentLabel: (intent: string) => string,
  intentSupportScope: (intent: string) => string
) {
  return options.map((intent, idx) => ({
    label: String(idx + 1),
    value: String(idx + 1),
  }));
}

function buildIntentDisambiguationChoiceItems(
  options: string[],
  intentLabel: (intent: string) => string,
  intentSupportScope: (intent: string) => string
) {
  return options.map((intent, idx) => {
    const label = intentLabel(intent);
    const scope = intentSupportScope(intent);
    const fields = [
      { label: "항목", value: label },
      ...(scope ? [{ label: "지원 범위", value: scope }] : []),
    ];
    return {
      value: String(idx + 1),
      label: `${idx + 1}번 | ${label}${scope ? ` | ${scope}` : ""}`,
      title: label,
      description: scope || "",
      fields,
    };
  });
}

function resolveIntentDisambiguationQuickReplyConfig(input: {
  options: string[];
  prevBotContext: Record<string, any>;
  sourceText: string;
}): RuntimeQuickReplyConfig {
  const prevContext = input.prevBotContext as Record<string, any>;
  const configuredMinRaw = Number(prevContext.intent_disambiguation_min_select ?? 0);
  const configuredMaxRaw = Number(prevContext.intent_disambiguation_max_select ?? 0);
  const explicitMode = prevContext.intent_disambiguation_mode;
  const explicitMulti = Boolean(prevContext.intent_disambiguation_multi === true);
  const connectorSignal = /(,|\/|그리고|또는|and)/i.test(String(input.sourceText || ""));
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
    intentSupportScope,
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
    const options = Array.isArray((prevBotContext as Record<string, any>).intent_disambiguation_options)
      ? ((prevBotContext as Record<string, any>).intent_disambiguation_options as string[])
          .map((v) => String(v))
          .filter(Boolean)
      : [];
    const picked = parseIndexedChoices(message, options.length);
    if (picked.length === 0) {
      const reply = makeReply(
        buildIntentDisambiguationPrompt({
          options,
          intentLabel,
          intentSupportScope,
          prevBotContext,
        })
      );
      const quickReplyConfig = resolveIntentDisambiguationQuickReplyConfig({
        options,
        prevBotContext,
        sourceText: intentDisambiguationSourceText || message,
      });
      const quickReplies = buildIndexedQuickReplies(options, intentLabel, intentSupportScope);
      const choiceItems = buildIntentDisambiguationChoiceItems(options, intentLabel, intentSupportScope);
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
          choice_items: choiceItems,
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
    !prevBotContext.reuse_pending &&
    !prevBotContext.phone_reuse_pending
  ) {
    const queuedIntents = Array.isArray((prevBotContext as Record<string, any>).intent_queue)
      ? ((prevBotContext as Record<string, any>).intent_queue as string[])
          .map((v) => String(v))
          .filter(Boolean)
      : [];
    if (queuedIntents.length > 0 && (isYesText(message) || /계속|진행|다음/.test(message))) {
      forcedIntentQueue = [queuedIntents[0]];
      pendingIntentQueue = queuedIntents.slice(1);
    }
    const candidates = detectIntentCandidates(message).filter((intent) => intent !== "general");
    if (forcedIntentQueue.length === 0 && hasChoiceAnswerCandidates(candidates.length)) {
      const reply = makeReply(
        buildIntentDisambiguationPrompt({
          options: candidates,
          intentLabel,
          intentSupportScope,
          prevBotContext,
        })
      );
      const quickReplyConfig = resolveIntentDisambiguationQuickReplyConfig({
        options: candidates,
        prevBotContext,
        sourceText: message,
      });
      const quickReplies = buildIndexedQuickReplies(candidates, intentLabel, intentSupportScope);
      const choiceItems = buildIntentDisambiguationChoiceItems(candidates, intentLabel, intentSupportScope);
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
          choice_items: choiceItems,
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
