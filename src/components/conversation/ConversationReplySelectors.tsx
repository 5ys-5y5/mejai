"use client";

import type { Dispatch, SetStateAction } from "react";
import { CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

type QuickReply = { label: string; value: string };
type ProductCard = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  value: string;
};
type QuickReplyConfig = {
  selection_mode: "single" | "multi";
  min_select?: number;
  max_select?: number;
  submit_format?: "single" | "csv";
};
type RenderPlan = {
  enable_quick_replies?: boolean;
  enable_cards?: boolean;
  selection_mode?: "single" | "multi";
  min_select?: number;
  max_select?: number;
  submit_format?: "single" | "csv";
  grid_columns?: { quick_replies?: number; cards?: number };
};

type MessageShape = {
  id: string;
  role: "user" | "bot";
  quickReplies?: QuickReply[];
  productCards?: ProductCard[];
  quickReplyConfig?: QuickReplyConfig;
  renderPlan?: RenderPlan;
};

type Props<TMessage extends MessageShape> = {
  modelId: string;
  message: TMessage;
  isLatest: boolean;
  sending: boolean;
  quickReplyDrafts: Record<string, string[]>;
  lockedReplySelections: Record<string, string[]>;
  setQuickReplyDrafts: Dispatch<SetStateAction<Record<string, string[]>>>;
  setLockedReplySelections: Dispatch<SetStateAction<Record<string, string[]>>>;
  enableQuickReplies?: boolean;
  enableProductCards?: boolean;
  onSubmit: (text: string) => void;
};

function parseLeadDayValue(value: string) {
  const m = String(value || "").match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function ConversationReplySelectors<TMessage extends MessageShape>({
  modelId,
  message,
  isLatest,
  sending,
  quickReplyDrafts,
  lockedReplySelections,
  setQuickReplyDrafts,
  setLockedReplySelections,
  enableQuickReplies = true,
  enableProductCards = true,
  onSubmit,
}: Props<TMessage>) {
  if (message.role !== "bot") return null;

  const quickReplies = message.quickReplies || [];
  const productCards = message.productCards || [];
  const quickRule = message.quickReplyConfig;
  const renderPlan = message.renderPlan;

  const selectionMode = renderPlan?.selection_mode || quickRule?.selection_mode || "single";
  const isMultiSelectPrompt = selectionMode === "multi";
  const cardValues = new Set(productCards.map((card) => String(card.value)));
  const allQuickRepliesMappedToCards =
    !isMultiSelectPrompt && productCards.length > 0 && quickReplies.every((item) => cardValues.has(String(item.value)));

  const quickDraftKey = `${modelId}:${message.id}:quick`;
  const quickSelected = quickReplyDrafts[quickDraftKey] || [];
  const quickLocked = lockedReplySelections[quickDraftKey] || [];
  const effectiveQuickSelection = quickLocked.length > 0 ? quickLocked : quickSelected;
  const quickIsLocked = quickLocked.length > 0;

  const minRequired =
    Number.isFinite(Number(renderPlan?.min_select || 0)) && Number(renderPlan?.min_select || 0) > 0
      ? Number(renderPlan?.min_select)
      : Number.isFinite(Number(quickRule?.min_select || 0)) && Number(quickRule?.min_select || 0) > 0
        ? Number(quickRule?.min_select)
        : 1;
  const canConfirmQuick = !quickIsLocked && quickSelected.length >= minRequired;

  const cardDraftKey = `${modelId}:${message.id}:card`;
  const selectedCard = (quickReplyDrafts[cardDraftKey] || [])[0] || "";
  const lockedCard = (lockedReplySelections[cardDraftKey] || [])[0] || "";
  const effectiveSelectedCard = lockedCard || selectedCard;
  const cardIsLocked = Boolean(lockedCard);
  const canConfirmCard = !cardIsLocked && Boolean(selectedCard);

  return (
    <>
      {enableQuickReplies && quickReplies.length > 0 && (renderPlan?.enable_quick_replies ?? true) && !allQuickRepliesMappedToCards ? (
        <>
          <div className="mt-[5px]">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.min(
                  Math.max(1, renderPlan?.grid_columns?.quick_replies || 1),
                  Math.max(1, quickReplies.length)
                )}, minmax(0, 1fr))`,
              }}
            >
              {quickReplies.map((item, idx) => {
                const num = parseLeadDayValue(item.value);
                const normalized = num ? String(num) : String(item.value);
                const picked = effectiveQuickSelection.includes(normalized);
                return (
                  <button
                    key={`${message.id}-quick-${idx}-${item.value}`}
                    type="button"
                    onClick={() => {
                      if (quickIsLocked || !isLatest) return;
                      setQuickReplyDrafts((prev) => {
                        const now = prev[quickDraftKey] || [];
                        const next = isMultiSelectPrompt
                          ? now.includes(normalized)
                            ? now.filter((v) => v !== normalized)
                            : [...now, normalized]
                          : now[0] === normalized
                            ? []
                            : [normalized];
                        return { ...prev, [quickDraftKey]: next };
                      });
                    }}
                    disabled={sending || quickIsLocked || !isLatest}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-xs font-semibold",
                      picked
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          {isLatest && !quickIsLocked ? (
            <div className="mt-[5px] flex justify-end">
              <button
                type="button"
                aria-label="선택 확인"
                title="선택 확인"
                onClick={() => {
                  const picked = isMultiSelectPrompt ? quickSelected.filter((v) => String(v).trim() !== "") : quickSelected.slice(0, 1);
                  if (picked.length < minRequired) return;
                  const maxAllowed =
                    Number.isFinite(Number(renderPlan?.max_select || 0)) && Number(renderPlan?.max_select || 0) > 0
                      ? Number(renderPlan?.max_select)
                      : Number.isFinite(Number(quickRule?.max_select || 0)) && Number(quickRule?.max_select || 0) > 0
                        ? Number(quickRule?.max_select)
                        : null;
                  const normalizedPicked = maxAllowed && maxAllowed > 0 ? picked.slice(0, maxAllowed) : picked;
                  setLockedReplySelections((prev) => ({ ...prev, [quickDraftKey]: normalizedPicked }));
                  setQuickReplyDrafts((prev) => {
                    const next = { ...prev };
                    delete next[quickDraftKey];
                    return next;
                  });
                  onSubmit(
                    isMultiSelectPrompt || renderPlan?.submit_format === "csv" || quickRule?.submit_format === "csv"
                      ? normalizedPicked.join(",")
                      : normalizedPicked[0]
                  );
                }}
                disabled={sending || !canConfirmQuick}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                  canConfirmQuick
                    ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                    : "border-slate-300 bg-slate-100 text-slate-400",
                  "disabled:cursor-not-allowed disabled:opacity-80"
                )}
              >
                <CornerDownRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {enableProductCards && productCards.length > 0 && (renderPlan?.enable_cards ?? true) ? (
        <>
          <div className="mt-[5px]">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.min(
                  Math.max(1, renderPlan?.grid_columns?.cards || 1),
                  Math.max(1, productCards.length)
                )}, minmax(0, 1fr))`,
              }}
            >
              {productCards.map((card, idx) => {
                const picked = effectiveSelectedCard === String(card.value);
                return (
                  <button
                    key={`${message.id}-card-${card.id}-${idx}`}
                    type="button"
                    onClick={() => {
                      if (cardIsLocked || !isLatest) return;
                      setQuickReplyDrafts((prev) => ({ ...prev, [cardDraftKey]: picked ? [] : [String(card.value)] }));
                    }}
                    disabled={sending || cardIsLocked || !isLatest}
                    className={cn(
                      "relative flex w-full flex-col rounded-xl border bg-white p-2 text-left hover:bg-slate-50",
                      picked ? "border-slate-900 ring-2 ring-slate-300" : "border-slate-300",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                      {card.value}
                    </span>
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt={card.title} className="h-24 w-full rounded-md bg-slate-100 object-cover" />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center rounded-md bg-slate-100 text-[11px] text-slate-500">
                        이미지 없음
                      </div>
                    )}
                    <div
                      className="mt-2 flex h-10 items-start justify-center overflow-hidden whitespace-normal break-keep text-center text-xs font-semibold leading-5 text-slate-700"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                    >
                      {card.title}
                    </div>
                    {card.subtitle ? (
                      <div
                        className="mt-0.5 overflow-hidden whitespace-normal break-keep text-center text-[11px] leading-4 text-slate-500"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                      >
                        {card.subtitle}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          {isLatest && !cardIsLocked ? (
            <div className="mt-[5px] flex justify-end">
              <button
                type="button"
                aria-label="선택 확인"
                title="선택 확인"
                onClick={() => {
                  if (!selectedCard) return;
                  setLockedReplySelections((prev) => ({ ...prev, [cardDraftKey]: [selectedCard] }));
                  setQuickReplyDrafts((prev) => {
                    const next = { ...prev };
                    delete next[cardDraftKey];
                    return next;
                  });
                  onSubmit(selectedCard);
                }}
                disabled={sending || !canConfirmCard}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                  canConfirmCard
                    ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                    : "border-slate-300 bg-slate-100 text-slate-400",
                  "disabled:cursor-not-allowed disabled:opacity-80"
                )}
              >
                <CornerDownRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
