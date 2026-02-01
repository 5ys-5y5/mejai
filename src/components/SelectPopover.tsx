"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  id: string;
  label: string;
  description?: string;
};

type SelectPopoverProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
  searchable?: boolean;
  disabled?: boolean;
  renderValue?: (selected: SelectOption | undefined) => React.ReactNode;
  renderOption?: (option: SelectOption, active: boolean) => React.ReactNode;
};

export function SelectPopover({
  value,
  onChange,
  options,
  placeholder = "선택",
  className,
  buttonClassName,
  panelClassName,
  searchable = false,
  disabled = false,
  renderValue,
  renderOption,
}: SelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    if (!searchable) return options;
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => o.label.toLowerCase().includes(query));
  }, [options, q, searchable]);

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
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen(!open);
        }}
        className={cn(
          "inline-flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50",
          open ? "border-slate-300" : "",
          disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
          buttonClassName
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={cn("min-w-0 flex-1 truncate text-left", selected ? "" : "text-slate-400")}>
          {renderValue ? renderValue(selected) : selected?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            open ? "rotate-180" : ""
          )}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute left-0 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white z-40",
              panelClassName
            )}
            role="dialog"
          >
            {searchable ? (
              <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-9 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  placeholder="검색..."
                  aria-label="검색"
                />
              </div>
            ) : null}
            <div className="flex max-h-72 flex-col gap-[5px] overflow-auto p-2">
              {filtered.map((o) => {
                const active = o.id === value;
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
                      "h-8 w-full rounded-xl px-3 text-sm flex items-center justify-between",
                      active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {renderOption ? (
                      renderOption(o, active)
                    ) : (
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-slate-900">{o.label}</span>
                          {o.description ? (
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">{o.description}</span>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {active ? <CheckCircle2 className="h-4 w-4 text-slate-900" /> : null}
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

type MultiSelectPopoverProps = {
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
  searchable?: boolean;
  displayMode?: "join" | "count";
  disabled?: boolean;
  renderValue?: (selected: SelectOption[]) => React.ReactNode;
  renderOption?: (option: SelectOption, active: boolean) => React.ReactNode;
  showBulkActions?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function MultiSelectPopover({
  values,
  onChange,
  options,
  placeholder = "선택",
  className,
  buttonClassName,
  panelClassName,
  searchable = true,
  displayMode = "join",
  disabled = false,
  renderValue,
  renderOption,
  showBulkActions = false,
  open: openProp,
  onOpenChange,
}: MultiSelectPopoverProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next);
      return;
    }
    setOpenState(next);
  };
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedOptions = useMemo(() => {
    const map = new Map(options.map((o) => [o.id, o]));
    return values.map((v) => map.get(v)).filter(Boolean) as SelectOption[];
  }, [options, values]);

  const label = useMemo(() => {
    if (selectedOptions.length === 0) return placeholder;
    if (displayMode === "count") {
      if (selectedOptions.length === 1) return selectedOptions[0].label;
      return `${selectedOptions[0].label}+${selectedOptions.length - 1}`;
    }
    return selectedOptions.map((opt) => opt.label).join(", ");
  }, [placeholder, selectedOptions, displayMode]);

  const filtered = useMemo(() => {
    if (!searchable) return options;
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((o) => o.label.toLowerCase().includes(query));
  }, [options, q, searchable]);

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
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen(!open);
        }}
        className={cn(
          "inline-flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50",
          open ? "border-slate-300" : "",
          disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
          buttonClassName
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={cn("min-w-0 flex-1 truncate text-left", selectedOptions.length ? "" : "text-slate-400")}>
          {renderValue ? renderValue(selectedOptions) : label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            open ? "rotate-180" : ""
          )}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute left-0 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white z-40",
              panelClassName
            )}
            role="dialog"
          >
            {searchable ? (
              <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-9 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  placeholder="검색..."
                  aria-label="검색"
                />
              </div>
            ) : null}
            {showBulkActions ? (
              <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    onChange(options.map((o) => o.id));
                  }}
                  className={cn(
                    "rounded-lg border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50",
                    disabled ? "cursor-not-allowed opacity-50" : ""
                  )}
                >
                  전체 선택
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    onChange([]);
                  }}
                  className={cn(
                    "rounded-lg border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50",
                    disabled ? "cursor-not-allowed opacity-50" : ""
                  )}
                >
                  전체 해제
                </button>
              </div>
            ) : null}
            <div className="flex max-h-72 flex-col gap-[5px] overflow-auto p-2">
              {filtered.map((o) => {
                const active = values.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      if (active) {
                        onChange(values.filter((v) => v !== o.id));
                      } else {
                        onChange([...values, o.id]);
                      }
                    }}
                    className={cn(
                      "h-8 w-full rounded-xl px-3 text-sm flex items-center justify-between",
                      active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {renderOption ? (
                      renderOption(o, active)
                    ) : (
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-slate-900">{o.label}</span>
                          {o.description ? (
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">{o.description}</span>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {active ? <CheckCircle2 className="h-4 w-4 text-slate-900" /> : null}
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
