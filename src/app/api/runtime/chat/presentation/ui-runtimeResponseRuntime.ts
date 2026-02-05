import { NextResponse } from "next/server";
import { deriveQuickReplies, deriveRichMessageHtml } from "./ui-responseDecorators";
import { ENABLE_RUNTIME_TIMING, nowIso, type RuntimeTimingStage } from "../runtime/runtimeSupport";

export function createRuntimeResponder(input: {
  runtimeTraceId: string;
  requestStartedAt: number;
  timingStages: RuntimeTimingStage[];
  quickReplyMax: number;
  getRuntimeContext: () => any;
  getCurrentSessionId: () => string | null;
  getLatestTurnId: () => string | null;
  getFirstTurnInSession: () => boolean;
}) {
  const {
    runtimeTraceId,
    requestStartedAt,
    timingStages,
    quickReplyMax,
    getRuntimeContext,
    getCurrentSessionId,
    getLatestTurnId,
    getFirstTurnInSession,
  } = input;
  let timingLogged = false;

  return (payload: Record<string, unknown>, init?: ResponseInit) => {
    if (ENABLE_RUNTIME_TIMING && !timingLogged) {
      timingLogged = true;
      const responseStatus = init?.status || 200;
      const hasError = Boolean(payload.error);
      const currentSessionId = getCurrentSessionId();
      const latestTurnId = getLatestTurnId();
      const firstTurnInSession = getFirstTurnInSession();
      const runtimeContext = getRuntimeContext();
      console.info("[runtime/chat/mk2][timing]", {
        trace_id: runtimeTraceId,
        status: responseStatus,
        result: hasError ? "error" : "ok",
        session_id: currentSessionId,
        turn_id: latestTurnId,
        is_first_turn: firstTurnInSession,
        total_ms: Date.now() - requestStartedAt,
        stage_count: timingStages.length,
        stages: timingStages,
      });
      if (runtimeContext && currentSessionId) {
        void runtimeContext.supabase
          .from("F_audit_events")
          .insert({
            session_id: currentSessionId,
            turn_id: latestTurnId,
            event_type: "RUNTIME_TIMING",
            payload: {
              trace_id: runtimeTraceId,
              status: responseStatus,
              result: hasError ? "error" : "ok",
              is_first_turn: firstTurnInSession,
              total_ms: Date.now() - requestStartedAt,
              stages: timingStages,
            },
            created_at: nowIso(),
            bot_context: { trace_id: runtimeTraceId },
          })
          .catch((error: unknown) => {
            console.warn("[runtime/chat_mk2] failed to insert runtime timing event", {
              trace_id: runtimeTraceId,
              session_id: currentSessionId,
              turn_id: latestTurnId,
              error: error instanceof Error ? error.message : String(error),
            });
          });
      }
    }
    const quickReplies =
      Array.isArray(payload.quick_replies) && payload.quick_replies.length > 0
        ? payload.quick_replies
        : deriveQuickReplies(payload.message, quickReplyMax);
    const richMessageHtml = deriveRichMessageHtml(payload.message);
    return NextResponse.json(
      {
        ...payload,
        trace_id: runtimeTraceId,
        turn_id: getLatestTurnId(),
        ...(richMessageHtml ? { rich_message_html: richMessageHtml } : {}),
        ...(quickReplies.length > 0 ? { quick_replies: quickReplies } : {}),
      },
      init
    );
  };
}
