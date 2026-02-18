export function deriveExpectedInputFromAnswer(lastAnswer: string) {
  const text = String(lastAnswer || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (/인증번호|OTP|코드/.test(text)) return "otp_code";
  const hasZipcode = /우편번호|5자리/.test(text);
  const hasAddress = /주소|배송지|수령지/.test(text);
  if (hasZipcode && !hasAddress) return "zipcode";
  if (hasAddress) return "address";
  const hasPhone = /휴대폰|전화번호|연락처/.test(text);
  const hasOrderId = /주문번호|주문\s*번호/.test(text);
  if (hasOrderId && hasPhone) return "order_id_or_phone";
  if (hasPhone) return "phone";
  if (hasOrderId) return "order_id";
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
