import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getServerContext } from "@/lib/serverAuth";

const SNAPSHOT_EVENT_TYPE = "DEBUG_TRANSCRIPT_SNAPSHOT_SAVED";
type SnapshotKind = "conversation" | "issue";
type SnapshotPage = "/" | "/app/laboratory";

type SnapshotPayload = {
  page?: unknown;
  kind?: unknown;
  transcript_text?: unknown;
};

type SnapshotRow = {
  id: string;
  payload: SnapshotPayload | null;
  created_at: string | null;
};

function isValidPage(value: string) {
  return value === "/" || value === "/app/laboratory";
}

function isValidKind(value: string) {
  return value === "conversation" || value === "issue";
}

async function assertSessionAccess(
  context: Awaited<ReturnType<typeof getServerContext>>,
  sessionId: string
) {
  if ("error" in context) {
    return { error: NextResponse.json({ error: context.error }, { status: 401 }) };
  }
  const { data: sessionRow, error } = await context.supabase
    .from("D_conv_sessions")
    .select("id, org_id")
    .eq("id", sessionId)
    .eq("org_id", context.orgId)
    .maybeSingle();
  if (error) return { error: NextResponse.json({ error: error.message }, { status: 400 }) };
  if (!sessionRow) return { error: NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 }) };
  return { error: null };
}

async function appendServicePageLog(input: {
  turnId: string | null;
  transcriptText: string;
}) {
  if (process.env.NODE_ENV === "production") return;
  const logPath = path.join(process.cwd(), "docs", "servicePageLog.md");
  await mkdir(path.dirname(logPath), { recursive: true });
  const header = `TURN_ID: ${input.turnId || "-"}`;
  const body = String(input.transcriptText || "").trim();
  if (!body) return;
  const entry = `\n\n${header}\n\n${body}\n`;
  await appendFile(logPath, entry, { encoding: "utf-8" });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get("session_id") || "").trim();
  const page = String(url.searchParams.get("page") || "").trim();
  const kind = String(url.searchParams.get("kind") || "").trim();
  if (!sessionId || !isValidPage(page) || !isValidKind(kind)) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const access = await assertSessionAccess(context, sessionId);
  if (access.error) return access.error;

  const { data, error } = await context.supabase
    .from("F_audit_events")
    .select("id, payload, created_at")
    .eq("session_id", sessionId)
    .eq("event_type", SNAPSHOT_EVENT_TYPE)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = ((data || []) as SnapshotRow[]);
  const row = rows.find((item) => {
    const payload = (item?.payload || {}) as SnapshotPayload;
    return payload.page === page && payload.kind === kind && typeof payload.transcript_text === "string";
  });

  return NextResponse.json({
    found: Boolean(row),
    transcript_text: row && typeof row.payload?.transcript_text === "string" ? row.payload.transcript_text : null,
    created_at: row?.created_at || null,
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const sessionId = String(body?.session_id || "").trim();
  const page = String(body?.page || "").trim();
  const kind = String(body?.kind || "").trim();
  const transcriptText = typeof body?.transcript_text === "string" ? body.transcript_text : "";
  const turnIdRaw = body?.turn_id;
  const turnId = typeof turnIdRaw === "string" && turnIdRaw.trim().length > 0 ? turnIdRaw.trim() : null;

  if (!sessionId || !isValidPage(page) || !isValidKind(kind) || !transcriptText.trim()) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const access = await assertSessionAccess(context, sessionId);
  if (access.error) return access.error;

  const payload = {
    page: page as SnapshotPage,
    kind: kind as SnapshotKind,
    transcript_text: transcriptText,
  };
  const botContext = {
    stage: "debug_transcript",
    source: "copy_button",
    page,
    kind,
  };

  const { error } = await context.supabase.from("F_audit_events").insert({
    session_id: sessionId,
    turn_id: turnId,
    event_type: SNAPSHOT_EVENT_TYPE,
    payload,
    created_at: new Date().toISOString(),
    bot_context: botContext,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await appendServicePageLog({ turnId, transcriptText });
  } catch {
    // ignore local log errors
  }

  return NextResponse.json({ ok: true });
}
