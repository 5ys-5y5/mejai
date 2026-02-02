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

function maskValue(value: string) {
  if (value.length <= 4) return "*".repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function maskOptional(value: unknown) {
  if (typeof value !== "string") return value;
  return maskValue(value);
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

function addOrderSummary(order: Record<string, unknown>) {
  const paid = order.paid === "T";
  const canceled = order.canceled === "T";
  const shippingStatus = String(order.shipping_status || "");
  const readTotalAmountDue = (value: unknown) => {
    if (!value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    return record.total_amount_due;
  };
  const actualTotal = readTotalAmountDue(order.actual_order_amount);
  const initialTotal = readTotalAmountDue(order.initial_order_amount);
  return {
    ...order,
    order_summary: {
      paid,
      canceled,
      shipping_status: shippingStatus,
      order_date: order.order_date,
      payment_method_name: order.payment_method_name,
      total_amount_due: actualTotal ?? initialTotal,
    },
  };
}

function maskOrderSensitive(order: Record<string, unknown>) {
  return {
    ...order,
    billing_name: maskOptional(order.billing_name),
    bank_account_no: maskOptional(order.bank_account_no),
    bank_account_owner_name: maskOptional(order.bank_account_owner_name),
    member_id: maskOptional(order.member_id),
  };
}

function formatOrderData(payload: Record<string, unknown>) {
  if (!payload || typeof payload !== "object" || !("order" in payload)) return payload;
  const order = (payload as { order?: Record<string, unknown> }).order;
  if (!order) return payload;
  const summarized = addOrderSummary(order);
  const masked = maskOrderSensitive(summarized);
  return { ...payload, order: masked };
}

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
  if (!cafe24.mall_id || !cafe24.access_token || !cafe24.refresh_token) {
    const bootstrapped = await bootstrapCafe24FromEnv(ctx, row);
    if (bootstrapped) {
      cafe24 = bootstrapped;
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
      error: `Cafe24 API error ${res.status}: ${text || res.statusText}`,
    };
  }
  try {
    return { ok: true as const, data: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: true as const, data: { raw: text } };
  }
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
    const result = await cafe24Request(cfg, `/orders/${encodeURIComponent(orderId)}`, {
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
          `/orders/${encodeURIComponent(orderId)}`,
          { query: { shop_no: cfg.shopNo } }
        );
        if (retry.ok) return { status: "success", data: formatOrderData(retry.data) };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: formatOrderData(result.data) };
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

    const requestPayload: Record<string, unknown> = {};
    if (address1) requestPayload.address1 = address1;
    if (address2) requestPayload.address2 = address2;
    if (zipcode) requestPayload.zipcode = zipcode;
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

      const endpoint = resolvedShippingCode
        ? `/orders/${encodeURIComponent(orderId)}/receivers/${encodeURIComponent(resolvedShippingCode)}`
        : `/orders/${encodeURIComponent(orderId)}/receivers`;
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
    if (!best) {
      return { status: "success", data: { matched: false } };
    }
    return {
      status: "success",
      data: {
        matched: true,
        product_id: best.product_id,
        alias: best.alias,
        match_type: best.match_type,
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
    const productId = String(params.product_id || "").trim();
    const channel = String(params.channel || "").trim();
    if (!productId || !channel) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "product_id and channel are required" } };
    }
    const payload = {
      org_id: ctx.orgId,
      product_id: productId,
      channel,
      phone: params.phone ? String(params.phone) : null,
      customer_id: params.customer_id ? String(params.customer_id) : null,
      trigger_type: params.trigger_type ? String(params.trigger_type) : "status_change",
      trigger_value: params.trigger_value ?? null,
      actions: Array.isArray(params.actions) ? params.actions : ["notify_only"],
      status: "active",
      created_at: new Date().toISOString(),
    };
    const { data, error } = await ctx.supabase.from("G_com_restock_subscriptions").insert(payload).select("id").single();
    if (error) {
      return { status: "error", error: { code: "DB_ERROR", message: error.message } };
    }
    return { status: "success", data: { subscription_id: data?.id ?? null, ...payload } };
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
      const from = readEnv("SOLAPI_FROM");
      if (!from) {
        const processKeys = Object.keys(process.env || {}).filter((key) => key.startsWith("SOLAPI_"));
        const fallbackKeys = Object.keys(loadEnvFromFiles() || {}).filter((key) => key.startsWith("SOLAPI_"));
        const envKeys = Array.from(new Set([...processKeys, ...fallbackKeys])).sort();
        return {
          status: "error",
          error: {
            code: "CONFIG_ERROR",
            message: "SOLAPI_FROM is required",
            detail: {
              cwd: process.cwd(),
              solapi_from_len: (process.env.SOLAPI_FROM || "").length,
              solapi_env_keys: envKeys,
            },
          },
        };
      }
      const tempCode = readEnv("SOLAPI_TEMP");
      const code = tempCode ? tempCode : String(Math.floor(100000 + Math.random() * 900000));
      const testMode = Boolean(tempCode);
    const otpRef = crypto.randomUUID();
    const text = String(params.text || `인증번호는 ${code} 입니다.`);
    const sendResult = await solapiSendMessage({ to: destination, from, text });
    if (!sendResult.ok) {
      return { status: "error", error: { code: "SOLAPI_ERROR", message: sendResult.error } };
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
};

export async function callAdapter(
  key: string,
  params: Record<string, unknown>,
  ctx?: AdapterContext
): Promise<ToolCallResult> {
  const adapter = adapters[key];
  if (!adapter) {
    return { status: "error", error: { code: "ADAPTER_NOT_FOUND", message: `adapter ${key} not found` } };
  }
  return adapter(params, ctx);
}

