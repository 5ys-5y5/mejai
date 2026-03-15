"use client";

import { type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { type JusoConnection } from "@/lib/providerConnections";

type CreateJusoConnectionFormProps = {
  isAdmin: boolean;
  stored: JusoConnection | null;
  draft: JusoConnection;
  setDraft: Dispatch<SetStateAction<JusoConnection>>;
  saving: boolean;
  onSave: (next: JusoConnection) => Promise<void>;
};

function maskValue(value: string) {
  if (!value) return "-";
  if (value.length <= 6) return "*".repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function CreateJusoConnectionForm({
  isAdmin,
  stored,
  draft,
  setDraft,
  saving,
  onSave,
}: CreateJusoConnectionFormProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-4 border-slate-200 bg-white p-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Juso connection</div>
          <div className="mt-1 text-xs text-slate-500">주소 검색 API key를 connection 단위로 저장합니다.</div>
        </div>

        <label className="block">
          <div className="mb-1 text-xs text-slate-600">label</div>
          <Input
            value={draft.label}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
            className="h-10"
            disabled={!isAdmin || saving}
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs text-slate-600">juso_api_key</div>
          <Input
            value={draft.juso_api_key}
            onChange={(event) => setDraft((current) => ({ ...current, juso_api_key: event.target.value }))}
            className="h-10"
            disabled={!isAdmin || saving}
          />
        </label>

        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={draft.is_active}
            onChange={(event) => setDraft((current) => ({ ...current, is_active: event.target.checked }))}
            disabled={!isAdmin || saving}
          />
          활성 connection으로 유지
        </label>

        {stored ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div>현재 저장 label: <span className="font-semibold text-slate-900">{stored.label || "-"}</span></div>
            <div className="mt-1">현재 저장 api key: <span className="font-mono text-slate-900">{maskValue(stored.juso_api_key)}</span></div>
            <div className="mt-1">updated_at: {stored.updated_at || "-"}</div>
          </div>
        ) : null}

        <div className="flex justify-end border-t border-slate-200 pt-4">
          <Button
            type="button"
            disabled={!isAdmin || saving || !draft.label.trim() || !draft.juso_api_key.trim()}
            className="rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
            onClick={() => void onSave({ ...draft, updated_at: new Date().toISOString() })}
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
