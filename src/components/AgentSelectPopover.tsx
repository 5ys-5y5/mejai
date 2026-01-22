"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AgentOption = {
  id: string;
  name: string;
};

type AgentSelectPopoverProps = {
  value: string;
  onChange: (value: string) => void;
  options?: AgentOption[];
  followupCountByAgent?: Map<string, number>;
};

const defaultAgents: AgentOption[] = [
  { id: "a_support", name: "고객지원" },
  { id: "a_billing", name: "결제/환불" },
];

const defaultFollowups = new Map<string, number>([
  ["a_support", 1],
  ["a_billing", 1],
]);

export function AgentSelectPopover({
  value,
  onChange,
  options,
  followupCountByAgent,
}: AgentSelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const baseOptions = useMemo(() => {
    const list = options && options.length ? options : defaultAgents;
    return [{ id: "all", name: "전체 에이전트" }, ...list];
  }, [options]);

  const followupMap = useMemo(() => {
    return followupCountByAgent && followupCountByAgent.size
      ? followupCountByAgent
      : defaultFollowups;
  }, [followupCountByAgent]);

  const selected = baseOptions.find((o) => o.id === value) || baseOptions[0];

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return baseOptions;
    return baseOptions.filter((o) => o.name.toLowerCase().includes(query));
  }, [baseOptions, q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50",
          open ? "border-slate-300" : ""
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {selected.name}
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", open ? "rotate-180" : "")} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white z-40"
            role="dialog"
          >
            <div className="p-3 border-b border-slate-200">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="에이전트 검색..."
                aria-label="에이전트 검색"
              />
            </div>
            <div className="max-h-72 overflow-auto p-2">
              {filtered.map((o) => {
                const active = o.id === value;
                const count = followupMap.get(o.id) || 0;
                const showCount = o.id !== "all";

                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                      setQ("");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm",
                      active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{o.name}</span>
                    </div>

                    {showCount ? (
                      <span className="text-[11px] rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700 tabular-nums">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
