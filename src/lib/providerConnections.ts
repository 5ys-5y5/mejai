export const SUPPORTED_PROVIDER_KEYS = ["cafe24", "juso", "solapi"] as const;

export type SupportedProviderKey = (typeof SUPPORTED_PROVIDER_KEYS)[number];

type UnknownRecord = Record<string, unknown>;

type BaseProviderConnection = UnknownRecord & {
  id: string;
  label: string;
  updated_at: string;
  is_active: boolean;
};

export type Cafe24Connection = BaseProviderConnection & {
  mall_id: string;
  shop_no: string;
  board_no: string;
  expires_at: string;
  mall_domain: string;
  access_token: string;
  refresh_token: string;
  last_refresh_error: string | null;
  attempted_candidates: string[];
  last_refresh_attempt_at: string;
  refresh_token_candidates: string[];
  api_version?: string;
};

export type JusoConnection = BaseProviderConnection & {
  juso_api_key: string;
};

export type SolapiConnection = BaseProviderConnection & {
  solapi_api_key: string;
  solapi_api_secret: string;
  solapi_from: string;
  solapi_temp: string;
  solapi_bypass: boolean;
};

export type SupportedProviderConnectionMap = {
  cafe24: Cafe24Connection;
  juso: JusoConnection;
  solapi: SolapiConnection;
};

export type SupportedProviderState<K extends SupportedProviderKey = SupportedProviderKey> = {
  connections: Array<SupportedProviderConnectionMap[K]>;
};

export type ProviderConnectionCommand<K extends SupportedProviderKey = SupportedProviderKey> = {
  mode: "create_connection" | "update_connection" | "delete_connection";
  connectionId?: string;
  values?: Partial<SupportedProviderConnectionMap[K]> & Record<string, unknown>;
};

export const SUPPORTED_PROVIDER_META: Record<
  SupportedProviderKey,
  { label: string; description: string; summaryLabel: string }
> = {
  cafe24: {
    label: "Cafe24",
    description: "mall_id, OAuth token, shop_no, board_no를 connection 단위로 관리합니다.",
    summaryLabel: "mall_id",
  },
  juso: {
    label: "Juso",
    description: "주소 검색 API key를 connection 단위로 관리합니다.",
    summaryLabel: "api key",
  },
  solapi: {
    label: "Solapi",
    description: "문자/알림톡 자격정보를 connection 단위로 관리합니다.",
    summaryLabel: "발신 정보",
  },
};

const CAFE24_KNOWN_KEYS = new Set([
  "id",
  "label",
  "updated_at",
  "is_active",
  "mall_id",
  "shop_no",
  "board_no",
  "expires_at",
  "mall_domain",
  "access_token",
  "refresh_token",
  "last_refresh_error",
  "attempted_candidates",
  "last_refresh_attempt_at",
  "refresh_token_candidates",
  "api_version",
]);

const JUSO_KNOWN_KEYS = new Set(["id", "label", "updated_at", "is_active", "juso_api_key"]);

const SOLAPI_KNOWN_KEYS = new Set([
  "id",
  "label",
  "updated_at",
  "is_active",
  "solapi_api_key",
  "solapi_api_secret",
  "solapi_from",
  "solapi_temp",
  "solapi_bypass",
]);

function toRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as UnknownRecord;
}

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = toText(value);
  return text.length > 0 ? text : null;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "n") return false;
  }
  return fallback;
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)));
  }
  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }
  return [];
}

function normalizeCsvNumbers(value: unknown) {
  return toStringArray(value)
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((left, right) => Number(left) - Number(right))
    .join(",");
}

function sanitizeIdPart(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "default";
}

export function generateProviderConnectionId(providerKey: SupportedProviderKey) {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return `${providerKey}-${globalThis.crypto.randomUUID()}`;
  }
  return `${providerKey}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildLegacyConnectionId(providerKey: SupportedProviderKey, raw: UnknownRecord) {
  if (providerKey === "cafe24") {
    return `legacy-${providerKey}-${sanitizeIdPart(toText(raw.mall_id) || toText(raw.mall_domain))}`;
  }
  if (providerKey === "juso") {
    return `legacy-${providerKey}-${sanitizeIdPart(toText(raw.label) || toText(raw.juso_api_key).slice(-6))}`;
  }
  return `legacy-${providerKey}-${sanitizeIdPart(toText(raw.label) || toText(raw.solapi_from) || toText(raw.solapi_api_key).slice(-6))}`;
}

function pickExtras(source: UnknownRecord, knownKeys: Set<string>) {
  const next: UnknownRecord = {};
  for (const [key, value] of Object.entries(source)) {
    if (knownKeys.has(key) || key === "connections") continue;
    next[key] = value;
  }
  return next;
}

function hasLegacyFields(providerKey: SupportedProviderKey, raw: UnknownRecord) {
  if (providerKey === "cafe24") {
    return [
      "mall_id",
      "shop_no",
      "board_no",
      "expires_at",
      "mall_domain",
      "access_token",
      "refresh_token",
      "last_refresh_error",
      "attempted_candidates",
      "last_refresh_attempt_at",
      "refresh_token_candidates",
      "api_version",
    ].some((key) => raw[key] !== undefined);
  }
  if (providerKey === "juso") {
    return ["juso_api_key", "label", "is_active"].some((key) => raw[key] !== undefined);
  }
  return [
    "solapi_api_key",
    "solapi_api_secret",
    "solapi_from",
    "solapi_temp",
    "solapi_bypass",
    "label",
    "is_active",
  ].some((key) => raw[key] !== undefined);
}

function buildDefaultLabel(providerKey: SupportedProviderKey, raw: UnknownRecord) {
  const explicit = toText(raw.label);
  if (explicit) return explicit;
  if (providerKey === "cafe24") {
    return toText(raw.mall_id) || toText(raw.mall_domain) || "Cafe24 connection";
  }
  if (providerKey === "juso") {
    return "Juso connection";
  }
  return toText(raw.solapi_from) || "Solapi connection";
}

function normalizeCafe24Connection(rawValue: unknown): Cafe24Connection {
  const raw = toRecord(rawValue);
  const extras = pickExtras(raw, CAFE24_KNOWN_KEYS);
  const attemptedCandidates = toStringArray(raw.attempted_candidates);
  const refreshTokenCandidates = toStringArray(raw.refresh_token_candidates);
  const mallId = toText(raw.mall_id);
  return {
    ...extras,
    id: toText(raw.id) || buildLegacyConnectionId("cafe24", raw),
    label: buildDefaultLabel("cafe24", raw),
    updated_at: toText(raw.updated_at) || toText(raw.last_refresh_attempt_at),
    is_active: toBoolean(raw.is_active, true),
    mall_id: mallId,
    shop_no: normalizeCsvNumbers(raw.shop_no),
    board_no: normalizeCsvNumbers(raw.board_no),
    expires_at: toText(raw.expires_at),
    mall_domain: toText(raw.mall_domain),
    access_token: toText(raw.access_token),
    refresh_token: toText(raw.refresh_token),
    last_refresh_error: toNullableText(raw.last_refresh_error),
    attempted_candidates: attemptedCandidates,
    last_refresh_attempt_at: toText(raw.last_refresh_attempt_at),
    refresh_token_candidates: refreshTokenCandidates,
    api_version: toText(raw.api_version) || undefined,
  };
}

function normalizeJusoConnection(rawValue: unknown): JusoConnection {
  const raw = toRecord(rawValue);
  const extras = pickExtras(raw, JUSO_KNOWN_KEYS);
  return {
    ...extras,
    id: toText(raw.id) || buildLegacyConnectionId("juso", raw),
    label: buildDefaultLabel("juso", raw),
    updated_at: toText(raw.updated_at),
    is_active: toBoolean(raw.is_active, true),
    juso_api_key: toText(raw.juso_api_key),
  };
}

function normalizeSolapiConnection(rawValue: unknown): SolapiConnection {
  const raw = toRecord(rawValue);
  const extras = pickExtras(raw, SOLAPI_KNOWN_KEYS);
  return {
    ...extras,
    id: toText(raw.id) || buildLegacyConnectionId("solapi", raw),
    label: buildDefaultLabel("solapi", raw),
    updated_at: toText(raw.updated_at),
    is_active: toBoolean(raw.is_active, true),
    solapi_api_key: toText(raw.solapi_api_key),
    solapi_api_secret: toText(raw.solapi_api_secret),
    solapi_from: toText(raw.solapi_from),
    solapi_temp: toText(raw.solapi_temp),
    solapi_bypass: toBoolean(raw.solapi_bypass, false),
  };
}

export function isSupportedProviderKey(value: unknown): value is SupportedProviderKey {
  return SUPPORTED_PROVIDER_KEYS.includes(String(value || "").trim().toLowerCase() as SupportedProviderKey);
}

export function normalizeProviderConnection<K extends SupportedProviderKey>(
  providerKey: K,
  rawValue: unknown
): SupportedProviderConnectionMap[K] {
  if (providerKey === "cafe24") {
    return normalizeCafe24Connection(rawValue) as SupportedProviderConnectionMap[K];
  }
  if (providerKey === "juso") {
    return normalizeJusoConnection(rawValue) as SupportedProviderConnectionMap[K];
  }
  return normalizeSolapiConnection(rawValue) as SupportedProviderConnectionMap[K];
}

export function readSupportedProviderState<K extends SupportedProviderKey>(
  providersValue: unknown,
  providerKey: K
): SupportedProviderState<K> {
  const providers = toRecord(providersValue);
  const rawProvider = toRecord(providers[providerKey]);
  const rawConnections = rawProvider.connections;
  if (Array.isArray(rawConnections)) {
    return {
      connections: rawConnections.map((connection) => normalizeProviderConnection(providerKey, connection)),
    };
  }
  if (hasLegacyFields(providerKey, rawProvider)) {
    return {
      connections: [normalizeProviderConnection(providerKey, rawProvider)],
    };
  }
  return { connections: [] };
}

export function getPreferredProviderConnection<K extends SupportedProviderKey>(
  state: SupportedProviderState<K>,
  preferredConnectionId?: string | null
) {
  if (preferredConnectionId) {
    const matched = state.connections.find((connection) => connection.id === preferredConnectionId);
    if (matched) return matched;
  }
  return state.connections.find((connection) => connection.is_active) || state.connections[0] || null;
}

export function writeSupportedProviderState<K extends SupportedProviderKey>(
  providersValue: unknown,
  providerKey: K,
  state: SupportedProviderState<K>
) {
  const providers = {
    ...toRecord(providersValue),
  } as Record<string, unknown>;
  providers[providerKey] = {
    connections: state.connections.map((connection) => normalizeProviderConnection(providerKey, connection)),
  };
  return providers;
}

export function serializeProviderStateForResponse<K extends SupportedProviderKey>(
  providerKey: K,
  state: SupportedProviderState<K>,
  preferredConnectionId?: string | null
) {
  const preferred = getPreferredProviderConnection(state, preferredConnectionId);
  if (!preferred) {
    return { connections: [] as Array<SupportedProviderConnectionMap[K]> };
  }
  return {
    ...preferred,
    connections: state.connections,
  };
}

export function upsertDefaultProviderConnection<K extends SupportedProviderKey>(
  providerKey: K,
  currentState: SupportedProviderState<K>,
  values: Partial<SupportedProviderConnectionMap[K]> & Record<string, unknown>,
  nowIso = new Date().toISOString()
): SupportedProviderState<K> {
  const current = getPreferredProviderConnection(currentState) as SupportedProviderConnectionMap[K] | null;
  const merged = normalizeProviderConnection(providerKey, {
    ...(current || {}),
    ...values,
    id: current?.id || toText(values.id) || generateProviderConnectionId(providerKey),
    updated_at: nowIso,
  });
  if (!current) {
    return { connections: [merged] };
  }
  return {
    connections: currentState.connections.map((connection) => (connection.id === current.id ? merged : connection)),
  };
}

export function applyProviderConnectionCommand<K extends SupportedProviderKey>(
  providerKey: K,
  currentState: SupportedProviderState<K>,
  command: ProviderConnectionCommand<K>,
  nowIso = new Date().toISOString()
): SupportedProviderState<K> {
  if (command.mode === "create_connection") {
    const created = normalizeProviderConnection(providerKey, {
      ...(command.values || {}),
      id: toText(command.values?.id) || generateProviderConnectionId(providerKey),
      updated_at: nowIso,
    });
    return {
      connections: [...currentState.connections, created],
    };
  }

  if (!command.connectionId) {
    throw new Error("CONNECTION_ID_REQUIRED");
  }

  if (command.mode === "delete_connection") {
    return {
      connections: currentState.connections.filter((connection) => connection.id !== command.connectionId),
    };
  }

  const existing = currentState.connections.find((connection) => connection.id === command.connectionId);
  if (!existing) {
    throw new Error("CONNECTION_NOT_FOUND");
  }

  const updated = normalizeProviderConnection(providerKey, {
    ...existing,
    ...(command.values || {}),
    id: existing.id,
    updated_at: nowIso,
  });

  return {
    connections: currentState.connections.map((connection) => (connection.id === existing.id ? updated : connection)),
  };
}

export function buildProviderConnectionSummary<K extends SupportedProviderKey>(
  providerKey: K,
  connection: SupportedProviderConnectionMap[K] | null | undefined
) {
  if (!connection) return "-";
  if (providerKey === "cafe24") {
    const cafe24 = connection as Cafe24Connection;
    return cafe24.mall_id || cafe24.mall_domain || cafe24.label || "-";
  }
  if (providerKey === "juso") {
    const juso = connection as JusoConnection;
    return juso.label || (juso.juso_api_key ? "API key configured" : "-");
  }
  const solapi = connection as SolapiConnection;
  return solapi.label || solapi.solapi_from || "-";
}

export function listAvailableConnectionIdsByProvider(providersValue: unknown) {
  return SUPPORTED_PROVIDER_KEYS.reduce(
    (accumulator, providerKey) => {
      accumulator[providerKey] = new Set(
        readSupportedProviderState(providersValue, providerKey).connections.map((connection) => connection.id)
      );
      return accumulator;
    },
    {} as Record<SupportedProviderKey, Set<string>>
  );
}

export function resolveSupportedProviderConnection<K extends SupportedProviderKey>(
  providersValue: unknown,
  providerKey: K,
  preferredConnectionId?: string | null
) {
  const state = readSupportedProviderState(providersValue, providerKey);
  return getPreferredProviderConnection(state, preferredConnectionId);
}
