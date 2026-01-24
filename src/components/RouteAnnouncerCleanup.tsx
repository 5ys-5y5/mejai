"use client";

import { useEffect } from "react";

export function RouteAnnouncerCleanup() {
  useEffect(() => {
    const removeEmptyAnnouncer = () => {
      const candidates = Array.from(document.body.querySelectorAll("section[aria-live]"));
      candidates.forEach((node) => {
        const hasText = (node.textContent || "").trim().length > 0;
        const hasElements = node.children.length > 0;
        if (!hasText && !hasElements) {
          node.remove();
        }
      });
    };

    removeEmptyAnnouncer();

    const observer = new MutationObserver(() => removeEmptyAnnouncer());
    observer.observe(document.body, { childList: true, subtree: false });
    return () => observer.disconnect();
  }, []);

  return null;
}
