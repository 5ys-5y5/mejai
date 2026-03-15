"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { CheckCircle2, LoaderCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getAccessToken } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type Cafe24ProviderDraft = {
  mall_id: string;
  mall_domain: string;
  shop_no: string;
  board_no: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

type CreateCafe24ConnectionFlowProps = {
  isAdmin: boolean;
  stored: Cafe24ProviderDraft;
  draft: Cafe24ProviderDraft;
  setDraft: Dispatch<SetStateAction<Cafe24ProviderDraft>>;
  saving: boolean;
  onSave: (next: Cafe24ProviderDraft) => Promise<void>;
};

type ShopOption = {
  id: string;
  label: string;
  description: string;
};

type FlowStep = "mall" | "shop" | "board";

const boardOptions = [
  { id: "1", label: "1", description: "공지사항" },
  { id: "2", label: "2", description: "뉴스/이벤트" },
  { id: "3", label: "3", description: "이용안내 FAQ" },
  { id: "4", label: "4", description: "상품 사용후기" },
  { id: "5", label: "5", description: "자유게시판" },
  { id: "6", label: "6", description: "상품 Q&A" },
  { id: "7", label: "7", description: "자료실" },
  { id: "8", label: "8", description: "갤러리" },
  { id: "9", label: "9", description: "1:1 맞춤상담" },
  { id: "101", label: "101", description: "상품자유게시판" },
  { id: "1001", label: "1001", description: "한줄메모" },
  { id: "1002", label: "1002", description: "자유게시판2" },
  { id: "3001", label: "3001", description: "자유게시판3" },
];

const allCafe24Scopes = [
  "mall.read_application",
  "mall.write_application",
  "mall.read_category",
  "mall.write_category",
  "mall.read_product",
  "mall.write_product",
  "mall.read_collection",
  "mall.write_collection",
  "mall.read_supply",
  "mall.write_supply",
  "mall.read_personal",
  "mall.write_personal",
  "mall.read_order",
  "mall.write_order",
  "mall.read_community",
  "mall.write_community",
  "mall.read_customer",
  "mall.write_customer",
  "mall.read_notification",
  "mall.write_notification",
  "mall.read_store",
  "mall.write_store",
  "mall.read_promotion",
  "mall.write_promotion",
  "mall.read_design",
  "mall.write_design",
  "mall.read_salesreport",
  "mall.read_shipping",
  "mall.write_shipping",
  "mall.read_translation",
  "mall.write_translation",
  "mall.read_analytics",
];

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sortNumbers(values: string[]) {
  return [...new Set(values)]
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((left, right) => Number(left) - Number(right));
}

function maskValue(value: string) {
  if (!value) return "-";
  if (value.length <= 6) return "*".repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function buildInitialStep(draft: Cafe24ProviderDraft): FlowStep {
  if (draft.board_no) return "board";
  if (draft.shop_no) return "shop";
  return "mall";
}

function parseJson<T>(value: string): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function fetchWithAccessToken<T>(input: string, init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await response.text().catch(() => "");
  const payload = parseJson<{ error?: string } & T>(text);
  if (!response.ok) {
    throw new Error(payload?.error || text || response.statusText || "REQUEST_FAILED");
  }
  return (payload || {}) as T;
}

export function CreateCafe24ConnectionFlow({
  isAdmin,
  stored,
  draft,
  setDraft,
  saving,
  onSave,
}: CreateCafe24ConnectionFlowProps) {
  const [step, setStep] = useState<FlowStep>(() => buildInitialStep(draft));
  const [shopOptions, setShopOptions] = useState<ShopOption[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [mallStatus, setMallStatus] = useState("");
  const [mallBusy, setMallBusy] = useState(false);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [advanceNotice, setAdvanceNotice] = useState(false);
  const [mallFailed, setMallFailed] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [tokenMallId, setTokenMallId] = useState(stored.mall_id || draft.mall_id || "");
  const oauthTimeoutRef = useRef<number | null>(null);
  const advanceTimeoutRef = useRef<number | null>(null);
  const oauthRetryRef = useRef(0);
  const lastMallIdRef = useRef(draft.mall_id || stored.mall_id || "");

  const shopDomainByNo = useMemo(() => {
    const map = new Map<string, string>();
    shopOptions.forEach((option) => {
      if (option.description) {
        map.set(option.id, option.description);
      }
    });
    return map;
  }, [shopOptions]);

  const buildMallDomainFromShopNo = useCallback(
    (values: string[]) =>
      values
        .map((shopNo) => shopDomainByNo.get(shopNo))
        .filter(Boolean)
        .join(", "),
    [shopDomainByNo]
  );

  const boardPairs = useMemo(() => {
    const map = new Map(boardOptions.map((option) => [option.id, option.description]));
    return sortNumbers(parseCsv(stored.board_no)).map((id) => ({
      id,
      label: id,
      description: map.get(id) || "-",
    }));
  }, [stored.board_no]);

  const shopPairs = useMemo(() => {
    const shops = sortNumbers(parseCsv(stored.shop_no));
    const domains = parseCsv(stored.mall_domain);
    const domainMap = new Map<string, string>();
    shops.forEach((shop, index) => {
      domainMap.set(shop, domains[index] || "");
    });
    return shops.map((shop) => ({
      id: shop,
      label: shop,
      description: domainMap.get(shop) || "-",
    }));
  }, [stored.mall_domain, stored.shop_no]);

  const selectedShopNos = useMemo(() => sortNumbers(parseCsv(draft.shop_no)), [draft.shop_no]);
  const selectedBoardNos = useMemo(() => sortNumbers(parseCsv(draft.board_no)), [draft.board_no]);

  useEffect(() => {
    setTokenMallId(stored.mall_id || "");
  }, [stored.mall_id]);

  useEffect(() => {
    setStep(buildInitialStep(draft));
  }, [draft.board_no, draft.shop_no]);

  useEffect(() => {
    if (draft.mall_id && tokenMallId && draft.mall_id !== tokenMallId) {
      setDraft((current) => ({
        ...current,
        access_token: "",
        refresh_token: "",
        expires_at: "",
        shop_no: "",
        board_no: "",
        mall_domain: "",
      }));
      setShopOptions([]);
      setStep("mall");
    }
  }, [draft.mall_id, setDraft, tokenMallId]);

  useEffect(() => {
    if (selectedShopNos.length === 0) return;
    const nextDomain = buildMallDomainFromShopNo(selectedShopNos);
    if (nextDomain && nextDomain !== draft.mall_domain) {
      setDraft((current) => ({ ...current, mall_domain: nextDomain }));
    }
  }, [buildMallDomainFromShopNo, draft.mall_domain, selectedShopNos, setDraft]);

  useEffect(() => {
    if (!isAdmin || !draft.mall_id || !draft.access_token || shopOptions.length > 0) return;
    void (async () => {
      try {
        setShopLoading(true);
        const payload = await fetchWithAccessToken<{
          shops?: Array<{ shop_no: number; primary_domain?: string | null; base_domain?: string | null; shop_name?: string }>;
        }>("/api/cafe24/shops", {
          headers: {
            "x-cafe24-mall-id": draft.mall_id,
            "x-cafe24-access-token": draft.access_token,
          },
        });
        const options =
          payload.shops?.map((shop) => ({
            id: String(shop.shop_no),
            label: String(shop.shop_no),
            description: shop.primary_domain || shop.base_domain || shop.shop_name || "",
          })) || [];
        setShopOptions(options);
      } catch {
        // keep manual retry path available
      } finally {
        setShopLoading(false);
      }
    })();
  }, [draft.access_token, draft.mall_id, isAdmin, shopOptions.length]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const allowedOrigins = new Set([window.location.origin, "https://mejai.help", "https://www.mejai.help"]);
      if (!allowedOrigins.has(event.origin)) return;
      const data = event.data as {
        type?: string;
        error?: string;
        mall_id?: string;
        access_token?: string;
        refresh_token?: string;
        expires_at?: string;
      };
      if (data?.type === "cafe24_oauth_error") {
        const friendly = data.error?.includes("Code time expired")
          ? "OAuth 시간이 만료되었습니다. 다시 로그인 후 시도해주세요."
          : data.error || "OAuth 오류가 발생했습니다.";
        setFlowError(friendly);
        toast.error(friendly);
        setMallStatus(`OAuth 오류: ${friendly}`);
        setMallFailed(true);
        setScopeBusy(false);
        setMallBusy(false);
        setAdvanceNotice(false);
        if (oauthTimeoutRef.current) {
          window.clearTimeout(oauthTimeoutRef.current);
          oauthTimeoutRef.current = null;
        }
        if (advanceTimeoutRef.current) {
          window.clearTimeout(advanceTimeoutRef.current);
          advanceTimeoutRef.current = null;
        }
        return;
      }
      if (data?.type !== "cafe24_oauth_complete") return;

      if (oauthTimeoutRef.current) {
        window.clearTimeout(oauthTimeoutRef.current);
        oauthTimeoutRef.current = null;
      }
      oauthRetryRef.current = 0;

      const mallId = data.mall_id || lastMallIdRef.current;
      const accessToken = data.access_token || "";
      const refreshToken = data.refresh_token || "";
      const expiresAt = data.expires_at || "";

      setDraft((current) => ({
        ...current,
        mall_id: mallId || current.mall_id,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      }));
      setTokenMallId(mallId || "");

      window.setTimeout(async () => {
        setMallStatus("shop_no 목록을 불러오는 중...");
        try {
          setShopLoading(true);
          const payload = await fetchWithAccessToken<{
            shops?: Array<{ shop_no: number; primary_domain?: string | null; base_domain?: string | null; shop_name?: string }>;
          }>("/api/cafe24/shops", {
            headers: {
              "x-cafe24-mall-id": mallId || "",
              "x-cafe24-access-token": accessToken,
            },
          });
          const options =
            payload.shops?.map((shop) => ({
              id: String(shop.shop_no),
              label: String(shop.shop_no),
              description: shop.primary_domain || shop.base_domain || shop.shop_name || "",
            })) || [];
          setShopOptions(options);
          setMallStatus("shop_no 목록 확인 완료. 다음 단계로 이동합니다.");
          setAdvanceNotice(true);
          advanceTimeoutRef.current = window.setTimeout(() => {
            setStep("shop");
            setMallStatus("");
            setAdvanceNotice(false);
          }, 1200);
        } catch (shopError) {
          const message = shopError instanceof Error ? shopError.message : "shop_no 목록을 불러오지 못했습니다.";
          setFlowError(message);
          setMallStatus(message);
          setMallFailed(true);
        } finally {
          setShopLoading(false);
          setScopeBusy(false);
          setMallBusy(false);
        }
      }, 0);
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (oauthTimeoutRef.current) window.clearTimeout(oauthTimeoutRef.current);
      if (advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current);
    };
  }, [setDraft]);

  const loadShops = useCallback(async () => {
    if (!isAdmin) {
      setFlowError("관리자 권한이 필요합니다.");
      return false;
    }
    if (!draft.mall_id || !draft.access_token) {
      setFlowError("OAuth 완료 후 shop_no 목록을 불러올 수 있습니다.");
      return false;
    }
    setFlowError(null);
    setShopLoading(true);
    try {
      const payload = await fetchWithAccessToken<{
        shops?: Array<{ shop_no: number; primary_domain?: string | null; base_domain?: string | null; shop_name?: string }>;
      }>("/api/cafe24/shops", {
        headers: {
          "x-cafe24-mall-id": draft.mall_id,
          "x-cafe24-access-token": draft.access_token,
        },
      });
      const options =
        payload.shops?.map((shop) => ({
          id: String(shop.shop_no),
          label: String(shop.shop_no),
          description: shop.primary_domain || shop.base_domain || shop.shop_name || "",
        })) || [];
      setShopOptions(options);
      return options.length > 0;
    } catch (shopError) {
      setFlowError(shopError instanceof Error ? shopError.message : "shop_no 목록을 불러오지 못했습니다.");
      return false;
    } finally {
      setShopLoading(false);
    }
  }, [draft.access_token, draft.mall_id, isAdmin]);

  const startOAuth = useCallback(async () => {
    if (!isAdmin) {
      setFlowError("관리자 권한이 필요합니다.");
      return false;
    }
    const mallId = draft.mall_id.trim();
    if (!mallId) {
      setFlowError("mall_id를 입력해주세요.");
      return false;
    }

    const scope = (process.env.NEXT_PUBLIC_CAFE24_SCOPE || "").trim() || allCafe24Scopes.join(" ");
    setFlowError(null);
    setMallBusy(true);
    setScopeBusy(true);
    setMallFailed(false);
    setMallStatus("OAuth 연결을 시작합니다...");
    lastMallIdRef.current = mallId;
    oauthRetryRef.current = 0;

    try {
      const payload = await fetchWithAccessToken<{ url?: string }>(
        `/api/cafe24/authorize?mode=json&mall_id=${encodeURIComponent(mallId)}&scope=${encodeURIComponent(scope)}`
      );
      if (!payload.url) {
        setMallStatus("OAuth 연결을 시작할 수 없습니다.");
        setMallBusy(false);
        setScopeBusy(false);
        return false;
      }
      const popup = window.open(payload.url, "cafe24_oauth", "width=520,height=720");
      if (!popup) {
        setFlowError("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요.");
        setMallStatus("팝업이 차단되어 OAuth를 진행할 수 없습니다.");
        setMallBusy(false);
        setScopeBusy(false);
        return false;
      }
      setMallStatus("OAuth 응답을 기다리는 중...");
      oauthTimeoutRef.current = window.setTimeout(() => {
        const nextTry = oauthRetryRef.current + 1;
        if (nextTry <= 3) {
          oauthRetryRef.current = nextTry;
          setMallStatus(`OAuth 재시도 중... (${nextTry}/3)`);
          void startOAuth();
          return;
        }
        setMallStatus("OAuth 응답이 없습니다. 다시 시도해주세요.");
        setMallFailed(true);
        setMallBusy(false);
        setScopeBusy(false);
      }, 5000);
      return true;
    } catch (oauthError) {
      const message = oauthError instanceof Error ? oauthError.message : "OAuth 연결을 시작할 수 없습니다.";
      setFlowError(message);
      setMallStatus(message);
      setMallBusy(false);
      setScopeBusy(false);
      return false;
    }
  }, [draft.mall_id, isAdmin]);

  const toggleShopNo = useCallback(
    (shopNo: string) => {
      const next = selectedShopNos.includes(shopNo)
        ? selectedShopNos.filter((value) => value !== shopNo)
        : [...selectedShopNos, shopNo];
      const ordered = sortNumbers(next);
      setDraft((current) => ({
        ...current,
        shop_no: ordered.join(","),
        mall_domain: buildMallDomainFromShopNo(ordered) || current.mall_domain,
      }));
    },
    [buildMallDomainFromShopNo, selectedShopNos, setDraft]
  );

  const toggleBoardNo = useCallback(
    (boardNo: string) => {
      const next = selectedBoardNos.includes(boardNo)
        ? selectedBoardNos.filter((value) => value !== boardNo)
        : [...selectedBoardNos, boardNo];
      setDraft((current) => ({
        ...current,
        board_no: sortNumbers(next).join(","),
      }));
    },
    [selectedBoardNos, setDraft]
  );

  const handleSave = useCallback(async () => {
    if (!isAdmin) {
      setFlowError("관리자 권한이 필요합니다.");
      return;
    }
    if (!draft.mall_id.trim()) {
      setFlowError("mall_id를 입력해주세요.");
      setStep("mall");
      return;
    }
    if (!draft.access_token || !draft.refresh_token || !draft.expires_at) {
      setFlowError("OAuth 토큰이 없습니다. OAuth를 다시 진행해주세요.");
      setStep("mall");
      return;
    }
    if (selectedShopNos.length === 0) {
      setFlowError("shop_no를 선택해주세요.");
      setStep("shop");
      return;
    }
    if (selectedBoardNos.length === 0) {
      setFlowError("board_no를 선택해주세요.");
      setStep("board");
      return;
    }
    const allowed = new Set(shopOptions.map((option) => option.id));
    const invalid = selectedShopNos.filter((shopNo) => !allowed.has(shopNo));
    if (shopOptions.length === 0 || invalid.length > 0) {
      setFlowError("shop_no 목록이 준비되지 않았습니다. OAuth 완료 후 목록에서 다시 선택해주세요.");
      setStep("shop");
      return;
    }

    const normalizedMallId = (lastMallIdRef.current || draft.mall_id).trim();
    const nextValues: Cafe24ProviderDraft = {
      ...draft,
      mall_id: normalizedMallId,
      shop_no: selectedShopNos.join(","),
      board_no: selectedBoardNos.join(","),
      mall_domain: buildMallDomainFromShopNo(selectedShopNos) || draft.mall_domain,
    };

    try {
      setFlowError(null);
      setSaveNotice("");
      await onSave(nextValues);
      setTokenMallId(normalizedMallId);
      setSaveNotice("Cafe24 연결 정보가 저장되었습니다.");
      toast.success("Cafe24 연결 정보가 저장되었습니다.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Cafe24 설정 저장에 실패했습니다.";
      setFlowError(message);
      toast.error(message);
    }
  }, [buildMallDomainFromShopNo, draft, isAdmin, onSave, selectedBoardNos, selectedShopNos, shopOptions]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3 border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">환경 변수</div>
        <div className="text-xs text-slate-600">
          Cafe24는 mall_id 입력 후 OAuth 연결을 진행하고, 연결된 쇼핑몰의 shop_no와 board_no를 선택해 저장합니다.
        </div>
        {!isAdmin ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            관리자만 연결 정보를 수정할 수 있습니다.
          </div>
        ) : null}
        {flowError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{flowError}</div>
        ) : null}
        {saveNotice ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {saveNotice}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4 border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">등록된 정보</div>
            <div className="mt-1 text-xs text-slate-500">저장된 Cafe24 연결값입니다. 아래 단계형 편집에서 다시 선택해 갱신할 수 있습니다.</div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isAdmin}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => setStep("mall")}
          >
            <RefreshCcw className="mr-1 h-4 w-4" />
            다시 연결
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div>mall_id: <span className="font-semibold text-slate-900">{stored.mall_id || "-"}</span></div>
            <div className="mt-1">access_token: <span className="font-mono text-slate-900">{maskValue(stored.access_token)}</span></div>
            <div className="mt-1">refresh_token: <span className="font-mono text-slate-900">{maskValue(stored.refresh_token)}</span></div>
            <div className="mt-1">expires_at: <span className="font-mono text-slate-900">{stored.expires_at || "-"}</span></div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-800">shop_no / mall_domain</div>
            <div className="mt-2 space-y-1">
              {shopPairs.length > 0 ? shopPairs.map((item) => (
                <div key={item.id}>
                  <span className="font-semibold text-slate-900">{item.label}</span> ({item.description})
                </div>
              )) : <div>-</div>}
            </div>
            <div className="mt-3 font-semibold text-slate-800">board_no</div>
            <div className="mt-2 space-y-1">
              {boardPairs.length > 0 ? boardPairs.map((item) => (
                <div key={item.id}>
                  <span className="font-semibold text-slate-900">{item.label}</span> ({item.description})
                </div>
              )) : <div>-</div>}
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 border-slate-200 bg-white p-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Cafe24 연결 플로우</div>
          <div className="mt-1 text-xs text-slate-500">
            mall_id 입력 {"->"} OAuth 연결 {"->"} shop_no 선택 {"->"} board_no 선택 {"->"} 저장
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "mall", label: "1. mall_id" },
            { key: "shop", label: "2. shop_no" },
            { key: "board", label: "3. board_no" },
          ] as Array<{ key: FlowStep; label: string }>).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (item.key === "shop" && !draft.access_token) return;
                if (item.key === "board" && selectedShopNos.length === 0) return;
                setStep(item.key);
              }}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                step === item.key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600",
                (item.key === "shop" && !draft.access_token) || (item.key === "board" && selectedShopNos.length === 0)
                  ? "cursor-not-allowed opacity-50"
                  : "hover:border-slate-300 hover:text-slate-900"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {step === "mall" ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-900">1. mall_id 입력</div>
            <div className="text-[11px] text-slate-500">
              Cafe24 관리자에서 상점 아이디를 확인한 뒤 입력합니다. OAuth 연결을 시작하면 token, refresh_token, expires_at 이 채워집니다.
            </div>
            <label className="block">
              <div className="mb-1 text-xs text-slate-600">mall_id</div>
              <Input
                value={draft.mall_id}
                onChange={(event) => setDraft((current) => ({ ...current, mall_id: event.target.value }))}
                className="h-10"
                disabled={!isAdmin || mallBusy || scopeBusy || saving}
              />
            </label>
            {mallStatus ? <div className="text-xs text-slate-500">{mallStatus}</div> : null}
            <Button
              type="button"
              disabled={!isAdmin || !draft.mall_id.trim() || mallBusy || scopeBusy || advanceNotice || saving}
              className="rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
              onClick={() => {
                void startOAuth();
              }}
            >
              {mallBusy || scopeBusy || advanceNotice ? (
                <>
                  <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
                  OAuth 연결중
                </>
              ) : mallFailed ? "다시 시도" : "OAuth 연결"}
            </Button>
          </div>
        ) : null}

        {step === "shop" ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-900">2. shop_no 선택</div>
                <div className="mt-1 text-[11px] text-slate-500">OAuth 완료 후 조회된 shop 목록에서 사용할 shop_no를 선택합니다.</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!isAdmin || shopLoading || saving}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  void loadShops();
                }}
              >
                <RefreshCcw className="mr-1 h-4 w-4" />
                목록 새로고침
              </Button>
            </div>
            {shopLoading ? <div className="text-xs text-slate-500">shop_no 목록을 불러오는 중...</div> : null}
            <div className="grid gap-2">
              {shopOptions.length > 0 ? shopOptions.map((option) => {
                const active = selectedShopNos.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!isAdmin || saving}
                    onClick={() => toggleShopNo(option.id)}
                    className={cn(
                      "grid grid-cols-[72px_1fr_64px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                  >
                    <span className="font-semibold">{option.label}</span>
                    <span className={cn("truncate", active ? "text-slate-200" : "text-slate-500")}>{option.description || "-"}</span>
                    <span className="text-right text-[11px]">{active ? "선택됨" : "선택"}</span>
                  </button>
                );
              }) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">
                  OAuth 완료 후 `목록 새로고침` 또는 자동 조회로 shop_no 목록이 채워집니다.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === "board" ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-900">3. board_no 선택</div>
            <div className="text-[11px] text-slate-500">사용할 게시판 번호를 하나 이상 선택합니다.</div>
            <div className="grid gap-2">
              {boardOptions.map((option) => {
                const active = selectedBoardNos.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!isAdmin || saving}
                    onClick={() => toggleBoardNo(option.id)}
                    className={cn(
                      "grid grid-cols-[72px_1fr_64px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs",
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                  >
                    <span className="font-semibold">{option.label}</span>
                    <span className={cn("truncate", active ? "text-emerald-100" : "text-slate-500")}>{option.description}</span>
                    <span className="text-right text-[11px]">{active ? "선택됨" : "선택"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div className="text-xs text-slate-500">
            {step === "mall"
              ? "OAuth 연결로 Cafe24 토큰을 먼저 확보합니다."
              : step === "shop"
                ? `선택된 shop_no: ${selectedShopNos.join(", ") || "-"}`
                : `선택된 board_no: ${selectedBoardNos.join(", ") || "-"}`}
          </div>
          <div className="flex items-center gap-2">
            {step !== "mall" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setStep(step === "board" ? "shop" : "mall")}
              >
                이전
              </Button>
            ) : null}
            {step === "shop" ? (
              <Button
                type="button"
                size="sm"
                disabled={!selectedShopNos.length || saving}
                className="rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={() => setStep("board")}
              >
                다음
              </Button>
            ) : null}
            {step === "board" ? (
              <Button
                type="button"
                size="sm"
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500"
                onClick={() => {
                  void handleSave();
                }}
              >
                {saving ? (
                  <>
                    <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    저장
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
