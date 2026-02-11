import { YES_NO_QUICK_REPLIES, resolveQuickReplyConfig } from "../runtime/quickReplyConfigRuntime";
import { toLeadDayQuickReplies } from "../policies/intentSlotPolicy";
import { generateAlternativeRestockConsentQuestion } from "../policies/restockResponsePolicy";
import { saveRestockSubscriptionLite } from "../services/restockSubscriptionRuntime";
import {
  buildNumberedChoicePrompt,
  buildRestockLeadDaysPrompt,
  buildYesNoConfirmationPrompt,
} from "../runtime/promptTemplateRuntime";
type HandleRestockIntentInput = Record<string, any>;
type RestockCandidateRow = {
  index: number;
  product_id?: string | null;
  product_name?: string | null;
  month?: number | string | null;
  day?: number | string | null;
  raw_date?: string | null;
  thumbnail_url?: string | null;
};

export async function handleRestockIntent(input: HandleRestockIntentInput): Promise<Response | null> {
  const {
    resolvedIntent,
    kb,
    adminKbs,
    prevBotContext,
    message,
    effectiveMessageForIntent,
    productDecisionRes,
    customerVerificationToken,
    mcpActions,
    context,
    sessionId,
    latestTurnId,
    policyContext,
    nextSeq,
    insertTurn,
    insertEvent,
    respond,
    makeReply,
    parseRestockEntriesFromContent,
    parseIndexedChoice,
    toRestockDueText,
    buildRestockFinalAnswerWithChoices,
    rankRestockEntries,
    normalizeKoreanQueryToken,
    normalizeKoreanMatchText,
    stripRestockNoise,
    hasChoiceAnswerCandidates,
    CHAT_PRINCIPLES,
    canUseTool,
    hasAllowedToolName,
    callMcpTool,
    noteMcp,
    toolResults,
    readProductShape,
    findBestRestockEntryByProductName,
    hasUniqueAnswerCandidate,
    buildFailedPayload,
    availableRestockLeadDays,
    normalizePhoneDigits,
    restockSubscribeAcceptedThisTurn,
    lockIntentToRestockSubscribe,
    allowedTools,
    providerConfig,
    extractRestockChannel,
    allowRestockLite,
  } = input;

  const normalizeKoreanMatch = normalizeKoreanMatchText as (value: string) => string;
  const toRestockDue = toRestockDueText as (month: number, day: number) => {
    diffDays: number;
    dday?: string;
    targetText?: string;
  };
  const parseIndexedChoiceSafe = parseIndexedChoice as (text: string) => number | null;
  const messageText = typeof message === "string" ? message : String(message ?? "");
  const prevBotContextRecord = (prevBotContext || {}) as Record<string, unknown>;
  const normalizeNameKey = (value: string) => normalizeKoreanMatch(value).replace(/\s+/g, "");
  const isNameMatch = (left: string, right: string) => {
    const a = normalizeNameKey(left || "");
    const b = normalizeNameKey(right || "");
    return Boolean(a && b && a === b);
  };
  const isSchedulableEntry = (month: number, day: number) => {
    const due = toRestockDue(Number(month || 0), Number(day || 0));
    return Number.isFinite(due.diffDays) && due.diffDays >= 0;
  };
  const filterSchedulableEntries = (items: Array<RestockCandidateRow>) =>
    (Array.isArray(items) ? items : []).filter((item) => isSchedulableEntry(Number(item.month || 0), Number(item.day || 0)));
  const reindexCandidateRows = (rows: Array<RestockCandidateRow>) =>
    rows.map((row, idx) => ({ ...row, index: idx + 1 }));
  const noSchedulableScheduleReply = "안내 가능한 재입고 일정이 없습니다. 미래 입고 예정 상품만 안내할 수 있습니다.";

  // Handle pending restock product choice even if current turn intent is misclassified (e.g. "1" -> general).
  const prevRestockCandidatesForAnyIntentRaw = Array.isArray(prevBotContextRecord.restock_candidates)
    ? (prevBotContextRecord.restock_candidates as Array<RestockCandidateRow>)
    : [];
  const prevRestockCandidatesForAnyIntent = reindexCandidateRows(
    filterSchedulableEntries(prevRestockCandidatesForAnyIntentRaw)
  );
  const pickedIndexForAnyIntent = parseIndexedChoiceSafe(messageText);
  const pickedFromPrevForAnyIntent =
    Boolean(prevBotContextRecord.restock_pending) &&
      prevBotContextRecord.restock_stage === "awaiting_product_choice" &&
      pickedIndexForAnyIntent &&
      prevRestockCandidatesForAnyIntent.length >= pickedIndexForAnyIntent
      ? prevRestockCandidatesForAnyIntent[pickedIndexForAnyIntent - 1]
      : null;
  if (pickedFromPrevForAnyIntent) {
    const productId = String(pickedFromPrevForAnyIntent.product_id || "").trim();
    const productName = String(pickedFromPrevForAnyIntent.product_name || "").trim();
    const month = Number(pickedFromPrevForAnyIntent.month || 0);
    const day = Number(pickedFromPrevForAnyIntent.day || 0);
    if (productName && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const due = toRestockDue(month, day);
      const reply = makeReply(buildRestockFinalAnswerWithChoices(productName, due));
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: "restock_inquiry",
          entity: policyContext.entity,
          restock_pending: true,
          restock_stage: "awaiting_subscribe_suggestion",
          pending_product_id: productId || null,
          pending_product_name: productName || null,
          pending_channel: "sms",
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        { stage: "tool", action: "RESTOCK_SCHEDULE_ANSWERED_BY_KB_CHOICE", product_name: productName },
        { intent_name: "restock_inquiry" }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_restock_kb" },
        { intent_name: "restock_inquiry" }
      );
      const quickReplyConfig = resolveQuickReplyConfig({
        optionsCount: 2,
        minSelectHint: 1,
        maxSelectHint: 1,
        explicitMode: "single",
        criteria: "restock:kb_schedule_followup_choice",
        sourceFunction: "handleRestockIntent",
        sourceModule: "src/app/api/runtime/chat/handlers/restockHandler.ts",
        contextText: reply,
      });
      return respond({
        session_id: sessionId,
        step: "final",
        message: reply,
        mcp_actions: mcpActions,
        quick_replies: [
          { label: "재입고 알림 신청", value: "네" },
          { label: "대화 종료", value: "대화 종료" },
        ],
        quick_reply_config: quickReplyConfig,
        product_cards: [],
      });
    }
  }

  if (resolvedIntent === "restock_inquiry" || resolvedIntent === "restock_subscribe") {
    const restockKbEntriesRaw = [
      ...parseRestockEntriesFromContent(String(kb.content || ""), `kb:${kb.id}`),
      ...adminKbs.flatMap((item: { id?: unknown; content?: unknown }) =>
        parseRestockEntriesFromContent(String(item.content || ""), `admin_kb:${item.id}`)
      ),
    ];
    const prevRestockCandidatesRaw = Array.isArray(prevBotContextRecord.restock_candidates)
      ? (prevBotContextRecord.restock_candidates as Array<RestockCandidateRow>)
      : [];
    const prevRestockCandidates = reindexCandidateRows(filterSchedulableEntries(prevRestockCandidatesRaw));
    const pickedIndex = parseIndexedChoiceSafe(messageText);
    const pickedFromPrev =
      pickedIndex && prevRestockCandidates.length >= pickedIndex
        ? prevRestockCandidates[pickedIndex - 1]
        : null;
    if (pickedFromPrev) {
      const productId = String(pickedFromPrev.product_id || "").trim();
      const productName = String(pickedFromPrev.product_name || "").trim();
      const month = Number(pickedFromPrev.month || 0);
      const day = Number(pickedFromPrev.day || 0);
      if (productName && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const due = toRestockDue(month, day);
        const reply = makeReply(buildRestockFinalAnswerWithChoices(productName, due));
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            restock_pending: true,
            restock_stage: "awaiting_subscribe_suggestion",
            pending_product_id: productId || null,
            pending_product_name: productName || null,
            pending_channel: "sms",
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          { stage: "tool", action: "RESTOCK_SCHEDULE_ANSWERED_BY_KB_CHOICE", product_name: productName },
          { intent_name: resolvedIntent }
        );
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          { answer: reply, model: "deterministic_restock_kb" },
          { intent_name: resolvedIntent }
        );
        const quickReplyConfig = resolveQuickReplyConfig({
          optionsCount: 2,
          minSelectHint: 1,
          maxSelectHint: 1,
          explicitMode: "single",
          criteria: "restock:kb_schedule_followup_choice",
          sourceFunction: "handleRestockIntent",
          sourceModule: "src/app/api/runtime/chat/handlers/restockHandler.ts",
          contextText: reply,
        });
        return respond({
          session_id: sessionId,
          step: "final",
          message: reply,
          mcp_actions: mcpActions,
          quick_replies: [
            { label: "재입고 알림 신청", value: "네" },
            { label: "대화 종료", value: "대화 종료" },
          ],
          quick_reply_config: quickReplyConfig,
          product_cards: [],
        });
      }
    }

    const pendingProductId = String(prevBotContextRecord.pending_product_id || "").trim();
    const pendingProductName = String(prevBotContextRecord.pending_product_name || "").trim();
    const pendingChannel = String(prevBotContextRecord.pending_channel || "").trim();
    const restockQueryText =
      resolvedIntent === "restock_inquiry" || resolvedIntent === "restock_subscribe"
        ? effectiveMessageForIntent
        : message;
    let restockProductId =
      String(productDecisionRes.decision?.product_id || "").trim() ||
      pendingProductId ||
      "";
    const restockChannel = extractRestockChannel(message) || pendingChannel || "sms";
    const rankedFromMessage = rankRestockEntries(restockQueryText, restockKbEntriesRaw);
    const rankedFromMessageSchedulable = rankedFromMessage.filter((row: { entry?: { month?: unknown; day?: unknown } }) => {
      const entry = row.entry;
      return isSchedulableEntry(Number(entry?.month || 0), Number(entry?.day || 0));
    });
    const queryCoreNoSpace = normalizeKoreanQueryToken(stripRestockNoise(restockQueryText)).replace(/\s+/g, "");
    const kbMatchFromQuery = rankedFromMessageSchedulable.length > 0 ? rankedFromMessageSchedulable[0].entry : null;
    const broadCandidates =
      queryCoreNoSpace.length > 0
        ? filterSchedulableEntries(
          restockKbEntriesRaw
          .filter((item) =>
            normalizeKoreanMatch(item.product_name).replace(/\s+/g, "").includes(queryCoreNoSpace)
          )
        ).slice(0, CHAT_PRINCIPLES.response.choicePreviewMax)
        : [];

    // Restock inquiry should stay strictly within KB schedule targets.
    // If query doesn't map to KB restock items, do not expose non-target products via MCP fuzzy match.
    if (
      resolvedIntent === "restock_inquiry" &&
      restockKbEntriesRaw.length > 0 &&
      rankedFromMessageSchedulable.length === 0 &&
      !lockIntentToRestockSubscribe &&
      !restockSubscribeAcceptedThisTurn &&
      !pendingProductId
    ) {
      if (hasChoiceAnswerCandidates(broadCandidates.length)) {
        const lines = broadCandidates.map((item, idx) => {
          const due = toRestockDueText(item.month, item.day);
          return `- ${idx + 1}번 | ${item.product_name} | ${item.raw_date} (${due.dday})`;
        });
        const reply = makeReply(
          buildNumberedChoicePrompt({
            titleKey: "restock_product_choice_title",
            lines,
            botContext: prevBotContext,
            entity: policyContext.entity,
          })
        );
        const candidateRows = broadCandidates.map((item, idx) => ({
          index: idx + 1,
          product_name: item.product_name,
          month: item.month,
          day: item.day,
          raw_date: item.raw_date,
          product_id: null as string | null,
          thumbnail_url: null as string | null,
        }));
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            customer_verification_token: customerVerificationToken || null,
            restock_pending: true,
            restock_stage: "awaiting_product_choice",
            restock_candidates: candidateRows,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          { stage: "tool", action: "ASK_RESTOCK_PRODUCT_CHOICE", candidate_count: candidateRows.length },
          { intent_name: resolvedIntent }
        );
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          { answer: reply, model: "deterministic_restock_kb" },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions, product_cards: [] });
      }
        const candidateRows = filterSchedulableEntries(restockKbEntriesRaw)
          .slice(0, CHAT_PRINCIPLES.response.choicePreviewMax)
          .map((item, idx) => ({
          index: idx + 1,
          product_name: item.product_name,
          month: item.month,
          day: item.day,
          raw_date: item.raw_date,
          product_id: null as string | null,
          thumbnail_url: null as string | null,
        }));
        if (candidateRows.length === 0) {
          const reply = makeReply(noSchedulableScheduleReply);
          await insertTurn({
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            answer_text: reply,
            final_answer: reply,
            bot_context: {
              intent_name: resolvedIntent,
              entity: policyContext.entity,
              customer_verification_token: customerVerificationToken || null,
              mcp_actions: mcpActions,
            },
          });
          await insertEvent(
            context,
            sessionId,
            latestTurnId,
            "POLICY_DECISION",
            { stage: "tool", action: "RESTOCK_NO_SCHEDULABLE_CANDIDATES" },
            { intent_name: resolvedIntent }
          );
          await insertEvent(
            context,
            sessionId,
            latestTurnId,
            "FINAL_ANSWER_READY",
            { answer: reply, model: "deterministic_restock_kb" },
            { intent_name: resolvedIntent }
          );
          return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
        }
        if (
          canUseTool("resolve_product") &&
          hasAllowedToolName("resolve_product") &&
          canUseTool("read_product") &&
          hasAllowedToolName("read_product")
        ) {
          for (const candidate of candidateRows) {
            const resolvedCandidate = await callMcpTool(
              context,
              "resolve_product",
              { query: candidate.product_name },
              sessionId,
              latestTurnId,
              { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
              allowedTools
            );
            noteMcp("resolve_product", resolvedCandidate);
            toolResults.push({
              name: "resolve_product",
              ok: resolvedCandidate.ok,
              data: resolvedCandidate.ok ? (resolvedCandidate.data as Record<string, unknown>) : undefined,
              error: resolvedCandidate.ok ? undefined : resolvedCandidate.error,
            });
            mcpActions.push("resolve_product");
            if (!resolvedCandidate.ok) continue;
            const resolvedData = (resolvedCandidate.data ?? {}) as Record<string, unknown>;
            const matched = Boolean(resolvedData.matched);
            const productId = String(resolvedData.product_id || "").trim();
            if (!matched || !productId) continue;
            candidate.product_id = productId;
            const readCandidate = await callMcpTool(
              context,
              "read_product",
              { product_no: productId },
              sessionId,
              latestTurnId,
              { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
              allowedTools
            );
            noteMcp("read_product", readCandidate);
            toolResults.push({
              name: "read_product",
              ok: readCandidate.ok,
              data: readCandidate.ok ? (readCandidate.data as Record<string, unknown>) : undefined,
              error: readCandidate.ok ? undefined : readCandidate.error,
            });
            mcpActions.push("read_product");
            if (!readCandidate.ok) continue;
            const shape = readProductShape(readCandidate.data || {});
            if (isNameMatch(candidate.product_name, shape.productName)) {
              candidate.thumbnail_url = shape.thumbnailUrl || null;
            } else {
              candidate.thumbnail_url = null;
            }
          }
        }
        const productCards = Boolean(CHAT_PRINCIPLES?.response?.requireImageCardsForChoiceWhenAvailable)
          ? candidateRows
              .filter((candidate) => Boolean(candidate.thumbnail_url))
              .map((candidate) => ({
                id: `restock-${candidate.index}`,
                title: candidate.product_name,
                subtitle: `${candidate.raw_date} 입고 예정`,
                description: `${toRestockDueText(candidate.month, candidate.day).dday}`,
                image_url: candidate.thumbnail_url,
                value: String(candidate.index),
              }))
          : [];
        const lines = candidateRows.map((candidate) => {
          const due = toRestockDueText(candidate.month, candidate.day);
          return `- ${candidate.index}번 | ${candidate.product_name} | ${candidate.raw_date} (${due.dday})`;
        });
        const needsAlternativeConsent =
          Boolean(CHAT_PRINCIPLES?.response?.requireConsentBeforeAlternativeSuggestion) &&
          Array.isArray(CHAT_PRINCIPLES?.response?.alternativeSuggestionConsentIntents) &&
          (CHAT_PRINCIPLES.response.alternativeSuggestionConsentIntents as Array<string>).includes(
            String(resolvedIntent || "")
          );
        const hideAlternativesBeforeConsent = Boolean(CHAT_PRINCIPLES?.response?.hideAlternativeCandidatesBeforeConsent);
      if (needsAlternativeConsent) {
        const consentQuestion = await generateAlternativeRestockConsentQuestion({
          intent: String(resolvedIntent || ""),
          alternativesCount: candidateRows.length,
          userQuery: String(restockQueryText || message || ""),
          model: "chatgpt",
        });
        const reply = makeReply(
          buildYesNoConfirmationPrompt(
            hideAlternativesBeforeConsent ? consentQuestion : `${consentQuestion}\n${lines.join("\n")}`,
            { botContext: prevBotContext, entity: policyContext.entity }
          )
        );
        const quickReplyConfig = resolveQuickReplyConfig({
          optionsCount: YES_NO_QUICK_REPLIES.length,
          minSelectHint: 1,
          maxSelectHint: 1,
          explicitMode: "single",
          criteria: "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
          sourceFunction: "handleRestockIntent",
          sourceModule: "src/app/api/runtime/chat/handlers/restockHandler.ts",
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
            entity: policyContext.entity,
            customer_verification_token: customerVerificationToken || null,
            restock_pending: true,
            restock_stage: "awaiting_non_target_alternative_confirm",
            restock_candidates: candidateRows,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          {
            stage: "tool",
            action: "ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
            candidate_count: candidateRows.length,
          },
          { intent_name: resolvedIntent }
        );
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          {
            answer: reply,
            model: "deterministic_restock_kb",
            quick_reply_config: quickReplyConfig,
          },
          { intent_name: resolvedIntent }
        );
          return respond({
            session_id: sessionId,
            step: "confirm",
            message: reply,
            mcp_actions: mcpActions,
            quick_replies: YES_NO_QUICK_REPLIES,
            quick_reply_config: quickReplyConfig,
            product_cards: hideAlternativesBeforeConsent ? [] : productCards,
          });
        }
      const reply = makeReply(
        `요청하신 상품은 현재 재입고 일정 안내 대상에 없습니다.\n안내 가능한 상품은 아래와 같습니다.\n${buildNumberedChoicePrompt({
          titleKey: "restock_product_choice_title",
          lines,
          botContext: prevBotContext,
          entity: policyContext.entity,
        })}`
      );
      const quickReplyConfig = resolveQuickReplyConfig({
        optionsCount: candidateRows.length,
        minSelectHint: 1,
        maxSelectHint: 1,
        explicitMode: "single",
        criteria: "restock:not_in_target_fallback_choice",
        sourceFunction: "handleRestockIntent",
        sourceModule: "src/app/api/runtime/chat/handlers/restockHandler.ts",
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
          entity: policyContext.entity,
          customer_verification_token: customerVerificationToken || null,
          restock_pending: true,
          restock_stage: "awaiting_product_choice",
          restock_candidates: candidateRows,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        {
          stage: "tool",
          action: "RESTOCK_PRODUCT_NOT_IN_KB_TARGET",
          next_action: "ASK_RESTOCK_PRODUCT_CHOICE",
          candidate_count: candidateRows.length,
        },
        { intent_name: resolvedIntent }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        {
          answer: reply,
          model: "deterministic_restock_kb",
          quick_reply_config: quickReplyConfig,
        },
        { intent_name: resolvedIntent }
      );
        return respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: mcpActions,
          quick_replies: candidateRows.map((candidate) => ({
            label: `${candidate.index}번`,
            value: String(candidate.index),
          })),
          quick_reply_config: quickReplyConfig,
          product_cards: productCards,
        });
      }

    if (hasChoiceAnswerCandidates(rankedFromMessageSchedulable.length)) {
      const candidateRows = rankedFromMessageSchedulable.map((row, idx) => ({
        index: idx + 1,
        product_name: row.entry.product_name,
        month: row.entry.month,
        day: row.entry.day,
        raw_date: row.entry.raw_date,
        product_id: null as string | null,
        thumbnail_url: null as string | null,
      }));
      if (
        canUseTool("resolve_product") &&
        hasAllowedToolName("resolve_product") &&
        canUseTool("read_product") &&
        hasAllowedToolName("read_product")
      ) {
        for (const candidate of candidateRows.slice(0, CHAT_PRINCIPLES.response.choicePreviewMax)) {
          const resolvedCandidate = await callMcpTool(
            context,
            "resolve_product",
            { query: candidate.product_name },
            sessionId,
            latestTurnId,
            { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
            allowedTools
          );
          noteMcp("resolve_product", resolvedCandidate);
          toolResults.push({
            name: "resolve_product",
            ok: resolvedCandidate.ok,
            data: resolvedCandidate.ok ? (resolvedCandidate.data as Record<string, unknown>) : undefined,
            error: resolvedCandidate.ok ? undefined : resolvedCandidate.error,
          });
          mcpActions.push("resolve_product");
          if (!resolvedCandidate.ok) continue;
          const resolvedData = (resolvedCandidate.data ?? {}) as Record<string, unknown>;
          const matched = Boolean(resolvedData.matched);
          const productId = String(resolvedData.product_id || "").trim();
          if (!matched || !productId) continue;
          candidate.product_id = productId;
          const readCandidate = await callMcpTool(
            context,
            "read_product",
            { product_no: productId },
            sessionId,
            latestTurnId,
            { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
            allowedTools
          );
          noteMcp("read_product", readCandidate);
          toolResults.push({
            name: "read_product",
            ok: readCandidate.ok,
            data: readCandidate.ok ? (readCandidate.data as Record<string, unknown>) : undefined,
            error: readCandidate.ok ? undefined : readCandidate.error,
          });
          mcpActions.push("read_product");
          if (!readCandidate.ok) continue;
          const shape = readProductShape(readCandidate.data || {});
          if (isNameMatch(candidate.product_name, shape.productName)) {
            candidate.thumbnail_url = shape.thumbnailUrl || null;
          } else {
            candidate.thumbnail_url = null;
          }
        }
      }
      const lines = candidateRows.map((candidate) => {
        const due = toRestockDueText(candidate.month, candidate.day);
        return `- ${candidate.index}번 | ${candidate.product_name} | ${candidate.raw_date} (${due.dday})`;
      });
      const reply = makeReply(
        buildNumberedChoicePrompt({
          titleKey: "restock_product_choice_title",
          lines,
          botContext: prevBotContext,
          entity: policyContext.entity,
        })
      );
      const productCards = candidateRows
        .filter((candidate) => Boolean(candidate.thumbnail_url))
        .map((candidate) => ({
          id: `restock-${candidate.index}`,
          title: candidate.product_name,
          subtitle: `${candidate.raw_date} 입고 예정`,
          description: `${toRestockDueText(candidate.month, candidate.day).dday}`,
          image_url: candidate.thumbnail_url || null,
          value: String(candidate.index),
        }));
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          customer_verification_token: customerVerificationToken || null,
          restock_pending: true,
          restock_stage: "awaiting_product_choice",
          restock_candidates: candidateRows,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        { stage: "tool", action: "ASK_RESTOCK_PRODUCT_CHOICE", candidate_count: rankedFromMessageSchedulable.length },
        { intent_name: resolvedIntent }
      );
      return respond({
        session_id: sessionId,
        step: "confirm",
        message: reply,
        mcp_actions: mcpActions,
        product_cards: productCards,
      });
    }

    if (!restockProductId && pendingProductName && canUseTool("resolve_product") && hasAllowedToolName("resolve_product")) {
      const resolvedPending = await callMcpTool(
        context,
        "resolve_product",
        { query: pendingProductName },
        sessionId,
        latestTurnId,
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
        allowedTools);
      noteMcp("resolve_product", resolvedPending);
      toolResults.push({
        name: "resolve_product",
        ok: resolvedPending.ok,
        data: resolvedPending.ok ? (resolvedPending.data as Record<string, unknown>) : undefined,
        error: resolvedPending.ok ? undefined : resolvedPending.error,
      });
      mcpActions.push("resolve_product");
      if (resolvedPending.ok) {
        const resolvedData = (resolvedPending.data ?? {}) as Record<string, unknown>;
        const matched = Boolean(resolvedData.matched);
        const candidate = String(resolvedData.product_id || "").trim();
        if (matched && candidate) restockProductId = candidate;
      }
    }

    if (!restockProductId && canUseTool("resolve_product") && hasAllowedToolName("resolve_product")) {
      const resolved = await callMcpTool(
        context,
        "resolve_product",
        { query: restockQueryText },
        sessionId,
        latestTurnId,
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
        allowedTools);
      noteMcp("resolve_product", resolved);
      toolResults.push({
        name: "resolve_product",
        ok: resolved.ok,
        data: resolved.ok ? (resolved.data as Record<string, unknown>) : undefined,
        error: resolved.ok ? undefined : resolved.error,
      });
      mcpActions.push("resolve_product");
      if (resolved.ok) {
        const resolvedData = (resolved.data ?? {}) as Record<string, unknown>;
        const matched = Boolean(resolvedData.matched);
        const candidate = String(resolvedData.product_id || "").trim();
        if (matched && candidate) restockProductId = candidate;
      }
      if (!resolved.ok && String(resolved.error || "").toUpperCase().includes("SCOPE_ERROR")) {
        const reply = makeReply(
          "상품 조회를 시도했지만 현재 연동 권한에 `mall.read_product` 스코프가 없어 진행할 수 없습니다.\n관리자에게 Cafe24 연동 권한(상품 조회)을 추가 요청해 주세요."
        );
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          failed: buildFailedPayload({
            code: "MCP_SCOPE_MISSING",
            summary: "resolve_product failed: mall.read_product scope missing",
            intent: resolvedIntent,
            stage: "restock.resolve_product",
            tool: "resolve_product",
            required_scope: "mall.read_product",
            retryable: false,
          }),
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            customer_verification_token: customerVerificationToken || null,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          { stage: "tool", action: "INFORM_SCOPE_MISSING_RESTOCK_PRODUCT" },
          { intent_name: resolvedIntent }
        );
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          { answer: reply, model: "deterministic_scope_guard" },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
      }
    }

    if (!restockProductId && !pendingProductName) {
      const ranked = rankRestockEntries(restockQueryText, restockKbEntriesRaw);
      const rankedSchedulable = ranked.filter((row) => {
        const entry = (row as { entry?: { month?: unknown; day?: unknown } }).entry;
        return isSchedulableEntry(Number(entry?.month || 0), Number(entry?.day || 0));
      });
      if (hasUniqueAnswerCandidate(rankedSchedulable.length)) {
        const item = rankedSchedulable[0].entry;
        const due = toRestockDueText(item.month, item.day);
        const reply = makeReply(buildRestockFinalAnswerWithChoices(item.product_name, due));
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            customer_verification_token: customerVerificationToken || null,
            restock_pending: true,
            restock_stage: "awaiting_subscribe_suggestion",
            pending_product_name: item.product_name,
            pending_channel: "sms",
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          { stage: "tool", action: "RESTOCK_SCHEDULE_ANSWERED_BY_KB", product_name: item.product_name },
          { intent_name: resolvedIntent }
        );
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          { answer: reply, model: "deterministic_restock_kb" },
          { intent_name: resolvedIntent }
        );
        const quickReplyConfig = resolveQuickReplyConfig({
          optionsCount: 2,
          minSelectHint: 1,
          maxSelectHint: 1,
          explicitMode: "single",
          criteria: "restock:kb_schedule_followup_choice",
          sourceFunction: "handleRestockIntent",
          sourceModule: "src/app/api/runtime/chat/handlers/restockHandler.ts",
          contextText: reply,
        });
        return respond({
          session_id: sessionId,
          step: "final",
          message: reply,
          mcp_actions: mcpActions,
          quick_replies: [
            { label: "재입고 알림 신청", value: "네" },
            { label: "대화 종료", value: "대화 종료" },
          ],
          quick_reply_config: quickReplyConfig,
          product_cards: [],
        });
      }
      if (hasChoiceAnswerCandidates(rankedSchedulable.length)) {
        const candidateRows = rankedSchedulable.map((row, idx) => ({
          index: idx + 1,
          product_name: row.entry.product_name,
          month: row.entry.month,
          day: row.entry.day,
          raw_date: row.entry.raw_date,
          product_id: null as string | null,
          thumbnail_url: null as string | null,
        }));
        if (
          canUseTool("resolve_product") &&
          hasAllowedToolName("resolve_product") &&
          canUseTool("read_product") &&
          hasAllowedToolName("read_product")
        ) {
          for (const candidate of candidateRows.slice(0, CHAT_PRINCIPLES.response.choicePreviewMax)) {
            const resolvedCandidate = await callMcpTool(
              context,
              "resolve_product",
              { query: candidate.product_name },
              sessionId,
              latestTurnId,
              { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
              allowedTools
            );
            noteMcp("resolve_product", resolvedCandidate);
            toolResults.push({
              name: "resolve_product",
              ok: resolvedCandidate.ok,
              data: resolvedCandidate.ok ? (resolvedCandidate.data as Record<string, unknown>) : undefined,
              error: resolvedCandidate.ok ? undefined : resolvedCandidate.error,
            });
            mcpActions.push("resolve_product");
            if (!resolvedCandidate.ok) continue;
            const resolvedData = (resolvedCandidate.data ?? {}) as Record<string, unknown>;
            const matched = Boolean(resolvedData.matched);
            const productId = String(resolvedData.product_id || "").trim();
            if (!matched || !productId) continue;
            candidate.product_id = productId;
            const readCandidate = await callMcpTool(
              context,
              "read_product",
              { product_no: productId },
              sessionId,
              latestTurnId,
              { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
              allowedTools
            );
            noteMcp("read_product", readCandidate);
            toolResults.push({
              name: "read_product",
              ok: readCandidate.ok,
              data: readCandidate.ok ? (readCandidate.data as Record<string, unknown>) : undefined,
              error: readCandidate.ok ? undefined : readCandidate.error,
            });
            mcpActions.push("read_product");
            if (!readCandidate.ok) continue;
            const shape = readProductShape(readCandidate.data || {});
            if (isNameMatch(candidate.product_name, shape.productName)) {
              candidate.thumbnail_url = shape.thumbnailUrl || null;
            } else {
              candidate.thumbnail_url = null;
            }
          }
        }
        const lines = candidateRows.map((candidate) => {
          const due = toRestockDueText(candidate.month, candidate.day);
          return `- ${candidate.index}번 | ${candidate.product_name} | ${candidate.raw_date} (${due.dday})`;
        });
        const reply = makeReply(
          buildNumberedChoicePrompt({
            titleKey: "restock_product_choice_title",
            lines,
            botContext: prevBotContext,
            entity: policyContext.entity,
          })
        );
        const productCards = candidateRows
          .filter((candidate) => Boolean(candidate.thumbnail_url))
          .map((candidate) => ({
            id: `restock-${candidate.index}`,
            title: candidate.product_name,
            subtitle: `${candidate.raw_date} 입고 예정`,
            description: `${toRestockDueText(candidate.month, candidate.day).dday}`,
            image_url: candidate.thumbnail_url || null,
            value: String(candidate.index),
          }));
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            customer_verification_token: customerVerificationToken || null,
            restock_pending: true,
            restock_stage: "awaiting_product_choice",
            restock_candidates: candidateRows,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          { stage: "tool", action: "ASK_RESTOCK_PRODUCT_CHOICE", candidate_count: rankedSchedulable.length },
          { intent_name: resolvedIntent }
        );
        return respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: mcpActions,
          product_cards: productCards,
        });
      }
      if (ranked.length > 0 && rankedSchedulable.length === 0) {
        const reply = makeReply(noSchedulableScheduleReply);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            customer_verification_token: customerVerificationToken || null,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          { stage: "tool", action: "RESTOCK_MATCHED_ONLY_PAST_SCHEDULES" },
          { intent_name: resolvedIntent }
        );
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          { answer: reply, model: "deterministic_restock_kb" },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
      }
      const reply = makeReply("확인할 상품명을 먼저 알려주세요. (예: 아드헬린 린넨 플레어 원피스)");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          customer_verification_token: customerVerificationToken || null,
          restock_pending: true,
          restock_stage: "awaiting_product",
          pending_channel: restockChannel,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        { stage: "tool", action: "ASK_PRODUCT_NAME_FOR_RESTOCK" },
        { intent_name: resolvedIntent }
      );
      return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
    }

    let readProductData: Record<string, unknown> | null = null;
    if (restockProductId && canUseTool("read_product") && hasAllowedToolName("read_product")) {
      const readRes = await callMcpTool(
        context,
        "read_product",
        { product_no: restockProductId },
        sessionId,
        latestTurnId,
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
        allowedTools);
      noteMcp("read_product", readRes);
      toolResults.push({
        name: "read_product",
        ok: readRes.ok,
        data: readRes.ok ? (readRes.data as Record<string, unknown>) : undefined,
        error: readRes.ok ? undefined : readRes.error,
      });
      mcpActions.push("read_product");
      if (readRes.ok) readProductData = (readRes.data as Record<string, unknown>) || null;
    }

    const productView = readProductShape(readProductData || {});
    const kbPreferEnabled = Boolean(CHAT_PRINCIPLES?.response?.restockPreferKbWhenNoMallNameMatch);
    const kbName = String(kbMatchFromQuery?.product_name || "").trim();
    const mallName = String(productView.productName || "").trim();
    const hasNameMatch = kbName && mallName && normalizeNameKey(kbName) === normalizeNameKey(mallName);
    const shouldPreferKbSchedule = kbPreferEnabled && kbMatchFromQuery && !hasNameMatch;
    if (shouldPreferKbSchedule) {
      const due = toRestockDueText(kbMatchFromQuery.month, kbMatchFromQuery.day);
      const newLabel = String(CHAT_PRINCIPLES?.response?.restockNewProductLabel || "신상품").trim();
      const displayName = newLabel ? `${newLabel} ${kbMatchFromQuery.product_name}` : kbMatchFromQuery.product_name;
      const reply = makeReply(buildRestockFinalAnswerWithChoices(displayName, due));
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          customer_verification_token: customerVerificationToken || null,
          restock_pending: true,
          restock_stage: "awaiting_subscribe_suggestion",
          pending_product_id: null,
          pending_product_name: kbMatchFromQuery.product_name,
          pending_channel: "sms",
          mcp_actions: mcpActions,
          restock_kb_only: true,
          restock_new_product: true,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        { stage: "tool", action: "RESTOCK_SCHEDULE_ANSWERED_BY_KB", product_name: kbMatchFromQuery.product_name, new_product: true },
        { intent_name: resolvedIntent }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_restock_kb" },
        { intent_name: resolvedIntent }
      );
      const quickReplyConfig = resolveQuickReplyConfig({
        optionsCount: 2,
        minSelectHint: 1,
        maxSelectHint: 1,
        explicitMode: "single",
        criteria: "restock:kb_schedule_followup_choice",
        sourceFunction: "handleRestockIntent",
        sourceModule: "src/app/api/runtime/chat/handlers/restockHandler.ts",
        contextText: reply,
      });
      return respond({
        session_id: sessionId,
        step: "final",
        message: reply,
        mcp_actions: mcpActions,
        quick_replies: [
          { label: "재입고 알림 신청", value: "네" },
          { label: "대화 종료", value: "대화 종료" },
        ],
        quick_reply_config: quickReplyConfig,
        product_cards: [],
      });
    }
    const scheduleEntry = findBestRestockEntryByProductName(
      productView.productName || pendingProductName || String(restockProductId),
      restockKbEntriesRaw
    );
    const scheduleDueForEntry = scheduleEntry ? toRestockDueText(scheduleEntry.month, scheduleEntry.day) : null;
    const restockDisplayName = String(productView.productName || pendingProductName || restockProductId || "").trim();
    const scheduleLine = scheduleEntry
      ? (() => {
        return `입고 예정: ${scheduleEntry.raw_date} (${scheduleDueForEntry?.dday || "-"})`;
      })()
      : "입고 예정: 확인된 일정 정보 없음";
    const policyAnswerability = String(productDecisionRes.decision?.answerability || "UNKNOWN");
    const policyRestock = String(productDecisionRes.decision?.restock_policy || "UNKNOWN");
    const policyRestockAt = String(productDecisionRes.decision?.restock_at || "").trim();
    const stockLine = productView.soldOut
      ? "현재 상태: 품절"
      : productView.qty === null
        ? "현재 상태: 재고 수량 확인 필요"
        : `현재 상태: 재고 ${productView.qty}개`;
    const policyLine =
      policyAnswerability === "UNKNOWN" && policyRestock === "UNKNOWN"
        ? "KB 정책: 별도 재입고 정책 없음"
        : `KB 정책: answerability=${policyAnswerability}, restock_policy=${policyRestock}${policyRestockAt ? `, restock_at=${policyRestockAt}` : ""
        }`;

    if (resolvedIntent === "restock_subscribe") {
      if (scheduleDueForEntry && scheduleDueForEntry.diffDays < 0) {
        const reply = makeReply(
          `선택하신 상품의 입고 예정일(${scheduleDueForEntry.targetText})은 이미 지난 일정이라 예약 알림을 신청할 수 없습니다. 다른 상품의 입고 일정을 확인해 주세요.`
        );
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            customer_verification_token: customerVerificationToken || null,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          {
            stage: "tool",
            action: "BLOCK_RESTOCK_SUBSCRIBE_PAST_SCHEDULE",
            product_id: restockProductId || null,
            restock_at: scheduleDueForEntry.targetText,
            diff_days: scheduleDueForEntry.diffDays,
          },
          { intent_name: resolvedIntent }
        );
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          { answer: reply, model: "deterministic_restock_subscribe_past_schedule_guard" },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
      }
      if (!restockSubscribeAcceptedThisTurn) {
        const reply = makeReply(
          buildYesNoConfirmationPrompt(
            `상품 ${restockDisplayName || "-"} 정보입니다.\n${scheduleLine}\n${stockLine}\n${policyLine}\n원하시면 ${restockChannel} 채널로 재입고 알림을 신청할까요?`,
            { botContext: prevBotContext, entity: policyContext.entity }
          )
        );
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
            bot_context: {
              intent_name: resolvedIntent,
              entity: policyContext.entity,
              restock_pending: true,
              restock_stage: "awaiting_subscribe_confirm",
              pending_product_id: restockProductId,
              pending_product_name: restockDisplayName || pendingProductName || null,
              pending_channel: restockChannel,
              customer_verification_token: customerVerificationToken || null,
              mcp_actions: mcpActions,
            },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          { stage: "tool", action: "ASK_RESTOCK_SUBSCRIBE_CONFIRM", product_id: restockProductId },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
      }

      const subscribePhone =
        typeof policyContext.entity?.phone === "string" ? normalizePhoneDigits(policyContext.entity.phone) : "";
    const pendingLeadDaysFromContext = Array.isArray(prevBotContextRecord.pending_lead_days)
        ? (prevBotContextRecord.pending_lead_days as number[])
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n))
        : [];
      const scheduleDue = scheduleDueForEntry;
      const availableLeadDays = scheduleDue ? availableRestockLeadDays(scheduleDue.diffDays) : [];
      const minLeadDays = 1;

      if (availableLeadDays.length > 0 && pendingLeadDaysFromContext.length < minLeadDays) {
        const quickReplies = toLeadDayQuickReplies(availableLeadDays, 7);
        const exampleValues = availableLeadDays.slice(0, Math.max(minLeadDays, 3));
        const reply = makeReply(
          buildRestockLeadDaysPrompt({
            minRequired: minLeadDays,
            options: availableLeadDays,
            exampleValues,
            botContext: prevBotContext,
            entity: policyContext.entity,
          })
        );
        const quickReplyConfig = resolveQuickReplyConfig({
          optionsCount: availableLeadDays.length,
          minSelectHint: minLeadDays,
          maxSelectHint: availableLeadDays.length,
          explicitMode: "multi",
          criteria: "policy:ASK_RESTOCK_SUBSCRIBE_LEAD_DAYS",
          sourceFunction: "handleRestockIntent",
          sourceModule: "src/app/api/runtime/chat/handlers/restockHandler.ts",
          contextText: reply,
        });
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: "restock_subscribe",
            entity: policyContext.entity,
            restock_pending: true,
            restock_stage: "awaiting_subscribe_lead_days",
            pending_product_id: restockProductId || null,
            pending_product_name: restockDisplayName || pendingProductName || null,
            pending_channel: restockChannel,
            available_lead_days: availableLeadDays,
            min_lead_days: minLeadDays,
            customer_verification_token: customerVerificationToken || null,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          {
            stage: "tool",
            action: "ASK_RESTOCK_SUBSCRIBE_LEAD_DAYS",
            options: availableLeadDays,
            min_required: minLeadDays,
            product_id: restockProductId || null,
          },
          { intent_name: resolvedIntent }
        );
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          { answer: reply, model: "deterministic_restock_subscribe_lead_days", quick_reply_config: quickReplyConfig },
          { intent_name: resolvedIntent }
        );
        return respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: mcpActions,
          quick_replies: quickReplies,
          quick_reply_config: quickReplyConfig,
        });
      }

      if (restockChannel === "sms" && !subscribePhone) {
        const reply = makeReply("재입고 알림 신청을 위해 휴대폰 번호를 알려주세요. (예: 01012345678)");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: "restock_subscribe",
            entity: policyContext.entity,
            restock_pending: true,
            restock_stage: "awaiting_subscribe_phone",
            pending_product_id: restockProductId || null,
            pending_product_name: restockDisplayName || pendingProductName || null,
            pending_channel: restockChannel,
            pending_lead_days: pendingLeadDaysFromContext,
            customer_verification_token: customerVerificationToken || null,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          { stage: "tool", action: "ASK_RESTOCK_SUBSCRIBE_PHONE", product_id: restockProductId || null, channel: restockChannel },
          { intent_name: resolvedIntent }
        );
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          { answer: reply, model: "deterministic_restock_subscribe_phone" },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
      }

      if (restockProductId && canUseTool("subscribe_restock") && hasAllowedToolName("subscribe_restock")) {
        const subscribeRes = await callMcpTool(
          context,
          "subscribe_restock",
          {
            product_id: restockProductId,
            channel: restockChannel,
            phone: subscribePhone || undefined,
            session_id: sessionId,
            mall_id: providerConfig.mall_id || undefined,
            restock_at: scheduleDue?.targetText || undefined,
            lead_days: pendingLeadDaysFromContext,
          },
          sessionId,
          latestTurnId,
          { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
          allowedTools);
        noteMcp("subscribe_restock", subscribeRes);
        toolResults.push({
          name: "subscribe_restock",
          ok: subscribeRes.ok,
          data: subscribeRes.ok ? (subscribeRes.data as Record<string, unknown>) : undefined,
          error: subscribeRes.ok ? undefined : subscribeRes.error,
        });
        mcpActions.push("subscribe_restock");
        if (subscribeRes.ok) {
          const reply = makeReply(
            `요약: 재입고 알림 신청이 완료되었습니다.\n상세: 상품 ${restockDisplayName || restockProductId} / 채널 ${restockChannel}\n${scheduleLine}\n${stockLine}\n${policyLine}\n다음 선택: 대화 종료 / 다른 문의`
          );
          await insertTurn({
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            answer_text: reply,
            final_answer: reply,
            bot_context: {
              intent_name: resolvedIntent,
              entity: policyContext.entity,
              customer_verification_token: customerVerificationToken || null,
              post_action_stage: "awaiting_choice",
              mcp_actions: mcpActions,
            },
          });
          const quickReplyConfig = resolveQuickReplyConfig({
            optionsCount: 2,
            minSelectHint: 1,
            maxSelectHint: 1,
            explicitMode: "single",
            criteria: "restock:post_subscribe_next_step",
            sourceFunction: "handleRestockIntent",
            sourceModule: "src/app/api/runtime/chat/handlers/restockHandler.ts",
            contextText: reply,
          });
          return respond({
            session_id: sessionId,
            step: "final",
            message: reply,
            mcp_actions: mcpActions,
            quick_replies: [
              { label: "대화 종료", value: "대화 종료" },
              { label: "다른 문의", value: "다른 문의" },
            ],
            quick_reply_config: quickReplyConfig,
          });
        }
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "MCP_TOOL_FAILED",
          { tool: "subscribe_restock", error: subscribeRes.error },
          { intent_name: resolvedIntent }
        );
        const reply = makeReply(
          "재입고 알림 신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. 문제가 반복되면 관리자에게 문의해 주세요."
        );
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            customer_verification_token: customerVerificationToken || null,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          { answer: reply, model: "deterministic_restock_subscribe_error" },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
      }

      if ((allowRestockLite || !restockProductId) && restockDisplayName) {
        const liteRes = await saveRestockSubscriptionLite(context, {
          orgId: context.orgId,
          sessionId,
          channel: restockChannel,
          phone: subscribePhone || null,
          productId: restockProductId || null,
          productName: restockDisplayName,
          restockAt: scheduleDue?.targetText || null,
          leadDays: pendingLeadDaysFromContext,
          intentName: resolvedIntent,
          mallId: providerConfig.mall_id || null,
          topicKey: restockProductId || restockDisplayName,
          topicLabel: restockDisplayName,
          metadata: {
            source: "lite",
            flow: "restock_subscribe",
          },
        });
        if (liteRes.ok) {
          const reply = makeReply(
            `요약: 재입고 알림 신청이 완료되었습니다.\n상세: 상품 ${restockDisplayName} / 채널 ${restockChannel}\n${scheduleLine}\n${stockLine}\n${policyLine}\n다음 선택: 대화 종료 / 다른 문의`
          );
          await insertTurn({
            session_id: sessionId,
            seq: nextSeq,
            transcript_text: message,
            answer_text: reply,
            final_answer: reply,
            bot_context: {
              intent_name: resolvedIntent,
              entity: policyContext.entity,
              customer_verification_token: customerVerificationToken || null,
              post_action_stage: "awaiting_choice",
              mcp_actions: mcpActions,
              restock_lite_notification_ids: liteRes.data.notification_ids || [],
            },
          });
          await insertEvent(
            context,
            sessionId,
            latestTurnId,
            "POLICY_DECISION",
            {
              stage: "tool",
              action: "RESTOCK_SUBSCRIBE_LITE",
              notification_ids: liteRes.data.notification_ids || [],
              scheduled_count: liteRes.data.scheduled_count ?? null,
            },
            { intent_name: resolvedIntent }
          );
          const quickReplyConfig = resolveQuickReplyConfig({
            optionsCount: 2,
            minSelectHint: 1,
            maxSelectHint: 1,
            explicitMode: "single",
            criteria: "restock:post_subscribe_next_step",
            sourceFunction: "handleRestockIntent",
            sourceModule: "src/app/api/runtime/chat/handlers/restockHandler.ts",
            contextText: reply,
          });
          return respond({
            session_id: sessionId,
            step: "final",
            message: reply,
            mcp_actions: mcpActions,
            quick_replies: [
              { label: "대화 종료", value: "대화 종료" },
              { label: "다른 문의", value: "다른 문의" },
            ],
            quick_reply_config: quickReplyConfig,
          });
        }
        const reply = makeReply(
          "재입고 알림 신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. 문제가 반복되면 관리자에게 문의해 주세요."
        );
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            intent_name: resolvedIntent,
            entity: policyContext.entity,
            customer_verification_token: customerVerificationToken || null,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "FINAL_ANSWER_READY",
          { answer: reply, model: "deterministic_restock_subscribe_error" },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
      }

      const inquiryReply = makeReply(
        buildYesNoConfirmationPrompt(
          `요약: ${restockDisplayName || restockProductId} 재고/입고 상태를 확인했습니다.\n상세: ${scheduleLine}\n${stockLine}\n${policyLine}\n지금 ${restockChannel} 재입고 알림 신청을 진행할까요?`,
          { botContext: prevBotContext, entity: policyContext.entity }
        )
      );
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: inquiryReply,
        final_answer: inquiryReply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          customer_verification_token: customerVerificationToken || null,
          restock_pending: true,
          restock_stage: "awaiting_subscribe_suggestion",
          pending_product_id: restockProductId || null,
          pending_product_name: restockDisplayName || pendingProductName || null,
          pending_channel: restockChannel || "sms",
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: inquiryReply, model: "deterministic_restock" },
        { intent_name: resolvedIntent }
      );
      return respond({
        session_id: sessionId,
        step: "final",
        message: inquiryReply,
        mcp_actions: mcpActions,
        product_cards: productView.thumbnailUrl
          ? [
              {
                id: `restock-${restockProductId}`,
                title: restockDisplayName || restockProductId,
                subtitle: "상품 확인",
                description: stockLine.replace(/^현재 상태:\s*/, ""),
                image_url: productView.thumbnailUrl,
                value: "1",
              },
            ]
          : [],
      });
    }
  }

  return null;
}
