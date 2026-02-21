import { DEFAULT_TOOL_PROVIDER_MAP } from "./mcpToolRegistry";

export type AnswerMode = "action" | "info" | "handoff";

type CapabilityContract = {
  intent: string;
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  requiredTools: string[];
  optionalTools: string[];
  unsupportedFeatureLabel: string;
  supportedAlternatives: string[];
  answerModes: AnswerMode[];
};

type CapabilityGateInput = {
  intent: string;
  hasAllowedToolName: (name: string) => boolean;
};

type CapabilityGateResult = {
  blocked: boolean;
  answerMode: AnswerMode;
  missingTools: string[];
  missingProviders: string[];
  missingCapabilities: string[];
  unsupportedFeatureLabel: string;
  reason: string;
  message: string;
};

const CAPABILITY_TOOL_MAP: Record<string, string[]> = {
  order_lookup: ["list_orders", "lookup_order"],
  order_update: ["update_order_shipping_address"],
  otp_gate: ["send_otp", "verify_otp"],
  shipment_tracking: ["track_shipment"],
  refund_ticket: ["create_ticket"],
  product_catalog_read: ["resolve_product", "read_product"],
  restock_subscription_provider: ["subscribe_restock"],
  address_search: ["search_address"],
  kb_access: [],
  handoff: [],
};

const CAPABILITY_LABELS: Record<string, string> = {
  order_lookup: "주문번호 조회",
  order_update: "배송지 변경",
  otp_gate: "본인 인증",
  shipment_tracking: "배송 조회",
  refund_ticket: "환불/반품 접수",
  product_catalog_read: "상품 조회",
  restock_subscription_provider: "재입고 알림 신청",
  address_search: "주소 검색",
  kb_access: "FAQ/정책 답변",
  handoff: "상담 연결",
};

const INTENT_CAPABILITY_CONTRACTS: Record<string, CapabilityContract> = {
  restock_inquiry: {
    intent: "restock_inquiry",
    requiredCapabilities: [],
    optionalCapabilities: ["product_catalog_read", "kb_access"],
    requiredTools: [],
    optionalTools: ["resolve_product", "read_product"],
    unsupportedFeatureLabel: "재입고 상품 조회",
    supportedAlternatives: ["다른 문의", "관리자 연결"],
    answerModes: ["info", "handoff"],
  },
  restock_subscribe: {
    intent: "restock_subscribe",
    requiredCapabilities: [],
    optionalCapabilities: ["restock_subscription_provider", "otp_gate"],
    requiredTools: [],
    optionalTools: ["subscribe_restock", "send_otp", "verify_otp"],
    unsupportedFeatureLabel: "재입고 알림 신청",
    supportedAlternatives: ["다른 문의", "관리자 연결"],
    answerModes: ["action", "handoff"],
  },
  order_change: {
    intent: "order_change",
    requiredCapabilities: ["order_lookup", "order_update", "otp_gate"],
    optionalCapabilities: ["address_search"],
    requiredTools: [],
    optionalTools: ["search_address"],
    unsupportedFeatureLabel: "주문번호 조회, 배송지 변경",
    supportedAlternatives: ["관리자 연결", "다른 채널 안내"],
    answerModes: ["action", "handoff"],
  },
  shipping_inquiry: {
    intent: "shipping_inquiry",
    requiredCapabilities: ["order_lookup", "shipment_tracking", "otp_gate"],
    optionalCapabilities: [],
    requiredTools: [],
    optionalTools: [],
    unsupportedFeatureLabel: "배송 조회",
    supportedAlternatives: ["관리자 연결", "다른 채널 안내"],
    answerModes: ["action", "handoff"],
  },
  refund_request: {
    intent: "refund_request",
    requiredCapabilities: ["order_lookup", "refund_ticket", "otp_gate"],
    optionalCapabilities: [],
    requiredTools: [],
    optionalTools: [],
    unsupportedFeatureLabel: "환불/반품 접수",
    supportedAlternatives: ["관리자 연결", "다른 채널 안내"],
    answerModes: ["action", "handoff"],
  },
  faq: {
    intent: "faq",
    requiredCapabilities: ["kb_access"],
    optionalCapabilities: [],
    requiredTools: [],
    optionalTools: [],
    unsupportedFeatureLabel: "FAQ/정책 답변",
    supportedAlternatives: ["다른 문의", "관리자 연결"],
    answerModes: ["info", "handoff"],
  },
  general: {
    intent: "general",
    requiredCapabilities: [],
    optionalCapabilities: ["kb_access", "handoff"],
    requiredTools: [],
    optionalTools: [],
    unsupportedFeatureLabel: "일반 문의 답변",
    supportedAlternatives: ["관리자 연결"],
    answerModes: ["info", "handoff"],
  },
};

function resolveContract(intent: string): CapabilityContract {
  const safeIntent = String(intent || "").trim();
  return INTENT_CAPABILITY_CONTRACTS[safeIntent] || {
    intent: safeIntent || "general",
    requiredCapabilities: [],
    optionalCapabilities: [],
    requiredTools: [],
    optionalTools: [],
    unsupportedFeatureLabel: "요청하신 기능",
    supportedAlternatives: ["관리자 연결"],
    answerModes: ["info", "handoff"],
  };
}

function buildRequiredTools(contract: CapabilityContract) {
  const tools = new Set<string>();
  contract.requiredCapabilities.forEach((cap) => {
    (CAPABILITY_TOOL_MAP[cap] || []).forEach((tool) => tools.add(tool));
  });
  contract.requiredTools.forEach((tool) => tools.add(tool));
  return Array.from(tools);
}

function buildMissingCapabilities(requiredCaps: string[], missingTools: string[]) {
  const missing = new Set<string>();
  requiredCaps.forEach((cap) => {
    const tools = CAPABILITY_TOOL_MAP[cap] || [];
    if (tools.length === 0) return;
    const hasAll = tools.every((tool) => !missingTools.includes(tool));
    if (!hasAll) missing.add(cap);
  });
  return Array.from(missing);
}

function buildUnsupportedLabel(fallback: string, missingCaps: string[]) {
  if (missingCaps.length === 0) return fallback;
  const labels = missingCaps.map((cap) => CAPABILITY_LABELS[cap] || cap);
  return Array.from(new Set(labels)).join(", ");
}

function buildMissingReason(missingTools: string[]) {
  if (missingTools.length === 0) return "필수 연동이 설정되어 있지 않습니다.";
  const providers = Array.from(
    new Set(
      missingTools
        .map((tool) => DEFAULT_TOOL_PROVIDER_MAP[tool])
        .filter((provider): provider is string => Boolean(provider))
    )
  );
  if (providers.length > 0) {
    return `${providers.join(", ")} 연동이 설정되어 있지 않습니다.`;
  }
  return `필수 도구가 허용되지 않았습니다: ${missingTools.join(", ")}`;
}

export function evaluateIntentCapabilityGate(input: CapabilityGateInput): CapabilityGateResult {
  const intent = String(input.intent || "").trim();
  const contract = resolveContract(intent);
  const requiredTools = buildRequiredTools(contract);
  const missingTools = requiredTools.filter((tool) => !input.hasAllowedToolName(tool));
  if (missingTools.length === 0) {
    return {
      blocked: false,
      answerMode: "action",
      missingTools: [],
      missingProviders: [],
      missingCapabilities: [],
      unsupportedFeatureLabel: contract.unsupportedFeatureLabel,
      reason: "",
      message: "",
    };
  }

  const missingProviders = Array.from(
    new Set(
      missingTools
        .map((tool) => DEFAULT_TOOL_PROVIDER_MAP[tool])
        .filter((provider): provider is string => Boolean(provider))
    )
  );
  const missingCaps = buildMissingCapabilities(contract.requiredCapabilities, missingTools);
  const unsupportedLabel = buildUnsupportedLabel(contract.unsupportedFeatureLabel, missingCaps);
  const reason = buildMissingReason(missingTools);
  const fallback = contract.supportedAlternatives[0] || "관리자 연결";
  const message = [
    `현재 이 채널에서는 ${unsupportedLabel} 기능을 지원하지 않습니다.`,
    `이유: ${reason}`,
    `원하시면 ${fallback}을(를) 도와드릴까요?`,
  ].join("\n");

  return {
    blocked: true,
    answerMode: contract.answerModes.includes("handoff") ? "handoff" : "info",
    missingTools,
    missingProviders,
    missingCapabilities: missingCaps,
    unsupportedFeatureLabel: unsupportedLabel,
    reason,
    message,
  };
}
