"use client";

import { Info } from "lucide-react";
import { MultiSelectPopover, SelectPopover, type SelectOption } from "@/components/SelectPopover";
import type { ReactNode } from "react";

type Props = {
  showKbSelector: boolean;
  kbLabel?: string;
  kbAdminOnly?: boolean;
  kbValue: string;
  kbOptions: SelectOption[];
  onKbChange: (value: string) => void;
  kbInfoOpen: boolean;
  onToggleKbInfo: () => void;
  kbInfoText: string;

  showAdminKbSelector: boolean;
  adminKbLabel?: string;
  adminKbAdminOnly?: boolean;
  adminKbValues: string[];
  adminKbOptions: SelectOption[];
  onAdminKbChange: (values: string[]) => void;
  adminKbInfoOpen: boolean;
  onToggleAdminKbInfo: () => void;
  adminKbInfoText: string;

  showRouteSelector: boolean;
  routeLabel?: string;
  routeAdminOnly?: boolean;
  routeValue: string;
  routeOptions: SelectOption[];
  onRouteChange: (value: string) => void;
  routeInfoOpen: boolean;
  onToggleRouteInfo: () => void;
  routeInfoText: string;
  setupFieldOrder?: Array<"kbSelector" | "adminKbSelector" | "routeSelector">;
};

export function LaboratoryNewModelControls({
  showKbSelector,
  kbLabel = "KB 선택",
  kbAdminOnly = false,
  kbValue,
  kbOptions,
  onKbChange,
  kbInfoOpen,
  onToggleKbInfo,
  kbInfoText,
  showAdminKbSelector,
  adminKbLabel = "관리자 KB 선택",
  adminKbAdminOnly = true,
  adminKbValues,
  adminKbOptions,
  onAdminKbChange,
  adminKbInfoOpen,
  onToggleAdminKbInfo,
  adminKbInfoText,
  showRouteSelector,
  routeLabel = "Runtime 선택",
  routeAdminOnly = false,
  routeValue,
  routeOptions,
  onRouteChange,
  routeInfoOpen,
  onToggleRouteInfo,
  routeInfoText,
  setupFieldOrder = ["kbSelector", "adminKbSelector", "routeSelector"],
}: Props) {
  const sections: Record<"kbSelector" | "adminKbSelector" | "routeSelector", ReactNode> = {
    kbSelector: showKbSelector ? (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span>{kbLabel}</span>
            {kbAdminOnly ? (
              <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
                ADMIN
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <SelectPopover
              value={kbValue}
              onChange={onKbChange}
              options={kbOptions}
              searchable
              className="flex-1 min-w-0"
            />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
              onClick={onToggleKbInfo}
              aria-label="KB 정보"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          {kbInfoOpen ? (
            <textarea
              readOnly
              value={kbInfoText}
              className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
            />
          ) : null}
        </div>
      ) : null,
    adminKbSelector: showAdminKbSelector ? (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span>{adminKbLabel}</span>
            {adminKbAdminOnly ? (
              <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
                ADMIN
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <MultiSelectPopover
              values={adminKbValues}
              onChange={onAdminKbChange}
              options={adminKbOptions}
              placeholder="관리자 KB 선택"
              displayMode="count"
              showBulkActions
              className="flex-1 min-w-0"
            />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
              onClick={onToggleAdminKbInfo}
              aria-label="관리자 KB 정보"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          {adminKbInfoOpen ? (
            <textarea
              readOnly
              value={adminKbInfoText}
              className="mt-2 min-h-[80px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
            />
          ) : null}
        </div>
      ) : null,
    routeSelector: showRouteSelector ? (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span>{routeLabel}</span>
            {routeAdminOnly ? (
              <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
                ADMIN
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <SelectPopover value={routeValue} onChange={onRouteChange} options={routeOptions} className="flex-1 min-w-0" />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
              onClick={onToggleRouteInfo}
              aria-label="Route 정보"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          {routeInfoOpen ? (
            <textarea
              readOnly
              value={routeInfoText}
              className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
            />
          ) : null}
        </div>
      ) : null,
  };

  return <>{setupFieldOrder.map((key) => sections[key]).filter(Boolean)}</>;
}
