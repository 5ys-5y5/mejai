type ToolCallResult = {
  status: "success" | "error";
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
};

import type { SupabaseClient } from "@supabase/supabase-js";
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

function readEnv(name: string) {
  return (process.env[name] || "").trim();
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
    .from("auth_settings")
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
    .from("auth_settings")
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
  send_otp: async (params) => {
    const destination = String(params.destination || "");
    if (!destination) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "destination is required" } };
    }
    return {
      status: "success",
      data: { delivery: "sms", destination: maskValue(destination), otp_ref: "otp_ref_001" },
    };
  },
  verify_otp: async (params) => {
    const code = String(params.code || "");
    if (!code) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "code is required" } };
    }
    return {
      status: "success",
      data: { verified: true, customer_verification_token: "cvt_001" },
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

