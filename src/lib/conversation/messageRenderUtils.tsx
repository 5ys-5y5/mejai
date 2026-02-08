import type { ReactNode } from "react";

export function renderBotContent(content: string): ReactNode {
  if (!content.includes("debug_prefix")) return content;
  const html = content.replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function renderStructuredChoiceContent(content: string): ReactNode {
  if (!content) return null;
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const items = lines
    .map((line) => {
      const match = line.match(/^-\s*(\d{1,2})번\s*\|\s*(.+)$/);
      if (!match) return null;
      const idx = match[1];
      const cols = String(match[2] || "")
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      if (cols.length === 0) return null;
      return { idx, cols };
    })
    .filter((row): row is { idx: string; cols: string[] } => Boolean(row));
  if (items.length === 0) return null;
  const example = lines.find((line) => /^예\s*:/.test(line));
  return (
    <div className="space-y-2">
      <div className="font-semibold text-slate-700">{lines[0]}</div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full table-fixed border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="w-12 border-b border-slate-200 px-2 py-1.5 text-center font-semibold">번호</th>
              <th className="border-b border-slate-200 px-2 py-1.5 text-left font-semibold">항목</th>
              <th className="w-28 border-b border-slate-200 px-2 py-1.5 text-left font-semibold">상세</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const main = row.cols[0] || "";
              const detail = row.cols.slice(1).join(" / ");
              return (
                <tr key={`${row.idx}-${row.cols.join("|")}`} className="text-slate-700">
                  <td className="border-b border-slate-100 px-2 py-1.5 text-center font-semibold">{row.idx}</td>
                  <td className="border-b border-slate-100 px-2 py-1.5 break-words">{main}</td>
                  <td className="border-b border-slate-100 px-2 py-1.5 text-slate-500 break-words">{detail || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {example ? <div className="text-[11px] text-slate-500">입력 예시: {example.replace(/^예\s*:\s*/, "")}</div> : null}
    </div>
  );
}

export function getDebugParts(content: string) {
  if (typeof document === "undefined" || !content.includes("debug_prefix")) {
    return { prefixText: "", answerHtml: "", answerText: content };
  }
  const holder = document.createElement("div");
  holder.innerHTML = content;
  const prefix = holder.querySelector(".debug_prefix") as HTMLElement | null;
  const answer = holder.querySelector(".debug_answer") as HTMLElement | null;
  const getLiLabel = (li: Element) => {
    const parts: string[] = [];
    li.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent || "");
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      if (el.tagName === "UL" || el.tagName === "OL") return;
      parts.push(el.innerText || "");
    });
    return parts.join(" ").replace(/\s+/g, " ").trim();
  };
  const renderList = (root: Element, depth: number) => {
    const lines: string[] = [];
    const items = Array.from(root.children).filter((el) => el.tagName === "LI");
    items.forEach((li) => {
      const label = getLiLabel(li);
      if (label) lines.push(`${"  ".repeat(depth)}- ${label}`);
      const nested = Array.from(li.children).find((child) => child.tagName === "UL");
      if (nested) lines.push(...renderList(nested, depth + 1));
    });
    return lines;
  };
  let prefixText = "";
  if (prefix) {
    const list = Array.from(prefix.children).find((child) => child.tagName === "UL");
    prefixText = list ? renderList(list, 0).join("\n") : prefix.innerText.trim();
  }
  const answerText = answer ? answer.innerText.trim() : holder.innerText.trim();
  const answerHtml = answer ? answer.innerHTML : "";
  return { prefixText, answerHtml, answerText };
}
