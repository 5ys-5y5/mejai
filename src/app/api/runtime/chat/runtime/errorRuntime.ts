export async function handleRuntimeError(input: Record<string, unknown>) {
  const {
    err,
    debugEnabled,
    buildFailedPayload,
    auditIntent,
    auditEntity,
    auditConversationMode,
    runtimeContext,
    currentSessionId,
    latestTurnId,
    insertEvent,
    getRecentTurns,
    lastDebugPrefixJson,
    buildDebugPrefixJson,
    insertFinalTurn,
    auditMessage,
    respond,
  } = input;

  if (debugEnabled) {
    console.error("[runtime/chat/mk2] unhandled error", err);
  }
  const errorMessage = err instanceof Error ? err.message : "INTERNAL_ERROR";
  const fallback = "처리 중 오류가 발생했습니다. 같은 내용을 한 번 더 보내주세요.";
  const failed = buildFailedPayload({
    code: "INTERNAL_ERROR",
    summary: errorMessage || "INTERNAL_ERROR",
    intent: auditIntent || undefined,
    stage: "runtime.chat.post",
    retryable: true,
    detail: debugEnabled && err instanceof Error ? { stack: err.stack || null } : undefined,
  });

  let nextLatestTurnId = latestTurnId;

  if (runtimeContext && currentSessionId) {
    const errorBotContext = {
      intent_name: auditIntent || "general",
      entity: auditEntity || {},
      mode: auditConversationMode || "mk2",
    };
    await insertEvent(
      runtimeContext,
      currentSessionId,
      nextLatestTurnId,
      "UNHANDLED_ERROR_CAUGHT",
      {
        code: "INTERNAL_ERROR",
        summary: errorMessage || "INTERNAL_ERROR",
        stage: "runtime.chat.post",
        has_previous_turn_id: Boolean(nextLatestTurnId),
      },
      errorBotContext
    );

    let fallbackTurnId: string | null = nextLatestTurnId;
    try {
      const recentRes = await getRecentTurns(runtimeContext, currentSessionId, 1);
      const recentTurns = (recentRes.data || []) as Array<{ seq?: number }>;
      const fallbackSeq = (recentTurns[0]?.seq ? Number(recentTurns[0].seq) : 0) + 1;
      const fallbackPrefixJson =
        lastDebugPrefixJson ||
        buildDebugPrefixJson({
          llmModel: null,
          mcpTools: [],
          mcpProviders: [],
          mcpLastFunction: "NO_TOOL_CALLED:ERROR_PATH",
          mcpLastStatus: "error",
          mcpLastError: errorMessage || "INTERNAL_ERROR",
          mcpLastCount: null,
          mcpLogs: [`unhandled_error: ${errorMessage || "INTERNAL_ERROR"}`],
          providerAvailable: [],
          conversationMode: auditConversationMode || "mk2",
        });
      const fallbackTurnRes = await insertFinalTurn(
        runtimeContext,
        {
          session_id: currentSessionId,
          seq: fallbackSeq,
          transcript_text: auditMessage || "",
          answer_text: fallback,
          final_answer: fallback,
          failed,
          bot_context: {
            intent_name: auditIntent || "general",
            entity: auditEntity || {},
            mcp_actions: [],
            error_code: "INTERNAL_ERROR",
            error_stage: "runtime.chat.post",
          },
        },
        fallbackPrefixJson
      );
      if (fallbackTurnRes?.data?.id) {
        fallbackTurnId = String(fallbackTurnRes.data.id);
        nextLatestTurnId = fallbackTurnId;
      }
    } catch (persistError) {
      console.warn("[runtime/chat_mk2] failed to persist fallback error turn", {
        session_id: currentSessionId,
        turn_id: nextLatestTurnId,
        error: persistError instanceof Error ? persistError.message : String(persistError),
      });
    }

    await insertEvent(
      runtimeContext,
      currentSessionId,
      fallbackTurnId,
      "FINAL_ANSWER_READY",
      { answer: fallback, model: "deterministic_error_fallback", failed },
      errorBotContext
    );
  }

  return {
    response: respond({
      session_id: currentSessionId || null,
      step: "final",
      message: fallback,
      mcp_actions: [],
      error: "INTERNAL_ERROR",
      detail: debugEnabled ? { message: errorMessage, stack: err instanceof Error ? err.stack : null } : undefined,
    }),
    latestTurnId: nextLatestTurnId,
  };
}
