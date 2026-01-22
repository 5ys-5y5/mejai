import { NextRequest, NextResponse } from "next/server";

function buildTwiML(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say language="ko-KR">${message}</Say>\n  <Hangup/>\n</Response>`;
}

export async function GET() {
  const xml = buildTwiML("이 주소는 Twilio 음성 웹훅입니다. 테스트 통화를 위해 Twilio에서 호출해 주세요.");
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: NextRequest) {
  // Twilio는 기본적으로 application/x-www-form-urlencoded 로 전송합니다.
  const form = await req.formData();
  const from = String(form.get("From") || "알 수 없는 번호");
  const xml = buildTwiML(`안녕하세요. 메자이입니다. ${from}님, 테스트 통화가 연결되었습니다.`);
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
