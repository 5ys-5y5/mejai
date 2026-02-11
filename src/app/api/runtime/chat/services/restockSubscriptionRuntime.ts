import { createHmac, randomBytes } from "crypto";

type RestockSubscriptionInput = {
  orgId: string;
  sessionId: string;
  channel: string;
  phone?: string | null;
  productId?: string | null;
  productName?: string | null;
  restockAt?: string | null;
  leadDays?: number[];
  scheduleTz?: string | null;
  scheduleHourLocal?: number | null;
  topicType?: string | null;
  topicKey?: string | null;
  topicLabel?: string | null;
  intentName?: string | null;
  metadata?: Record<string, unknown> | null;
  mallId?: string | null;
};

type RestockSubscriptionResult =
  | { ok: true; data: { notification_ids: string[]; scheduled_count: number } & Record<string, unknown> }
  | { ok: false; error: string };

type SupabaseLike = {
  from: (table: string) => {
    insert: (...args: unknown[]) => { select: (...args: unknown[]) => Promise<{ data?: unknown; error?: { message?: string } }> };
    update: (...args: unknown[]) => { eq: (...args: unknown[]) => Promise<{ error?: { message?: string } }> };
    select: (...args: unknown[]) => { eq: (...args: unknown[]) => Promise<{ data?: unknown; error?: { message?: string } }> };
  };
};

type RuntimeContext = { supabase: SupabaseLike; runtimeTurnId?: string | null };

function normalizeLeadDays(values?: number[]) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))).sort(
    (a, b) => a - b
  );
}

function normalizeScheduleHour(value?: number | null) {
  const hour = Number(value);
  if (!Number.isFinite(hour)) return 17;
  return Math.max(0, Math.min(23, Math.floor(hour)));
}

function computeScheduledFor(restockAt: string | null, leadDay: number, scheduleHourLocal: number, scheduleTz?: string | null) {
  if (!restockAt) return null;
  const match = restockAt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const tz = String(scheduleTz || "Asia/Seoul");
  const offsetMinutes = tz === "Asia/Seoul" ? 9 * 60 : 0;
  const baseUtcMs = Date.UTC(year, month - 1, day, scheduleHourLocal, 0, 0) - offsetMinutes * 60 * 1000;
  const scheduledMs = baseUtcMs - Math.max(0, leadDay) * 24 * 60 * 60 * 1000;
  return new Date(scheduledMs).toISOString();
}

function buildRestockMessageText(productName: string, restockAt: string | null, leadDay: number) {
  const title = `[재입고 알림] ${productName || "상품"}`;
  const scheduleLine = restockAt ? `예정일: ${restockAt}` : "예정일: 확인된 일정 정보 없음";
  const leadLine = leadDay > 0 ? `알림: D-${leadDay}` : "";
  return [title, scheduleLine, leadLine].filter(Boolean).join("\n");
}

function readEnvValue(name: string) {
  return String(process.env[name] || "").trim();
}

function buildSolapiAuthHeader(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function sendSolapiMessageNow(params: { to: string; text: string; from: string; scheduledAt?: string | null }) {
  const apiKey = readEnvValue("SOLAPI_API_KEY");
  const apiSecret = readEnvValue("SOLAPI_API_SECRET");
  if (!apiKey || !apiSecret) {
    return { ok: false as const, error: "SOLAPI_CONFIG_MISSING" };
  }
  const auth = buildSolapiAuthHeader(apiKey, apiSecret);
  const res = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...(params.scheduledAt ? { scheduledDate: params.scheduledAt } : {}),
      messages: [
        {
          to: params.to,
          from: params.from,
          text: params.text,
        },
      ],
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    return { ok: false as const, error: `SOLAPI_ERROR_${res.status}: ${bodyText || res.statusText}` };
  }
  try {
    return { ok: true as const, data: bodyText ? JSON.parse(bodyText) : {} };
  } catch {
    return { ok: true as const, data: { raw: bodyText } };
  }
}

function extractSolapiMessageId(payload: Record<string, unknown>) {
  const direct = payload.messageId || payload.message_id;
  if (direct) return String(direct);
  const list = (payload as Record<string, unknown>).messageList;
  if (Array.isArray(list) && list.length > 0) {
    const msgId = list[0]?.messageId || list[0]?.message_id;
    if (msgId) return String(msgId);
  }
  return null;
}

export async function saveRestockSubscriptionLite(
  context: RuntimeContext,
  input: RestockSubscriptionInput
): Promise<RestockSubscriptionResult> {
  if (!context?.supabase?.from) {
    return { ok: false, error: "SUPABASE_UNAVAILABLE" };
  }
  const topicType = String(input.topicType || "restock").trim() || "restock";
  const topicKey = String(input.topicKey || input.productId || input.productName || "").trim();
  if (!topicKey) {
    return { ok: false, error: "TOPIC_KEY_REQUIRED" };
  }
  const channel = String(input.channel || "").trim();
  if (!channel) {
    return { ok: false, error: "CHANNEL_REQUIRED" };
  }
  const sessionId = String(input.sessionId || "").trim();
  if (!sessionId) {
    return { ok: false, error: "SESSION_ID_REQUIRED" };
  }
  const restockAtRaw = String(input.restockAt || "").trim();
  const restockAt = /^\d{4}-\d{2}-\d{2}$/.test(restockAtRaw) ? restockAtRaw : null;
  const leadDays = normalizeLeadDays(input.leadDays);
  const scheduleTz = String(input.scheduleTz || "Asia/Seoul");
  const scheduleHourLocal = normalizeScheduleHour(input.scheduleHourLocal);
  const leadDaysToSchedule = leadDays.length > 0 ? leadDays : [0];
  const productName = input.productName ? String(input.productName) : null;

  const rows = leadDaysToSchedule.map((leadDay) => ({
    org_id: input.orgId,
    mall_id: input.mallId || null,
    session_id: sessionId,
    channel,
    phone: input.phone ? String(input.phone) : null,
    category: "restock",
    topic_type: topicType,
    topic_key: topicKey,
    topic_label: input.topicLabel ? String(input.topicLabel) : null,
    product_id: input.productId ? String(input.productId) : null,
    product_name: productName,
    restock_at: restockAt,
    lead_day: leadDay,
    scheduled_for: computeScheduledFor(restockAt, leadDay, scheduleHourLocal, scheduleTz),
    template_key: "restock_lead_day",
    template_vars: {
      product_name: productName,
      restock_at: restockAt,
      lead_day: leadDay,
      channel,
    },
    message_text: buildRestockMessageText(productName || topicKey, restockAt, leadDay),
    status: "pending",
    attempts: 0,
    last_error: null,
    sent_at: null,
    solapi_message_id: null,
    schedule_tz: scheduleTz,
    schedule_hour_local: scheduleHourLocal,
    intent_name: input.intentName ? String(input.intentName) : null,
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await context.supabase.from("E_ops_notification_messages").insert(rows).select("id");

  if (error) {
    if (/relation .*E_ops_notification_messages.* does not exist/i.test(error.message || "")) {
      return { ok: false, error: "NOTIFICATION_TABLE_MISSING" };
    }
    return { ok: false, error: error.message };
  }

  const ids = Array.isArray(data)
    ? data.map((row) => String((row as Record<string, unknown>)?.id || "").trim()).filter(Boolean)
    : [];
  const nowIso = new Date().toISOString();
  const runtimeTurnId = String((context as { runtimeTurnId?: unknown })?.runtimeTurnId || "").trim() || null;
  const insertDispatchAuditEvent = async (eventType: string, payload: Record<string, unknown>) => {
    try {
      await context.supabase.from("F_audit_events").insert({
        session_id: sessionId,
        turn_id: runtimeTurnId,
        event_type: eventType,
        payload,
        created_at: new Date().toISOString(),
        bot_context: { intent_name: input.intentName || "restock_subscribe" },
      });
    } catch {
      // Audit write should never break subscribe flow.
    }
  };
  const insertDeliveryOutcomeEvent = async (
    eventType: "RESTOCK_SMS_SENT" | "RESTOCK_SMS_SCHEDULED" | "RESTOCK_SMS_FAILED" | "RESTOCK_SMS_SCHEDULE_FAILED",
    payload: Record<string, unknown>
  ) => {
    try {
      await context.supabase.from("F_audit_events").insert({
        session_id: sessionId,
        turn_id: runtimeTurnId,
        event_type: eventType,
        payload,
        created_at: new Date().toISOString(),
        bot_context: { intent_name: input.intentName || "restock_subscribe" },
      });
    } catch {
      // Outcome audit write should not break flow.
    }
  };
  await insertDispatchAuditEvent("RESTOCK_SUBSCRIBE_DISPATCH_STARTED", {
    notification_ids: ids,
    scheduled_count: rows.length,
    channel,
    external_action_name: "restock_sms_dispatch",
    external_provider: "solapi",
    external_ack_required: true,
    bypass_enabled: String(process.env.SOLAPI_BYPASS || "").trim().toLowerCase(),
  });

  // Immediately send or schedule via Solapi when possible.
  const bypass = String(process.env.SOLAPI_BYPASS || "").trim().toLowerCase();
  const bypassEnabled = bypass === "1" || bypass === "true" || bypass === "y" || bypass === "yes";
  const from = readEnvValue("SOLAPI_FROM");
  let sentCount = 0;
  let scheduledCount = 0;
  let failedCount = 0;
  const outcomes: Array<{ id: string; status: string; reason: string | null }> = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const id = ids[i];
    if (!id || !row.phone || row.channel !== "sms") continue;
    const scheduledAt =
      row.scheduled_for && Date.parse(String(row.scheduled_for)) > Date.now()
        ? new Date(String(row.scheduled_for)).toISOString()
        : null;
    let sendOk = false;
    let sendError: string | null = null;
    let solapiMessageId: string | null = null;
    if (bypassEnabled) {
      sendOk = true;
      sendError = "SOLAPI_BYPASS";
    } else if (!from) {
      sendError = "SOLAPI_FROM_MISSING";
    } else {
      const sent = await sendSolapiMessageNow({
        to: String(row.phone),
        from,
        text: String(row.message_text || ""),
        scheduledAt,
      });
      if (!sent.ok) {
        sendError = sent.error;
      } else {
        sendOk = true;
        solapiMessageId = extractSolapiMessageId((sent.data || {}) as Record<string, unknown>);
      }
    }
    if (sendOk) {
      const scheduledStatus = scheduledAt ? "scheduled" : "sent";
      await context.supabase
        .from("E_ops_notification_messages")
        .update({
          status: scheduledStatus,
          attempts: 1,
          sent_at: scheduledAt ? null : nowIso,
          last_error: bypassEnabled ? sendError : null,
          solapi_registered: !bypassEnabled,
          solapi_register_error: bypassEnabled ? sendError : null,
          solapi_message_id: solapiMessageId,
          updated_at: nowIso,
        })
        .eq("id", id);
      if (scheduledAt) scheduledCount += 1;
      else sentCount += 1;
      outcomes.push({ id, status: scheduledStatus, reason: bypassEnabled ? sendError : null });
      await insertDeliveryOutcomeEvent(scheduledAt ? "RESTOCK_SMS_SCHEDULED" : "RESTOCK_SMS_SENT", {
        message_id: id,
        notification_id: id,
        channel: row.channel,
        external_action_name: "restock_sms_dispatch",
        external_provider: "solapi",
        external_ack_required: true,
        external_ack_received: Boolean(solapiMessageId) && !bypassEnabled,
        external_ack_id: solapiMessageId,
        provider_response_received: Boolean(solapiMessageId) && !bypassEnabled,
        phone_masked: row.phone ? `${String(row.phone).slice(0, 3)}****${String(row.phone).slice(-4)}` : null,
        scheduled_for: row.scheduled_for || null,
        bypass: bypassEnabled,
        bypass_reason: bypassEnabled ? sendError : null,
        solapi_message_id: solapiMessageId,
      });
    } else if (sendError) {
      await context.supabase
        .from("E_ops_notification_messages")
        .update({
          status: "failed",
          attempts: 1,
          last_error: sendError,
          solapi_registered: false,
          solapi_register_error: sendError,
          updated_at: nowIso,
        })
        .eq("id", id);
      failedCount += 1;
      outcomes.push({ id, status: "failed", reason: sendError });
      await insertDeliveryOutcomeEvent(
        row.scheduled_for && Date.parse(String(row.scheduled_for)) > Date.now()
          ? "RESTOCK_SMS_SCHEDULE_FAILED"
          : "RESTOCK_SMS_FAILED",
        {
          message_id: id,
          notification_id: id,
          channel: row.channel,
          external_action_name: "restock_sms_dispatch",
          external_provider: "solapi",
          external_ack_required: true,
          external_ack_received: false,
          external_ack_id: null,
          provider_response_received: false,
          phone_masked: row.phone ? `${String(row.phone).slice(0, 3)}****${String(row.phone).slice(-4)}` : null,
          scheduled_for: row.scheduled_for || null,
          error: sendError,
        }
      );
    }
  }
  await insertDispatchAuditEvent("RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED", {
    notification_ids: ids,
    sent_count: sentCount,
    scheduled_count: scheduledCount,
    failed_count: failedCount,
    external_action_name: "restock_sms_dispatch",
    external_provider: "solapi",
    external_ack_required: true,
    outcomes,
  });

  return {
    ok: true,
    data: {
      notification_ids: ids,
      scheduled_count: rows.length,
    },
  };
}
