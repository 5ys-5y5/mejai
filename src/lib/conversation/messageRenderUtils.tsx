import type { ReactNode } from "react";

export function renderBotContent(content: string): ReactNode {
  if (!content.includes("debug_prefix")) return content;
  const html = content.replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
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
