"use client";

import { useEffect, useMemo, useState } from "react";

const TAB_ID_KEY = "mejai:tab-id";

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTabId() {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.sessionStorage.getItem(TAB_ID_KEY);
    if (existing) return existing;
    const next = createId();
    window.sessionStorage.setItem(TAB_ID_KEY, next);
    return next;
  } catch {
    return createId();
  }
}

export function useMultiTabLeaderLock(key: string, enabled: boolean, ttlMs: number) {
  const tabId = useMemo(() => getTabId(), []);
  const [isLeader, setIsLeader] = useState(!enabled);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!enabled) {
      const timer = window.setTimeout(() => setIsLeader(true), 0);
      return () => window.clearTimeout(timer);
    }

    const lockKey = `mejai:leader-lock:${key}`;
    const now = () => Date.now();
    const readLock = () => {
      try {
        const raw = window.localStorage.getItem(lockKey);
        if (!raw) return null as null | { owner: string; expiresAt: number };
        const parsed = JSON.parse(raw) as { owner?: string; expiresAt?: number };
        if (!parsed.owner || typeof parsed.expiresAt !== "number") return null;
        return { owner: parsed.owner, expiresAt: parsed.expiresAt };
      } catch {
        return null;
      }
    };
    const writeLock = (owner: string, expiresAt: number) => {
      try {
        window.localStorage.setItem(lockKey, JSON.stringify({ owner, expiresAt }));
      } catch {
        // ignore
      }
    };

    const acquire = () => {
      const current = readLock();
      const ts = now();
      const isExpired = !current || current.expiresAt <= ts;
      const isMine = current?.owner === tabId;
      if (isExpired || isMine) {
        writeLock(tabId, ts + ttlMs);
      }
      const next = readLock();
      setIsLeader(next?.owner === tabId);
    };

    acquire();
    const heartbeat = window.setInterval(acquire, Math.max(1000, Math.floor(ttlMs / 3)));
    const onStorage = (event: StorageEvent) => {
      if (event.key !== lockKey) return;
      acquire();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", acquire);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", acquire);
      const current = readLock();
      if (current?.owner === tabId) {
        try {
          window.localStorage.removeItem(lockKey);
        } catch {
          // ignore
        }
      }
    };
  }, [enabled, key, tabId, ttlMs]);

  return { isLeader, tabId };
}
