type ToolCallResult = {
  status: "success" | "error";
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
};

import type { SupabaseClient } from "@supabase/supabase-js";

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

type Cafe24ProviderConfig = {
  mall_id?: string;
  client_id?: string;
  client_secret?: string;
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
  const cafe24 = row.providers?.cafe24 || {};
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
    clientId: cafe24.client_id || "",
    clientSecret: cafe24.client_secret || "",
    expiresAt: cafe24.expires_at || "",
    shopNo,
    boardNo,
    baseUrl: `https://${cafe24.mall_id}.cafe24api.com/api/v2/admin`,
  };
}

function isExpired(expiresAt: string) {
  const exp = Date.parse(expiresAt);
  if (Number.isNaN(exp)) return true;
  return exp <= Date.now() + 30_000;
}

async function refreshCafe24Token(cfg: {
  settingsId: string;
  mallId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  supabase: SupabaseClient;
}) {
  if (!cfg.clientId || !cfg.clientSecret) {
    return { ok: false as const, error: "Missing client_id/client_secret" };
  }
  const auth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetch(`https://${cfg.mallId}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(cfg.refreshToken)}`,
  });
  const payloadText = await res.text();
  if (!res.ok) {
    return { ok: false as const, error: `Cafe24 refresh failed ${res.status}: ${payloadText}` };
  }
  const payload = JSON.parse(payloadText) as {
    access_token: string;
    refresh_token: string;
    expires_at: string;
  };
  const { data: settingsRow, error: settingsError } = await cfg.supabase
    .from("auth_settings")
    .select("providers")
    .eq("id", cfg.settingsId)
    .maybeSingle();
  if (settingsError || !settingsRow) {
    return { ok: false as const, error: "Auth settings not found" };
  }
  const providers = (settingsRow.providers || {}) as Record<string, Cafe24ProviderConfig | undefined>;
  const current = providers.cafe24 || {};
  const next = {
    ...current,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at,
  };
  providers.cafe24 = next;
  const { error } = await cfg.supabase
    .from("auth_settings")
    .update({
      providers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cfg.settingsId);
  if (error) {
    return { ok: false as const, error: `Token update failed: ${error.message}` };
  }
  return { ok: true as const, accessToken: payload.access_token };
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
    if (isExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
    if (isExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
    if (isExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
    const cellphone = String(params.cellphone || "");
    if (!cellphone) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "cellphone is required" } };
    }
    if (isExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        cfg.accessToken = refreshed.accessToken;
      } else {
        return { status: "error", error: { code: "TOKEN_REFRESH_FAILED", message: refreshed.error } };
      }
    }
    const result = await cafe24Request(cfg, `/customers`, {
      query: { shop_no: cfg.shopNo, cellphone },
    });
    if (!result.ok && result.error.includes("401")) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          `/customers`,
          { query: { shop_no: cfg.shopNo, cellphone } }
        );
        if (retry.ok) return { status: "success", data: retry.data };
      }
    }
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
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
    if (isExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
        refreshToken: cfg.refreshToken,
        supabase: ctx!.supabase,
      });
      if (refreshed.ok) {
        const retry = await cafe24Request(
          { ...cfg, accessToken: refreshed.accessToken },
          `/orders/${encodeURIComponent(orderId)}`,
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
    if (isExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
    if (isExpired(cfg.expiresAt)) {
      const refreshed = await refreshCafe24Token({
        settingsId: cfg.settingsId,
        mallId: cfg.mallId,
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
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
