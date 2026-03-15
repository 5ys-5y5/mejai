"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreateCafe24ConnectionFlow, type Cafe24ProviderDraft } from "@/components/create/CreateCafe24ConnectionFlow";
import { StateBanner } from "@/components/design-system";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CreateListTable, CreateResourceShell } from "@/components/create/CreateResourceShell";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

type ProviderKey = "cafe24" | "shopify";

type ShopifyDraft = {
  shop_domain: string;
  client_id: string;
  client_secret: string;
  access_token: string;
  scopes: string;
};

type ProviderRow = {
  id: ProviderKey;
  label: string;
  target: string;
  status: string;
  summary: string;
  permission: string;
};

const emptyCafe24: Cafe24ProviderDraft = {
  mall_id: "",
  mall_domain: "",
  shop_no: "",
  board_no: "",
  access_token: "",
  refresh_token: "",
  expires_at: "",
};

const emptyShopify: ShopifyDraft = {
  shop_domain: "",
  client_id: "",
  client_secret: "",
  access_token: "",
  scopes: "",
};

function toText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeCafe24Provider(value: unknown): Cafe24ProviderDraft {
  const provider = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    mall_id: toText(provider.mall_id),
    mall_domain: toText(provider.mall_domain),
    shop_no: toText(provider.shop_no),
    board_no: toText(provider.board_no),
    access_token: toText(provider.access_token),
    refresh_token: toText(provider.refresh_token),
    expires_at: toText(provider.expires_at),
  };
}

function normalizeShopifyProvider(value: unknown): ShopifyDraft {
  const provider = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    shop_domain: toText(provider.shop_domain),
    client_id: toText(provider.client_id),
    client_secret: toText(provider.client_secret),
    access_token: toText(provider.access_token),
    scopes: toText(provider.scopes),
  };
}

function hasAnyValue(value: Record<string, string>) {
  return Object.values(value).some((item) => item.trim().length > 0);
}

function maskValue(value: string) {
  if (!value) return "-";
  if (value.length <= 6) return "*".repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function CreateApiTab({ isAdmin }: { isAdmin: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<ProviderKey>("cafe24");

  const [cafe24Stored, setCafe24Stored] = useState<Cafe24ProviderDraft>(emptyCafe24);
  const [shopifyStored, setShopifyStored] = useState<ShopifyDraft>(emptyShopify);
  const [cafe24Draft, setCafe24Draft] = useState<Cafe24ProviderDraft>(emptyCafe24);
  const [shopifyDraft, setShopifyDraft] = useState<ShopifyDraft>(emptyShopify);

  const loadData = async (nextSelectedKey?: ProviderKey) => {
    setLoading(true);
    setError(null);
    try {
      const [cafe24Res, shopifyRes] = await Promise.all([
        apiFetch<{ provider: Record<string, unknown> }>("/api/auth-settings/providers?provider=cafe24"),
        apiFetch<{ provider: Record<string, unknown> }>("/api/auth-settings/providers?provider=shopify"),
      ]);

      const nextCafe24 = normalizeCafe24Provider(cafe24Res.provider);
      const nextShopify = normalizeShopifyProvider(shopifyRes.provider);

      setCafe24Stored(nextCafe24);
      setShopifyStored(nextShopify);
      setCafe24Draft(nextCafe24);
      setShopifyDraft(nextShopify);
      if (nextSelectedKey) setSelectedKey(nextSelectedKey);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "API 설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const rows = useMemo<ProviderRow[]>(
    () => [
      {
        id: "cafe24",
        label: "Cafe24",
        target: "providers.cafe24",
        status: hasAnyValue(cafe24Stored) ? "구성됨" : "미설정",
        summary: cafe24Stored.mall_id || cafe24Stored.mall_domain || "-",
        permission: isAdmin ? "관리자 편집" : "읽기 전용",
      },
      {
        id: "shopify",
        label: "Shopify",
        target: "providers.shopify",
        status: hasAnyValue(shopifyStored) ? "구성됨" : "미설정",
        summary: shopifyStored.shop_domain || shopifyStored.client_id || "-",
        permission: isAdmin ? "관리자 편집" : "읽기 전용",
      },
    ],
    [cafe24Stored, isAdmin, shopifyStored]
  );

  const shopifyDirty = useMemo(
    () => JSON.stringify(shopifyStored) !== JSON.stringify(shopifyDraft),
    [shopifyDraft, shopifyStored]
  );

  const saveProvider = useCallback(
    async (provider: ProviderKey, values: Record<string, unknown>) => {
      if (!isAdmin) {
        throw new Error("관리자만 저장할 수 있습니다.");
      }
      setSaving(true);
      try {
        await apiFetch("/api/auth-settings/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            values,
            commit: true,
          }),
        });
        await loadData(provider);
      } finally {
        setSaving(false);
      }
    },
    [isAdmin]
  );

  const handleShopifySave = async () => {
    try {
      await saveProvider("shopify", shopifyDraft);
      toast.success("Shopify 설정이 저장되었습니다.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Shopify 설정 저장에 실패했습니다.");
    }
  };

  const handleCafe24Save = useCallback(
    async (nextValues: Cafe24ProviderDraft) => {
      await saveProvider("cafe24", nextValues);
    },
    [saveProvider]
  );

  const banner = (
    <>
      {!isAdmin ? (
        <StateBanner
          tone="warning"
          title="읽기 전용"
          description="api 설정은 확인할 수 있지만 저장은 관리자만 수행할 수 있습니다."
        />
      ) : null}
      {error ? <StateBanner tone="danger" title="api 로딩 실패" description={error} /> : null}
    </>
  );

  return (
    <CreateResourceShell
      description="provider별 환경 변수와 연결값을 한 곳에서 관리합니다. Cafe24는 연결 플로우로, Shopify는 직접 입력으로 관리합니다."
      helperText="저장 대상은 `A_iam_auth_settings.providers` 이며, create 화면만으로 Cafe24 연결과 Shopify 저장값을 관리합니다."
      banner={banner}
      listTitle="연결 목록"
      listCountLabel={`총 ${rows.length}개`}
      onRefresh={() => void loadData(selectedKey)}
      refreshDisabled={loading}
      listContent={
        <CreateListTable
          rows={rows}
          getRowId={(item) => item.id}
          selectedId={selectedKey}
          onSelect={(item) => setSelectedKey(item.id)}
          columns={[
            {
              id: "label",
              label: "Provider",
              width: "minmax(0, 1.1fr)",
              render: (item) => <div className="truncate text-sm font-semibold text-slate-900">{item.label}</div>,
            },
            {
              id: "target",
              label: "저장 대상",
              width: "minmax(0, 1.4fr)",
              render: (item) => item.target,
            },
            {
              id: "status",
              label: "상태",
              width: "minmax(0, 0.75fr)",
              render: (item) => item.status,
            },
            {
              id: "summary",
              label: "핵심 값",
              width: "minmax(0, 1.15fr)",
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
      detailTitle={selectedKey === "cafe24" ? "Cafe24" : "Shopify"}
      detailDescription={
        selectedKey === "cafe24"
          ? "mall_id 입력부터 OAuth 연결, shop_no/board_no 선택, 저장까지 create 화면 안에서 처리합니다."
          : "Shopify 저장값은 현재 사용자 기준 provider 레코드에 직접 저장합니다."
      }
      detailContent={
        selectedKey === "cafe24" ? (
          <CreateCafe24ConnectionFlow
            isAdmin={isAdmin}
            stored={cafe24Stored}
            draft={cafe24Draft}
            setDraft={setCafe24Draft}
            saving={saving}
            onSave={handleCafe24Save}
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Shopify는 현재 사용자 기준 provider 저장값을 직접 편집합니다.
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">shop_domain</div>
                <Input
                  value={shopifyDraft.shop_domain}
                  onChange={(event) => setShopifyDraft((prev) => ({ ...prev, shop_domain: event.target.value }))}
                  className="h-10"
                  disabled={!isAdmin}
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">scopes</div>
                <Input
                  value={shopifyDraft.scopes}
                  onChange={(event) => setShopifyDraft((prev) => ({ ...prev, scopes: event.target.value }))}
                  className="h-10"
                  disabled={!isAdmin}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">client_id</div>
                <Input
                  value={shopifyDraft.client_id}
                  onChange={(event) => setShopifyDraft((prev) => ({ ...prev, client_id: event.target.value }))}
                  className="h-10"
                  disabled={!isAdmin}
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">client_secret</div>
                <Input
                  value={shopifyDraft.client_secret}
                  onChange={(event) => setShopifyDraft((prev) => ({ ...prev, client_secret: event.target.value }))}
                  className="h-10"
                  disabled={!isAdmin}
                />
              </label>
            </div>

            <label className="block">
              <div className="mb-1 text-xs text-slate-600">access_token</div>
              <Input
                value={shopifyDraft.access_token}
                onChange={(event) => setShopifyDraft((prev) => ({ ...prev, access_token: event.target.value }))}
                className="h-10"
                disabled={!isAdmin}
              />
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="font-semibold text-slate-800">현재 저장 요약</div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>shop_domain: {shopifyStored.shop_domain || "-"}</div>
                <div>scopes: {shopifyStored.scopes || "-"}</div>
                <div>client_id: {maskValue(shopifyStored.client_id)}</div>
                <div>client_secret: {maskValue(shopifyStored.client_secret)}</div>
                <div>access_token: {maskValue(shopifyStored.access_token)}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="text-xs text-slate-500">
                {!isAdmin ? "관리자만 저장할 수 있습니다." : shopifyDirty ? "저장되지 않은 변경 사항이 있습니다." : "변경 사항이 없습니다."}
              </div>
              <Button
                type="button"
                onClick={() => void handleShopifySave()}
                disabled={!isAdmin || saving || !shopifyDirty}
                className="rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        )
      }
    />
  );
}
