"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type DiffLine = {
  type: "add" | "del" | "ctx";
  oldNo: number | null;
  newNo: number | null;
  text: string;
  segments?: { kind: "equal" | "add" | "del"; text: string }[];
};

const GUTTER_WIDTH = "20px";

export default function DiffViewer({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="min-w-[640px] text-xs leading-5">
        {lines.map((line, idx) => {
          const isAdd = line.type === "add";
          const isDel = line.type === "del";
          const prefix = isAdd ? "+" : isDel ? "-" : " ";
          return (
            <div
              key={`${line.type}-${line.oldNo ?? "x"}-${line.newNo ?? "x"}-${idx}`}
              className={cn(
                "grid grid-cols-[20px_20px_1fr] items-start gap-0 border-b border-slate-100",
                isAdd ? "bg-[rgba(74,222,128,0.15)]" : isDel ? "bg-[rgba(248,113,113,0.15)]" : "bg-white"
              )}
              aria-label={`diff line ${line.type}`}
            >
              <div
                className="sticky left-0 z-10 bg-inherit text-right text-[11px] text-slate-500 pr-2"
                style={{ width: GUTTER_WIDTH }}
                aria-label={line.newNo === null ? "new line empty" : `new line ${line.newNo}`}
              >
                {line.newNo ?? ""}
              </div>
              <div className="text-center text-slate-500" aria-hidden="true">
                {prefix}
              </div>
              <div className="font-mono whitespace-pre px-2">
                {line.segments && line.segments.length > 0
                  ? line.segments.map((seg, sidx) => (
                      <span
                        key={`${seg.kind}-${sidx}`}
                        className={cn(
                          seg.kind === "add" && "bg-[rgba(74,222,128,0.35)]",
                          seg.kind === "del" && "bg-[rgba(248,113,113,0.35)]"
                        )}
                      >
                        {seg.text}
                      </span>
                    ))
                  : line.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
