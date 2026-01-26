type ToolCallResult = {
  status: "success" | "error";
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
};

type ToolAdapter = (params: Record<string, unknown>) => Promise<ToolCallResult>;

function maskValue(value: string) {
  if (value.length <= 4) return "*".repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function getCafe24Config() {
  const mallId = process.env.CAFE24_MALL_ID || "";
  const accessToken = process.env.CAFE24_ACCESS_TOKEN || "";
  const shopNo = process.env.CAFE24_SHOP_NO || "1";
  const boardNo = process.env.CAFE24_BOARD_NO || "";
  if (!mallId || !accessToken) {
    return { ok: false as const, error: "Missing CAFE24_MALL_ID or CAFE24_ACCESS_TOKEN in env" };
  }
  return {
    ok: true as const,
    mallId,
    accessToken,
    shopNo,
    boardNo,
    baseUrl: `https://${mallId}.cafe24api.com/api/v2/admin`,
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
  lookup_order: async (params) => {
    const orderId = String(params.order_id || "");
    if (!orderId) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "order_id is required" } };
    }
    const cfg = getCafe24Config();
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    const result = await cafe24Request(cfg, `/orders/${encodeURIComponent(orderId)}`, {
      query: { shop_no: cfg.shopNo },
    });
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  track_shipment: async (params) => {
    const orderId = String(params.order_id || params.tracking_number || "");
    if (!orderId) {
      return {
        status: "error",
        error: { code: "INVALID_INPUT", message: "order_id is required for Cafe24 shipments lookup" },
      };
    }
    const cfg = getCafe24Config();
    if (!cfg.ok) {
      return { status: "error", error: { code: "CONFIG_ERROR", message: cfg.error } };
    }
    const result = await cafe24Request(cfg, `/orders/${encodeURIComponent(orderId)}/shipments`, {
      query: { shop_no: cfg.shopNo },
    });
    if (!result.ok) {
      return { status: "error", error: { code: "CAFE24_ERROR", message: result.error } };
    }
    return { status: "success", data: result.data };
  },
  create_ticket: async (params) => {
    const cfg = getCafe24Config();
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
    const requestBody: Record<string, unknown> = {
      shop_no: cfg.shopNo,
      board_no: boardNo,
      writer,
      title,
      content,
      client_ip: clientIp,
    };
    const optionalKeys = [
      "writer_email",
      "member_id",
      "password",
      "reply_mail",
      "secret",
      "notice",
      "fixed",
      "reply",
      "board_category_no",
      "input_channel",
      "order_id",
      "product_no",
      "category_no",
    ];
    for (const key of optionalKeys) {
      const value = (params as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== "") {
        requestBody[key] = value;
      }
    }
    const result = await cafe24Request(cfg, `/boards/${encodeURIComponent(boardNo)}/articles`, {
      method: "POST",
      body: {
        request: {
          ...requestBody,
        },
      },
    });
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

export async function callAdapter(key: string, params: Record<string, unknown>): Promise<ToolCallResult> {
  const adapter = adapters[key];
  if (!adapter) {
    return { status: "error", error: { code: "ADAPTER_NOT_FOUND", message: `adapter ${key} not found` } };
  }
  return adapter(params);
}
