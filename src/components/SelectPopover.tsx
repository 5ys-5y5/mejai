"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  id: string;
  label: string;
  description?: string;
  group?: string;
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "bottom" | "top";
};

type SelectPopoverProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> & {
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
  ...rootProps
}: SelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<PopoverPosition | null>(null);
  const [mounted, setMounted] = useState(false);
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
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, setOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelPosition = useCallback(() => {
    if (!open) return;
    const anchor = buttonRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const preferredTop = rect.bottom + 8;
    const preferredBottom = rect.top - 8;
    const spaceBelow = viewportH - preferredTop - margin;
    const spaceAbove = preferredBottom - margin;
    const panelMax = 288;
    const placeBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(160, Math.min(panelMax, placeBelow ? spaceBelow : spaceAbove));
    const width = rect.width;
    let left = rect.left;
    if (left + width > viewportW - margin) left = Math.max(margin, viewportW - margin - width);
    if (left < margin) left = margin;
    const top = placeBelow ? preferredTop : Math.max(margin, rect.top - maxHeight - 8);
    setPanelStyle({ top, left, width, maxHeight, placement: placeBelow ? "bottom" : "top" });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  return (
    <div className={cn("relative", className)} ref={ref} {...rootProps}>
      <button
        type="button"
        ref={buttonRef}
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
      {mounted
        ? createPortal(
            <AnimatePresence>
              {open && panelStyle ? (
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: panelStyle.placement === "bottom" ? -6 : 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: panelStyle.placement === "bottom" ? -6 : 6, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className={cn(
                    "fixed flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white",
                    panelClassName
                  )}
                  style={{
                    top: panelStyle.top,
                    left: panelStyle.left,
                    width: panelStyle.width,
                    maxHeight: panelStyle.maxHeight,
                    height: panelStyle.maxHeight,
                    zIndex: "var(--layer-popover)",
                  }}
                  role="dialog"
                >
                  {searchable ? (
                    <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="h-9 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        placeholder="Search..."
                        aria-label="Search options"
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
            </AnimatePresence>,
            document.body
          )
        : null}

    </div>
  );
}

type MultiSelectPopoverProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> & {
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
  ...rootProps
}: MultiSelectPopoverProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = useCallback(
    (next: boolean) => {
      if (onOpenChange) {
        onOpenChange(next);
        return;
      }
      setOpenState(next);
    },
    [onOpenChange]
  );
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<PopoverPosition | null>(null);
  const [mounted, setMounted] = useState(false);

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

  const groupedFiltered = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: SelectOption[] }> = [];
    const indexByKey = new Map<string, number>();
    filtered.forEach((option) => {
      const rawGroup = String(option.group || "").trim();
      const key = rawGroup || "__ungrouped__";
      const labelValue = rawGroup || "기타";
      const idx = indexByKey.get(key);
      if (idx === undefined) {
        indexByKey.set(key, groups.length);
        groups.push({ key, label: labelValue, items: [option] });
      } else {
        groups[idx].items.push(option);
      }
    });
    return groups;
  }, [filtered]);

  const hasGroupedOptions = useMemo(
    () => groupedFiltered.some((group) => group.key !== "__ungrouped__"),
    [groupedFiltered]
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, setOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelPosition = useCallback(() => {
    if (!open) return;
    const anchor = buttonRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const preferredTop = rect.bottom + 8;
    const preferredBottom = rect.top - 8;
    const spaceBelow = viewportH - preferredTop - margin;
    const spaceAbove = preferredBottom - margin;
    const panelMax = 288;
    const placeBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(160, Math.min(panelMax, placeBelow ? spaceBelow : spaceAbove));
    const width = rect.width;
    let left = rect.left;
    if (left + width > viewportW - margin) left = Math.max(margin, viewportW - margin - width);
    if (left < margin) left = margin;
    const top = placeBelow ? preferredTop : Math.max(margin, rect.top - maxHeight - 8);
    setPanelStyle({ top, left, width, maxHeight, placement: placeBelow ? "bottom" : "top" });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  const renderMultiOptionButton = (option: SelectOption) => {
    const active = values.includes(option.id);
    return (
      <button
        key={option.id}
        type="button"
        onClick={() => {
          if (active) {
            onChange(values.filter((v) => v !== option.id));
          } else {
            onChange([...values, option.id]);
          }
        }}
        className={cn(
          "h-8 w-full rounded-xl px-3 text-sm flex items-center justify-between",
          active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
        )}
      >
        {renderOption ? (
          renderOption(option, active)
        ) : (
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-900">{option.label}</span>
              {option.description ? (
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{option.description}</span>
              ) : null}
            </div>
          </div>
        )}
        {active ? <CheckCircle2 className="h-4 w-4 text-slate-900" /> : null}
      </button>
    );
  };

  return (
    <div className={cn("relative", className)} ref={ref} {...rootProps}>
      <button
        type="button"
        ref={buttonRef}
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
      {mounted
        ? createPortal(
            <AnimatePresence>
              {open && panelStyle ? (
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: panelStyle.placement === "bottom" ? -6 : 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: panelStyle.placement === "bottom" ? -6 : 6, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className={cn(
                    "fixed overflow-hidden rounded-2xl border border-slate-200 bg-white",
                    panelClassName
                  )}
                  style={{
                    top: panelStyle.top,
                    left: panelStyle.left,
                    width: panelStyle.width,
                    maxHeight: panelStyle.maxHeight,
                    zIndex: "var(--layer-popover)",
                  }}
                  role="dialog"
                >
                  {searchable ? (
                    <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="h-9 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        placeholder="Search..."
                        aria-label="Search options"
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
                        {"\uC804\uCCB4 \uC120\uD0DD"}
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
                        {"\uC804\uCCB4 \uD574\uC81C"}
                      </button>
                    </div>
                  ) : null}
                  <div
                    className="flex flex-col gap-[5px] overflow-auto p-2 pb-6"
                    style={{
                      maxHeight: Math.max(
                        80,
                        panelStyle.maxHeight - (searchable ? 44 : 0) - (showBulkActions ? 44 : 0)
                      ),
                    }}
                  >
                    {hasGroupedOptions
                      ? groupedFiltered.map((group, index) => (
                          <div key={group.key} className={cn(index > 0 ? "pt-2" : "")}>
                            {group.key !== "__ungrouped__" ? (
                              <div className="mb-1 border-t border-slate-200 px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                {group.label}
                              </div>
                            ) : null}
                            <div className="flex flex-col gap-[5px]">
                              {group.items.map((option) => renderMultiOptionButton(option))}
                            </div>
                          </div>
                        ))
                      : filtered.map((option) => renderMultiOptionButton(option))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}

    </div>
  );
}
