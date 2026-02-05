function nowIso() {
  return new Date().toISOString();
}

export async function insertEvent(
  context: any,
  sessionId: string,
  turnId: string | null,
  eventType: string,
  payload: Record<string, unknown>,
  botContext: Record<string, unknown>
) {
  try {
    await context.supabase.from("F_audit_events").insert({
      session_id: sessionId,
      turn_id: turnId,
      event_type: eventType,
      payload,
      created_at: nowIso(),
      bot_context: botContext,
    });
  } catch (error) {
    console.warn("[runtime/chat_mk2] failed to insert event log", {
      eventType,
      sessionId,
      turnId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function upsertDebugLog(
  context: any,
  payload: { sessionId: string; turnId: string; seq?: number | null; prefixJson: Record<string, unknown> | null }
) {
  if (!payload.prefixJson) return;
  try {
    await context.supabase.from("F_audit_turn_specs").upsert(
      {
        session_id: payload.sessionId,
        turn_id: payload.turnId,
        seq: payload.seq ?? null,
        prefix_json: payload.prefixJson,
        created_at: nowIso(),
      },
      { onConflict: "turn_id" }
    );
  } catch (error) {
    console.warn("[runtime/chat_mk2] failed to upsert debug log", {
      sessionId: payload.sessionId,
      turnId: payload.turnId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function insertFinalTurn(
  context: any,
  payload: Record<string, unknown>,
  prefixJson: Record<string, unknown> | null
) {
  const { data, error } = await context.supabase.from("D_conv_turns").insert(payload).select("*").single();
  if (!error && data?.id && data?.session_id) {
    await upsertDebugLog(context, {
      sessionId: data.session_id,
      turnId: data.id,
      seq: data.seq,
      prefixJson,
    });
  }
  return { data, error };
}

