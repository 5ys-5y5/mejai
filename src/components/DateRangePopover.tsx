"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function DateRangePopover({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const presets = [
    { id: "last_day", label: "어제" },
    { id: "last_week", label: "지난 주" },
    { id: "last_month", label: "지난 달" },
  ];
  const selected = presets.find((p) => p.id === value) || presets[2];

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
        {selected.label}
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", open ? "rotate-180" : "")} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-[640px] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white z-40"
            role="dialog"
          >
            <div className="flex">
              <div className="w-40 shrink-0 border-r border-slate-200 p-2">
                {presets.map((p) => {
                  const active = p.id === value;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onChange(p.id)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm",
                        active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {p.label}
                      {active ? <CheckCircle2 className="h-4 w-4 text-slate-900" /> : null}
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">시작</div>
                    <input
                      className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      defaultValue="2025-12-22 오후 09:46"
                      aria-label="시작"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">종료</div>
                    <input
                      className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      defaultValue="2026-01-21 오후 09:46"
                      aria-label="종료"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">캘린더</div>
                  <div className="mt-2 text-xs text-slate-500">날짜 범위를 선택하세요.</div>
                  <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs text-slate-700">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 py-2">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onChange("last_month");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    적용
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
