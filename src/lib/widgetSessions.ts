import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type WidgetSessionInput = {
  sessionId?: string | null;
  templateId: string;
  instanceId?: string | null;
  origin?: string | null;
  pageUrl?: string | null;
  referrer?: string | null;
  visitorId?: string | null;
  visitor?: Record<string, unknown> | null;
  createIfMissing: boolean;
};

type SessionRow = {
  id: string;
  metadata?: Record<string, unknown> | null;
};

function nowIso() {
  return new Date().toISOString();
}

function makeSessionCode() {
  return `w_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sessionMatchesWidgetContext(row: SessionRow, input: WidgetSessionInput) {
  const metadata = normalizeRecord(row.metadata);
  if (!metadata) return true;

  const metadataTemplateId = normalizeText(metadata.template_id);
  const metadataInstanceId = normalizeText(metadata.widget_instance_id);
  const metadataVisitorId =
    normalizeText(metadata.visitor_id) ||
    normalizeText(metadata.visitorId) ||
    normalizeText(metadata.external_user_id);

  if (metadataTemplateId && metadataTemplateId !== input.templateId) {
    return false;
  }

  if (input.instanceId) {
    if (metadataInstanceId && metadataInstanceId !== input.instanceId) {
      return false;
    }
  } else if (metadataInstanceId) {
    return false;
  }

  if (input.visitorId && metadataVisitorId && metadataVisitorId !== input.visitorId) {
    return false;
  }

  return true;
}

function buildWidgetSessionMetadata(input: WidgetSessionInput) {
  return {
    widget_instance_id: input.instanceId || null,
    template_id: input.templateId,
    origin: normalizeText(input.origin) || null,
    page_url: normalizeText(input.pageUrl) || null,
    referrer: normalizeText(input.referrer) || null,
    visitor_id: normalizeText(input.visitorId) || null,
    visitor: normalizeRecord(input.visitor),
  };
}

export async function ensureWidgetSession(
  supabaseAdmin: SupabaseClient,
  input: WidgetSessionInput
) {
  let sessionId = normalizeText(input.sessionId);

  if (sessionId) {
    const { data: existing, error } = await supabaseAdmin
      .from("D_conv_sessions")
      .select("id, metadata")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "WIDGET_SESSION_LOOKUP_FAILED");
    }

    if (!existing || !sessionMatchesWidgetContext(existing as SessionRow, input)) {
      sessionId = "";
    }
  }

  if (sessionId || !input.createIfMissing) {
    return { sessionId, created: false };
  }

  sessionId = crypto.randomUUID();
  const { error: insertError } = await supabaseAdmin.from("D_conv_sessions").insert({
    id: sessionId,
    session_code: makeSessionCode(),
    started_at: nowIso(),
    channel: "web_widget",
    metadata: buildWidgetSessionMetadata(input),
  });

  if (insertError) {
    throw new Error(insertError.message || "WIDGET_SESSION_CREATE_FAILED");
  }

  return { sessionId, created: true };
}
