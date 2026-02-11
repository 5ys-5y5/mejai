export type SessionState = {
  sessionId: string;
  reusedSession: boolean;
  recentTurns: Array<Record<string, unknown>>;
  firstTurnInSession: boolean;
  lastTurn: Record<string, unknown> | null;
  nextSeq: number;
  prevBotContext: Record<string, unknown>;
};

export async function prepareSessionState(input: {
  context: unknown;
  requestedSessionId: string;
  agentId: string | null;
  createSession: (context: unknown, agentId: string | null) => Promise<{ data?: Record<string, unknown>; error?: unknown }>;
  getRecentTurns: (context: unknown, sessionId: string, limit: number) => Promise<{ data?: Array<Record<string, unknown>> }>;
  recentTurnLimit?: number;
}): Promise<{ state?: SessionState; error?: string }> {
  const requestedSessionId = String(input.requestedSessionId || "").trim();
  let sessionId = requestedSessionId;
  if (!sessionId) {
    const agentId = String(input.agentId || "").trim() || null;
    const sessionRes = await input.createSession(input.context, agentId);
    if (!sessionRes?.data?.id) {
      return { error: String(sessionRes?.error || "SESSION_CREATE_FAILED") };
    }
    sessionId = String(sessionRes.data.id);
  }

  const recentLimit = Number(input.recentTurnLimit || 15);
  const recentTurnsRes = await input.getRecentTurns(input.context, sessionId, recentLimit);
  const recentTurns = (recentTurnsRes?.data || []) as Array<Record<string, unknown>>;
  const lastTurn = recentTurns[0] as Record<string, unknown> | undefined;

  return {
    state: {
      sessionId,
      reusedSession: Boolean(requestedSessionId),
      recentTurns,
      firstTurnInSession: recentTurns.length === 0,
      lastTurn: lastTurn || null,
      nextSeq: lastTurn?.seq ? Number(lastTurn.seq) + 1 : 1,
      prevBotContext: (lastTurn?.bot_context || {}) as Record<string, unknown>,
    },
  };
}
