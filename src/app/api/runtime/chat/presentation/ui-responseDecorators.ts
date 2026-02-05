export type RuntimeQuickReply = { label: string; value: string };
export type RuntimeQuickReplyConfig = {
  selection_mode: "single" | "multi";
  min_select?: number;
  max_select?: number;
  submit_format?: "single" | "csv";
  criteria?: string;
  source_function?: string;
  source_module?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function deriveQuickReplies(message: unknown, quickReplyMax: number): RuntimeQuickReply[] {
  const text = typeof message === "string" ? message : "";
  if (!text) return [];
  if (/지금\s+\S+\s+재입고 알림 신청을 진행할까요\?/u.test(text)) {
    return [
      { label: "재입고 알림 신청", value: "네" },
      { label: "대화 종료", value: "대화 종료" },
    ];
  }
  if (text.includes("다음 선택: 대화 종료 / 다른 문의")) {
    return [
      { label: "대화 종료", value: "대화 종료" },
      { label: "다른 문의", value: "다른 문의" },
    ];
  }
  if (text.includes("이번 상담은 만족하셨나요?") || text.includes("상담이 도움이 되었나요?")) {
    return [
      { label: "1점", value: "1" },
      { label: "2점", value: "2" },
      { label: "3점", value: "3" },
      { label: "4점", value: "4" },
      { label: "5점", value: "5" },
    ];
  }
  if (text.includes("맞으면 '네', 아니면 '아니오'")) {
    return [
      { label: "네", value: "네" },
      { label: "아니오", value: "아니오" },
    ];
  }
  const numberMatches = Array.from(text.matchAll(/-\s*(\d{1,2})번\s*\|/g))
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (numberMatches.length > 0) {
    const uniq = Array.from(new Set(numberMatches)).slice(0, quickReplyMax);
    return uniq.map((n) => ({ label: `${n}번`, value: String(n) }));
  }
  const dayMatches = /(선택 가능|알림일|쉼표)/.test(text)
    ? Array.from(text.matchAll(/D-(\d{1,2})/g))
        .map((m) => Number(m[1]))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [];
  if (dayMatches.length > 0) {
    const uniqDays = Array.from(new Set(dayMatches)).sort((a, b) => a - b);
    return uniqDays.slice(0, 7).map((n) => ({ label: `D-${n}`, value: String(n) }));
  }
  return [];
}

export function deriveQuickReplyConfig(
  message: unknown,
  quickReplies: RuntimeQuickReply[]
): RuntimeQuickReplyConfig | null {
  if (!Array.isArray(quickReplies) || quickReplies.length === 0) return null;
  const text = typeof message === "string" ? message : "";
  if (/복수 선택 가능/u.test(text) && /의도 확인/u.test(text)) {
    return {
      selection_mode: "multi",
      min_select: 1,
      max_select: quickReplies.length,
      submit_format: "csv",
      criteria: "decorator:intent_disambiguation_text",
    };
  }
  if (/예약 알림일/u.test(text) || text.includes("쉼표(,)")) {
    const minMatch = text.match(/최소\s*(\d+)/);
    const minSelect = minMatch ? Math.max(1, Number(minMatch[1])) : 1;
    return {
      selection_mode: "multi",
      min_select: minSelect,
      max_select: quickReplies.length,
      submit_format: "csv",
      criteria: "decorator:lead_days_text",
    };
  }
  return {
    selection_mode: "single",
    min_select: 1,
    max_select: 1,
    submit_format: "single",
    criteria: "decorator:default_single",
  };
}

export function deriveRichMessageHtml(message: unknown) {
  const text = typeof message === "string" ? message : "";
  if (!text) return null;
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const title = lines[0];
  const itemRows = lines
    .map((line) => {
      const match = line.match(/^-\s*(\d{1,2})번\s*\|\s*(.+)$/);
      if (!match) return null;
      const index = match[1];
      const cols = String(match[2] || "")
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      if (cols.length === 0) return null;
      return { index, cols };
    })
    .filter((row): row is { index: string; cols: string[] } => Boolean(row));
  if (itemRows.length === 0) return null;

  const example = lines.find((line) => /^예\s*:/.test(line)) || "";
  const itemsHtml = itemRows
    .map((row) => {
      const productName = row.cols[0] || "-";
      const schedule = row.cols.slice(1).join(" | ") || "-";
      return `<tr><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;text-align:center;color:#0f172a;font-size:11px;font-weight:700;white-space:nowrap;">${escapeHtml(row.index)}</td><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:inherit;font-size:12px;line-height:1.35;">${escapeHtml(productName)}</td><td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:11px;line-height:1.35;white-space:nowrap;">${escapeHtml(schedule)}</td></tr>`;
    })
    .join("");

  const exampleHtml = example
    ? `<div style="margin-top:8px;color:inherit;"><strong>입력 예시</strong>: ${escapeHtml(
        example.replace(/^예\s*:\s*/, "")
      )}</div>`
    : "";

  return `<div style="display:block;margin:0;padding:0;color:inherit;font:inherit;line-height:inherit;"><div style="margin:0;padding:0;color:inherit;font:inherit;line-height:inherit;">${escapeHtml(title)}</div><div style="margin-top:4px;overflow:hidden;border:1px solid #e2e8f0;border-radius:8px;background:rgba(255,255,255,0.55);"><table style="width:100%;border-collapse:collapse;table-layout:fixed;color:inherit;font:inherit;margin:0;"><thead><tr><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:center;width:42px;">번호</th><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;">항목명</th><th style="padding:4px 6px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:10px;text-align:left;width:110px;">일정</th></tr></thead><tbody>${itemsHtml}</tbody></table></div>${exampleHtml}</div>`;
}
