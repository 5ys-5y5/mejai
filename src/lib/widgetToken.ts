import crypto from "crypto";

type WidgetTokenPayload = {
  org_id: string;
  widget_id: string;
  session_id: string;
  visitor_id: string | null;
  origin: string | null;
  exp: number;
};

function readSecret() {
  return String(process.env.WIDGET_TOKEN_SECRET || "").trim();
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

export function issueWidgetToken(payload: Omit<WidgetTokenPayload, "exp">, ttlSec = 3600) {
  const secret = readSecret();
  if (!secret) {
    throw new Error("WIDGET_TOKEN_SECRET_MISSING");
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body: WidgetTokenPayload = { ...payload, exp };
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
  let payload: WidgetTokenPayload | null = null;
  try {
    payload = JSON.parse(base64UrlDecode(encoded)) as WidgetTokenPayload;
  } catch {
    return null;
  }
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
