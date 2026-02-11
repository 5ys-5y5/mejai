import { NextResponse } from "next/server";
import {
  deriveQuickRepliesWithTrace,
  deriveQuickRepliesFromConfig,
  deriveQuickReplyConfig,
  deriveRichMessageHtml,
  type RuntimeQuickReplyConfig,
} from "./ui-responseDecorators";
import { ENABLE_RUNTIME_TIMING, nowIso, type RuntimeTimingStage } from "../runtime/runtimeSupport";
import {
  buildRuntimeResponseSchema,
  extractRuntimeCards,
  type RuntimeResponderPayload,
  validateRuntimeResponseSchema,
} from "./runtimeResponseSchema";
import { buildRenderPlan } from "../policies/renderPolicy";

type RuntimeContextAnyLike = {
  supabase: {
    from: (table: string) => {
      insert: (value: Record<string, any>) => Promise<unknown>;
    };
  };
};

export function createRuntimeResponder(input: {
  runtimeTraceId: string;
  requestStartedAt: number;
  timingStages: RuntimeTimingStage[];
  quickReplyMax: number;
  getRuntimeContextAny: () => RuntimeContextAnyLike | null;
  getCurrentSessionId: () => string | null;
  getLatestTurnId: () => string | null;
  getFirstTurnInSession: () => boolean;
}) {
  const {
    runtimeTraceId,
    requestStartedAt,
    timingStages,
    quickReplyMax,
    getRuntimeContextAny,
    getCurrentSessionId,
    getLatestTurnId,
    getFirstTurnInSession,
  } = input;
  let timingLogged = false;

  return (payload: RuntimeResponderPayload, init?: ResponseInit) => {
    if (ENABLE_RUNTIME_TIMING && !timingLogged) {
      timingLogged = true;
      const responseStatus = init?.status || 200;
      const hasError = Boolean(payload.error);
      const currentSessionId = getCurrentSessionId();
      const latestTurnId = getLatestTurnId();
      const firstTurnInSession = getFirstTurnInSession();
      const RuntimeContextAny = getRuntimeContextAny();
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
      if (RuntimeContextAny && currentSessionId) {
        void (async () => {
          try {
            await RuntimeContextAny.supabase.from("F_audit_events").insert({
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
            });
          } catch (error: unknown) {
            console.warn("[runtime/chat_mk2] failed to insert runtime timing event", {
              trace_id: runtimeTraceId,
              session_id: currentSessionId,
              turn_id: latestTurnId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })();
      }
    }
    const quickReplyConfig: RuntimeQuickReplyConfig | null =
      payload.quick_reply_config && typeof payload.quick_reply_config === "object"
        ? payload.quick_reply_config
        : null;
    const configDerivedQuickReplies = deriveQuickRepliesFromConfig(quickReplyConfig);
    const derivedQuickReplies = deriveQuickRepliesWithTrace(payload.message, quickReplyMax);
    const quickReplies =
      Array.isArray(payload.quick_replies) && payload.quick_replies.length > 0
        ? payload.quick_replies
        : configDerivedQuickReplies.length > 0
          ? configDerivedQuickReplies
          : derivedQuickReplies.quickReplies;
    const resolvedQuickReplyConfig = quickReplyConfig || deriveQuickReplyConfig(payload.message, quickReplies);
    const richMessageHtml = deriveRichMessageHtml(payload.message);
    const cards = extractRuntimeCards(payload);
    const quickReplySource =
      Array.isArray(payload.quick_replies) && payload.quick_replies.length > 0
        ? { type: "explicit" as const, criteria: "payload:quick_replies" }
        : configDerivedQuickReplies.length > 0
          ? {
            type: "config" as const,
            criteria: "payload:quick_reply_config",
            source_function: "deriveQuickRepliesFromConfig",
            source_module: "src/app/api/runtime/chat/presentation/ui-responseDecorators.ts",
          }
          : derivedQuickReplies.quickReplies.length > 0
            ? {
              type: "fallback" as const,
              criteria: derivedQuickReplies.derivation?.criteria,
              source_function: derivedQuickReplies.derivation?.source_function,
              source_module: derivedQuickReplies.derivation?.source_module,
            }
            : { type: "none" as const };
    const RuntimeContextAny = getRuntimeContextAny();
    const currentSessionId = getCurrentSessionId();
    const currentTurnId = getLatestTurnId();
    if (resolvedQuickReplyConfig && RuntimeContextAny && currentSessionId) {
      void (async () => {
        try {
          await RuntimeContextAny.supabase.from("F_audit_events").insert({
            session_id: currentSessionId,
            turn_id: currentTurnId,
            event_type: "QUICK_REPLY_RULE_DECISION",
            payload: {
              quick_reply_config: resolvedQuickReplyConfig,
              quick_reply_count: Array.isArray(quickReplies) ? quickReplies.length : 0,
              quick_reply_source:
                Array.isArray(payload.quick_replies) && payload.quick_replies.length > 0
                  ? { criteria: "payload:quick_replies" }
                  : configDerivedQuickReplies.length > 0
                    ? { criteria: "payload:quick_reply_config", source_function: "deriveQuickRepliesFromConfig" }
                    : derivedQuickReplies.derivation,
            },
            created_at: nowIso(),
            bot_context: { trace_id: runtimeTraceId },
          });
        } catch (error: unknown) {
          console.warn("[runtime/chat_mk2] failed to insert quick reply rule event", {
            trace_id: runtimeTraceId,
            session_id: currentSessionId,
            turn_id: currentTurnId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    }
    const renderPlan = buildRenderPlan({
      message: typeof payload.message === "string" ? payload.message : null,
      quickReplies,
      quickReplyConfig: resolvedQuickReplyConfig || null,
      cards,
      quickReplySource,
    });
    const responseSchema = buildRuntimeResponseSchema({
      message: payload.message,
      quickReplies,
      quickReplyConfig: resolvedQuickReplyConfig || null,
      cards,
      decidedView: renderPlan.view,
      decidedChoiceMode: renderPlan.selection_mode,
      decidedUiTypeId: renderPlan.ui_type_id,
    });
    const schemaValidation = validateRuntimeResponseSchema(responseSchema);
    return NextResponse.json(
      {
        ...payload,
        trace_id: runtimeTraceId,
        turn_id: getLatestTurnId(),
        ...(richMessageHtml ? { rich_message_html: richMessageHtml } : {}),
        ...(quickReplies.length > 0 ? { quick_replies: quickReplies } : {}),
        ...(resolvedQuickReplyConfig ? { quick_reply_config: resolvedQuickReplyConfig } : {}),
        response_schema: responseSchema,
        render_plan: renderPlan,
        ...(schemaValidation.ok ? {} : { response_schema_issues: schemaValidation.issues }),
      },
      init
    );
  };
}


