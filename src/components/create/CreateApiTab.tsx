"use client";

import { useEffect, useMemo, useState } from "react";
import { StateBanner } from "@/components/design-system";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CreateListTable, CreateResourceShell } from "@/components/create/CreateResourceShell";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

type ProviderKey = "cafe24" | "shopify";

type Cafe24Draft = {
  mall_id: string;
  mall_domain: string;
  shop_no: string;
  board_no: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

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

const emptyCafe24: Cafe24Draft = {
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

function normalizeCafe24Provider(value: unknown): Cafe24Draft {
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

  const [cafe24Stored, setCafe24Stored] = useState<Cafe24Draft>(emptyCafe24);
  const [shopifyStored, setShopifyStored] = useState<ShopifyDraft>(emptyShopify);
  const [cafe24Draft, setCafe24Draft] = useState<Cafe24Draft>(emptyCafe24);
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

  const currentStored = selectedKey === "cafe24" ? cafe24Stored : shopifyStored;
  const currentDraft = selectedKey === "cafe24" ? cafe24Draft : shopifyDraft;
  const isDirty = JSON.stringify(currentStored) !== JSON.stringify(currentDraft);

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error("api 설정 저장은 관리자만 가능합니다.");
      return;
    }

    setSaving(true);
    try {
      const values = selectedKey === "cafe24" ? cafe24Draft : shopifyDraft;
      await apiFetch("/api/auth-settings/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedKey,
          values,
          commit: true,
        }),
      });
      toast.success("api 설정이 저장되었습니다.");
      await loadData(selectedKey);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "api 설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

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
      description="provider별 가변 설정값을 한 곳에서 관리합니다. 서버 환경 변수는 이 탭에서 다루지 않습니다."
      helperText="저장 대상은 `A_iam_auth_settings.providers` 이며, `cafe24`와 `shopify` 값을 현재 사용자 기준으로 읽고 저장합니다."
      banner={banner}
      listTitle="API 목록"
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
              label: "API",
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
      detailDescription="서버 환경 변수 카드는 제외하고, provider별 DB 저장값만 이 화면에서 관리합니다."
      detailContent={
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-800">범위 제외</div>
            <div className="mt-1">`/app/install?tab=env` 의 "서버 환경 변수" 영역은 이 탭에서 제외됩니다.</div>
          </div>

          {selectedKey === "cafe24" ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">mall_id</div>
                  <Input
                    value={cafe24Draft.mall_id}
                    onChange={(event) => setCafe24Draft((prev) => ({ ...prev, mall_id: event.target.value }))}
                    className="h-10"
                    disabled={!isAdmin}
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">mall_domain</div>
                  <Input
                    value={cafe24Draft.mall_domain}
                    onChange={(event) => setCafe24Draft((prev) => ({ ...prev, mall_domain: event.target.value }))}
                    className="h-10"
                    disabled={!isAdmin}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">shop_no</div>
                  <Input
                    value={cafe24Draft.shop_no}
                    onChange={(event) => setCafe24Draft((prev) => ({ ...prev, shop_no: event.target.value }))}
                    className="h-10"
                    disabled={!isAdmin}
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">board_no</div>
                  <Input
                    value={cafe24Draft.board_no}
                    onChange={(event) => setCafe24Draft((prev) => ({ ...prev, board_no: event.target.value }))}
                    className="h-10"
                    disabled={!isAdmin}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="block md:col-span-2">
                  <div className="mb-1 text-xs text-slate-600">access_token</div>
                  <Input
                    value={cafe24Draft.access_token}
                    onChange={(event) => setCafe24Draft((prev) => ({ ...prev, access_token: event.target.value }))}
                    className="h-10"
                    disabled={!isAdmin}
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">expires_at</div>
                  <Input
                    value={cafe24Draft.expires_at}
                    onChange={(event) => setCafe24Draft((prev) => ({ ...prev, expires_at: event.target.value }))}
                    className="h-10"
                    disabled={!isAdmin}
                  />
                </label>
              </div>

              <label className="block">
                <div className="mb-1 text-xs text-slate-600">refresh_token</div>
                <Input
                  value={cafe24Draft.refresh_token}
                  onChange={(event) => setCafe24Draft((prev) => ({ ...prev, refresh_token: event.target.value }))}
                  className="h-10"
                  disabled={!isAdmin}
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <div className="font-semibold text-slate-800">현재 저장 요약</div>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>mall_id: {cafe24Stored.mall_id || "-"}</div>
                  <div>mall_domain: {cafe24Stored.mall_domain || "-"}</div>
                  <div>shop_no: {cafe24Stored.shop_no || "-"}</div>
                  <div>board_no: {cafe24Stored.board_no || "-"}</div>
                  <div>access_token: {maskValue(cafe24Stored.access_token)}</div>
                  <div>refresh_token: {maskValue(cafe24Stored.refresh_token)}</div>
                </div>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div className="text-xs text-slate-500">
              {!isAdmin ? "관리자만 저장할 수 있습니다." : isDirty ? "저장되지 않은 변경 사항이 있습니다." : "변경 사항이 없습니다."}
            </div>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={!isAdmin || saving || !isDirty}
              className="rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
            >
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      }
    />
  );
}
