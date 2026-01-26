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

const adapters: Record<string, ToolAdapter> = {
  lookup_order: async (params) => {
    const orderId = String(params.order_id || "");
    if (!orderId) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "order_id is required" } };
    }
    return {
      status: "success",
      data: {
        status: "SHIPPED",
        eta: "2026-01-28",
        items: [{ sku: "SKU-001", qty: 1 }],
        customer_match_level: "PARTIAL",
        shipment_tracking: orderId ? maskValue(`TRK-${orderId}`) : null,
      },
    };
  },
  track_shipment: async (params) => {
    const tracking = String(params.tracking_number || "");
    if (!tracking) {
      return { status: "error", error: { code: "INVALID_INPUT", message: "tracking_number is required" } };
    }
    return {
      status: "success",
      data: { carrier: params.carrier || "GENERIC", status: "IN_TRANSIT", eta: "2026-01-28" },
    };
  },
  create_ticket: async (params) => {
    return {
      status: "success",
      data: { ticket_id: "TCK-1001", status: "OPEN", summary: params.summary || "" },
    };
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
