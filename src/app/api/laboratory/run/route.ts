import { NextRequest, NextResponse } from "next/server";
import {
  resolveConversationPageFeatures,
  type ConversationFeaturesProviderShape,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";

function parsePageKey(value: unknown): ConversationPageKey {
  const pageKey = String(value || "").trim();
  if (!pageKey) return "/app/conversation";
  return pageKey;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { page_key?: unknown } | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const pageKey = parsePageKey(body.page_key);
  const providerValue: ConversationFeaturesProviderShape | null = null;
  resolveConversationPageFeatures(pageKey, providerValue);

  const targetUrl = new URL("/api/conversation/run", req.nextUrl.origin);
  const res = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(req.headers.get("authorization") ? { Authorization: req.headers.get("authorization") as string } : {}),
      ...(req.headers.get("cookie") ? { Cookie: req.headers.get("cookie") as string } : {}),
      ...(req.headers.get("x-runtime-trace-id")
        ? { "x-runtime-trace-id": req.headers.get("x-runtime-trace-id") as string }
        : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
