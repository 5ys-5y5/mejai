import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || "";
  const state = searchParams.get("state") || "";
  const error = searchParams.get("error") || "";
  const traceId = searchParams.get("trace_id") || "";

  const title = error ? "Cafe24 OAuth Error" : "Cafe24 OAuth Success";
  const body = `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; line-height: 1.5; }
      code, pre { background: #f4f4f4; padding: 8px; display: block; }
      .label { font-weight: 700; margin-top: 16px; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    ${
      error
        ? `<div class="label">error</div><pre>${error}</pre>
           <div class="label">trace_id</div><pre>${traceId}</pre>`
        : `<div class="label">authorization_code</div><pre>${code}</pre>
           <div class="label">state</div><pre>${state}</pre>`
    }
    <p>이 값을 복사해서 .env의 CAFE24_AUTHORIZATION_CODE에 붙여넣으세요.</p>
  </body>
</html>
  `.trim();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
