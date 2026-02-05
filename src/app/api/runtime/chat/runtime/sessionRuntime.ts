export type SessionState = {
  sessionId: string;
  reusedSession: boolean;
  recentTurns: any[];
  firstTurnInSession: boolean;
  lastTurn: any;
  nextSeq: number;
  prevBotContext: Record<string, unknown>;
};

export async function prepareSessionState(input: {
  context: any;
  requestedSessionId: string;
  agentId: string | null;
  createSession: (context: any, agentId: string | null) => Promise<any>;
  getRecentTurns: (context: any, sessionId: string, limit: number) => Promise<any>;
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
  const recentTurns = (recentTurnsRes?.data || []) as any[];
  const lastTurn = recentTurns[0] as any;

  return {
    state: {
      sessionId,
      reusedSession: Boolean(requestedSessionId),
      recentTurns,
      firstTurnInSession: recentTurns.length === 0,
      lastTurn,
      nextSeq: lastTurn?.seq ? Number(lastTurn.seq) + 1 : 1,
      prevBotContext: (lastTurn?.bot_context || {}) as Record<string, unknown>,
    },
  };
}
