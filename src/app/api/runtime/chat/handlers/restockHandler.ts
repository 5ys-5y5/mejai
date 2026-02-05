// @ts-nocheck
type HandleRestockIntentInput = Record<string, any>;

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
  } = input;

// Handle pending restock product choice even if current turn intent is misclassified (e.g. "1" -> general).
    const prevRestockCandidatesForAnyIntent = Array.isArray((prevBotContext as any).restock_candidates)
      ? ((prevBotContext as any).restock_candidates as Array<Record<string, unknown>>)
      : [];
    const pickedIndexForAnyIntent = parseIndexedChoice(message);
    const pickedFromPrevForAnyIntent =
      prevBotContext.restock_pending &&
      prevBotContext.restock_stage === "awaiting_product_choice" &&
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
        const due = toRestockDueText(month, day);
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
        return respond({
          session_id: sessionId,
          step: "final",
          message: reply,
          mcp_actions: mcpActions,
          quick_replies: [
            { label: "재입고 알림 신청", value: "네" },
            { label: "대화 종료", value: "대화 종료" },
          ],
          product_cards: [],
        });
      }
    }

    if (resolvedIntent === "restock_inquiry" || resolvedIntent === "restock_subscribe") {
      const restockKbEntries = [
        ...parseRestockEntriesFromContent(String(kb.content || ""), `kb:${kb.id}`),
        ...adminKbs.flatMap((item) =>
          parseRestockEntriesFromContent(String(item.content || ""), `admin_kb:${item.id}`)
        ),
      ];
      const prevRestockCandidates = Array.isArray((prevBotContext as any).restock_candidates)
        ? ((prevBotContext as any).restock_candidates as Array<Record<string, unknown>>)
        : [];
      const pickedIndex = parseIndexedChoice(message);
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
          const due = toRestockDueText(month, day);
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
          return respond({
            session_id: sessionId,
            step: "final",
            message: reply,
            mcp_actions: mcpActions,
            quick_replies: [
              { label: "재입고 알림 신청", value: "네" },
              { label: "대화 종료", value: "대화 종료" },
            ],
            product_cards: [],
          });
        }
      }

      const pendingProductId = String(prevBotContext.pending_product_id || "").trim();
      const pendingProductName = String(prevBotContext.pending_product_name || "").trim();
      const pendingChannel = String(prevBotContext.pending_channel || "").trim();
      const restockQueryText =
        resolvedIntent === "restock_inquiry" || resolvedIntent === "restock_subscribe"
          ? effectiveMessageForIntent
          : message;
      let restockProductId =
        String(productDecisionRes.decision?.product_id || "").trim() ||
        pendingProductId ||
        "";
      const restockChannel = extractRestockChannel(message) || pendingChannel || "sms";
      const rankedFromMessage = rankRestockEntries(restockQueryText, restockKbEntries);
      const queryCoreNoSpace = normalizeKoreanQueryToken(stripRestockNoise(restockQueryText)).replace(/\s+/g, "");
      const broadCandidates =
        queryCoreNoSpace.length > 0
          ? restockKbEntries
              .filter((item) =>
                normalizeKoreanMatchText(item.product_name).replace(/\s+/g, "").includes(queryCoreNoSpace)
              )
              .slice(0, CHAT_PRINCIPLES.response.choicePreviewMax)
          : [];

      // Restock inquiry should stay strictly within KB schedule targets.
      // If query doesn't map to KB restock items, do not expose non-target products via MCP fuzzy match.
      if (
        resolvedIntent === "restock_inquiry" &&
        restockKbEntries.length > 0 &&
        rankedFromMessage.length === 0 &&
        !lockIntentToRestockSubscribe &&
        !restockSubscribeAcceptedThisTurn &&
        !pendingProductId
      ) {
        if (hasChoiceAnswerCandidates(broadCandidates.length)) {
          const lines = broadCandidates.map((item, idx) => {
            const due = toRestockDueText(item.month, item.day);
            return `- ${idx + 1}번 | ${item.product_name} | ${item.raw_date} (${due.dday})`;
          });
          const reply = makeReply(`유사한 상품이 여러 개입니다. 아래에서 번호를 선택해 주세요.\n${lines.join("\n")}`);
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
        const knownTargets = restockKbEntries
          .slice(0, CHAT_PRINCIPLES.response.choicePreviewMax)
          .map((item) => `- ${item.product_name} (${item.raw_date})`)
          .join("\n");
        const reply = makeReply(
          `요청하신 상품은 현재 재입고 일정 안내 대상에 없습니다.\n안내 가능한 상품은 아래와 같습니다.\n${knownTargets}`
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
            restock_pending: false,
            restock_stage: null,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "POLICY_DECISION",
          { stage: "tool", action: "RESTOCK_PRODUCT_NOT_IN_KB_TARGET" },
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
        return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions, product_cards: [] });
      }

      if (hasChoiceAnswerCandidates(rankedFromMessage.length)) {
        const candidateRows = rankedFromMessage.map((row, idx) => ({
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
            const matched = Boolean((resolvedCandidate.data as any)?.matched);
            const productId = String((resolvedCandidate.data as any)?.product_id || "").trim();
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
            candidate.thumbnail_url = shape.thumbnailUrl || null;
          }
        }
        const lines = candidateRows.map((candidate) => {
          const due = toRestockDueText(candidate.month, candidate.day);
          return `- ${candidate.index}번 | ${candidate.product_name} | ${candidate.raw_date} (${due.dday})`;
        });
        const reply = makeReply(
          `유사한 상품이 여러 개입니다. 아래에서 번호를 선택해 주세요.\n${lines.join("\n")}`
        );
        const productCards = candidateRows.map((candidate) => ({
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
          { stage: "tool", action: "ASK_RESTOCK_PRODUCT_CHOICE", candidate_count: rankedFromMessage.length },
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
          const matched = Boolean((resolvedPending.data as any)?.matched);
          const candidate = String((resolvedPending.data as any)?.product_id || "").trim();
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
          const matched = Boolean((resolved.data as any)?.matched);
          const candidate = String((resolved.data as any)?.product_id || "").trim();
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

      if (!restockProductId) {
        const ranked = rankRestockEntries(restockQueryText, restockKbEntries);
        if (hasUniqueAnswerCandidate(ranked.length)) {
          const item = ranked[0].entry;
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
          return respond({
            session_id: sessionId,
            step: "final",
            message: reply,
            mcp_actions: mcpActions,
            quick_replies: [
              { label: "재입고 알림 신청", value: "네" },
              { label: "대화 종료", value: "대화 종료" },
            ],
            product_cards: [],
          });
        }
        if (hasChoiceAnswerCandidates(ranked.length)) {
          const candidateRows = ranked.map((row, idx) => ({
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
              const matched = Boolean((resolvedCandidate.data as any)?.matched);
              const productId = String((resolvedCandidate.data as any)?.product_id || "").trim();
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
              candidate.thumbnail_url = shape.thumbnailUrl || null;
            }
          }
          const lines = candidateRows.map((candidate) => {
            const due = toRestockDueText(candidate.month, candidate.day);
            return `- ${candidate.index}번 | ${candidate.product_name} | ${candidate.raw_date} (${due.dday})`;
          });
          const reply = makeReply(
            `유사한 상품이 여러 개입니다. 아래에서 번호를 선택해 주세요.\n${lines.join("\n")}`
          );
          const productCards = candidateRows.map((candidate) => ({
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
            { stage: "tool", action: "ASK_RESTOCK_PRODUCT_CHOICE", candidate_count: ranked.length },
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
      if (canUseTool("read_product") && hasAllowedToolName("read_product")) {
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
      const scheduleEntry =
        findBestRestockEntryByProductName(productView.productName || String(restockProductId), restockKbEntries);
      const scheduleLine = scheduleEntry
        ? (() => {
            const due = toRestockDueText(scheduleEntry.month, scheduleEntry.day);
            return `입고 예정: ${scheduleEntry.raw_date} (${due.dday})`;
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
          : `KB 정책: answerability=${policyAnswerability}, restock_policy=${policyRestock}${
              policyRestockAt ? `, restock_at=${policyRestockAt}` : ""
            }`;

      if (resolvedIntent === "restock_subscribe") {
        if (!restockSubscribeAcceptedThisTurn) {
          const reply = makeReply(
            `상품 ${productView.productName || restockProductId} 정보입니다.\n${scheduleLine}\n${stockLine}\n${policyLine}\n원하시면 ${restockChannel} 채널로 재입고 알림을 신청할까요?\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.`
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
        const pendingLeadDaysFromContext = Array.isArray((prevBotContext as any).pending_lead_days)
          ? ((prevBotContext as any).pending_lead_days as number[]).map((n) => Number(n)).filter((n) => Number.isFinite(n))
          : [];
        const scheduleDue = scheduleEntry ? toRestockDueText(scheduleEntry.month, scheduleEntry.day) : null;
        const availableLeadDays = scheduleDue ? availableRestockLeadDays(scheduleDue.diffDays) : [];
        const minLeadDays = availableLeadDays.length >= 3 ? 3 : Math.max(availableLeadDays.length, 1);

        if (availableLeadDays.length > 0 && pendingLeadDaysFromContext.length < minLeadDays) {
          const optionLine = availableLeadDays.map((v) => `D-${v}`).join(", ");
          const reply = makeReply(
            `예약 알림일을 선택해 주세요. (최소 ${minLeadDays}개)\n선택 가능: ${optionLine}\n쉼표(,)로 입력해 주세요. 예: ${availableLeadDays.slice(0, Math.max(minLeadDays, 3)).join(",")}`
          );
          const quickReplyConfig = {
            selection_mode: "multi" as const,
            min_select: minLeadDays,
            max_select: availableLeadDays.length,
            submit_format: "csv" as const,
            criteria: "policy:ASK_RESTOCK_SUBSCRIBE_LEAD_DAYS",
          };
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
              pending_product_name: productView.productName || null,
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
              pending_product_name: productView.productName || null,
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

        if (canUseTool("subscribe_restock") && hasAllowedToolName("subscribe_restock")) {
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
              `요약: 재입고 알림 신청이 완료되었습니다.\n상세: 상품 ${productView.productName || restockProductId} / 채널 ${restockChannel}\n${scheduleLine}\n${stockLine}\n${policyLine}\n다음 선택: 대화 종료 / 다른 문의`
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
            return respond({
              session_id: sessionId,
              step: "final",
              message: reply,
              mcp_actions: mcpActions,
              quick_replies: [
                { label: "대화 종료", value: "대화 종료" },
                { label: "다른 문의", value: "다른 문의" },
              ],
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
      }

      const inquiryReply = makeReply(
        `요약: ${productView.productName || restockProductId} 재고/입고 상태를 확인했습니다.\n상세: ${scheduleLine}\n${stockLine}\n${policyLine}\n지금 ${restockChannel} 재입고 알림 신청을 진행할까요?\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.`
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
          pending_product_name: productView.productName || null,
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
                title: productView.productName || restockProductId,
                subtitle: "상품 확인",
                description: stockLine.replace(/^현재 상태:\s*/, ""),
                image_url: productView.thumbnailUrl,
                value: "1",
              },
            ]
          : [],
      });
    }

  return null;
}
