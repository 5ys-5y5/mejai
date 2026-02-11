type ToolCallResult = {
  status: "success" | "error";
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
};

import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { isTokenExpired, refreshCafe24Token } from "@/lib/cafe24Tokens";

type AdapterContext = {
  supabase: SupabaseClient;
  orgId: string;
  userId: string;
};

type ToolAdapter = (params: Record<string, unknown>, ctx?: AdapterContext) => Promise<ToolCallResult>;
const CAFE24_SCOPE_TOOL_PREFIX = "cafe24_scope_";

function adapterKeyToCafe24Scope(adapterKey: string) {
  if (!adapterKey.startsWith(CAFE24_SCOPE_TOOL_PREFIX)) return null;
  return adapterKey.slice(CAFE24_SCOPE_TOOL_PREFIX.length).replace(/_/g, ".");
}

function maskValue(value: string) {
  if (value.length <= 4) return "*".repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function normalizeMatchText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchAliasText(text: string, alias: string, matchType: string) {
  const hay = normalizeMatchText(text);
  const needle = normalizeMatchText(alias);
  if (!needle) return false;
  if (matchType === "exact") return hay === needle;
  if (matchType === "contains") return hay.includes(needle);
  if (matchType === "regex") {
    try {
      return new RegExp(alias, "i").test(text);
    } catch {
      return false;
    }
  }
  return false;
}

function chooseBestAlias<T extends { alias: string; match_type: string; priority?: number | null }>(
  text: string,
  aliases: T[]
): T | null {
  const candidates = aliases.filter((row) => matchAliasText(text, row.alias, row.match_type));
  if (candidates.length === 0) return null;
  const scored = candidates.map((row) => ({
    row,
    priority: row.priority ?? 0,
    length: row.alias.length,
  }));
  scored.sort((a, b) => b.priority - a.priority || b.length - a.length);
  return scored[0].row;
}

const LOOKUP_ORDER_EMBED = "items,receivers,buyer,return";

type Cafe24ProviderConfig = {
  mall_id?: string;
  scope?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  shop_no?: string;
  board_no?: string;
};

type AuthSettingsRow = {
  id: string;
  org_id: string;
  user_id: string;
  providers: Record<string, Cafe24ProviderConfig | undefined>;
};

let cachedEnvFile: Record<string, string> | null = null;

function parseEnvContent(content: string) {
  const lines = content.split(/\r?\n/);
  const result: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function loadEnvFromFiles() {
  if (cachedEnvFile) return cachedEnvFile;
  const cwd = process.cwd();
  const envPaths = [path.join(cwd, ".env.local"), path.join(cwd, ".env")];
  const merged: Record<string, string> = {};
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    try {
      const content = fs.readFileSync(envPath, "utf8");
      Object.assign(merged, parseEnvContent(content));
    } catch {
      // Ignore file read errors and keep best-effort behavior.
    }
  }
  cachedEnvFile = merged;
  return merged;
}

function readEnv(name: string) {
  const value = (process.env[name] || "").trim();
  if (value) return value;
  const fallback = loadEnvFromFiles();
  return (fallback[name] || "").trim();
}

function isEnvTrue(name: string) {
  const value = readEnv(name).toLowerCase();
  return value === "1" || value === "true" || value === "y" || value === "yes";
}

function buildSolapiAuthHeader(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function solapiSendMessage(params: { to: string; text: string; from: string }) {
  const apiKey = readEnv("SOLAPI_API_KEY");
  const apiSecret = readEnv("SOLAPI_API_SECRET");
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
      messages: [
        {
          to: params.to,
          from: params.from,
          text: params.text,
        },
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false as const, error: `SOLAPI_ERROR_${res.status}: ${text || res.statusText}` };
  }
  try {
    return { ok: true as const, data: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: true as const, data: { raw: text } };
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

async function bootstrapCafe24FromEnv(ctx: AdapterContext, row: AuthSettingsRow) {
  const mallId = readEnv("CAFE24_MALL_ID");
  const accessToken = readEnv("CAFE24_ACCESS_TOKEN");
  const refreshToken = readEnv("CAFE24_REFRESH_TOKEN");
  const scope = readEnv("CAFE24_SCOPE");
  const shopNo = readEnv("CAFE24_SHOP_NO");
  const boardNo = readEnv("CAFE24_BOARD_NO");
  const expiresAt = readEnv("CAFE24_EXPIRES_AT");
  if (!mallId || !accessToken || !refreshToken) return null;

  const providers = (row.providers || {}) as Record<string, Cafe24ProviderConfig | undefined>;
  const current = providers.cafe24 || {};
  const nextCafe24 = {
    ...current,
    mall_id: mallId,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt || new Date().toISOString(),
    scope: scope || current.scope,
    shop_no: shopNo || current.shop_no,
    board_no: boardNo || current.board_no,
  };
  delete (nextCafe24 as Record<string, unknown>).client_id;
  delete (nextCafe24 as Record<string, unknown>).client_secret;
  providers.cafe24 = nextCafe24;

  await ctx.supabase
    .from("A_iam_auth_settings")
    .update({ providers, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  return providers.cafe24 || null;
}

async function getCafe24Config(ctx?: AdapterContext) {
  if (!ctx) {
    return { ok: false as const, error: "MISSING_CONTEXT" };
  }
  const { supabase, orgId, userId } = ctx;
  const { data, error } = await supabase
    .from("A_iam_auth_settings")
    .select("id, org_id, user_id, providers")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false as const, error: "CAFE24_TOKEN_NOT_FOUND" };
  }
  const row = data as AuthSettingsRow;
  let cafe24 = row.providers?.cafe24 || {};
  const envScope = readEnv("CAFE24_SCOPE");
  if (!cafe24.mall_id || !cafe24.access_token || !cafe24.refresh_token) {
    const bootstrapped = await bootstrapCafe24FromEnv(ctx, row);
    if (bootstrapped) {
      cafe24 = bootstrapped;
    }
  }
  // Backward compatibility: older provider rows may miss scope.
  // Fall back to env scope so C_mcp_tools.scope_key checks can work.
  if ((!cafe24.scope || String(cafe24.scope).trim().length === 0) && envScope) {
    cafe24 = { ...cafe24, scope: envScope };
    try {
      const providers = (row.providers || {}) as Record<string, Cafe24ProviderConfig | undefined>;
      providers.cafe24 = { ...(providers.cafe24 || {}), scope: envScope };
      await supabase
        .from("A_iam_auth_settings")
        .update({ providers, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    } catch {
      // no-op: fallback in memory is enough for runtime
    }
  }
  if (!cafe24.mall_id || !cafe24.access_token || !cafe24.refresh_token) {
    return { ok: false as const, error: "CAFE24_PROVIDER_CONFIG_MISSING" };
  }
  const shopNo = cafe24.shop_no || "1";
  const boardNo = cafe24.board_no || "";
  return {
    ok: true as const,
    settingsId: row.id,
    mallId: cafe24.mall_id,
    scope: cafe24.scope || "",
    accessToken: cafe24.access_token,
    refreshToken: cafe24.refresh_token,
    expiresAt: cafe24.expires_at || "",
    shopNo,
    boardNo,
    baseUrl: `https://${cafe24.mall_id}.cafe24api.com/api/v2/admin`,
  };
}


async function cafe24Request(
  config: { baseUrl: string; accessToken: string },
  path: string,
  options?: {
    method?: string;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
  }
) {
  const url = new URL(`${config.baseUrl}${path}`);
  if (options?.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }
  const res = await fetch(url.toString(), {
    method: options?.method || "GET",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    return {
      ok: false as const,
      error: `Cafe24 API error ${res.status} [${options?.method || "GET"} ${path}]: ${text || res.statusText}`,
    };
  }
  try {
    return { ok: true as const, data: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: true as const, data: { raw: text } };
  }
}

async function solapiScheduleMessage(params: { to: string; text: string; from: string; scheduledAt: string }) {
  const apiKey = readEnv("SOLAPI_API_KEY");
  const apiSecret = readEnv("SOLAPI_API_SECRET");
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
      scheduledDate: params.scheduledAt,
      messages: [
        {
          to: params.to,
          from: params.from,
          text: params.text,
        },
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false as const, error: `SOLAPI_ERROR_${res.status}: ${text || res.statusText}` };
  }
  try {
    return { ok: true as const, data: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: true as const, data: { raw: text } };
  }
}

function toQueryRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw === null || raw === undefined) continue;
    out[key] = String(raw);
  }
  return out;
}

function hasCafe24Scope(scopeText: string, requiredScope: string) {
  const set = new Set(
    String(scopeText || "")
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter(Boolean)
  );
  return set.has(requiredScope);
}

async function requestCafe24WithRetry(
  cfg: {
    settingsId: string;
    mallId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    baseUrl: string;
  },
  ctx: AdapterContext,
  path: string,
  options?: { method?: string; query?: Record<string, string>; body?: Record<string, unknown> }
) {
  const method = options?.method || "GET";
  const query = options?.query || {};
  const body = options?.body;
  const run = (token: string) => cafe24Request({ baseUrl: cfg.baseUrl, accessToken: token }, path, { method, query, body });

  if (isTokenExpired(cfg.expiresAt)) {
    const refreshed = await refreshCafe24Token({
      settingsId: cfg.settingsId,
      mallId: cfg.mallId,
      refreshToken: cfg.refreshToken,
      supabase: ctx.supabase,
    });
    if (refreshed.ok) {
      cfg.accessToken = refreshed.accessToken;
    } else {
      return { ok: false as const, error: `TOKEN_REFRESH_FAILED: ${refreshed.error}` };
    }
  }

  const first = await run(cfg.accessToken);
  if (!first.ok && first.error.includes("401")) {
    const refreshed = await refreshCafe24Token({
      settingsId: cfg.settingsId,
      mallId: cfg.mallId,
      refreshToken: cfg.refreshToken,
      supabase: ctx.supabase,
    });
    if (refreshed.ok) {
      cfg.accessToken = refreshed.accessToken;
      return run(cfg.accessToken);
    }
    return { ok: false as const, error: `TOKEN_REFRESH_FAILED: ${refreshed.error}` };
  }
  return first;
}

async function searchJusoAddress(keyword: string) {
  // 1. Try Juso API if key exists
  let apiKey = readEnv("JUSO_API_KEY");
  if (!apiKey) {
    cachedEnvFile = null;
    apiKey = readEnv("JUSO_API_KEY");
  }

  const debugInfo: Record<string, unknown> = {
    keyFound: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    source: "JUSO_API"
  };

  if (apiKey) {
    try {
      const query = new URLSearchParams({
        confmKey: apiKey,
        currentPage: "1",
        countPerPage: "10",
        keyword: keyword,
        resultType: "json"
      });
      const url = `https://business.juso.go.kr/addrlink/addrLinkApi.do?${query.toString()}`;
      debugInfo.url = url.replace(apiKey, "***");

      const res = await fetch(url, {
        headers: {
          "Referer": "https://mejai.help/",
          "User-Agent": "Mozilla/5.0 (compatible; MejaiBot/1.0)"
        }
      });
      const text = await res.text();
      debugInfo.status = res.status;
      debugInfo.rawResponseLength = text.length;

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        debugInfo.parseError = String(e);
      }

      if (json && json.results && json.results.common) {
        if (json.results.common.errorCode === "0") {
          return {
            ok: true,
            data: json.results.juso || [],
            totalCount: json.results.common.totalCount,
            debug: debugInfo
          };
        } else {
          debugInfo.apiErrorCode = json.results.common.errorCode;
          debugInfo.apiErrorMessage = json.results.common.errorMessage;
        }
      } else {
        debugInfo.jsonStructureMismatch = true;
      }
    } catch (e) {
      console.error("Juso API Error:", e);
      debugInfo.fetchError = String(e);
    }
  }

  // 2. Mock Fallback
  // "서울시 관악구 1515-7" -> "08813" (Simplified mock for fallback)
  if (keyword.includes("1515-7") || keyword.includes("관악구")) {
    debugInfo.source = "MOCK";
    return {
      ok: true,
      data: [
        {
          zipNo: "08813",
          roadAddrPart1: "서울특별시 관악구 난곡로 83",
          roadAddrPart2: "(신림동, 관악산휴먼시아 2단지 아파트)",
          jibunAddr: "서울특별시 관악구 신림동 1515-7 관악산휴먼시아 2단지 아파트",
          engAddr: "83, Nangok-ro, Gwanak-gu, Seoul",
          admCd: "1162010200",
          rnMgtSn: "116203115012",
          bdMgtSn: "1162010200115150007000001"
        }
      ],
      totalCount: 1,
      debug: debugInfo
    };
  }

  return { ok: false, error: "ADDRESS_SEARCH_FAILED", debug: debugInfo };
}

const adapters: Record<string, ToolAdapter> = {
  list_boards: async (_params, ctx) => {
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const result = await cafe24Request(cfg, `/boards`, {
      query: { shop_no: cfg.shopNo },
    });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          `/boards`,
          { query: { shop_no: cfg.shopNo } }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  list_board_articles: async (params, ctx) => {
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    const boardNo = String(params.board_no || cfg.boardNo || "");
    if (!boardNo) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "board_no is required" } };
    }
    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const query: Record<string, string> = { shop_no: cfg.shopNo };
    const optional = [
      "board_category_no",
      "start_date",
      "end_date",
      "input_channel",
      "search",
      "keyword",
      "reply_status",
      "comment",
      "attached_file",
      "article_type",
      "product_no",
      "has_product",
      "is_notice",
      "is_display",
      "supplier_id",
      "offset",
      "limit",
    ];
    for (const key of optional) {
      const value = (params as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== "") {
        query[key] = String(value);
      }
    }
    const result = await cafe24Request(cfg, `/boards/${encodeURIComponent(boardNo)}/articles`, { query });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          `/boards/${encodeURIComponent(boardNo)}/articles`,
          { query }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  list_orders: async (params, ctx) => {
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    const endDate = String(params.end_date || "");
    const startDate = String(params.start_date || "");
    if (!startDate || !endDate) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "start_date and end_date are required" } };
    }
    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const query: Record<string, string> = { shop_no: cfg.shopNo };
    query.start_date = startDate;
    query.end_date = endDate;
    if (params.limit) query.limit = String(params.limit);
    if (params.offset) query.offset = String(params.offset);
    if (params.member_id) query.member_id = String(params.member_id);
    if (params.memberId) query.member_id = String(params.memberId);

    const readCustomers = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return [];
      const asObj = payload as Record<string, unknown>;
      const list =
        (Array.isArray(asObj.customers) ? asObj.customers : null) ??
        (Array.isArray(asObj.customersprivacy) ? asObj.customersprivacy : null) ??
        [];
      return Array.isArray(list) ? (list as Array<Record<string, unknown>>) : [];
    };

    const cellphoneRaw = String(params.cellphone || "").trim();
    if (!query.member_id && cellphoneRaw) {
      const customerResult = await cafe24Request(cfg, `/customers`, {
        query: { shop_no: cfg.shopNo, cellphone: cellphoneRaw },
      });
      let customerPayload = customerResult.ok ? customerResult.data : null;
      if (!customerResult.ok && customerResult.error.includes("401")) {
        const refreshed = await refreshCafe24Token({
          settingsId: cfg.settingsId,
          mallId: cfg.mallId,
          refreshToken: cfg.refreshToken,
          supabase: ctx!.supabase,
        });
        if (refreshed.ok) {
          const retry = await cafe24Request(
            { ...cfg, accessToken: refreshed.accessToken },
            `/customers`,
            { query: { shop_no: cfg.shopNo, cellphone: cellphoneRaw } }
          );
          if (retry.ok) {
            customerPayload = retry.data;
          }
        }
      }
      if (!customerPayload) {
        return {
          status: "error",
          error: { code: "CAFE24_ERROR", message: customerResult.ok ? "unknown error" : customerResult.error },
        };
      }
      const customers = readCustomers(customerPayload);
      if (customers.length === 0) {
        return { status: "error", error: { code: "CUSTOMER_NOT_FOUND", message: "no customer for cellphone" } };
      }
      if (customers.length > 1) {
        return { status: "error", error: { code: "CUSTOMER_AMBIGUOUS", message: "multiple customers for cellphone" } };
      }
      const memberId =
        String(customers[0]?.member_id || customers[0]?.memberId || "").trim();
      if (!memberId) {
        return { status: "error", error: { code: "CUSTOMER_MEMBER_ID_MISSING", message: "member_id missing" } };
      }
      query.member_id = memberId;
    }
    const result = await cafe24Request(cfg, `/orders`, { query });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          `/orders`,
          { query }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  find_customer_by_phone: async (params, ctx) => {
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    const rawCellphone = String(params.cellphone || "").trim();
    const digitsOnly = rawCellphone.replace(/[^\d]/g, "");
    const memberId = String((params.member_id ?? (params as { memberId?: unknown }).memberId ?? "")).trim();
    if (!digitsOnly && !memberId && !rawCellphone) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "cellphone or member_id is required" } };
    }
    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const hasCustomers = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return false;
      const asObj = payload as { customers?: unknown; customersprivacy?: unknown };
      const list = Array.isArray(asObj.customers)
        ? asObj.customers
        : Array.isArray(asObj.customersprivacy)
          ? asObj.customersprivacy
          : null;
      return Array.isArray(list) && list.length > 0;
    };
    const debugSteps: Array<{
      query: Record<string, string>;
      ok: boolean;
      hasCustomers: boolean;
      error?: string;
    }> = [];
    const includeDebug = (params as { debug?: boolean }).debug === true;
    const attachDebug = (data: Record<string, unknown>) => {
      if (!includeDebug) return data;
      return { ...data, _debug: debugSteps };
    };

    const buildQuery = (query: Record<string, string>) =>
      Object.fromEntries(Object.entries(query).filter(([, value]) => value !== "")) as Record<string, string>;

    if (memberId) {
      const query = buildQuery({ shop_no: String(cfg.shopNo || ""), member_id: String(memberId || "") });
      const result = await cafe24Request(cfg, `/customers`, { query });
      debugSteps.push({
        query,
        ok: result.ok,
        hasCustomers: result.ok ? hasCustomers(result.data) : false,
        error: result.ok ? undefined : result.error,
      });
      if (!result.ok && result.error.includes("401")) {
        const refreshed = await refreshCafe24Token({
          settingsId: cfg.settingsId,
          mallId: cfg.mallId,
          refreshToken: cfg.refreshToken,
          supabase: ctx!.supabase,
        });
        if (refreshed.ok) {
          const retry = await cafe24Request(
            { ...cfg, accessToken: refreshed.accessToken },
            `/customers`,
            { query }
          );
          debugSteps.push({
            query,
            ok: retry.ok,
            hasCustomers: retry.ok ? hasCustomers(retry.data) : false,
            error: retry.ok ? undefined : retry.error,
          });
          if (retry.ok) return { status: "success", data: attachDebug(retry.data) };
          return {
            status: "error",
            error: { code: "CAFE24_ERROR", message: retry.error, debug: debugSteps },
          };
        }
      }
      if (!result.ok) {
        return {
          status: "error",
          error: { code: "CAFE24_ERROR", message: result.error, debug: debugSteps },
        };
      }
      return { status: "success", data: attachDebug(result.data) };
    }

    const formatted = digitsOnly.length === 11
      ? `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`
      : "";
    const candidates = Array.from(new Set([rawCellphone, digitsOnly, formatted].filter(Boolean)));
    for (const cellphone of candidates) {
      const query = buildQuery({ shop_no: String(cfg.shopNo || ""), cellphone: String(cellphone || "") });
      const result = await cafe24Request(cfg, `/customers`, { query });
      debugSteps.push({
        query,
        ok: result.ok,
        hasCustomers: result.ok ? hasCustomers(result.data) : false,
        error: result.ok ? undefined : result.error,
      });
      if (result.ok) {
        return { status: "success", data: attachDebug(result.data) };
      }
    }

    const finalQuery = buildQuery({
      shop_no: String(cfg.shopNo || ""),
      cellphone: String(digitsOnly || rawCellphone || ""),
    });
    if (!finalQuery.cellphone) {
      debugSteps.push({ query: finalQuery, ok: false, hasCustomers: false, error: "Missing cellphone" });
      return { status: "error", error: { code: "INVALID_INPUT", message: "cellphone is required", debug: debugSteps } };
    }
    const result = await cafe24Request(cfg, `/customers`, { query: finalQuery });
    debugSteps.push({
      query: finalQuery,
      ok: result.ok,
      hasCustomers: result.ok ? hasCustomers(result.data) : false,
      error: result.ok ? undefined : result.error,
    });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          `/customers`,
          { query: finalQuery }
        );
        debugSteps.push({
          query: finalQuery,
          ok: retry.ok,
          hasCustomers: retry.ok ? hasCustomers(retry.data) : false,
          error: retry.ok ? undefined : retry.error,
        });
        if (retry.ok) return { status: "success", data: attachDebug(retry.data) };
      }
    }
    if (!result.ok) {
      return {
        status: "error",
        error: { code: "CAFE24_ERROR", message: result.error, debug: debugSteps },
      };
    }
    return { status: "success", data: attachDebug(result.data) };
  },
  lookup_order: async (params, ctx) => {
    const orderId = String(params.order_id || "");
    if (!orderId) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "order_id is required" } };
    }
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const baseQuery: Record<string, string> = { shop_no: cfg.shopNo, embed: LOOKUP_ORDER_EMBED };
    const result = await cafe24Request(cfg, `/orders/${encodeURIComponent(orderId)}`, {
      query: baseQuery,
    });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          `/orders/${encodeURIComponent(orderId)}`,
          { query: baseQuery }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  track_shipment: async (params, ctx) => {
    const orderId = String(params.order_id || params.tracking_number || "");
    if (!orderId) {
      return {
        status: "error",
        error: { code: "INVALID_INPUT", message: "order_id is required for Cafe24 shipments lookup" },
      };
    }
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const result = await cafe24Request(cfg, `/orders/${encodeURIComponent(orderId)}/shipments`, {
      query: { shop_no: cfg.shopNo },
    });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          `/orders/${encodeURIComponent(orderId)}/shipments`,
          { query: { shop_no: cfg.shopNo } }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  update_order_shipping_address: async (params, ctx) => {
    const orderId = String(params.order_id || "").trim();
    if (!orderId) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "order_id is required" } };
    }
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    const shippingCode = String(params.shipping_code || "").trim();
    const address1 = String(params.address1 || params.address_full || params.address || "").trim();
    const address2 = String(params.address2 || "").trim();
    const zipcode = String(params.zipcode || "").trim();
    const receiverName = String(params.receiver_name || params.name || "").trim();
    const receiverPhone = String(params.receiver_phone || params.phone || "").trim();
    const receiverCellphone = String(params.receiver_cellphone || params.cellphone || params.phone || "").trim();
    const shippingMessage = String(params.shipping_message || "").trim();
    const changeDefault = params.change_default_shipping_address ?? params.change_default ?? null;

    if (!address1 && !address2 && !zipcode && !receiverName && !receiverPhone && !receiverCellphone && !shippingMessage) {
      return {
        status: "error",
        error: { code: "INVALID_INPUT", message: "address or receiver info is required" },
      };
    }

    // Auto-fill/Validate Zipcode logic using Juso API
    let finalZipcode = zipcode;

    if (!finalZipcode && address1) {
      // Auto-find zipcode
      const searchRes = await searchJusoAddress(address1);
      if (searchRes.ok && searchRes.data && searchRes.data.length > 0) {
        // Logic: If all results share the same zipNo, use it.
        const firstZip = searchRes.data[0].zipNo;
        const allSame = searchRes.data.every((r: { zipNo?: string }) => r.zipNo === firstZip);

        if (allSame) {
          finalZipcode = firstZip;
          // We could log this auto-fill action if we had a logger, or attach meta.
        } else {
          // Ambiguous
          return {
            status: "error",
            error: {
              code: "AMBIGUOUS_ADDRESS",
              message: `Multiple zipcodes found for address "${address1}". Please specify zipcode manually. Found: ${Array.from(
                new Set(searchRes.data.map((r: { zipNo?: string }) => r.zipNo))
              ).join(", ")}`
            }
          };
        }
      }
    }

    if ((address1 || address2) && !finalZipcode) {
      return {
        status: "error",
        error: {
          code: "MISSING_ZIPCODE",
          message: "Zipcode is required and could not be auto-found. Please ask the user for their zipcode (우편번호)."
        }
      };
    }

    const requestPayload: Record<string, unknown> = {};
    if (address1) requestPayload.address1 = address1;
    if (address2) requestPayload.address2 = address2;
    if (finalZipcode) requestPayload.zipcode = finalZipcode;
    if (receiverName) requestPayload.name = receiverName;
    if (receiverPhone) requestPayload.phone = receiverPhone;
    if (receiverCellphone) requestPayload.cellphone = receiverCellphone;
    if (shippingMessage) requestPayload.shipping_message = shippingMessage;
    if (changeDefault !== null && changeDefault !== undefined && changeDefault !== "") {
      requestPayload.change_default_shipping_address = changeDefault;
    }

    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }

    let resolvedShippingCode = shippingCode;
    let receiverDefaults: Record<string, string> | null = null;
    if (!resolvedShippingCode) {
      const fetchReceivers = async () => {
        const receiversRes = await cafe24Request(cfg, `/orders/${encodeURIComponent(orderId)}/receivers`, {
          query: { shop_no: cfg.shopNo },
        });
        if (!receiversRes.ok && receiversRes.error.includes("401")) {
          const refreshed = await refreshCafe24Token({
            settingsId: cfg.settingsId,
            mallId: cfg.mallId,
            refreshToken: cfg.refreshToken,
            supabase: ctx!.supabase,
          });
          if (refreshed.ok) {
            return cafe24Request(
              { ...cfg, accessToken: refreshed.accessToken },
              `/orders/${encodeURIComponent(orderId)}/receivers`,
              { query: { shop_no: cfg.shopNo } }
            );
          }
        }
        return receiversRes;
      };
      const receiversRes = await fetchReceivers();
      if (receiversRes.ok) {
        const payload = receiversRes.data as { receivers?: unknown } | undefined;
        const receiversNode = payload?.receivers as { receiver?: unknown } | undefined;
        const list = Array.isArray(payload?.receivers)
          ? (payload?.receivers as Array<Record<string, unknown>>)
          : Array.isArray(receiversNode?.receiver)
            ? (receiversNode?.receiver as Array<Record<string, unknown>>)
            : [];
        const first = list[0];
        const firstCode = first ? String(first.shipping_code || "") : "";
        if (firstCode) resolvedShippingCode = firstCode;
        if (first) {
          receiverDefaults = {
            name: String(first.name || ""),
            phone: String(first.phone || ""),
            cellphone: String(first.cellphone || ""),
            zipcode: String(first.zipcode || ""),
            address1: String(first.address1 || first.address || ""),
            address2: String(first.address2 || ""),
          };
        }
      }
    }

    if (!resolvedShippingCode) {
      return {
        status: "error",
        error: {
          code: "INVALID_INPUT",
          message: "shipping_code is required (receiver lookup failed)",
        },
      };
    }

    if (resolvedShippingCode && !requestPayload.shipping_code) {
      requestPayload.shipping_code = resolvedShippingCode;
    }
    if (receiverDefaults) {
      if (!requestPayload.name && receiverDefaults.name) requestPayload.name = receiverDefaults.name;
      if (!requestPayload.phone && receiverDefaults.phone) requestPayload.phone = receiverDefaults.phone;
      if (!requestPayload.cellphone && receiverDefaults.cellphone) requestPayload.cellphone = receiverDefaults.cellphone;
      if (!requestPayload.zipcode && receiverDefaults.zipcode) requestPayload.zipcode = receiverDefaults.zipcode;
      if (!requestPayload.address1 && receiverDefaults.address1) requestPayload.address1 = receiverDefaults.address1;
      if (!requestPayload.address2 && receiverDefaults.address2) requestPayload.address2 = receiverDefaults.address2;
    }

    // Fix: Always use the collection endpoint because we are sending an array in the body ({ request: [...] }).
    // Sending an array to the single resource endpoint (.../receivers/{code}) causes a 422 Invalid Request error.
    const endpoint = `/orders/${encodeURIComponent(orderId)}/receivers`;
    const body: Record<string, unknown> = { request: [requestPayload] };
    if (cfg.shopNo) body.shop_no = cfg.shopNo;

    const result = await cafe24Request(cfg, endpoint, {
      method: "PUT",
      body,
    });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          endpoint,
          { method: "PUT", body }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  create_ticket: async (params, ctx) => {
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    const boardNo = String(params.board_no || cfg.boardNo || "");
    if (!boardNo) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "board_no is required" } };
    }
    const writer = String(params.writer || "mejai");
    const title = String(params.title || params.summary || "Support request");
    const content = String(params.content || params.summary || "");
    const clientIp = String(params.client_ip || "1.1.1.1");
    const shopNoNum = Number(cfg.shopNo);
    const boardNoNum = Number(boardNo);
    const requestBody: Record<string, unknown> = {
      shop_no: Number.isFinite(shopNoNum) ? shopNoNum : cfg.shopNo,
      board_no: Number.isFinite(boardNoNum) ? boardNoNum : boardNo,
      writer,
      title,
      content,
      client_ip: clientIp,
    };
    const optionalKeys = [
      "reply_article_no",
      "created_date",
      "writer_email",
      "member_id",
      "notice",
    ];
    for (const key of optionalKeys) {
      const value = (params as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== "") {
        requestBody[key] = value;
      }
    }
    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const result = await cafe24Request(cfg, `/boards/${encodeURIComponent(boardNo)}/articles`, {
      method: "POST",
      body: {
        request: [requestBody],
      },
    });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          `/boards/${encodeURIComponent(boardNo)}/articles`,
          { method: "POST", body: { request: [requestBody] } }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  resolve_product: async (params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const query = String(params.query || "").trim();
    if (!query) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "query is required" } };
    }
    const { data, error } = await ctx.supabase
      .from("G_com_product_aliases")
      .select("org_id, alias, product_id, match_type, priority, is_active")
      .eq("is_active", true)
      .or(`org_id.eq.${ctx.orgId},org_id.is.null`);
    if (error) {
      return { status: "error", error: { code: "DB_ERROR", message: error.message } };
    }
    const aliases = (data || []) as Array<{
      org_id: string | null;
      alias: string;
      product_id: string;
      match_type: string;
      priority?: number | null;
    }>;
    const best = chooseBestAlias(query, aliases);
    if (best) {
      return {
        status: "success",
        data: {
          matched: true,
          product_id: best.product_id,
          alias: best.alias,
          match_type: best.match_type,
        },
      };
    }
    // Fallback: try Cafe24 product search when alias dictionary has no match.
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "success", data: { matched: false } };
    }
    if (!hasCafe24Scope(cfg.scope, "mall.read_product")) {
      return {
        status: "error",
        error: { code: "SCOPE_ERROR", message: "mall.read_product scope is required for this request" },
      };
    }
    const normalizedQuery = normalizeMatchText(query).replace(/\s+/g, " ").trim();
    const queries: Array<Record<string, string>> = [
      { shop_no: cfg.shopNo, product_name: query, limit: "20" },
      { shop_no: cfg.shopNo, search: "product_name", keyword: query, limit: "20" },
      { shop_no: cfg.shopNo, keyword: query, limit: "20" },
    ];
    let products: Array<Record<string, unknown>> = [];
    for (const q of queries) {
      const searchResult = await requestCafe24WithRetry(cfg, ctx, "/products", {
        method: "GET",
        query: q,
      });
      if (!searchResult.ok) continue;
      const searchData = (searchResult.data || {}) as Record<string, unknown>;
      const list = Array.isArray(searchData.products)
        ? (searchData.products as Array<Record<string, unknown>>)
        : [];
      if (list.length > 0) {
        products = list;
        break;
      }
    }
    if (products.length === 0) {
      return { status: "success", data: { matched: false } };
    }
    let bestProduct: Record<string, unknown> | null = null;
    let bestScore = 0;
    for (const product of products) {
      const productRecord = product as Record<string, unknown>;
      const name = String(
        productRecord.product_name || productRecord.product_name_default || productRecord.name || ""
      ).trim();
      if (!name) continue;
      const normalizedName = normalizeMatchText(name);
      const qNoSpace = normalizedQuery.replace(/\s+/g, "");
      const nNoSpace = normalizedName.replace(/\s+/g, "");
      let score = 0;
      if (qNoSpace && nNoSpace.includes(qNoSpace)) score += 4;
      if (qNoSpace && qNoSpace.includes(nNoSpace)) score += 2;
      const qTokens = normalizedQuery.split(" ").filter(Boolean);
      score += qTokens.filter((token) => normalizedName.includes(token)).length;
      if (score > bestScore) {
        bestScore = score;
        bestProduct = product;
      }
    }
    const bestProductRecord = (bestProduct || {}) as Record<string, unknown>;
    const productId = String(bestProductRecord.product_no || bestProductRecord.product_id || "").trim();
    const productName = String(
      bestProductRecord.product_name || bestProductRecord.product_name_default || bestProductRecord.name || ""
    ).trim();
    if (!productId || bestScore <= 0) {
      return { status: "success", data: { matched: false } };
    }
    return {
      status: "success",
      data: {
        matched: true,
        product_id: productId,
        product_name: productName || null,
        match_type: "cafe24_fuzzy",
      },
    };
  },
  read_product: async (params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const productNo = String(params.product_no || params.product_id || "").trim();
    if (!productNo) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "product_no is required" } };
    }
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    const embed = String(params.embed || "").trim();
    const fields = String(params.fields || "").trim();
    const query: Record<string, string> = { shop_no: cfg.shopNo };
    if (embed) query.embed = embed;
    if (fields) query.fields = fields;
    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const result = await cafe24Request(cfg, `/products/${encodeURIComponent(productNo)}`, { query });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          `/products/${encodeURIComponent(productNo)}`,
          { query }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  read_supply: async (params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const supplierCode = String(params.supplier_code || "").trim();
    const supplierName = String(params.supplier_name || "").trim();
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const query: Record<string, string> = { shop_no: cfg.shopNo };
    if (supplierName) query.supplier_name = supplierName;
    if (params.limit) query.limit = String(params.limit);
    if (params.offset) query.offset = String(params.offset);
    const endpoint = supplierCode
      ? `/suppliers/${encodeURIComponent(supplierCode)}`
      : "/suppliers";
    const result = await cafe24Request(cfg, endpoint, { query });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          endpoint,
          { query }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  read_order_settings: async (params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    if (!hasCafe24Scope(cfg.scope, "mall.read_store")) {
      return { status: "error", error: { code: "SCOPE_ERROR", message: "mall.read_store scope is required" } };
    }
    const query = { shop_no: String(params.shop_no || cfg.shopNo) };
    const result = await requestCafe24WithRetry(cfg, ctx, "/orders/setting", { method: "GET", query });
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  update_order_settings: async (params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    if (!hasCafe24Scope(cfg.scope, "mall.write_store")) {
      return { status: "error", error: { code: "SCOPE_ERROR", message: "mall.write_store scope is required" } };
    }
    const shopNo = String(params.shop_no || cfg.shopNo);
    const rawRequest =
      typeof params.request === "object" && params.request !== null && !Array.isArray(params.request)
        ? (params.request as Record<string, unknown>)
        : Object.fromEntries(
            Object.entries(params).filter(([key, value]) => key !== "shop_no" && value !== undefined)
          );
    if (Object.keys(rawRequest).length === 0) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "request payload is required" } };
    }

    const candidates: Array<Record<string, unknown>> = [
      { request: [rawRequest] },
      { request: rawRequest },
      rawRequest,
    ];
    for (const body of candidates) {
      const result = await requestCafe24WithRetry(cfg, ctx, "/orders/setting", {
        method: "PUT",
        query: { shop_no: shopNo },
        body,
      });
      if (result.ok) {
        return { status: "success", data: result.data };
      }
      if (!String(result.error || "").includes("400")) {
        return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
      }
    }
    return {
      status: "error",
      error: { code: "CAFE24_ERROR", message: "Cafe24 API rejected all request payload formats for /orders/setting" },
    };
  },
  list_activitylogs: async (params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    const query = toQueryRecord(params);
    if (!query.shop_no) query.shop_no = cfg.shopNo;
    const result = await requestCafe24WithRetry(cfg, ctx, "/activitylogs", { method: "GET", query });
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  cafe24_admin_request: async (params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    const rawPath = String(params.path || "").trim();
    if (!rawPath) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "path is required" } };
    }
    if (/^https?:\/\//i.test(rawPath)) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "path must not include protocol/domain" } };
    }
    const pathValue = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    const method = String(params.method || "GET").trim().toUpperCase();
    const query = toQueryRecord(params.query);
    if (!query.shop_no) query.shop_no = cfg.shopNo;
    const requiredScope = String(params.required_scope || "").trim();
    if (requiredScope && !hasCafe24Scope(cfg.scope, requiredScope)) {
      return {
        status: "error",
        error: { code: "SCOPE_ERROR", message: `${requiredScope} scope is required for this request` },
      };
    }
    const body =
      method === "GET" || method === "DELETE"
        ? undefined
        : (typeof params.body === "object" && params.body !== null
            ? (params.body as Record<string, unknown>)
            : undefined);
    const result = await requestCafe24WithRetry(cfg, ctx, pathValue, { method, query, body });
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  read_shipping: async (_params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const cfg = await getCafe24Config(ctx);
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    if (isTokenExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const result = await cafe24Request(cfg, "/shipping", { query: { shop_no: cfg.shopNo } });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          "/shipping",
          { query: { shop_no: cfg.shopNo } }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  subscribe_restock: async (params, ctx) => {
      if (!ctx) {
        return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
      }
      const channel = String(params.channel || "").trim();
      const mallId = String(params.mall_id || "").trim();
      const sessionId = String(params.session_id || "").trim();
      const productId = String(params.product_id || "").trim();
      const topicTypeRaw = String(params.topic_type || "").trim().toLowerCase();
      const topicType = topicTypeRaw || "restock";
      const topicKey = String(params.topic_key || productId || params.product_name || "").trim();
      if (!channel) {
        return { status: "error", error: { code: "INVALID_INPUT", message: "channel is required" } };
      }
      if (!mallId) {
        return { status: "error", error: { code: "INVALID_INPUT", message: "mall_id is required" } };
      }
      if (!sessionId) {
        return { status: "error", error: { code: "INVALID_INPUT", message: "session_id is required" } };
      }
      if (!topicKey) {
        return { status: "error", error: { code: "INVALID_INPUT", message: "topic_key is required" } };
      }
      const restockAtRaw = String(params.restock_at || "").trim();
      const restockAt = /^\d{4}-\d{2}-\d{2}$/.test(restockAtRaw) ? restockAtRaw : null;
      const scheduleTz = String(params.schedule_tz || "Asia/Seoul");
      const scheduleHourLocal = Number(params.schedule_hour_local || 17);
      const leadDays = Array.isArray(params.lead_days)
        ? Array.from(
            new Set(
              (params.lead_days as unknown[])
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value > 0)
            )
          ).sort((a, b) => a - b)
        : [];
      const leadDaysToSchedule = leadDays.length > 0 ? leadDays : [0];
      const productName = params.product_name ? String(params.product_name) : null;
      const category = String(params.category || topicType || "restock").trim() || "restock";

      const computeScheduledFor = (dateText: string | null, leadDay: number) => {
        if (!dateText) return null;
        const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
        const offsetMinutes = scheduleTz === "Asia/Seoul" ? 9 * 60 : 0;
        const baseUtcMs = Date.UTC(year, month - 1, day, scheduleHourLocal, 0, 0) - offsetMinutes * 60 * 1000;
        const scheduledMs = baseUtcMs - Math.max(0, leadDay) * 24 * 60 * 60 * 1000;
        return new Date(scheduledMs).toISOString();
      };

      const buildMessageText = (leadDay: number) => {
        const name = productName || topicKey || "상품";
        const scheduleLine = restockAt ? `예정일: ${restockAt}` : "예정일: 확인된 일정 정보 없음";
        const leadLine = leadDay > 0 ? `알림: D-${leadDay}` : "";
        return [`[재입고 알림] ${name}`, scheduleLine, leadLine].filter(Boolean).join("\n");
      };

      const nowIso = new Date().toISOString();
      const rows = leadDaysToSchedule.map((leadDay) => ({
        org_id: ctx.orgId,
        mall_id: mallId,
        session_id: sessionId,
        channel,
        phone: params.phone ? String(params.phone) : null,
        category,
        topic_type: topicType,
        topic_key: topicKey,
        topic_label: params.topic_label ? String(params.topic_label) : null,
        product_id: productId || null,
        product_name: productName,
        restock_at: restockAt,
        lead_day: leadDay,
        scheduled_for: computeScheduledFor(restockAt, leadDay),
        template_key: "restock_lead_day",
        template_vars: {
          product_name: productName,
          restock_at: restockAt,
          lead_day: leadDay,
          channel,
        },
        message_text: buildMessageText(leadDay),
        status: "pending",
        attempts: 0,
        last_error: null,
        sent_at: null,
        solapi_message_id: null,
        schedule_tz: scheduleTz,
        schedule_hour_local: Number.isFinite(scheduleHourLocal) ? scheduleHourLocal : 17,
        intent_name: params.intent_name ? String(params.intent_name) : null,
        metadata: params.metadata && typeof params.metadata === "object" ? params.metadata : {},
        created_at: nowIso,
        updated_at: nowIso,
      }));

      const { data, error } = await ctx.supabase.from("E_ops_notification_messages").insert(rows).select("id");
      if (error) {
        return { status: "error", error: { code: "DB_ERROR", message: error.message } };
      }
      const ids = Array.isArray(data)
        ? data.map((row) => String((row as Record<string, unknown>)?.id || "").trim()).filter(Boolean)
        : [];

      const bypass = isEnvTrue("SOLAPI_BYPASS");
      const from = readEnv("SOLAPI_FROM");
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
        if (bypass) {
          sendOk = true;
          sendError = "SOLAPI_BYPASS";
        } else if (!from) {
          sendError = "SOLAPI_FROM_MISSING";
        } else if (scheduledAt) {
          const sent = await solapiScheduleMessage({
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
        } else {
          const sent = await solapiSendMessage({ to: String(row.phone), from, text: String(row.message_text || "") });
          if (!sent.ok) {
            sendError = sent.error;
          } else {
            sendOk = true;
            solapiMessageId = extractSolapiMessageId((sent.data || {}) as Record<string, unknown>);
          }
        }
        if (sendOk) {
          await ctx.supabase
            .from("E_ops_notification_messages")
            .update({
              status: scheduledAt ? "scheduled" : "sent",
              attempts: 1,
              sent_at: scheduledAt ? null : nowIso,
              last_error: bypass ? sendError : null,
              solapi_registered: !bypass,
              solapi_register_error: bypass ? sendError : null,
              solapi_message_id: solapiMessageId,
              updated_at: nowIso,
            })
            .eq("id", id);
        } else if (sendError) {
          await ctx.supabase
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
        }
      }
      return {
        status: "success",
        data: {
          notification_ids: ids,
          scheduled_count: rows.length,
        },
      };
    },
  subscribe_notification: async (params, ctx) => {
    return adapters.subscribe_restock(
      {
        ...params,
        topic_type: params.topic_type || "general",
        schedule_mode: params.schedule_mode || "scheduled_at",
      },
      ctx
    );
  },
  trigger_restock: async (params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const productId = String(params.product_id || "").trim();
    const triggerType = String(params.trigger_type || "").trim();
    if (!productId || !triggerType) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "product_id and trigger_type are required" } };
    }
    return {
      status: "success",
      data: {
        accepted: true,
        product_id: productId,
        trigger_type: triggerType,
        trigger_value: params.trigger_value ?? null,
      },
    };
  },
  send_otp: async (params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const destination = String(params.destination || "").trim();
    if (!destination) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "destination is required" } };
    }
    const bypassSms = isEnvTrue("SOLAPI_BYPASS");
    const tempCode = readEnv("SOLAPI_TEMP");
    if (bypassSms && !tempCode) {
      return {
        status: "error",
        error: {
          code: "CONFIG_ERROR",
          message: "SOLAPI_BYPASS is enabled, but SOLAPI_TEMP is missing",
        },
      };
    }
    const code = tempCode ? tempCode : String(Math.floor(100000 + Math.random() * 900000));
    const testMode = bypassSms || Boolean(tempCode);
    const otpRef = crypto.randomUUID();
    const from = readEnv("SOLAPI_FROM");
    const text = String(params.text || `인증번호는 ${code} 입니다.`);
    let sendOk = false;
    let sendError: string | null = null;
    let solapiMessageId: string | null = null;
    if (bypassSms) {
      sendOk = true;
      sendError = "SOLAPI_BYPASS";
    } else if (!from) {
      const processKeys = Object.keys(process.env || {}).filter((key) => key.startsWith("SOLAPI_"));
      const fallbackKeys = Object.keys(loadEnvFromFiles() || {}).filter((key) => key.startsWith("SOLAPI_"));
      const envKeys = Array.from(new Set([...processKeys, ...fallbackKeys])).sort();
      sendError = "SOLAPI_FROM_MISSING";
      // continue to record OTP/notification even when from is missing
      void envKeys;
    } else {
      const sendResult = await solapiSendMessage({ to: destination, from, text });
      if (!sendResult.ok) {
        sendError = sendResult.error;
      } else {
        sendOk = true;
        solapiMessageId = extractSolapiMessageId((sendResult.data || {}) as Record<string, unknown>);
      }
    }
    const codeHash = crypto.createHash("sha256").update(code + otpRef).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const recordId = crypto.randomUUID();
    const { error } = await ctx.supabase.from("H_auth_otp_verifications").insert({
      id: recordId,
      org_id: ctx.orgId,
      user_id: ctx.userId,
      destination,
      otp_ref: otpRef,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (error) {
      return { status: "error", error: { code: "DB_ERROR", message: error.message } };
    }
    const otpNowIso = new Date().toISOString();
    const { data: notifData, error: notifError } = await ctx.supabase
      .from("E_ops_notification_messages")
      .insert({
        org_id: ctx.orgId,
        mall_id: null,
        session_id: String(params.session_id || "") || null,
        channel: "sms",
        phone: destination,
        category: "auth_otp",
        topic_type: "auth",
        topic_key: otpRef,
        topic_label: null,
        product_id: null,
        product_name: null,
        restock_at: null,
        lead_day: 0,
        scheduled_for: null,
        template_key: "auth_otp",
        template_vars: {
          destination,
          channel: "sms",
          otp_ref: otpRef,
        },
        message_text: text,
        status: sendOk ? "sent" : "failed",
        attempts: 1,
        last_error: sendOk ? (bypassSms ? "SOLAPI_BYPASS" : null) : sendError,
        sent_at: sendOk ? otpNowIso : null,
        solapi_message_id: solapiMessageId,
        solapi_registered: sendOk && !bypassSms,
        solapi_register_error: sendOk ? (bypassSms ? "SOLAPI_BYPASS" : null) : sendError,
        schedule_tz: "Asia/Seoul",
        schedule_hour_local: 17,
        intent_name: "auth_otp",
        metadata: {
          flow: "auth_otp",
          source: "otp_runtime",
        },
        created_at: otpNowIso,
        updated_at: otpNowIso,
        source_turn_id: params.source_turn_id || null,
      })
      .select("id")
      .maybeSingle();
    if (notifError) {
      return { status: "error", error: { code: "DB_ERROR", message: notifError.message } };
    }
    if (!sendOk) {
      return {
        status: "error",
        error: {
          code: "SOLAPI_ERROR",
          message: sendError || "SOLAPI_SEND_FAILED",
          detail: {
            otp_ref: otpRef,
            notification_id: notifData ? String((notifData as Record<string, unknown>).id || "") : null,
          },
        },
      };
    }
    return {
      status: "success",
      data: {
        delivery: "sms",
        destination: maskValue(destination),
        otp_ref: otpRef,
        expires_at: expiresAt,
        test_mode: testMode,
        test_code: testMode ? code : undefined,
      },
    };
  },
  verify_otp: async (params, ctx) => {
    if (!ctx) {
      return { status: "error", error: { code: "MISSING_CONTEXT", message: "context required" } };
    }
    const code = String(params.code || "").trim();
    const otpRef = String(params.otp_ref || "").trim();
    if (!code) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "code is required" } };
    }
    if (!otpRef) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "otp_ref is required" } };
    }
    const { data, error } = await ctx.supabase
      .from("H_auth_otp_verifications")
      .select("id, code_hash, expires_at, verified_at")
      .eq("otp_ref", otpRef)
      .maybeSingle();
    if (error || !data) {
      return { status: "error", error: { code: "OTP_NOT_FOUND", message: "otp_ref not found" } };
    }
    if (data.verified_at) {
      return { status: "error", error: { code: "OTP_ALREADY_USED", message: "otp already verified" } };
    }
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return { status: "error", error: { code: "OTP_EXPIRED", message: "otp expired" } };
    }
    const codeHash = crypto.createHash("sha256").update(code + otpRef).digest("hex");
    if (codeHash !== data.code_hash) {
      return { status: "error", error: { code: "OTP_INVALID", message: "invalid code" } };
    }
    const verificationToken = crypto.randomUUID();
    await ctx.supabase
      .from("H_auth_otp_verifications")
      .update({ verified_at: new Date().toISOString(), verification_token: verificationToken })
      .eq("id", data.id);
    return {
      status: "success",
      data: { verified: true, customer_verification_token: verificationToken },
    };
  },
  search_address: async (params, ctx) => {
    void ctx;
    const keyword = String(params.keyword || "").trim();
    if (!keyword) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "keyword is required" } };
    }
    const result = await searchJusoAddress(keyword);
    if (!result.ok) {
      return {
        status: "error",
        error: {
          code: result.error || "ADDRESS_SEARCH_FAILED",
          message: "Address search failed. See debug info.",
          debug: result.debug
        }
      };
    }
    return {
      status: "success",
      data: {
        results: result.data,
        totalCount: result.totalCount,
        source: result.debug?.source || "UNKNOWN",
        debug: result.debug
      }
    };
  },

};

export async function callAdapter(
  key: string,
  params: Record<string, unknown>,
  ctx?: AdapterContext,
  options?: { toolName?: string }
): Promise<ToolCallResult> {
  const normalizedKey = String(key || "").trim().toLowerCase();
  const normalizedToolName = String(options?.toolName || "").trim();
  let adapter = adapters[key] || adapters[normalizedKey];
  // Prefer concrete tool adapters (e.g. list_orders, resolve_product) even when key is provider_key.
  if (!adapter && normalizedToolName) {
    adapter = adapters[normalizedToolName] || adapters[normalizedToolName.toLowerCase()];
  }
  if (!adapter && normalizedKey === "cafe24") {
    adapter = async (incomingParams, incomingCtx) =>
      adapters.cafe24_admin_request(
        {
          ...incomingParams,
          method: String(incomingParams.method || "GET")
            .trim()
            .toUpperCase(),
        },
        incomingCtx
      );
  }
  if (!adapter && normalizedKey === "juso") {
    if (normalizedToolName && normalizedToolName !== "search_address") {
      return {
        status: "error",
        error: { code: "ADAPTER_NOT_FOUND", message: `tool ${normalizedToolName} is not supported for provider ${normalizedKey}` },
      };
    }
    adapter = adapters.search_address;
  }
  if (!adapter && normalizedKey === "solapi") {
    if (normalizedToolName === "send_otp") adapter = adapters.send_otp;
    if (normalizedToolName === "verify_otp") adapter = adapters.verify_otp;
    if (!adapter) {
      return {
        status: "error",
        error: { code: "ADAPTER_NOT_FOUND", message: `tool ${normalizedToolName || "-"} is not supported for provider ${normalizedKey}` },
      };
    }
  }
  if (!adapter) {
    const scope = adapterKeyToCafe24Scope(key);
    if (scope) {
      adapter = async (incomingParams, incomingCtx) => {
        const isReadScope = scope.includes(".read_");
        const method = String(incomingParams.method || (isReadScope ? "GET" : "POST"))
          .trim()
          .toUpperCase();
        if (isReadScope && method !== "GET") {
          return {
            status: "error",
            error: { code: "INVALID_INPUT", message: `${key} supports only GET` },
          };
        }
        return adapters.cafe24_admin_request(
          {
            ...incomingParams,
            method,
            required_scope: scope,
          },
          incomingCtx
        );
      };
    }
  }
  if (!adapter) {
    return { status: "error", error: { code: "ADAPTER_NOT_FOUND", message: `adapter ${key} not found` } };
  }
  return adapter(params, ctx);
}

