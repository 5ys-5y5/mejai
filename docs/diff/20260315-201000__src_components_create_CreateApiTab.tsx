"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { CreateCafe24ConnectionFlow, type Cafe24ProviderDraft } from "@/components/create/CreateCafe24ConnectionFlow";
import { CreateJusoConnectionForm } from "@/components/create/CreateJusoConnectionForm";
import { CreateSolapiConnectionForm } from "@/components/create/CreateSolapiConnectionForm";
import { StateBanner } from "@/components/design-system";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CreateListTable, CreateResourceShell } from "@/components/create/CreateResourceShell";
import { apiFetch } from "@/lib/apiClient";
import {
  SUPPORTED_PROVIDER_KEYS,
  SUPPORTED_PROVIDER_META,
  buildProviderConnectionSummary,
  generateProviderConnectionId,
  getPreferredProviderConnection,
  normalizeProviderConnection,
  readSupportedProviderState,
  type Cafe24Connection,
  type JusoConnection,
  type SolapiConnection,
  type SupportedProviderKey,
  type SupportedProviderState,
} from "@/lib/providerConnections";
import { toast } from "sonner";

type ProviderRow = {
  id: SupportedProviderKey;
  label: string;
  target: string;
  status: string;
  connectionCount: number;
  summary: string;
  permission: string;
};

type ProviderStateMap = {
  cafe24: SupportedProviderState<"cafe24">;
  juso: SupportedProviderState<"juso">;
  solapi: SupportedProviderState<"solapi">;
};

type SelectedConnectionMap = Record<SupportedProviderKey, string | null>;
type CreatingMap = Record<SupportedProviderKey, boolean>;

type ProviderPayloadResponse = {
  provider: Record<string, unknown>;
};

function createEmptyCafe24Draft(): Cafe24Connection {
  return {
    id: generateProviderConnectionId("cafe24"),
    label: "",
    updated_at: "",
    is_active: true,
    mall_id: "",
    shop_no: "",
    board_no: "",
    expires_at: "",
    mall_domain: "",
    access_token: "",
    refresh_token: "",
    last_refresh_error: null,
    attempted_candidates: [],
    last_refresh_attempt_at: "",
    refresh_token_candidates: [],
  };
}

function createEmptyJusoDraft(): JusoConnection {
  return {
    id: generateProviderConnectionId("juso"),
    label: "",
    updated_at: "",
    is_active: true,
    juso_api_key: "",
  };
}

function createEmptySolapiDraft(): SolapiConnection {
  return {
    id: generateProviderConnectionId("solapi"),
    label: "",
    updated_at: "",
    is_active: true,
    solapi_api_key: "",
    solapi_api_secret: "",
    solapi_from: "",
    solapi_temp: "",
    solapi_bypass: false,
  };
}

const emptySelectedConnections: SelectedConnectionMap = {
  cafe24: null,
  juso: null,
  solapi: null,
};

const emptyCreatingMap: CreatingMap = {
  cafe24: false,
  juso: false,
  solapi: false,
};

export function CreateApiTab({ isAdmin }: { isAdmin: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<SupportedProviderKey>("cafe24");

  const [storedStates, setStoredStates] = useState<ProviderStateMap>({
    cafe24: { connections: [] },
    juso: { connections: [] },
    solapi: { connections: [] },
  });
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<SelectedConnectionMap>(emptySelectedConnections);
  const [creatingByProvider, setCreatingByProvider] = useState<CreatingMap>(emptyCreatingMap);

  const [cafe24Draft, setCafe24Draft] = useState<Cafe24ProviderDraft>(createEmptyCafe24Draft);
  const [jusoDraft, setJusoDraft] = useState<JusoConnection>(createEmptyJusoDraft);
  const [solapiDraft, setSolapiDraft] = useState<SolapiConnection>(createEmptySolapiDraft);

  const hydrateDraftForProvider = useCallback(
    (
      providerKey: SupportedProviderKey,
      nextStates: ProviderStateMap,
      nextSelectedIds: SelectedConnectionMap,
      nextCreating: CreatingMap
    ) => {
      if (providerKey === "cafe24") {
        const connection = getPreferredProviderConnection(nextStates.cafe24, nextSelectedIds.cafe24);
        setCafe24Draft(
          nextCreating.cafe24
            ? createEmptyCafe24Draft()
            : normalizeProviderConnection("cafe24", connection || createEmptyCafe24Draft())
        );
        return;
      }
      if (providerKey === "juso") {
        const connection = getPreferredProviderConnection(nextStates.juso, nextSelectedIds.juso);
        setJusoDraft(
          nextCreating.juso
            ? createEmptyJusoDraft()
            : normalizeProviderConnection("juso", connection || createEmptyJusoDraft())
        );
        return;
      }
      const connection = getPreferredProviderConnection(nextStates.solapi, nextSelectedIds.solapi);
      setSolapiDraft(
        nextCreating.solapi
          ? createEmptySolapiDraft()
          : normalizeProviderConnection("solapi", connection || createEmptySolapiDraft())
      );
    },
    []
  );

  const hydrateAllDrafts = useCallback(
    (nextStates: ProviderStateMap, nextSelectedIds: SelectedConnectionMap, nextCreating: CreatingMap) => {
      hydrateDraftForProvider("cafe24", nextStates, nextSelectedIds, nextCreating);
      hydrateDraftForProvider("juso", nextStates, nextSelectedIds, nextCreating);
      hydrateDraftForProvider("solapi", nextStates, nextSelectedIds, nextCreating);
    },
    [hydrateDraftForProvider]
  );

  const loadData = useCallback(
    async (nextProviderKey?: SupportedProviderKey, nextConnectionId?: string | null, forceCreate = false) => {
      setLoading(true);
      setError(null);
      try {
        const [cafe24Res, jusoRes, solapiRes] = await Promise.all(
          SUPPORTED_PROVIDER_KEYS.map((providerKey) =>
            apiFetch<ProviderPayloadResponse>(`/api/auth-settings/providers?provider=${providerKey}`)
          )
        );

        const nextStates: ProviderStateMap = {
          cafe24: readSupportedProviderState({ cafe24: cafe24Res.provider }, "cafe24"),
          juso: readSupportedProviderState({ juso: jusoRes.provider }, "juso"),
          solapi: readSupportedProviderState({ solapi: solapiRes.provider }, "solapi"),
        };

        const resolvedProviderKey = nextProviderKey || selectedKey;
        const resolvedSelectedIds: SelectedConnectionMap = {
          cafe24:
            selectedConnectionIds.cafe24 && nextStates.cafe24.connections.some((item) => item.id === selectedConnectionIds.cafe24)
              ? selectedConnectionIds.cafe24
              : nextStates.cafe24.connections[0]?.id || null,
          juso:
            selectedConnectionIds.juso && nextStates.juso.connections.some((item) => item.id === selectedConnectionIds.juso)
              ? selectedConnectionIds.juso
              : nextStates.juso.connections[0]?.id || null,
          solapi:
            selectedConnectionIds.solapi && nextStates.solapi.connections.some((item) => item.id === selectedConnectionIds.solapi)
              ? selectedConnectionIds.solapi
              : nextStates.solapi.connections[0]?.id || null,
        };

        if (nextConnectionId !== undefined) {
          resolvedSelectedIds[resolvedProviderKey] = nextConnectionId;
        }

        const resolvedCreating: CreatingMap = {
          ...emptyCreatingMap,
          ...creatingByProvider,
          [resolvedProviderKey]: forceCreate,
        };

        if (!forceCreate && nextConnectionId !== undefined && !nextConnectionId) {
          resolvedSelectedIds[resolvedProviderKey] = nextStates[resolvedProviderKey].connections[0]?.id || null;
        }

        setStoredStates(nextStates);
        setSelectedKey(resolvedProviderKey);
        setSelectedConnectionIds(resolvedSelectedIds);
        setCreatingByProvider(resolvedCreating);
        hydrateAllDrafts(nextStates, resolvedSelectedIds, resolvedCreating);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "API 설정을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [creatingByProvider, hydrateAllDrafts, selectedConnectionIds, selectedKey]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows = useMemo<ProviderRow[]>(
    () =>
      SUPPORTED_PROVIDER_KEYS.map((providerKey) => {
        const state = storedStates[providerKey];
        const preferred = getPreferredProviderConnection(state, selectedConnectionIds[providerKey]);
        return {
          id: providerKey,
          label: SUPPORTED_PROVIDER_META[providerKey].label,
          target: `providers.${providerKey}.connections[]`,
          status: state.connections.length > 0 ? "구성됨" : "미설정",
          connectionCount: state.connections.length,
          summary: buildProviderConnectionSummary(providerKey, preferred),
          permission: isAdmin ? "관리자 편집" : "읽기 전용",
        };
      }),
    [isAdmin, selectedConnectionIds, storedStates]
  );

  const currentState = storedStates[selectedKey];
  const currentSelectedConnectionId = selectedConnectionIds[selectedKey];
  const currentCreating = creatingByProvider[selectedKey];

  const selectConnection = (providerKey: SupportedProviderKey, connectionId: string | null, forceCreate = false) => {
    const nextSelectedIds = {
      ...selectedConnectionIds,
      [providerKey]: connectionId,
    };
    const nextCreating = {
      ...creatingByProvider,
      [providerKey]: forceCreate,
    };
    setSelectedKey(providerKey);
    setSelectedConnectionIds(nextSelectedIds);
    setCreatingByProvider(nextCreating);
    hydrateDraftForProvider(providerKey, storedStates, nextSelectedIds, nextCreating);
  };

  const saveProviderConnection = useCallback(
    async (providerKey: SupportedProviderKey, values: Record<string, unknown>) => {
      if (!isAdmin) {
        throw new Error("관리자만 저장할 수 있습니다.");
      }
      setSaving(true);
      try {
        const isCreating = creatingByProvider[providerKey];
        const connectionId = isCreating ? undefined : selectedConnectionIds[providerKey] || undefined;
        const mode = isCreating ? "create_connection" : "update_connection";
        await apiFetch("/api/auth-settings/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: providerKey,
            mode,
            connection_id: connectionId,
            values,
            commit: true,
          }),
        });
        await loadData(providerKey, String(values.id || connectionId || ""), false);
      } finally {
        setSaving(false);
      }
    },
    [creatingByProvider, isAdmin, loadData, selectedConnectionIds]
  );

  const deleteSelectedConnection = useCallback(async () => {
    if (!isAdmin) return;
    if (!currentSelectedConnectionId) return;
    if (!window.confirm("선택한 connection을 삭제할까요?")) return;
    setSaving(true);
    try {
      await apiFetch("/api/auth-settings/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedKey,
          mode: "delete_connection",
          connection_id: currentSelectedConnectionId,
          commit: true,
        }),
      });
      toast.success("connection이 삭제되었습니다.");
      await loadData(selectedKey, null, false);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "connection 삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [currentSelectedConnectionId, isAdmin, loadData, selectedKey]);

  const banner = (
    <>
      {!isAdmin ? (
        <StateBanner
          tone="warning"
          title="읽기 전용"
          description="provider connection은 확인할 수 있지만 저장은 관리자만 수행할 수 있습니다."
        />
      ) : null}
      {error ? <StateBanner tone="danger" title="api 로딩 실패" description={error} /> : null}
    </>
  );

  return (
    <CreateResourceShell
      description="provider별 connection 목록과 편집기를 한 곳에서 관리합니다. 모든 provider는 `connections[]` 구조를 공유하고, agent는 이 connection 중 하나를 선택해 사용합니다."
      helperText="저장 대상은 `A_iam_auth_settings.providers` 입니다. Cafe24, Juso, Solapi 모두 provider당 여러 connection을 유지할 수 있습니다."
      banner={banner}
      listTitle="Provider 목록"
      listCountLabel={`총 ${rows.length}개`}
      onRefresh={() => void loadData(selectedKey, currentSelectedConnectionId, currentCreating)}
      refreshDisabled={loading}
      listContent={
        <CreateListTable
          rows={rows}
          getRowId={(item) => item.id}
          selectedId={selectedKey}
          onSelect={(item) => {
            const preferred = storedStates[item.id].connections[0]?.id || null;
            selectConnection(item.id, preferred, false);
          }}
          columns={[
            {
              id: "label",
              label: "Provider",
              width: "minmax(0, 1.05fr)",
              render: (item) => <div className="truncate text-sm font-semibold text-slate-900">{item.label}</div>,
            },
            {
              id: "target",
              label: "저장 대상",
              width: "minmax(0, 1.45fr)",
              render: (item) => item.target,
            },
            {
              id: "connections",
              label: "Connections",
              width: "minmax(0, 0.8fr)",
              render: (item) => String(item.connectionCount),
            },
            {
              id: "status",
              label: "상태",
              width: "minmax(0, 0.8fr)",
              render: (item) => item.status,
            },
            {
              id: "summary",
              label: "대표 요약",
              width: "minmax(0, 1.2fr)",
              render: (item) => item.summary,
            },
            {
              id: "permission",
              label: "권한",
              width: "minmax(0, 0.95fr)",
              render: (item) => item.permission,
            },
          ]}
        />
      }
      detailTitle={SUPPORTED_PROVIDER_META[selectedKey].label}
      detailDescription={SUPPORTED_PROVIDER_META[selectedKey].description}
      detailActions={
        !currentCreating && currentSelectedConnectionId ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void deleteSelectedConnection()}
            disabled={!isAdmin || saving}
            className="rounded-xl border-rose-200 bg-rose-50 px-3 text-xs text-rose-600 hover:bg-rose-100"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            삭제
          </Button>
        ) : null
      }
      detailContent={
        <div className="space-y-4">
          <Card className="space-y-4 border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">등록된 connection</div>
                <div className="mt-1 text-xs text-slate-500">
                  provider별 connection 목록입니다. 하나를 선택해 수정하거나 새 connection을 추가할 수 있습니다.
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => selectConnection(selectedKey, null, true)}
                disabled={!isAdmin || saving}
                className="rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
              >
                새 연결
              </Button>
            </div>

            {currentState.connections.length === 0 && !currentCreating ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                저장된 connection이 없습니다. `새 연결`로 첫 항목을 등록하세요.
              </div>
            ) : (
              <div className="grid gap-2">
                {currentState.connections.map((connection) => {
                  const active = !currentCreating && currentSelectedConnectionId === connection.id;
                  return (
                    <button
                      key={connection.id}
                      type="button"
                      onClick={() => selectConnection(selectedKey, connection.id, false)}
                      className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{connection.label || buildProviderConnectionSummary(selectedKey, connection)}</div>
                        <div className={active ? "text-slate-200" : "text-slate-500"}>
                          {connection.is_active ? "활성" : "비활성"}
                        </div>
                      </div>
                      <div className={`mt-1 truncate ${active ? "text-slate-200" : "text-slate-500"}`}>
                        {buildProviderConnectionSummary(selectedKey, connection)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {selectedKey === "cafe24" ? (
            <CreateCafe24ConnectionFlow
              isAdmin={isAdmin}
              stored={currentCreating ? null : getPreferredProviderConnection(storedStates.cafe24, selectedConnectionIds.cafe24)}
              draft={cafe24Draft}
              setDraft={setCafe24Draft}
              saving={saving}
              onSave={async (nextValues) => {
                await saveProviderConnection("cafe24", nextValues);
                toast.success("Cafe24 connection이 저장되었습니다.");
              }}
            />
          ) : null}

          {selectedKey === "juso" ? (
            <CreateJusoConnectionForm
              isAdmin={isAdmin}
              stored={currentCreating ? null : getPreferredProviderConnection(storedStates.juso, selectedConnectionIds.juso)}
              draft={jusoDraft}
              setDraft={setJusoDraft}
              saving={saving}
              onSave={async (nextValues) => {
                await saveProviderConnection("juso", nextValues);
                toast.success("Juso connection이 저장되었습니다.");
              }}
            />
          ) : null}

          {selectedKey === "solapi" ? (
            <CreateSolapiConnectionForm
              isAdmin={isAdmin}
              stored={currentCreating ? null : getPreferredProviderConnection(storedStates.solapi, selectedConnectionIds.solapi)}
              draft={solapiDraft}
              setDraft={setSolapiDraft}
              saving={saving}
              onSave={async (nextValues) => {
                await saveProviderConnection("solapi", nextValues);
                toast.success("Solapi connection이 저장되었습니다.");
              }}
            />
          ) : null}
        </div>
      }
    />
  );
}
