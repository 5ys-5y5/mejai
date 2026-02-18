import { NextResponse } from "next/server";
import {
  deriveQuickRepliesWithTrace,
  deriveQuickRepliesFromChoiceItems,
  deriveQuickRepliesFromConfig,
  deriveQuickReplyConfig,
  deriveRichMessageHtml,
  type RuntimeChoiceItem,
  type RuntimeQuickReplyConfig,
} from "./ui-responseDecorators";
import { ENABLE_RUNTIME_TIMING, nowIso, type RuntimeTimingStage } from "../runtime/runtimeSupport";
import {
  buildRuntimeResponseSchema,
  extractRuntimeChoiceItems,
  extractRuntimeCards,
  type RuntimeCard,
  type RuntimeResponderPayload,
  validateRuntimeResponseSchema,
} from "./runtimeResponseSchema";
import { buildRenderPlan } from "../policies/renderPolicy";
import type { RuntimeContext } from "../shared/runtimeTypes";

type RuntimeContextAnyLike = RuntimeContext;

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

  function buildCardsFromChoiceItems(items: RuntimeChoiceItem[]): RuntimeCard[] {
    if (!Array.isArray(items) || items.length === 0) return [];
    return items
      .filter((item) => String(item.image_url || "").trim() !== "")
      .map((item) => {
        const fields = Array.isArray(item.fields)
          ? item.fields
              .map((field) => `${String(field.label || "").trim()}: ${String(field.value || "").trim()}`)
              .filter((line) => line.trim() !== "")
          : [];
        const description =
          String(item.description || "").trim() || (fields.length > 0 ? fields.join("\n") : "");
        return {
          id: String(item.value || ""),
          title: String(item.title || item.label || ""),
          subtitle: String(item.subtitle || ""),
          description,
          image_url: item.image_url || null,
          value: String(item.value || ""),
        };
      });
  }

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
    const choiceItems = extractRuntimeChoiceItems(payload);
    const choiceDerivedQuickReplies = deriveQuickRepliesFromChoiceItems(choiceItems, quickReplyMax);
    const explicitQuickReplies = Array.isArray(payload.quick_replies) ? payload.quick_replies : [];
    const quickReplies =
      explicitQuickReplies.length > 0
        ? explicitQuickReplies
        : choiceDerivedQuickReplies.length > 0
          ? choiceDerivedQuickReplies
          : configDerivedQuickReplies.length > 0
            ? configDerivedQuickReplies
            : derivedQuickReplies.quickReplies;
    const resolvedQuickReplyConfig = quickReplyConfig || deriveQuickReplyConfig(payload.message, quickReplies);
    const richMessageHtml = deriveRichMessageHtml(payload.message);
    const explicitCards = extractRuntimeCards(payload);
    const choiceCards = buildCardsFromChoiceItems(choiceItems);
    const cards = explicitCards.length > 0 ? explicitCards : choiceCards;
    const quickReplySource =
      explicitQuickReplies.length > 0
        ? { type: "explicit" as const, criteria: "payload:quick_replies" }
        : choiceDerivedQuickReplies.length > 0
          ? {
            type: "explicit" as const,
            criteria: "payload:choice_items",
            source_function: "deriveQuickRepliesFromChoiceItems",
            source_module: "src/app/api/runtime/chat/presentation/ui-responseDecorators.ts",
          }
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
      choiceItems,
      decidedView: renderPlan.view,
      decidedChoiceMode: renderPlan.selection_mode,
      decidedUiTypeId: renderPlan.ui_type_id,
    });
    const schemaValidation = validateRuntimeResponseSchema(responseSchema);
    if (RuntimeContextAny && currentTurnId) {
      void (async () => {
        try {
          const { data } = await RuntimeContextAny.supabase
            .from("D_conv_turns")
            .select("bot_context")
            .eq("id", currentTurnId)
            .maybeSingle();
          const currentBotContext =
            data?.bot_context && typeof data.bot_context === "object" ? (data.bot_context as Record<string, any>) : {};
          await RuntimeContextAny.supabase
            .from("D_conv_turns")
            .update({
              bot_context: {
                ...currentBotContext,
                response_schema: responseSchema,
                render_plan: renderPlan,
                response_schema_issues: schemaValidation.ok ? null : schemaValidation.issues,
              },
            })
            .eq("id", currentTurnId);
        } catch (error: unknown) {
          console.warn("[runtime/chat_mk2] failed to persist response schema", {
            trace_id: runtimeTraceId,
            session_id: currentSessionId,
            turn_id: currentTurnId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    }
    return NextResponse.json(
      {
        ...payload,
        trace_id: runtimeTraceId,
        turn_id: getLatestTurnId(),
        ...(richMessageHtml ? { rich_message_html: richMessageHtml } : {}),
        ...(quickReplies.length > 0 ? { quick_replies: quickReplies } : {}),
        ...(resolvedQuickReplyConfig ? { quick_reply_config: resolvedQuickReplyConfig } : {}),
        ...(choiceItems.length > 0 ? { choice_items: choiceItems } : {}),
        response_schema: responseSchema,
        render_plan: renderPlan,
        ...(schemaValidation.ok ? {} : { response_schema_issues: schemaValidation.issues }),
      },
      init
    );
  };
}


