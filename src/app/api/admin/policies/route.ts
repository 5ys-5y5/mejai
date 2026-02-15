import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { runLlm, type ChatMessage } from "@/lib/llm_mk2";

export const runtime = "nodejs";

type PolicyRow = {
  id: string;
  path: string;
  file_name: string;
  content_hash: string;
  summary_ko: string;
  exports: string[];
  details_ko?: Record<string, unknown> | null;
  status: "LIVE" | "MODIFIED" | "NEW" | "DELETED";
  line_count: number;
  prev_line_count: number | null;
  last_seen_at: string;
  last_changed_at: string;
  created_at: string;
  updated_at: string;
};

type FileSnapshot = {
  path: string;
  fileName: string;
  content: string;
  hash: string;
  lineCount: number;
  exports: string[];
  summary: string;
};

type PolicyItemMeta = {
  name: string;
  kind: string;
  exported: boolean;
  hash: string;
};

type PolicyItemDetail = {
  name: string;
  kind: string;
  exported: boolean;
  status: "LIVE" | "MODIFIED" | "NEW" | "DELETED";
  item_hash: string;
  role: string;
  impact: string;
};

const POLICIES_DIR = path.join(process.cwd(), "src", "app", "api", "runtime", "chat", "policies");

const SUMMARY_BY_FILE: Record<string, string> = {
  "intentSlotPolicy.ts": "대화 의도 감지, 슬롯/선택 파싱, yes/no 판정 등 입력 해석 규칙을 정의합니다.",
  "principles.ts": "런타임 전반의 원칙(안전, 응답, 대화, 주소, 메모리, 감사)을 정의합니다.",
  "renderPolicy.ts": "UI 렌더링 정책(퀵리플라이/카드/선택 규칙)을 정의합니다.",
  "replyStyleRuntime.ts": "말투/문장톤 후처리 및 응답 스타일 규칙을 정의합니다.",
  "restockResponsePolicy.ts": "재입고 응답의 파싱/매칭/랭킹/출력 정책을 정의합니다.",
};

async function ensureAdmin(context: Awaited<ReturnType<typeof getServerContext>>) {
  if ("error" in context) return { ok: false, status: 401, error: context.error };
  const { data: access } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!access?.is_admin) {
    return { ok: false, status: 403, error: "FORBIDDEN" };
  }
  return { ok: true as const };
}

function extractExports(content: string) {
  const names = new Set<string>();
  const patterns = [
    /export\s+function\s+([A-Za-z0-9_]+)/g,
    /export\s+const\s+([A-Za-z0-9_]+)/g,
    /export\s+type\s+([A-Za-z0-9_]+)/g,
    /export\s+interface\s+([A-Za-z0-9_]+)/g,
    /export\s+enum\s+([A-Za-z0-9_]+)/g,
    /export\s+class\s+([A-Za-z0-9_]+)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content))) {
      if (match[1]) names.add(match[1]);
    }
  }
  const namedExportRegex = /export\s*{\s*([^}]+)\s*}/g;
  let namedMatch: RegExpExecArray | null;
  while ((namedMatch = namedExportRegex.exec(content))) {
    const chunk = namedMatch[1] || "";
    chunk
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const aliasSplit = part.split(/\s+as\s+/i);
        const name = aliasSplit[0]?.trim();
        if (name) names.add(name);
      });
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function buildSummary(fileName: string, exportsList: string[]) {
  const base = SUMMARY_BY_FILE[fileName] || "런타임 정책 규칙을 정의합니다.";
  const exportsLine =
    exportsList.length > 0 ? `주요 export: ${exportsList.join(", ")}` : "주요 export: 없음";
  return `${base}\n${exportsLine}`;
}

function buildFallbackDetails(summary: string, items: PolicyItemMeta[]) {
  return {
    overview: summary,
    items: items.map((item) => ({
      name: item.name,
      kind: item.kind,
      exported: item.exported,
      status: "LIVE",
      item_hash: item.hash,
      role: "정의된 역할을 코드에서 확인해야 합니다.",
      impact: "런타임 정책 흐름에 영향을 줍니다.",
    })),
  };
}

async function summarizeWithLlm(snapshot: FileSnapshot, items: PolicyItemMeta[]) {
  const systemPrompt =
    "너는 한국어 기술 문서 편집자다. 코드의 정책/규칙이 대화 흐름을 어떻게 통제하는지 구체적으로 설명한다.";
  const itemHints = items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.name} (${item.kind}${item.exported ? ", exported" : ", internal"})`
    )
    .join("\n");
  const userPrompt = [
    `파일명: ${snapshot.fileName}`,
    "다음 TypeScript 코드를 읽고 JSON으로만 답해라.",
    "규칙:",
    "- overview: 파일의 전체 역할과 대화/런타임에 미치는 영향(3~5문장).",
    "- items: 아래 목록의 항목을 빠짐없이 포함해 설명.",
    "- 각 item에는 name, role, impact를 포함.",
    "- role: 1~2문장으로 구체적 설명.",
    "- impact: 대화 흐름/정책 결정에 미치는 영향 1문장.",
    "- 출력은 JSON만, 마크다운 금지.",
    "JSON 스키마:",
    '{ "overview": "...", "items": [ { "name": "...", "role": "...", "impact": "..." } ] }',
    "항목 목록:",
    itemHints || "(없음)",
    "코드:",
    "```ts",
    snapshot.content,
    "```",
  ].join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  const result = await runLlm("chatgpt", messages);
  let raw = String(result.text || "").trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  const candidate =
    braceStart >= 0 && braceEnd >= braceStart ? raw.slice(braceStart, braceEnd + 1).trim() : raw;
  const parsed = JSON.parse(candidate) as { overview?: string; items?: Array<Record<string, unknown>> };
  return { details: parsed, model: result.model };
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeItemName(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return raw;
  const withoutSuffix = raw.replace(/\s*\((type|function|const|interface|enum|class|export)\)\s*$/i, "");
  return withoutSuffix.replace(/^export\s+/i, "").trim();
}

async function extractPolicyItems(content: string): Promise<PolicyItemMeta[]> {
  let tsModule: typeof import("typescript") | null = null;
  try {
    const mod = await import("typescript");
    tsModule = (mod as unknown as { default?: typeof import("typescript") }).default || mod;
  } catch (error) {
    tsModule = null;
  }
  if (!tsModule) {
    const fallbackItems: PolicyItemMeta[] = [];
    const regexes = [
      { kind: "function", regex: /function\s+([A-Za-z0-9_]+)/g },
      { kind: "const", regex: /const\s+([A-Za-z0-9_]+)/g },
      { kind: "type", regex: /type\s+([A-Za-z0-9_]+)/g },
      { kind: "interface", regex: /interface\s+([A-Za-z0-9_]+)/g },
      { kind: "enum", regex: /enum\s+([A-Za-z0-9_]+)/g },
      { kind: "class", regex: /class\s+([A-Za-z0-9_]+)/g },
    ];
    const seen = new Set<string>();
    for (const { kind, regex } of regexes) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content))) {
        const name = normalizeItemName(match[1]);
        if (!name || seen.has(name)) continue;
        seen.add(name);
        fallbackItems.push({
          name,
          kind,
          exported: /export\s+/.test(match[0]),
          hash: sha256(`${kind}:${name}`),
        });
      }
    }
    return fallbackItems.sort((a, b) => a.name.localeCompare(b.name));
  }
  const ts = tsModule;
  const source = ts.createSourceFile("policy.ts", content, ts.ScriptTarget.Latest, true);
  const items: PolicyItemMeta[] = [];

  const addItem = (name: string, kind: string, exported: boolean, nodeText: string) => {
    const trimmed = String(nodeText || "").trim();
    const hash = sha256(trimmed || `${kind}:${name}`);
    items.push({ name, kind, exported, hash });
  };

  const isExported = (node: import("typescript").Node) =>
    Boolean(node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));

  source.forEachChild((node) => {
    const exported = isExported(node);
    if (ts.isFunctionDeclaration(node) && node.name) {
      addItem(normalizeItemName(node.name.text), "function", exported, node.getText(source));
      return;
    }
    if (ts.isVariableStatement(node)) {
      const declarations = node.declarationList.declarations;
      declarations.forEach((decl) => {
        if (ts.isIdentifier(decl.name)) {
          addItem(normalizeItemName(decl.name.text), "const", exported, decl.getText(source));
        }
      });
      return;
    }
    if (ts.isTypeAliasDeclaration(node)) {
      addItem(normalizeItemName(node.name.text), "type", exported, node.getText(source));
      return;
    }
    if (ts.isInterfaceDeclaration(node)) {
      addItem(normalizeItemName(node.name.text), "interface", exported, node.getText(source));
      return;
    }
    if (ts.isEnumDeclaration(node)) {
      addItem(normalizeItemName(node.name.text), "enum", exported, node.getText(source));
      return;
    }
    if (ts.isClassDeclaration(node) && node.name) {
      addItem(normalizeItemName(node.name.text), "class", exported, node.getText(source));
      return;
    }
    if (ts.isExportAssignment(node)) {
      addItem("default", "export_assignment", true, node.getText(source));
      return;
    }
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      node.exportClause.elements.forEach((el) => {
        const name = el.name?.text;
        if (name) {
          addItem(normalizeItemName(name), "reexport", true, el.getText(source));
        }
      });
    }
  });

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

async function readPolicyFiles() {
  const entries = await fs.readdir(POLICIES_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".ts"));
  const snapshots: FileSnapshot[] = [];
  for (const file of files) {
    const filePath = path.join(POLICIES_DIR, file.name);
    const content = await fs.readFile(filePath, "utf-8");
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    const lineCount = content.split(/\r?\n/).length;
    const exportsList = extractExports(content);
    const summary = buildSummary(file.name, exportsList);
    snapshots.push({
      path: path.relative(process.cwd(), filePath),
      fileName: file.name,
      content,
      hash,
      lineCount,
      exports: exportsList,
      summary,
    });
  }
  return snapshots.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

type RefreshProgress =
  | { type: "start"; total: number }
  | { type: "file"; index: number; total: number; file_name: string; stage: string }
  | { type: "done"; total: number }
  | { type: "result"; items: PolicyRow[]; refreshed_at: string }
  | { type: "error"; message: string };

async function refreshPolicies(onProgress?: (payload: RefreshProgress) => void) {
  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED");
  }

  const now = new Date().toISOString();
  const { data: existingRows, error: fetchError } = await supabaseAdmin
    .from("I_runtime_policy_files")
    .select("*");
  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const existingByPath = new Map<string, PolicyRow>();
  (existingRows as PolicyRow[] | null | undefined)?.forEach((row) => {
    if (row?.path) existingByPath.set(row.path, row);
  });

  const snapshots = await readPolicyFiles();
  onProgress?.({ type: "start", total: snapshots.length });
  const seenPaths = new Set<string>();
  const upsertRows = [];
  for (let idx = 0; idx < snapshots.length; idx += 1) {
    const snapshot = snapshots[idx];
    onProgress?.({ type: "file", index: idx + 1, total: snapshots.length, file_name: snapshot.fileName, stage: "parse" });
    seenPaths.add(snapshot.path);
    const existing = existingByPath.get(snapshot.path);
    const isSame = existing?.content_hash === snapshot.hash;
    let status: PolicyRow["status"] = "NEW";
    if (existing) {
      if (existing.status === "DELETED") {
        status = "NEW";
      } else {
        status = isSame ? "LIVE" : "MODIFIED";
      }
    }
    const prevLineCount =
      status === "MODIFIED" ? existing?.line_count ?? null : existing?.prev_line_count ?? null;
    const lastChangedAt = status === "LIVE" ? existing?.last_changed_at || now : now;

    const currentItems = await extractPolicyItems(snapshot.content);
    let summary = snapshot.summary;
    let details: Record<string, unknown> = existing?.details_ko
      ? (existing.details_ko as Record<string, unknown>)
      : {};
    const prevItemsRaw = Array.isArray((details as { items?: unknown }).items)
      ? ((details as { items?: unknown }).items as Array<Record<string, unknown>>)
      : [];
    const prevMap = new Map<
      string,
      {
        originalName: string;
        hash: string;
        role: string;
        impact: string;
        kind?: string;
        exported?: boolean;
      }
    >();
    prevItemsRaw.forEach((item) => {
      const rawName = String(item?.name || "").trim();
      const name = normalizeItemName(rawName);
      if (!name) return;
      prevMap.set(name, {
        originalName: rawName,
        hash: String(item?.item_hash || ""),
        role: String(item?.role || ""),
        impact: String(item?.impact || ""),
        kind: typeof item?.kind === "string" ? String(item.kind) : undefined,
        exported: typeof item?.exported === "boolean" ? Boolean(item.exported) : undefined,
      });
    });

    const hasDetails = details && Object.keys(details).length > 0;
    const needsSummary = status === "NEW" || status === "MODIFIED" || !hasDetails;
    let detailItems: PolicyItemDetail[] = [];
    if (needsSummary) {
      onProgress?.({ type: "file", index: idx + 1, total: snapshots.length, file_name: snapshot.fileName, stage: "summarize" });
      try {
        const llmRes = await summarizeWithLlm(snapshot, currentItems);
        const llmDetails = llmRes.details || buildFallbackDetails(summary, currentItems);
        const llmItems = Array.isArray(llmDetails.items)
          ? (llmDetails.items as Array<Record<string, unknown>>)
          : [];
        const llmMap = new Map<string, { role: string; impact: string }>();
        llmItems.forEach((item) => {
          const name = String(item?.name || "").trim();
          if (!name) return;
          llmMap.set(name, {
            role: String(item?.role || "").trim(),
            impact: String(item?.impact || "").trim(),
          });
        });

        const currentNames = new Set(currentItems.map((item) => normalizeItemName(item.name)));
        detailItems = currentItems.map((item) => {
          const normalized = normalizeItemName(item.name);
          const prev = prevMap.get(normalized);
          let statusItem: PolicyItemDetail["status"] = "NEW";
          if (prev) {
            if (prev.hash) {
              statusItem = prev.hash === item.hash ? "LIVE" : "MODIFIED";
            } else {
              statusItem = "LIVE";
            }
          }
          const llm = llmMap.get(item.name) || llmMap.get(normalized);
          const role = llm?.role || prev?.role || "정의된 역할을 코드에서 확인해야 합니다.";
          const impact = llm?.impact || prev?.impact || "런타임 정책 흐름에 영향을 줍니다.";
          return {
            name: item.name,
            kind: item.kind,
            exported: item.exported,
            status: statusItem,
            item_hash: item.hash,
            role,
            impact,
          };
        });
        prevMap.forEach((prev, name) => {
          if (currentNames.has(name)) return;
          detailItems.push({
            name: prev.originalName || name,
            kind: prev.kind || "unknown",
            exported: prev.exported ?? false,
            status: "DELETED",
            item_hash: prev.hash || "",
            role: prev.role || "삭제된 항목입니다.",
            impact: prev.impact || "정책 동작에서 제거되었습니다.",
          });
        });

        details = {
          overview:
            typeof llmDetails.overview === "string" && llmDetails.overview.trim()
              ? llmDetails.overview.trim()
              : summary,
          items: detailItems,
          model: llmRes.model,
        };
        if (typeof details.overview === "string" && details.overview.trim()) {
          summary = String(details.overview).trim();
        }
      } catch (error) {
        const fallback = buildFallbackDetails(summary, currentItems);
        detailItems = (fallback.items as PolicyItemDetail[]).map((item) => ({
          ...item,
          status: "LIVE",
        }));
        details = {
          overview: fallback.overview,
          items: detailItems,
        };
      }
    } else {
      const currentNames = new Set(currentItems.map((item) => normalizeItemName(item.name)));
      detailItems = currentItems.map((item) => {
        const normalized = normalizeItemName(item.name);
        const prev = prevMap.get(normalized);
        let statusItem: PolicyItemDetail["status"] = "NEW";
        if (prev) {
          if (prev.hash) {
            statusItem = prev.hash === item.hash ? "LIVE" : "MODIFIED";
          } else {
            statusItem = "LIVE";
          }
        }
        return {
          name: item.name,
          kind: item.kind,
          exported: item.exported,
          status: statusItem,
          item_hash: item.hash,
          role: prev?.role || "정의된 역할을 코드에서 확인해야 합니다.",
          impact: prev?.impact || "런타임 정책 흐름에 영향을 줍니다.",
        };
      });
      prevMap.forEach((prev, name) => {
        if (currentNames.has(name)) return;
        detailItems.push({
          name: prev.originalName || name,
          kind: prev.kind || "unknown",
          exported: prev.exported ?? false,
          status: "DELETED",
          item_hash: prev.hash || "",
          role: prev.role || "삭제된 항목입니다.",
          impact: prev.impact || "정책 동작에서 제거되었습니다.",
        });
      });
      details = { ...details, items: detailItems };
    }

    upsertRows.push({
      path: snapshot.path,
      file_name: snapshot.fileName,
      content_hash: snapshot.hash,
      summary_ko: summary,
      exports: snapshot.exports,
      details_ko: details,
      status,
      line_count: snapshot.lineCount,
      prev_line_count: prevLineCount,
      last_seen_at: now,
      last_changed_at: lastChangedAt,
      updated_at: now,
    });
  }
  onProgress?.({ type: "done", total: snapshots.length });

  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from("I_runtime_policy_files")
      .upsert(upsertRows, { onConflict: "path" });
    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  const deletedRows = (existingRows as PolicyRow[] | null | undefined)?.filter(
    (row) => row?.path && !seenPaths.has(row.path)
  );
  const updates: Array<Promise<unknown>> = [];
  deletedRows?.forEach((row) => {
    if (!row?.path) return;
    if (row.status === "DELETED") return;
    updates.push(
      supabaseAdmin
        .from("I_runtime_policy_files")
        .update({
          status: "DELETED",
          last_changed_at: now,
          updated_at: now,
        })
        .eq("path", row.path)
    );
  });
  if (updates.length > 0) {
    await Promise.all(updates);
  }

  const { data: refreshedRows, error: refreshedError } = await supabaseAdmin
    .from("I_runtime_policy_files")
    .select("*")
    .order("path", { ascending: true });
  if (refreshedError) {
    throw new Error(refreshedError.message);
  }
  return { items: (refreshedRows || []) as PolicyRow[], refreshed_at: now };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }
  const adminCheck = await ensureAdmin(context);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }
  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }
  const { data, error } = await supabaseAdmin
    .from("I_runtime_policy_files")
    .select("*")
    .order("path", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ items: (data || []) as PolicyRow[] });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }
  const adminCheck = await ensureAdmin(context);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const url = new URL(req.url);
  const wantsStream = url.searchParams.get("stream") === "1";

  if (!wantsStream) {
    try {
      const res = await refreshPolicies();
      return NextResponse.json(res);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "POLICY_REFRESH_FAILED" },
        { status: 500 }
      );
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: RefreshProgress) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };
      try {
        const res = await refreshPolicies((payload) => {
          send(payload);
        });
        send({ type: "result", items: res.items, refreshed_at: res.refreshed_at });
      } catch (error) {
        send({ type: "error", message: error instanceof Error ? error.message : "POLICY_REFRESH_FAILED" });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
