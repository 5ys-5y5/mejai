import { resolveQuickReplyConfig } from "./quickReplyConfigRuntime";

type SupabaseLike = {
  from: (table: string) => {
    select: (...args: unknown[]) => {
      eq: (...args: unknown[]) => { maybeSingle: () => Promise<{ data?: { metadata?: unknown } | null }> };
    };
    update: (...args: unknown[]) => { eq: (...args: unknown[]) => Promise<unknown> };
  };
};

type RuntimeContext = { supabase: SupabaseLike };

type PostActionRuntimeParams = {
  context: RuntimeContext;
  prevBotContext: Record<string, unknown>;
  resolvedIntent: string;
  prevEntity: Record<string, unknown>;
  message: string;
  sessionId: string;
  nextSeq: number;
  mcpActions: string[];
  parseSatisfactionScore: (text: string) => number | null;
  isEndConversationText: (text: string) => boolean;
  isOtherInquiryText: (text: string) => boolean;
  isYesText: (text: string) => boolean;
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, unknown>) => Promise<unknown>;
  respond: (payload: Record<string, unknown>, init?: ResponseInit) => unknown;
};

const SATISFACTION_QUICK_REPLIES = [
  { label: "1점", value: "1" },
  { label: "2점", value: "2" },
  { label: "3점", value: "3" },
  { label: "4점", value: "4" },
  { label: "5점", value: "5" },
];
const POST_ACTION_CHOICE_QUICK_REPLIES = [
  { label: "대화 종료", value: "대화 종료" },
  { label: "다른 문의", value: "다른 문의" },
];

export async function handlePostActionStage(params: PostActionRuntimeParams): Promise<{
  response: unknown | null;
}> {
  const {
    context,
    prevBotContext,
    resolvedIntent,
    prevEntity,
    message,
    sessionId,
    nextSeq,
    mcpActions,
    parseSatisfactionScore,
    isEndConversationText,
    isOtherInquiryText,
    isYesText,
    makeReply,
    insertTurn,
    respond,
  } = params;

  if (prevBotContext.post_action_stage === "awaiting_choice") {
    if (isEndConversationText(message)) {
      const reply = makeReply("상담이 도움이 되었나요? 만족도를 선택해 주세요. (1~5점)");
      const quickReplyConfig = resolveQuickReplyConfig({
        optionsCount: SATISFACTION_QUICK_REPLIES.length,
        minSelectHint: 1,
        maxSelectHint: 1,
        explicitMode: "single",
        criteria: "state:awaiting_satisfaction",
        sourceFunction: "handlePostActionStage",
        sourceModule: "src/app/api/runtime/chat/runtime/postActionRuntime.ts",
        contextText: reply,
      });
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          post_action_stage: "awaiting_satisfaction",
        },
      });
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: mcpActions,
          quick_replies: SATISFACTION_QUICK_REPLIES,
          quick_reply_config: quickReplyConfig,
        }),
      };
    }
    if (isOtherInquiryText(message) || isYesText(message)) {
      const reply = makeReply("좋아요. 다른 문의 내용을 입력해 주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: "general",
          entity: prevEntity,
          post_action_stage: null,
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions }) };
    }
    const reply = makeReply("다음 중 선택해 주세요: 대화 종료 / 다른 문의");
    const quickReplyConfig = resolveQuickReplyConfig({
      optionsCount: POST_ACTION_CHOICE_QUICK_REPLIES.length,
      minSelectHint: 1,
      maxSelectHint: 1,
      explicitMode: "single",
      criteria: "state:awaiting_choice",
      sourceFunction: "handlePostActionStage",
      sourceModule: "src/app/api/runtime/chat/runtime/postActionRuntime.ts",
      contextText: reply,
    });
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: prevEntity,
        post_action_stage: "awaiting_choice",
      },
    });
    return {
      response: respond({
        session_id: sessionId,
        step: "confirm",
        message: reply,
        mcp_actions: mcpActions,
        quick_replies: POST_ACTION_CHOICE_QUICK_REPLIES,
        quick_reply_config: quickReplyConfig,
      }),
    };
  }

  if (prevBotContext.post_action_stage === "awaiting_satisfaction") {
    const score = parseSatisfactionScore(message);
    if (!score) {
      const reply = makeReply("만족도를 1~5 중에서 선택해 주세요. (예: 4)");
      const quickReplyConfig = resolveQuickReplyConfig({
        optionsCount: SATISFACTION_QUICK_REPLIES.length,
        minSelectHint: 1,
        maxSelectHint: 1,
        explicitMode: "single",
        criteria: "state:awaiting_satisfaction_retry",
        sourceFunction: "handlePostActionStage",
        sourceModule: "src/app/api/runtime/chat/runtime/postActionRuntime.ts",
        contextText: reply,
      });
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          post_action_stage: "awaiting_satisfaction",
        },
      });
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: mcpActions,
          quick_replies: SATISFACTION_QUICK_REPLIES,
          quick_reply_config: quickReplyConfig,
        }),
      };
    }

    const { data: currentSessionRow } = await context.supabase
      .from("D_conv_sessions")
      .select("id, metadata")
      .eq("id", sessionId)
      .maybeSingle();
    const currentMeta =
      currentSessionRow && currentSessionRow.metadata && typeof currentSessionRow.metadata === "object"
        ? (currentSessionRow.metadata as Record<string, unknown>)
        : {};
    const baseMeta = { ...currentMeta, csat: { ...(currentMeta.csat as Record<string, unknown> | undefined), score } };
    await context.supabase
      .from("D_conv_sessions")
      .update({ satisfaction: score, ended_at: new Date().toISOString(), metadata: baseMeta })
      .eq("id", sessionId);

    if (score <= 2) {
      const reply = makeReply("불편을 드려 죄송합니다. 개선을 위해 이유를 알려주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          post_action_stage: "awaiting_satisfaction_reason",
          post_action_satisfaction: score,
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions }) };
    }

    const reply = makeReply("소중한 평가 감사합니다. 좋은 하루 되세요!");
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: prevEntity,
        post_action_stage: null,
        conversation_closed: true,
      },
    });
    return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions }) };
  }

  if (prevBotContext.post_action_stage === "awaiting_satisfaction_reason") {
    const reason = String(message || "").trim();
    if (reason.length < 2) {
      const reply = makeReply("이유를 조금 더 자세히 알려주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          post_action_stage: "awaiting_satisfaction_reason",
          post_action_satisfaction: Number(prevBotContext.post_action_satisfaction || 1),
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions }) };
    }
    const { data: currentSessionRow } = await context.supabase
      .from("D_conv_sessions")
      .select("id, metadata")
      .eq("id", sessionId)
      .maybeSingle();
    const currentMeta =
      currentSessionRow && currentSessionRow.metadata && typeof currentSessionRow.metadata === "object"
        ? (currentSessionRow.metadata as Record<string, unknown>)
        : {};
    const priorCsat =
      currentMeta.csat && typeof currentMeta.csat === "object"
        ? (currentMeta.csat as Record<string, unknown>)
        : {};
    const nextMeta = {
      ...currentMeta,
      csat: {
        ...priorCsat,
        reason,
        rated_at: new Date().toISOString(),
      },
    };
    await context.supabase
      .from("D_conv_sessions")
      .update({ metadata: nextMeta, ended_at: new Date().toISOString() })
      .eq("id", sessionId);
    const reply = makeReply("의견 감사합니다. 남겨주신 내용을 바탕으로 개선하겠습니다. 대화를 종료합니다.");
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: prevEntity,
        post_action_stage: null,
        conversation_closed: true,
      },
    });
    return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions }) };
  }

  return { response: null };
}
