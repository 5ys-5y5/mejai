import crypto from "crypto";

export type WidgetTokenPayload = {
  org_id: string | null;
  widget_id: string;
  template_id: string;
  instance_id: string | null;
  session_id: string;
  visitor_id: string | null;
  origin: string | null;
  exp: number;
};

type RawWidgetTokenPayload = Partial<WidgetTokenPayload> & {
  widget_id?: string | null;
  template_id?: string | null;
  instance_id?: string | null;
};

function readSecret() {
  return String(process.env.WIDGET_TOKEN_SECRET || "").trim();
}

function normalizeNullableString(value: unknown) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function base64UrlEncode(input: string | Buffer) {
  const buff = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf-8");
  return buff
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function sign(value: string, secret: string) {
  return base64UrlEncode(crypto.createHmac("sha256", secret).update(value).digest());
}

export function issueWidgetToken(
  payload: Omit<WidgetTokenPayload, "exp" | "widget_id"> & { widget_id?: string | null },
  ttlSec = 3600
) {
  const secret = readSecret();
  if (!secret) {
    throw new Error("WIDGET_TOKEN_SECRET_MISSING");
  }
  const templateId = String(payload.template_id || "").trim();
  const instanceId = normalizeNullableString(payload.instance_id);
  const widgetId = String(payload.widget_id || instanceId || templateId).trim();
  if (!widgetId) {
    throw new Error("WIDGET_TOKEN_TARGET_MISSING");
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body: WidgetTokenPayload = {
    org_id: normalizeNullableString(payload.org_id),
    widget_id: widgetId,
    template_id: templateId,
    instance_id: instanceId,
    session_id: String(payload.session_id || "").trim(),
    visitor_id: normalizeNullableString(payload.visitor_id),
    origin: normalizeNullableString(payload.origin),
    exp,
  };
  const encoded = base64UrlEncode(JSON.stringify(body));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifyWidgetToken(token: string | null | undefined): WidgetTokenPayload | null {
  const secret = readSecret();
  if (!secret) return null;
  const raw = String(token || "").trim();
  if (!raw) return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded, secret);
  const sigBuff = Buffer.from(signature);
  const expBuff = Buffer.from(expected);
  if (sigBuff.length !== expBuff.length) return null;
  if (!crypto.timingSafeEqual(sigBuff, expBuff)) return null;
  let payload: RawWidgetTokenPayload | null = null;
  try {
    payload = JSON.parse(base64UrlDecode(encoded)) as RawWidgetTokenPayload;
  } catch {
    return null;
  }
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

  const templateId = String(payload.template_id || "").trim();
  const widgetId = String(payload.widget_id || "").trim();
  const instanceId = normalizeNullableString(payload.instance_id) || (!templateId && widgetId ? widgetId : null);
  const normalizedWidgetId = widgetId || instanceId || templateId;
  if (!normalizedWidgetId) return null;

  return {
    org_id: normalizeNullableString(payload.org_id),
    widget_id: normalizedWidgetId,
    template_id: templateId,
    instance_id: instanceId,
    session_id: String(payload.session_id || "").trim(),
    visitor_id: normalizeNullableString(payload.visitor_id),
    origin: normalizeNullableString(payload.origin),
    exp: Number(payload.exp),
  };
}

export function readWidgetTokenInstanceId(payload: WidgetTokenPayload) {
  return String(payload.instance_id || "").trim();
}

export function readWidgetTokenTemplateId(payload: WidgetTokenPayload) {
  return String(payload.template_id || "").trim();
}
