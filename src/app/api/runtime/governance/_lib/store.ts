import type { RuntimeEvent, RuntimeMcpAudit, RuntimeTurn } from "./detector";
import type { SupabaseClient } from "@supabase/supabase-js";

function nowIso() {
  return new Date().toISOString();
}

export async function fetchRecentTurns(input: {
  supabase: SupabaseClient;
  orgId: string;
  sessionId?: string | null;
  limit: number;
}) {
  void input.orgId;
  const query = input.supabase
    .from("D_conv_turns")
    .select("id, session_id, seq, transcript_text, answer_text, final_answer, bot_context, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(500, input.limit)));
  const scoped = input.sessionId ? query.eq("session_id", input.sessionId) : query;
  const { data, error } = await scoped;
  if (error) throw new Error(error.message);
  const rows = (data || []) as RuntimeTurn[];
  return rows;
}

export async function fetchEventsForSessions(input: {
  supabase: SupabaseClient;
  sessionIds: string[];
  limitPerSession: number;
}) {
  const out = new Map<string, RuntimeEvent[]>();
  for (const sessionId of input.sessionIds) {
    const { data, error } = await input.supabase
      .from("F_audit_events")
      .select("id, session_id, turn_id, event_type, payload, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(1000, input.limitPerSession)));
    if (error) throw new Error(error.message);
    out.set(sessionId, (data || []) as RuntimeEvent[]);
  }
  return out;
}

export async function fetchMcpForSessions(input: {
  supabase: SupabaseClient;
  sessionIds: string[];
  limitPerSession: number;
}) {
  const out = new Map<string, RuntimeMcpAudit[]>();
  for (const sessionId of input.sessionIds) {
    const { data, error } = await input.supabase
      .from("F_audit_mcp_tools")
      .select("id, session_id, turn_id, tool_name, status, request_payload, response_payload, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(1000, input.limitPerSession)));
    if (error) throw new Error(error.message);
    out.set(sessionId, (data || []) as RuntimeMcpAudit[]);
  }
  return out;
}

export async function insertAuditEvent(input: {
  supabase: SupabaseClient;
  sessionId: string | null;
  turnId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  botContext?: Record<string, unknown>;
}) {
  const { error } = await input.supabase.from("F_audit_events").insert({
    session_id: input.sessionId,
    turn_id: input.turnId,
    event_type: input.eventType,
    payload: input.payload,
    created_at: nowIso(),
    bot_context: input.botContext || {},
  });
  if (error) {
    throw new Error(`insertAuditEvent failed: ${error.message}`);
  }
}

export async function fetchProposalById(input: {
  supabase: SupabaseClient;
  proposalId: string;
  lookback: number;
  orgId?: string | null;
}) {
  const { data, error } = await input.supabase
    .from("F_audit_events")
    .select("id, session_id, turn_id, event_type, payload, bot_context, created_at")
    .eq("event_type", "RUNTIME_PATCH_PROPOSAL_CREATED")
    .order("created_at", { ascending: false })
    .limit(Math.max(50, Math.min(5000, input.lookback)));
  if (error) throw new Error(error.message);
  const rows = (data || []) as Array<RuntimeEvent & { bot_context?: Record<string, unknown> | null }>;
  return (
    rows.find((row) => {
      if (String((row.payload || {}).proposal_id || "") !== input.proposalId) return false;
      if (!input.orgId) return true;
      const payloadOrg = String(((row.payload || {}) as Record<string, unknown>).org_id || "");
      const contextOrg = String((row.bot_context || {}).org_id || "");
      if (payloadOrg && payloadOrg !== input.orgId) return false;
      if (!payloadOrg && contextOrg && contextOrg !== input.orgId) return false;
      return true;
    }) || null
  );
}
