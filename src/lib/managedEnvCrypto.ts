import crypto from "crypto";

type EncryptedPayloadV1 = {
  v: 1;
  iv: string;
  tag: string;
  data: string;
};

function getKey() {
  const raw = String(process.env.RUNTIME_ENV_ENC_KEY || "").trim();
  if (!raw) {
    console.warn("[managedEnv] RUNTIME_ENV_ENC_KEY is missing");
    return null;
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("RUNTIME_ENV_ENC_KEY must be base64-encoded 32 bytes");
  }
  return buf;
}

export function encryptManagedEnv(values: Record<string, unknown>): EncryptedPayloadV1 {
  const key = getKey();
  if (!key) {
    throw new Error("RUNTIME_ENV_ENC_KEY is missing");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(values), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptManagedEnv(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const data = payload as EncryptedPayloadV1;
  if (data.v !== 1 || !data.iv || !data.tag || !data.data) return {};
  const key = getKey();
  if (!key) {
    throw new Error("RUNTIME_ENV_ENC_KEY is missing");
  }
  const iv = Buffer.from(data.iv, "base64");
  const tag = Buffer.from(data.tag, "base64");
  const ciphertext = Buffer.from(data.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  const parsed = JSON.parse(plaintext);
  if (!parsed || typeof parsed !== "object") return {};
  return parsed as Record<string, unknown>;
}
