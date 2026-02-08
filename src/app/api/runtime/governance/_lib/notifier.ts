type NotifyPayload = {
  type: string;
  proposal_id?: string;
  violation_id?: string;
  runtime_scope?: string;
  session_id?: string;
  turn_id?: string;
  summary?: string;
  detail?: Record<string, unknown>;
};

export async function notifyAdmins(payload: NotifyPayload) {
  const webhook = String(process.env.RUNTIME_ADMIN_WEBHOOK_URL || "").trim();
  if (!webhook) return { ok: false as const, reason: "WEBHOOK_NOT_CONFIGURED" };
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });
    if (!response.ok) {
      return { ok: false as const, reason: `WEBHOOK_FAILED_${response.status}` };
    }
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

