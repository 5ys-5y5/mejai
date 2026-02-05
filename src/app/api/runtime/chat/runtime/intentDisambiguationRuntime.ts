type DisambiguationParams = {
  context: any;
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
    context: any,
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

type QuickReplyConfig = {
  selection_mode: "single" | "multi";
  min_select: number;
  max_select: number;
  submit_format: "single" | "csv";
  criteria: string;
  source_function: string;
  source_module: string;
};

function clampSelectionRange(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function resolveIntentDisambiguationQuickReplyConfig(input: {
  options: string[];
  prevBotContext: Record<string, unknown>;
  sourceText: string;
}): QuickReplyConfig {
  const optionsCount = Math.max(1, input.options.length);
  const configuredMinRaw = Number((input.prevBotContext as any).intent_disambiguation_min_select ?? 0);
  const configuredMaxRaw = Number((input.prevBotContext as any).intent_disambiguation_max_select ?? 0);
  const explicitMulti = Boolean((input.prevBotContext as any).intent_disambiguation_multi === true);
  const connectorSignal = /(,|\/|그리고|및|and)/i.test(String(input.sourceText || ""));
  const selectionMode: "single" | "multi" =
    explicitMulti || optionsCount > 1 || connectorSignal ? "multi" : "single";
  const maxSelect =
    configuredMaxRaw > 0 ? clampSelectionRange(configuredMaxRaw, 1, optionsCount) : selectionMode === "multi" ? optionsCount : 1;
  const minSelect =
    configuredMinRaw > 0
      ? clampSelectionRange(configuredMinRaw, 1, maxSelect)
      : selectionMode === "multi"
        ? 1
        : 1;
  return {
    selection_mode: selectionMode,
    min_select: minSelect,
    max_select: maxSelect,
    submit_format: selectionMode === "multi" ? "csv" : "single",
    source_function: "resolveIntentDisambiguationQuickReplyConfig",
    source_module: "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
    criteria: configuredMinRaw > 0 || configuredMaxRaw > 0 || explicitMulti
      ? "bot_context:intent_disambiguation_rules"
      : connectorSignal
        ? "source_text:intent_connector_signal"
        : "policy:ASK_INTENT_DISAMBIGUATION",
  };
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
    const options = Array.isArray((prevBotContext as any).intent_disambiguation_options)
      ? ((prevBotContext as any).intent_disambiguation_options as string[]).map((v) => String(v)).filter(Boolean)
      : [];
    const picked = parseIndexedChoices(message, options.length);
    if (picked.length === 0) {
      const lines = options.map((intent, idx) => `- ${idx + 1}번 | ${intentLabel(intent)}`);
      const reply = makeReply(
        `요청이 모호해서 의도 확인이 필요합니다. 아래에서 선택해 주세요. (복수 선택 가능)\n${lines.join("\n")}\n예: 1,2`
      );
      const quickReplyConfig = resolveIntentDisambiguationQuickReplyConfig({
        options,
        prevBotContext,
        sourceText: intentDisambiguationSourceText || message,
      });
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
    const queuedIntents = Array.isArray((prevBotContext as any).intent_queue)
      ? ((prevBotContext as any).intent_queue as string[]).map((v) => String(v)).filter(Boolean)
      : [];
    if (queuedIntents.length > 0 && (isYesText(message) || /다음|계속/.test(message))) {
      forcedIntentQueue = [queuedIntents[0]];
      pendingIntentQueue = queuedIntents.slice(1);
    }
    const candidates = detectIntentCandidates(message).filter((intent) => intent !== "general");
    if (forcedIntentQueue.length === 0 && hasChoiceAnswerCandidates(candidates.length)) {
      const lines = candidates.map((intent, idx) => `- ${idx + 1}번 | ${intentLabel(intent)}`);
      const reply = makeReply(
        `요청이 모호해서 의도 확인이 필요합니다. 아래에서 선택해 주세요. (복수 선택 가능)\n${lines.join("\n")}\n예: 1,2`
      );
      const quickReplyConfig = resolveIntentDisambiguationQuickReplyConfig({
        options: candidates,
        prevBotContext,
        sourceText: message,
      });
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
