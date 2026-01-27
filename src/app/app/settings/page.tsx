"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useHelpPanelEnabled } from "@/hooks/useHelpPanel";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { MultiSelectPopover, SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { ExternalLink, Eye, EyeOff } from "lucide-react";

type TabKey = "profile" | "workspaces" | "team" | "audit" | "env";
type ProviderKey = "cafe24" | "shopify";

type Cafe24ProviderDraft = {
  mall_id: string;
  mall_domain: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
  shop_no: string;
  board_no: string;
};

type ShopifyProviderDraft = {
  shop_domain: string;
  client_id: string;
  client_secret: string;
  access_token: string;
  scopes: string;
};

const auditSeed = [
  { t: "2026-01-21 10:30", who: "operator@mejai.help", what: "세션 s_9d3f2b 조회" },
  { t: "2026-01-20 18:50", who: "jane@mejai.help", what: "리뷰 rq_01 할당" },
  { t: "2026-01-18 09:02", who: "owner@mejai.help", what: "KB '환불 정책' v3 배포" },
];

const teamSeed = [
  { role: "오너", perms: "모든 권한" },
  { role: "운영자", perms: "통화, KB, 리뷰" },
  { role: "감사자", perms: "읽기 전용, 감사" },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = (searchParams.get("tab") || "profile").toLowerCase();
  const tab: TabKey = (rawTab === "general" ? "profile" : rawTab) as TabKey;

  const [email, setEmail] = useState("operator@mejai.help");
  const givenName = "성지용";
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminReady, setAdminReady] = useState(false);
  const [envLoading, setEnvLoading] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [envSavedAt, setEnvSavedAt] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string>("");
  const [activeProvider, setActiveProvider] = useState<ProviderKey>("cafe24");
  const [revealedField, setRevealedField] = useState<string | null>(null);
  const envReadOnly = false;
  const editableCafe24Keys = new Set(["mall_id", "mall_domain", "shop_no", "board_no"]);
  const [shopOptions, setShopOptions] = useState<SelectOption[]>([]);
  const [shopError, setShopError] = useState<string | null>(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopPickerOpen, setShopPickerOpen] = useState(false);
  const [cafe24TokenMallId, setCafe24TokenMallId] = useState<string>("");
  const [cafe24Flow, setCafe24Flow] = useState<"idle" | "oauth" | "token" | "shops" | "done">("idle");
  const [cafe24Step, setCafe24Step] = useState<"mall" | "scope" | "shop" | "board">("mall");
  const [cafe24CallbackUrl, setCafe24CallbackUrl] = useState<string>("");
  const [cafe24SaveNotice, setCafe24SaveNotice] = useState<string>("");
  const [cafe24ScopeTouched, setCafe24ScopeTouched] = useState(false);
  const oauthPollRef = useRef<number | null>(null);
  const lastOauthKeyRef = useRef<string>("");
  const lastMallIdRef = useRef<string>("");
  const [cafe24Draft, setCafe24Draft] = useState<Cafe24ProviderDraft>({
    mall_id: "",
    mall_domain: "",
    access_token: "",
    refresh_token: "",
    expires_at: "",
    scope: "",
    shop_no: "",
    board_no: "",
  });
  const [shopifyDraft, setShopifyDraft] = useState<ShopifyProviderDraft>({
    shop_domain: "",
    client_id: "",
    client_secret: "",
    access_token: "",
    scopes: "",
  });

  const { enabled: helpPanelEnabled, setEnabled: setHelpPanelEnabled } = useHelpPanelEnabled();

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return;
      if (data.user?.email) setEmail(data.user.email);
      if (!data.user) {
        setAdminReady(true);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
        setAuthToken(sessionData.session.access_token);
      }
      const { data: access } = await supabase
        .from("user_access")
        .select("is_admin")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!mounted) return;
      setIsAdmin(Boolean(access?.is_admin));
      setAdminReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email || "operator@mejai.help");
      setAuthToken(session?.access_token || "");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const tabs = useMemo(() => {
    const base = [
      { key: "profile", label: "프로필" },
      { key: "workspaces", label: "워크스페이스" },
      { key: "team", label: "팀/권한" },
      { key: "audit", label: "감사로그" },
    ];
    if (isAdmin) {
      base.push({ key: "env", label: "환경 변수" });
    }
    return base;
  }, [isAdmin]);

  const providerOptions = useMemo<SelectOption[]>(
    () => [
      { id: "cafe24", label: "Cafe24" },
      { id: "shopify", label: "Shopify" },
    ],
    []
  );

  const cafe24ScopeOptions = useMemo<SelectOption[]>(
    () =>
      [
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
      ].map((item) => ({ id: item, label: item })),
    []
  );

  const boardNoOptions = useMemo<SelectOption[]>(
    () => [
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
    ],
    []
  );

  const shopifyScopeOptions = useMemo<SelectOption[]>(
    () =>
      [
        "read_orders",
        "write_orders",
        "read_customers",
        "write_customers",
        "read_products",
        "write_products",
        "read_inventory",
        "write_inventory",
        "read_fulfillments",
        "write_fulfillments",
        "read_locations",
        "read_shipping",
        "write_shipping",
        "read_content",
        "write_content",
      ].map((item) => ({ id: item, label: item })),
    []
  );

  const parseCsv = (value: string) =>
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const parseScopes = (value: string) =>
    value
      .split(/\s+/)
      .map((v) => v.trim())
      .filter(Boolean);

  const sortStrings = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  const sortNumbers = (values: string[]) =>
    [...new Set(values)]
      .map((v) => v.trim())
      .filter(Boolean)
      .sort((a, b) => Number(a) - Number(b));

  const cafe24AllowedScopes = useMemo(
    () => new Set(cafe24ScopeOptions.map((option) => option.id)),
    [cafe24ScopeOptions]
  );
  const filterCafe24Scopes = useCallback(
    (values: string[]) => values.filter((value) => cafe24AllowedScopes.has(value)),
    [cafe24AllowedScopes]
  );
  const cafe24ScopeValues = useMemo(
    () => sortStrings(filterCafe24Scopes(parseScopes(cafe24Draft.scope))),
    [cafe24Draft.scope, filterCafe24Scopes]
  );
  const cafe24BoardNoValues = useMemo(
    () => sortNumbers(parseCsv(cafe24Draft.board_no)),
    [cafe24Draft.board_no]
  );

  const shopifyScopeValues = useMemo(() => parseScopes(shopifyDraft.scopes), [shopifyDraft.scopes]);

  const revealFor = (field: string) => {
    setRevealedField(field);
    window.setTimeout(() => {
      setRevealedField((current) => (current === field ? null : current));
    }, 5000);
  };

  const shopDomainByNo = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of shopOptions) {
      if (opt.description) {
        map.set(opt.id, opt.description);
      }
    }
    return map;
  }, [shopOptions]);

  const buildMallDomainFromShopNo = (values: string[]) =>
    values
      .map((shopNo) => shopDomainByNo.get(shopNo))
      .filter(Boolean)
      .join(", ");

  const allCafe24Scopes = useMemo(() => cafe24ScopeOptions.map((opt) => opt.id), [cafe24ScopeOptions]);

  const openDomain = (domain?: string) => {
    if (!domain) return;
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const cafe24StatusText = useMemo(() => {
    switch (cafe24Flow) {
      case "oauth":
        return "OAuth 인증 진행 중입니다.";
      case "token":
        return "토큰을 확인하는 중입니다.";
      case "shops":
        return "shop_no 목록을 불러오는 중입니다.";
      case "done":
        return "인증이 완료되었습니다.";
      default:
        return "";
    }
  }, [cafe24Flow]);


  const loadShops = useCallback(async () => {
    if (!adminReady || !isAdmin || tab !== "env") return false;
    if (activeProvider !== "cafe24") return false;
    if (!cafe24Draft.mall_id || !cafe24Draft.access_token || !authToken) return false;
    setShopLoading(true);
    setShopError(null);
    try {
      const res = await fetch("/api/cafe24/shops", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const payload = (await res.json()) as {
        shops?: Array<{
          shop_no: number;
          shop_name: string;
          primary_domain?: string | null;
          base_domain?: string | null;
        }>;
        error?: string;
      };
      if (!res.ok || payload.error) {
        setShopError(payload.error || "shop_no 목록을 불러오지 못했습니다.");
        setShopOptions([]);
        setShopLoading(false);
        return false;
      }
      const options =
        payload.shops?.map((shop) => ({
          id: String(shop.shop_no),
          label: String(shop.shop_no),
          description: shop.primary_domain || shop.base_domain || shop.shop_name || "",
        })) || [];
      setShopOptions(options);
      return true;
    } catch {
      setShopError("shop_no 목록을 불러오지 못했습니다.");
      setShopOptions([]);
      return false;
    } finally {
      setShopLoading(false);
    }
  }, [
    adminReady,
    isAdmin,
    tab,
    authToken,
    activeProvider,
    cafe24Draft.mall_id,
    cafe24Draft.access_token,
  ]);

  const reloadCafe24Provider = useCallback(async (overrideMallId?: string) => {
    if (!authToken) return false;
    try {
      const res = await fetch(`/api/auth-settings/providers?provider=cafe24`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const payload = (await res.json()) as { provider?: Record<string, unknown>; error?: string };
      if (!res.ok || payload.error || !payload.provider) {
        setShopError(payload.error || "OAuth 결과를 불러오지 못했습니다.");
        return null;
      }
      setCafe24Flow("token");
      const next = payload.provider as Partial<Cafe24ProviderDraft>;
      const forcedMallId = overrideMallId || lastMallIdRef.current;
      if (forcedMallId) next.mall_id = forcedMallId;
      if (next.mall_id) setCafe24TokenMallId(next.mall_id);
      setCafe24Draft((prev) => ({ ...prev, ...next }));
      return next;
    } catch {
      setShopError("OAuth 결과를 불러오지 못했습니다.");
      return null;
    }
  }, [authToken]);

  const startCafe24OAuth = useCallback(async () => {
    if (!authToken) {
      setShopError("로그인 세션이 없습니다. 다시 로그인해주세요.");
      return;
    }
    if (!cafe24Draft.mall_id || !cafe24Draft.scope) {
      setShopError("mall_id와 scope를 입력한 뒤 OAuth 연결을 진행해주세요.");
      return;
    }
    setCafe24Flow("oauth");
    try {
      const res = await fetch(
        `/api/cafe24/authorize?mode=json&mall_id=${encodeURIComponent(
          cafe24Draft.mall_id
        )}&scope=${encodeURIComponent(cafe24Draft.scope)}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: "application/json",
          },
        }
      );
      const payload = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !payload.url) {
        setShopError(payload.error || "OAuth 연결을 시작할 수 없습니다.");
        return;
      }
      const popup = window.open(payload.url, "cafe24_oauth", "width=520,height=720");
      if (!popup) {
        setCafe24Flow("idle");
        setShopError("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요.");
      }
    } catch {
      setShopError("OAuth 연결을 시작할 수 없습니다.");
    }
  }, [authToken, cafe24Draft.mall_id, cafe24Draft.scope]);

  const handleMallNext = useCallback(() => {
    if (!cafe24Draft.mall_id) {
      setShopError("mall_id를 입력해주세요.");
      return;
    }
    const trimmed = cafe24Draft.mall_id.trim();
    lastMallIdRef.current = trimmed;
    if (trimmed !== cafe24Draft.mall_id) {
      setCafe24Draft((prev) => ({ ...prev, mall_id: trimmed }));
    }
    setCafe24CallbackUrl("");
    setCafe24Step("scope");
  }, [cafe24Draft.mall_id]);

  const handleScopeNext = useCallback(async () => {
    if (!cafe24Draft.scope) {
      setShopError("scope를 선택해주세요.");
      return;
    }
    setCafe24CallbackUrl("");
    setCafe24Flow("oauth");
    await startCafe24OAuth();
    if (oauthPollRef.current) {
      window.clearInterval(oauthPollRef.current);
    }
    const startedAt = Date.now();
    oauthPollRef.current = window.setInterval(async () => {
      if (Date.now() - startedAt > 60_000) {
        if (oauthPollRef.current) window.clearInterval(oauthPollRef.current);
        oauthPollRef.current = null;
        return;
      }
      const pollMallId = lastMallIdRef.current || cafe24Draft.mall_id;
      const next = await reloadCafe24Provider(pollMallId);
      if (!next) return;
      const tokenMallId = next.mall_id || pollMallId;
      if (!tokenMallId || tokenMallId !== pollMallId) return;
      if (!next.access_token || !next.refresh_token) return;
      if (oauthPollRef.current) window.clearInterval(oauthPollRef.current);
      oauthPollRef.current = null;
      setCafe24Flow("shops");
      const loaded = await loadShops();
      if (loaded) {
        setShopPickerOpen(true);
        setCafe24Step("shop");
      }
      setCafe24Flow(loaded ? "done" : "idle");
    }, 1200);
  }, [cafe24Draft.scope, startCafe24OAuth, reloadCafe24Provider, loadShops, cafe24Draft.mall_id]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        type?: string;
        error?: string;
        trace_id?: string;
        callback_url?: string;
        mall_id?: string;
      };
      if (data?.type === "cafe24_oauth_error") {
        setShopError(`OAuth 오류: ${data.error || "unknown"}`);
        setCafe24Flow("idle");
        if (data.callback_url) setCafe24CallbackUrl(data.callback_url);
        return;
      }
      if (data?.type !== "cafe24_oauth_complete") return;
      if (data.callback_url) setCafe24CallbackUrl(data.callback_url);
      const messageMallId = data.mall_id || lastMallIdRef.current;
      reloadCafe24Provider(messageMallId).then((next) => {
        if (!next) return;
        window.setTimeout(async () => {
          setCafe24Flow("shops");
          const loaded = await loadShops();
          if (loaded) {
            setShopPickerOpen(true);
            setCafe24Step("shop");
          }
          setCafe24Flow(loaded ? "done" : "idle");
        }, 0);
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [reloadCafe24Provider, loadShops]);

  useEffect(() => {
    return () => {
      if (oauthPollRef.current) window.clearInterval(oauthPollRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeProvider !== "cafe24") return;
    const values = sortNumbers(parseCsv(cafe24Draft.shop_no));
    if (values.length === 0) return;
    const nextDomain = buildMallDomainFromShopNo(values);
    if (nextDomain && nextDomain !== cafe24Draft.mall_domain) {
      setCafe24Draft((prev) => ({ ...prev, mall_domain: nextDomain }));
    }
  }, [activeProvider, cafe24Draft.shop_no, shopDomainByNo]);

  const buildCompanyInfoUrl = (fragment: string) =>
    `https://${cafe24Draft.mall_id || "{mall_id}"}.cafe24.com/admin/php/shop1/m/company_info_f.php#:~:text=${fragment}`;

  useEffect(() => {
    if (!adminReady || !isAdmin || tab !== "env" || !authToken) return;
    let active = true;
    const load = async () => {
      setEnvLoading(true);
      setEnvError(null);
      try {
        const res = await fetch(`/api/auth-settings/providers?provider=${activeProvider}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const payload = (await res.json()) as { provider?: Record<string, unknown>; error?: string };
        if (!active) return;
        if (!res.ok || payload.error) {
          setEnvError(payload.error || "환경 변수 정보를 불러오지 못했습니다.");
        } else if (payload.provider) {
          if (activeProvider === "cafe24") {
            const next = payload.provider as Partial<Cafe24ProviderDraft>;
            if (next.mall_id) setCafe24TokenMallId(next.mall_id);
            setCafe24Draft((prev) => ({ ...prev, ...next }));
          } else {
            setShopifyDraft((prev) => ({ ...prev, ...(payload.provider as Partial<ShopifyProviderDraft>) }));
          }
        }
      } catch {
        if (active) setEnvError("환경 변수 정보를 불러오지 못했습니다.");
      } finally {
        if (active) setEnvLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [adminReady, isAdmin, tab, authToken, activeProvider]);

  useEffect(() => {
    if (activeProvider !== "cafe24") return;
    if (cafe24Draft.scope || cafe24ScopeTouched) return;
    setCafe24Draft((prev) => ({ ...prev, scope: allCafe24Scopes.join(" ") }));
  }, [activeProvider, cafe24Draft.scope, allCafe24Scopes, cafe24ScopeTouched]);

  useEffect(() => {
    if (activeProvider !== "cafe24") return;
    if (!cafe24Draft.mall_id || !cafe24Draft.scope) return;
    if (cafe24Draft.access_token && cafe24TokenMallId === cafe24Draft.mall_id) {
      return;
    }
    const key = `${cafe24Draft.mall_id}|${cafe24Draft.scope}`;
    if (lastOauthKeyRef.current === key || cafe24Flow === "oauth") return;
    lastOauthKeyRef.current = key;
  }, [
    activeProvider,
    cafe24Draft.mall_id,
    cafe24Draft.scope,
    cafe24Draft.access_token,
    cafe24TokenMallId,
    cafe24Flow,
  ]);

  useEffect(() => {
    if (!cafe24Draft.mall_id) return;
    if (!cafe24TokenMallId) return;
    if (cafe24Draft.mall_id === cafe24TokenMallId) return;
    setCafe24Draft((prev) => ({
      ...prev,
      access_token: "",
      refresh_token: "",
      expires_at: "",
      shop_no: "",
    }));
    setShopOptions([]);
    setShopPickerOpen(false);
    setCafe24Flow("idle");
    setCafe24Step("mall");
    setCafe24CallbackUrl("");
  }, [cafe24Draft.mall_id, cafe24TokenMallId]);

  const handleProviderSave = async () => {
    setEnvLoading(true);
    setEnvError(null);
    try {
      const forcedMallId = lastMallIdRef.current;
      const cafe24Values = forcedMallId ? { ...cafe24Draft, mall_id: forcedMallId } : cafe24Draft;
      const values =
        activeProvider === "cafe24"
          ? {
              ...cafe24Values,
              scope: sortStrings(filterCafe24Scopes(parseScopes(cafe24Values.scope))).join(" "),
            }
          : shopifyDraft;
      const res = await fetch("/api/auth-settings/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ provider: activeProvider, values }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok || payload.error) {
        setEnvError(payload.error || "저장에 실패했습니다.");
        return;
      }
      setEnvSavedAt(new Date().toISOString());
    } catch {
      setEnvError("저장에 실패했습니다.");
    } finally {
      setEnvLoading(false);
    }
  };

  const handleShopSave = useCallback(async () => {
    if (!cafe24Draft.shop_no) {
      setShopError("shop_no를 선택해주세요.");
      return;
    }
    setCafe24Step("board");
  }, [cafe24Draft.shop_no]);

  const handleBoardSave = useCallback(async () => {
    if (!cafe24Draft.board_no) {
      setShopError("board_no를 선택해주세요.");
      return;
    }
    await handleProviderSave();
    setCafe24SaveNotice("저장이 완료되었습니다.");
  }, [cafe24Draft.board_no]);

  const handleStepPrev = useCallback(() => {
    if (cafe24Step === "board") {
      setCafe24Step("shop");
      return;
    }
    if (cafe24Step === "shop") {
      setCafe24Step("scope");
      return;
    }
    if (cafe24Step === "scope") {
      setCafe24Step("mall");
    }
  }, [cafe24Step]);

  return (
    <div className="px-5 md:px-8 pt-6 pb-[100px]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="border-b border-slate-200 pb-2">
          <nav className="flex gap-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => router.push(`/app/settings?tab=${t.key}`)}
                className={cn(
                  "whitespace-nowrap rounded-xl border px-3 py-2 text-sm",
                  tab === t.key
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-transparent bg-transparent text-slate-600 hover:bg-slate-50"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {tab === "workspaces" ? (
            <Card>
              <div className="divide-y divide-slate-200">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">워크스페이스</div>
                    <div className="mt-1 text-sm text-slate-600">성지용 워크스페이스</div>
                    <div className="mt-1 text-xs text-slate-500">경로: /workspaces/01</div>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    관리
                  </button>
                </div>
              </div>
            </Card>
          ) : tab === "team" ? (
            <Card>
              <div className="p-4">
                <div className="text-sm font-semibold text-slate-900">팀/권한</div>
                <div className="mt-2 grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                  {teamSeed.map((r) => (
                    <div key={r.role} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="font-semibold text-slate-900">{r.role}</div>
                      <div className="mt-1 text-slate-600">{r.perms}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : tab === "audit" ? (
            <div className="space-y-3">
              {auditSeed.map((e, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-900">{e.what}</div>
                    <div className="text-slate-500">{e.t}</div>
                  </div>
                  <div className="mt-1 text-slate-600">{e.who}</div>
                </Card>
              ))}
            </div>
          ) : tab === "env" && isAdmin ? (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="text-sm font-semibold text-slate-900">환경 변수 관리 안내</div>
                <div className="mt-2 text-sm text-slate-600">
                  영구 변수는 배포 환경(Railway 등)의 서버 환경 변수로 관리됩니다. 가변 변수는
                  사용자별/조직별 설정값으로 DB(auth_settings.providers)에 저장됩니다.
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-sm font-semibold text-slate-900">서버 환경 변수</div>
                <div className="mt-3 grid gap-3 text-sm text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="font-semibold">NEXT_PUBLIC_SUPABASE_URL</div>
                    <div className="text-xs text-slate-500">Supabase 프로젝트 URL (필수)</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
                    <div className="text-xs text-slate-500">Supabase 공개 키 (필수)</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="font-semibold">SUPABASE_SERVICE_ROLE_KEY</div>
                    <div className="text-xs text-slate-500">서버 전용 키 (필수, Cron 갱신용)</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="font-semibold">CRON_SECRET</div>
                    <div className="text-xs text-slate-500">/api/cafe24/refresh 보호용 시크릿</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="font-semibold">CAFE24_REDIRECT_URI</div>
                    <div className="text-xs text-slate-500">Cafe24 OAuth 콜백 URL</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="font-semibold">CAFE24_CLIENT_ID</div>
                    <div className="text-xs text-slate-500">Cafe24 앱 Client ID (공통, 노출 금지)</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="font-semibold">CAFE24_CLIENT_SECRET</div>
                    <div className="text-xs text-slate-500">Cafe24 앱 Client Secret (공통, 노출 금지)</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">환경 변수</div>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-32 min-w-0">
                      <SelectPopover
                        value={activeProvider}
                        onChange={(next) => setActiveProvider(next as ProviderKey)}
                        options={providerOptions}
                        className="min-w-0"
                        buttonClassName="w-full min-w-0"
                      />
                    </div>
                  </div>
                </div>

                {envError ? <div className="mt-3 text-sm text-rose-600">{envError}</div> : null}
                {envSavedAt ? (
                  <div className="mt-2 text-xs text-slate-500">저장됨: {envSavedAt}</div>
                ) : null}

                {activeProvider === "cafe24" ? (
                  <div className="mt-4 space-y-4 min-w-0">
                    {cafe24Step === "mall" ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-900">1. mall_id 입력</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          좌측 메뉴 맨 아래의 [⚙️쇼핑몰 설정] → [기본 설정] → [내 쇼핑몰 정보] → [기본정보 설정] → [상점 아이디]에서 확인해주세요.
                        </div>
                        <label className="mt-3 flex w-full min-w-0 flex-col items-start gap-1 text-xs font-medium text-slate-600">
                          <input
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-left text-sm truncate"
                            value={cafe24Draft.mall_id}
                            onChange={(event) =>
                              setCafe24Draft((prev) => ({ ...prev, mall_id: event.target.value }))
                            }
                            disabled={envReadOnly && !editableCafe24Keys.has("mall_id")}
                          />
                        </label>
                      </div>
                    ) : cafe24Step === "scope" ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-900">2. scope 선택</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          필요한 권한을 선택한 뒤 인증을 진행합니다.
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCafe24Draft((prev) => ({ ...prev, scope: allCafe24Scopes.join(" ") }))
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                          >
                            전체 선택
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCafe24ScopeTouched(true);
                              setCafe24Draft((prev) => ({ ...prev, scope: "" }));
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                          >
                            전체 해제
                          </button>
                        </div>
                        <label className="mt-3 flex w-full min-w-0 flex-col items-start gap-1 text-xs font-medium text-slate-600">
                          <div className="w-full rounded-xl border border-slate-200 bg-white p-2">
                            <div className="max-h-56 overflow-auto text-xs">
                              <div className="sticky top-0 z-10 grid grid-cols-[1fr_72px] items-center gap-2 bg-white px-2 py-1 text-[10px] leading-none text-slate-400">
                                <span>scope</span>
                                <span>상태</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                {cafe24ScopeOptions.map((opt) => {
                                  const active = cafe24ScopeValues.includes(opt.id);
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => {
                                        setCafe24ScopeTouched(true);
                                        const next = active
                                          ? cafe24ScopeValues.filter((v) => v !== opt.id)
                                          : [...cafe24ScopeValues, opt.id];
                                        setCafe24Draft((prev) => ({
                                          ...prev,
                                          scope: sortStrings(filterCafe24Scopes(next)).join(" "),
                                        }));
                                      }}
                                      className={cn(
                                        "grid w-full grid-cols-[1fr_72px] items-center gap-2 rounded-lg px-2 py-1 text-left leading-none",
                                        active
                                          ? "bg-slate-100 text-slate-900"
                                          : "text-slate-600 hover:bg-slate-50"
                                      )}
                                    >
                                      <span className="truncate">{opt.label}</span>
                                      <span
                                        className={cn(
                                          "text-[10px]",
                                          active ? "text-emerald-600" : "text-slate-400"
                                        )}
                                      >
                                        {active ? "선택됨" : "해제됨"}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </label>
                        {cafe24StatusText ? (
                          <div className="mt-2 text-[11px] text-slate-500">{cafe24StatusText}</div>
                        ) : null}
                      </div>
                    ) : cafe24Step === "shop" ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-900">3. shop_no 선택</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          mall_id로 선택 가능한 shop_no를 선택합니다.
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const all = shopOptions.map((opt) => opt.id);
                              const ordered = sortNumbers(all);
                              const domain = buildMallDomainFromShopNo(ordered);
                              setCafe24Draft((prev) => ({
                                ...prev,
                                shop_no: ordered.join(","),
                                mall_domain: domain || prev.mall_domain,
                              }));
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                          >
                            전체 선택
                          </button>
                          <button
                            type="button"
                            onClick={() => setCafe24Draft((prev) => ({ ...prev, shop_no: "" }))}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                          >
                            전체 해제
                          </button>
                        </div>
                        <label className="mt-3 flex w-full min-w-0 flex-col items-start gap-1 text-xs font-medium text-slate-600">
                          <div className="w-full rounded-xl border border-slate-200 bg-white p-2">
                            <div className="max-h-56 overflow-auto text-xs">
                              <div className="sticky top-0 z-10 grid grid-cols-[80px_1fr_60px] items-center gap-2 bg-white px-2 py-1 text-[10px] leading-none text-slate-400">
                                <span>shop_no</span>
                                <span>domain</span>
                                <span>상태</span>
                              </div>
                              {shopLoading ? (
                                <div className="px-2 py-1 text-xs text-slate-500">shop_no 불러오는 중...</div>
                              ) : (
                                <div className="grid grid-cols-1 gap-1">
                                  {shopOptions.map((opt) => {
                                    const current = sortNumbers(parseCsv(cafe24Draft.shop_no));
                                    const active = current.includes(opt.id);
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                          const next = active
                                            ? current.filter((v) => v !== opt.id)
                                            : [...current, opt.id];
                                          const ordered = sortNumbers(next);
                                          const domain = buildMallDomainFromShopNo(ordered);
                                          setCafe24Draft((prev) => ({
                                            ...prev,
                                            shop_no: ordered.join(","),
                                            mall_domain: domain || prev.mall_domain,
                                          }));
                                        }}
                                        className={cn(
                                          "grid w-full grid-cols-[80px_1fr_60px] items-center gap-2 rounded-lg px-2 py-1 text-left leading-none",
                                          active
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-600 hover:bg-slate-50"
                                        )}
                                      >
                                        <span className="truncate">{opt.label}</span>
                                        <span className="truncate text-[11px] text-slate-500">{opt.description || ""}</span>
                                        <span
                                          className={cn(
                                            "text-[10px]",
                                            active ? "text-emerald-600" : "text-slate-400"
                                          )}
                                        >
                                          {active ? "선택됨" : "해제됨"}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    ) : cafe24Step === "board" ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-900">4. board_no 선택</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          사용할 게시판 번호를 선택합니다.
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCafe24Draft((prev) => ({
                                ...prev,
                                board_no: boardNoOptions.map((opt) => opt.id).join(","),
                              }))
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                          >
                            전체 선택
                          </button>
                          <button
                            type="button"
                            onClick={() => setCafe24Draft((prev) => ({ ...prev, board_no: "" }))}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                          >
                            전체 해제
                          </button>
                        </div>
                        <label className="mt-3 flex w-full min-w-0 flex-col items-start gap-1 text-xs font-medium text-slate-600">
                          <div className="w-full rounded-xl border border-slate-200 bg-white p-2">
                            <div className="max-h-56 overflow-auto text-xs">
                              <div className="sticky top-0 z-10 grid grid-cols-[80px_1fr_72px] items-center gap-2 bg-white px-2 py-1 text-[10px] leading-none text-slate-400">
                                <span>board_no</span>
                                <span>이름</span>
                                <span>상태</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                {boardNoOptions.map((opt) => {
                                  const current = sortNumbers(parseCsv(cafe24Draft.board_no));
                                  const active = current.includes(opt.id);
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => {
                                        const next = active
                                          ? current.filter((v) => v !== opt.id)
                                          : [...current, opt.id];
                                        setCafe24Draft((prev) => ({
                                          ...prev,
                                          board_no: sortNumbers(next).join(","),
                                        }));
                                      }}
                                      className={cn(
                                        "grid w-full grid-cols-[80px_1fr_72px] items-center gap-2 rounded-lg px-2 py-1 text-left leading-none",
                                        active
                                          ? "bg-slate-100 text-slate-900"
                                          : "text-slate-600 hover:bg-slate-50"
                                      )}
                                    >
                                      <span className="truncate">{opt.id}</span>
                                      <span className="truncate text-[11px] text-slate-500">
                                        {opt.description || opt.label}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-[10px]",
                                          active ? "text-emerald-600" : "text-slate-400"
                                        )}
                                      >
                                        {active ? "선택됨" : "해제됨"}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </label>
                      </div>
                    ) : null}
                    {cafe24CallbackUrl ? (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <iframe
                          title="Cafe24 OAuth 결과"
                          src={cafe24CallbackUrl}
                          className="h-[240px] w-full border-0"
                        />
                      </div>
                    ) : null}
                    {cafe24Step === "scope" ? (
                      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full bg-emerald-400 transition-all duration-500",
                            cafe24Flow === "idle" ? "w-0" : cafe24Flow === "done" ? "w-full" : "w-2/3"
                          )}
                        />
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                      {cafe24Step !== "mall" ? (
                        <button
                          type="button"
                          onClick={handleStepPrev}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          이전
                        </button>
                      ) : null}
                      <div className="flex flex-1 items-center gap-2">
                        {cafe24Step === "mall" ? (
                          <button
                            type="button"
                            onClick={handleMallNext}
                            className="w-full rounded-lg border border-slate-300 bg-slate-600 px-3 py-2 text-xs text-white hover:bg-slate-700"
                          >
                            다음
                          </button>
                        ) : null}
                        {cafe24Step === "scope" ? (
                          <button
                            type="button"
                            onClick={handleScopeNext}
                            className="w-full rounded-lg border border-slate-300 bg-slate-600 px-3 py-2 text-xs text-white hover:bg-slate-700"
                          >
                            다음
                          </button>
                        ) : null}
                        {cafe24Step === "shop" ? (
                          <button
                            type="button"
                            onClick={handleShopSave}
                            className="w-full rounded-lg border border-slate-300 bg-slate-600 px-3 py-2 text-xs text-white hover:bg-slate-700"
                          >
                            다음
                          </button>
                        ) : null}
                        {cafe24Step === "board" ? (
                          <button
                            type="button"
                            onClick={handleBoardSave}
                            className="w-full rounded-lg border border-slate-300 bg-slate-600 px-3 py-2 text-xs text-white hover:bg-slate-700"
                          >
                            저장
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {cafe24Step === "board" && cafe24SaveNotice ? (
                      <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-700">
                        {cafe24SaveNotice}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    준비중입니다.
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <Card>
              <div className="divide-y divide-slate-200">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">이메일 주소</p>
                    <p className="text-sm text-slate-600">{email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">이름</p>
                    <p className="text-sm text-slate-600">{givenName}</p>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    이름 변경
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">현재 플랜</p>
                    <p className="text-sm text-slate-600">무료</p>
                  </div>
                  <Link
                    href="/app/billing"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    구독 관리
                  </Link>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">도움 패널</p>
                    <p className="text-sm text-slate-600">
                      서비스 사용 순서와 후속 지원 요청 대상 바로가기를 표시합니다.
                    </p>
                  </div>
                  <button
                    onClick={() => setHelpPanelEnabled((v) => !v)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm",
                      helpPanelEnabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    {helpPanelEnabled ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">모든 기기에서 로그아웃</p>
                    <p className="text-sm text-slate-600">모든 기기 및 세션에서 로그아웃합니다.</p>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    로그아웃
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-rose-600">계정 삭제</p>
                    <p className="text-sm text-slate-600">계정 삭제는 되돌릴 수 없습니다.</p>
                  </div>
                  <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 hover:bg-rose-100">
                    계정 삭제
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
