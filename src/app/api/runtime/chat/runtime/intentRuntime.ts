export function deriveExpectedInputFromAnswer(lastAnswer: string) {
  const text = String(lastAnswer || "");
  if (text.includes("인증번호")) return "otp_code";
  const addressPrompt = text.includes("주소") || text.includes("배송지");
  const zipcodeOnlyPrompt = text.includes("우편번호") && !addressPrompt && /(알려|입력|필요)/.test(text);
  if (zipcodeOnlyPrompt) return "zipcode";
  if (addressPrompt) return "address";
  if (text.includes("휴대폰 번호")) {
    if (text.includes("주문번호") && text.includes("또는")) return "order_id_or_phone";
    return "phone";
  }
  if (text.includes("주문번호") && text.includes("또는") && text.includes("휴대폰")) return "order_id_or_phone";
  if (text.includes("주문번호")) return "order_id";
  return null;
}

export function isRestockSubscribeStage(prevBotContext: Record<string, any>) {
  return (
    prevBotContext.restock_pending === true &&
    [
      "awaiting_subscribe_suggestion",
      "awaiting_subscribe_confirm",
      "awaiting_subscribe_phone",
      "awaiting_subscribe_lead_days",
    ].includes(String(prevBotContext.restock_stage || ""))
  );
}

