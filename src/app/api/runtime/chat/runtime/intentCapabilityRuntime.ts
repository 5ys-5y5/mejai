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
  order_lookup: "二쇰Ц踰덊샇 議고쉶",
  order_update: "諛곗넚吏 蹂寃?,
  otp_gate: "蹂몄씤 ?몄쬆",
  shipment_tracking: "諛곗넚 議고쉶",
  refund_ticket: "?섎텋/諛섑뭹 ?묒닔",
  product_catalog_read: "?곹뭹 議고쉶",
  restock_subscription_provider: "?ъ엯怨??뚮┝ ?좎껌",
  address_search: "二쇱냼 寃??,
  kb_access: "FAQ/?뺤콉 ?듬?",
  handoff: "?곷떞 ?곌껐",
};

const INTENT_CAPABILITY_CONTRACTS: Record<string, CapabilityContract> = {
  restock_inquiry: {
    intent: "restock_inquiry",
    requiredCapabilities: [],
    optionalCapabilities: ["product_catalog_read", "kb_access"],
    requiredTools: [],
    optionalTools: ["resolve_product", "read_product"],
    unsupportedFeatureLabel: "?ъ엯怨??곹뭹 議고쉶",
    supportedAlternatives: ["?ㅻⅨ 臾몄쓽", "愿由ъ옄 ?곌껐"],
    answerModes: ["info", "handoff"],
  },
  restock_subscribe: {
    intent: "restock_subscribe",
    requiredCapabilities: [],
    optionalCapabilities: ["restock_subscription_provider", "otp_gate"],
    requiredTools: [],
    optionalTools: ["subscribe_restock", "send_otp", "verify_otp"],
    unsupportedFeatureLabel: "?ъ엯怨??뚮┝ ?좎껌",
    supportedAlternatives: ["?ㅻⅨ 臾몄쓽", "愿由ъ옄 ?곌껐"],
    answerModes: ["action", "handoff"],
  },
  order_change: {
    intent: "order_change",
    requiredCapabilities: ["order_lookup", "order_update", "otp_gate"],
    optionalCapabilities: ["address_search"],
    requiredTools: [],
    optionalTools: ["search_address"],
    unsupportedFeatureLabel: "二쇰Ц踰덊샇 議고쉶, 諛곗넚吏 蹂寃?,
    supportedAlternatives: ["愿由ъ옄 ?곌껐", "?ㅻⅨ 梨꾨꼸 ?덈궡"],
    answerModes: ["action", "handoff"],
  },
  shipping_inquiry: {
    intent: "shipping_inquiry",
    requiredCapabilities: ["order_lookup", "shipment_tracking", "otp_gate"],
    optionalCapabilities: [],
    requiredTools: [],
    optionalTools: [],
    unsupportedFeatureLabel: "諛곗넚 議고쉶",
    supportedAlternatives: ["愿由ъ옄 ?곌껐", "?ㅻⅨ 梨꾨꼸 ?덈궡"],
    answerModes: ["action", "handoff"],
  },
  refund_request: {
    intent: "refund_request",
    requiredCapabilities: ["order_lookup", "refund_ticket", "otp_gate"],
    optionalCapabilities: [],
    requiredTools: [],
    optionalTools: [],
    unsupportedFeatureLabel: "?섎텋/諛섑뭹 ?묒닔",
    supportedAlternatives: ["愿由ъ옄 ?곌껐", "?ㅻⅨ 梨꾨꼸 ?덈궡"],
    answerModes: ["action", "handoff"],
  },
  admin_login: {
    intent: "admin_login",
    requiredCapabilities: ["otp_gate"],
    optionalCapabilities: [],
    requiredTools: [],
    optionalTools: [],
    unsupportedFeatureLabel: "관리자 로그인",
    supportedAlternatives: ["?ã…»â…¨ è‡¾ëª„ì“½"],
    answerModes: ["action", "handoff"],
  },
  faq: {
    intent: "faq",
    requiredCapabilities: ["kb_access"],
    optionalCapabilities: [],
    requiredTools: [],
    optionalTools: [],
    unsupportedFeatureLabel: "FAQ/?뺤콉 ?듬?",
    supportedAlternatives: ["?ㅻⅨ 臾몄쓽", "愿由ъ옄 ?곌껐"],
    answerModes: ["info", "handoff"],
  },
  general: {
    intent: "general",
    requiredCapabilities: [],
    optionalCapabilities: ["kb_access", "handoff"],
    requiredTools: [],
    optionalTools: [],
    unsupportedFeatureLabel: "?쇰컲 臾몄쓽 ?듬?",
    supportedAlternatives: ["愿由ъ옄 ?곌껐"],
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
    unsupportedFeatureLabel: "?붿껌?섏떊 湲곕뒫",
    supportedAlternatives: ["愿由ъ옄 ?곌껐"],
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
  if (missingTools.length === 0) return "?꾩닔 ?곕룞???ㅼ젙?섏뼱 ?덉? ?딆뒿?덈떎.";
  const providers = Array.from(
    new Set(
      missingTools
        .map((tool) => DEFAULT_TOOL_PROVIDER_MAP[tool])
        .filter((provider): provider is string => Boolean(provider))
    )
  );
  if (providers.length > 0) {
    return `${providers.join(", ")} ?곕룞???ㅼ젙?섏뼱 ?덉? ?딆뒿?덈떎.`;
  }
  return `?꾩닔 ?꾧뎄媛 ?덉슜?섏? ?딆븯?듬땲?? ${missingTools.join(", ")}`;
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
  const fallback = contract.supportedAlternatives[0] || "愿由ъ옄 ?곌껐";
  const message = [
    `?꾩옱 ??梨꾨꼸?먯꽌??${unsupportedLabel} 湲곕뒫??吏?먰븯吏 ?딆뒿?덈떎.`,
    `?댁쑀: ${reason}`,
    `?먰븯?쒕㈃ ${fallback}??瑜? ?꾩??쒕┫源뚯슂?`,
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
