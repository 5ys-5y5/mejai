"use client";

import { type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { type SolapiConnection } from "@/lib/providerConnections";

type CreateSolapiConnectionFormProps = {
  isAdmin: boolean;
  stored: SolapiConnection | null;
  draft: SolapiConnection;
  setDraft: Dispatch<SetStateAction<SolapiConnection>>;
  saving: boolean;
  onSave: (next: SolapiConnection) => Promise<void>;
};

function maskValue(value: string) {
  if (!value) return "-";
  if (value.length <= 6) return "*".repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function CreateSolapiConnectionForm({
  isAdmin,
  stored,
  draft,
  setDraft,
  saving,
  onSave,
}: CreateSolapiConnectionFormProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-4 border-slate-200 bg-white p-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Solapi connection</div>
          <div className="mt-1 text-xs text-slate-500">메시지 발송 자격정보를 connection 단위로 저장합니다.</div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <div className="mb-1 text-xs text-slate-600">solapi_from</div>
            <Input
              value={draft.solapi_from}
              onChange={(event) => setDraft((current) => ({ ...current, solapi_from: event.target.value }))}
              className="h-10"
              disabled={!isAdmin || saving}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-xs text-slate-600">solapi_api_key</div>
            <Input
              value={draft.solapi_api_key}
              onChange={(event) => setDraft((current) => ({ ...current, solapi_api_key: event.target.value }))}
              className="h-10"
              disabled={!isAdmin || saving}
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs text-slate-600">solapi_api_secret</div>
            <Input
              value={draft.solapi_api_secret}
              onChange={(event) => setDraft((current) => ({ ...current, solapi_api_secret: event.target.value }))}
              className="h-10"
              disabled={!isAdmin || saving}
            />
          </label>
        </div>

        <label className="block">
          <div className="mb-1 text-xs text-slate-600">solapi_temp</div>
          <Input
            value={draft.solapi_temp}
            onChange={(event) => setDraft((current) => ({ ...current, solapi_temp: event.target.value }))}
            className="h-10"
            disabled={!isAdmin || saving}
          />
        </label>

        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={draft.solapi_bypass}
              onChange={(event) => setDraft((current) => ({ ...current, solapi_bypass: event.target.checked }))}
              disabled={!isAdmin || saving}
            />
            bypass 사용
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
        </div>

        {stored ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div>현재 저장 label: <span className="font-semibold text-slate-900">{stored.label || "-"}</span></div>
            <div className="mt-1">api key: <span className="font-mono text-slate-900">{maskValue(stored.solapi_api_key)}</span></div>
            <div className="mt-1">api secret: <span className="font-mono text-slate-900">{maskValue(stored.solapi_api_secret)}</span></div>
            <div className="mt-1">from: {stored.solapi_from || "-"}</div>
            <div className="mt-1">temp: {stored.solapi_temp || "-"}</div>
            <div className="mt-1">bypass: {stored.solapi_bypass ? "true" : "false"}</div>
          </div>
        ) : null}

        <div className="flex justify-end border-t border-slate-200 pt-4">
          <Button
            type="button"
            disabled={
              !isAdmin ||
              saving ||
              !draft.label.trim() ||
              !draft.solapi_api_key.trim() ||
              !draft.solapi_api_secret.trim()
            }
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
