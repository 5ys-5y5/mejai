import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

type QueueRow = {
  id: string;
  subscription_id: string;
  org_id: string | null;
  mall_id: string | null;
  session_id: string | null;
  phone: string;
  channel: string;
  product_id: string;
  topic_type: string | null;
  topic_key: string | null;
  topic_label: string | null;
  intent_name: string | null;
  restock_at: string | null;
  lead_day: number;
  scheduled_for: string;
  message_text: string | null;
  attempts: number;
};

function readCronSecret() {
  return (process.env.CRON_SECRET || "").trim();
}

function readProvidedSecret(req: NextRequest) {
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  return (headerSecret || bearer).trim();
}

function isEnvTrue(name: string) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "y" || v === "yes";
}

function buildSolapiAuthHeader(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function sendSms(to: string, text: string, from: string, scheduledAt?: string | null) {
  const apiKey = String(process.env.SOLAPI_API_KEY || "").trim();
  const apiSecret = String(process.env.SOLAPI_API_SECRET || "").trim();
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
      ...(scheduledAt ? { scheduledDate: scheduledAt } : {}),
      messages: [
        {
          to,
          from,
          text,
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

export async function GET(req: NextRequest) {
  const expected = readCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET_NOT_CONFIGURED" }, { status: 500 });
  }
  const provided = readProvidedSecret(req);
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SUPABASE_ADMIN_INIT_FAILED" },
      { status: 500 }
    );
  }

  const batch = Math.max(1, Math.min(200, Number(req.nextUrl.searchParams.get("batch") || 50)));
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("G_com_restock_message_queue")
    .select("id,subscription_id,org_id,mall_id,session_id,phone,channel,product_id,topic_type,topic_key,topic_label,intent_name,restock_at,lead_day,scheduled_for,message_text,attempts")
    .eq("status", "pending")
    .order("scheduled_for", { ascending: true })
    .limit(batch);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as QueueRow[];
  const bypass = isEnvTrue("SOLAPI_BYPASS");
  const from = String(process.env.SOLAPI_FROM || "").trim();
  const summary = {
    scanned: rows.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    bypass,
    errors: [] as Array<{ queue_id: string; reason: string }>,
  };

  for (const row of rows) {
    const topicLabel = row.topic_label || row.topic_key || row.product_id;
    const baseText = row.message_text || `[알림] ${topicLabel}`;
    const text = row.restock_at
      ? `${baseText}\n예정일: ${row.restock_at}`
      : baseText;

    if (row.channel !== "sms") {
      summary.skipped += 1;
      await supabase
        .from("G_com_restock_message_queue")
        .update({ status: "canceled", last_error: "UNSUPPORTED_CHANNEL", updated_at: nowIso })
        .eq("id", row.id);
      continue;
    }

    if (!row.phone) {
      summary.failed += 1;
      summary.errors.push({ queue_id: row.id, reason: "PHONE_MISSING" });
      await supabase
        .from("G_com_restock_message_queue")
        .update({ status: "failed", attempts: row.attempts + 1, last_error: "PHONE_MISSING", updated_at: nowIso })
        .eq("id", row.id);
      continue;
    }

    let sendOk = false;
    let sendError: string | null = null;
    let solapiMessageId: string | null = null;

    if (bypass) {
      sendOk = true;
    } else if (!from) {
      sendError = "SOLAPI_FROM_MISSING";
    } else {
      const scheduledAt = Date.parse(row.scheduled_for) > Date.now() ? new Date(row.scheduled_for).toISOString() : null;
      const sent = await sendSms(row.phone, text, from, scheduledAt);
      if (!sent.ok) {
        sendError = sent.error;
      } else {
        sendOk = true;
        const sendData = (sent.data || {}) as Record<string, unknown>;
        const messageId = sendData.messageId || sendData.message_id || null;
        solapiMessageId = messageId ? String(messageId) : null;
      }
    }

    if (sendOk) {
      summary.sent += 1;
      await supabase
        .from("G_com_restock_message_queue")
        .update({
          status: "sent",
          attempts: row.attempts + 1,
          sent_at: nowIso,
          last_error: null,
          solapi_message_id: solapiMessageId,
          updated_at: nowIso,
        })
        .eq("id", row.id);
      await supabase
        .from("G_com_restock_subscriptions")
        .update({ last_notified_at: nowIso, last_triggered_at: nowIso, updated_at: nowIso })
        .eq("id", row.subscription_id);
      await supabase.from("F_audit_events").insert({
        session_id: row.session_id,
        turn_id: null,
        event_type: "RESTOCK_SMS_SENT",
        payload: {
          queue_id: row.id,
          subscription_id: row.subscription_id,
          product_id: row.product_id,
          lead_day: row.lead_day,
          bypass,
          solapi_message_id: solapiMessageId,
        },
        created_at: nowIso,
        bot_context: { intent_name: row.intent_name || "restock_subscribe" },
      });
      continue;
    }

    summary.failed += 1;
    if (summary.errors.length < 50) {
      summary.errors.push({ queue_id: row.id, reason: sendError || "SEND_FAILED" });
    }
    await supabase
      .from("G_com_restock_message_queue")
      .update({
        status: "failed",
        attempts: row.attempts + 1,
        last_error: sendError || "SEND_FAILED",
        updated_at: nowIso,
      })
      .eq("id", row.id);
    await supabase.from("F_audit_events").insert({
      session_id: row.session_id,
      turn_id: null,
      event_type: "RESTOCK_SMS_FAILED",
      payload: {
        queue_id: row.id,
        subscription_id: row.subscription_id,
        product_id: row.product_id,
        lead_day: row.lead_day,
        error: sendError || "SEND_FAILED",
      },
      created_at: nowIso,
      bot_context: { intent_name: row.intent_name || "restock_subscribe" },
    });
  }

  return NextResponse.json(summary);
}
