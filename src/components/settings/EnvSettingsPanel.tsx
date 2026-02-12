"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

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

export function EnvSettingsPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminReady, setAdminReady] = useState(false);
  const [, setEnvLoading] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [envSavedAt, setEnvSavedAt] = useState<string | null>(null);
  const [envSaveNotice, setEnvSaveNotice] = useState<string>("");
  const [envEditorOpen, setEnvEditorOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string>("");
  const [activeProvider, setActiveProvider] = useState<ProviderKey>("cafe24");
  const envReadOnly = !isAdmin;
  const editableCafe24Keys = new Set(["mall_id", "mall_domain", "shop_no", "board_no"]);
  const [shopOptions, setShopOptions] = useState<SelectOption[]>([]);
  const [, setShopError] = useState<string | null>(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [, setShopPickerOpen] = useState(false);
  const [cafe24TokenMallId, setCafe24TokenMallId] = useState<string>("");
  const [cafe24Stored, setCafe24Stored] = useState<Partial<Cafe24ProviderDraft> | null>(null);
  const [shopifyStored, setShopifyStored] = useState<Partial<ShopifyProviderDraft> | null>(null);
  const [cafe24Flow, setCafe24Flow] = useState<"idle" | "oauth" | "token" | "shops" | "done">("idle");
  const [cafe24Step, setCafe24Step] = useState<"mall" | "shop" | "board">("mall");
  const [, setCafe24CallbackUrl] = useState<string>("");
  const [cafe24SaveNotice, setCafe24SaveNotice] = useState<string>("");
  const [cafe24ScopeBusy, setCafe24ScopeBusy] = useState(false);
  const [cafe24MallBusy, setCafe24MallBusy] = useState(false);
  const [cafe24MallStatus, setCafe24MallStatus] = useState<string>("");
  const [cafe24AdvanceNotice, setCafe24AdvanceNotice] = useState(false);
  const [cafe24MallFailed, setCafe24MallFailed] = useState(false);
  const oauthPollRef = useRef<number | null>(null);
  const oauthTimeoutRef = useRef<number | null>(null);
  const advanceTimeoutRef = useRef<number | null>(null);
  const envSaveTimeoutRef = useRef<number | null>(null);
  const oauthRetryRef = useRef<number>(0);
  const lastOauthKeyRef = useRef<string>("");
  const lastMallIdRef = useRef<string>("");
  const lastSavedMallIdRef = useRef<string>("");
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
  const [shopifyDraft] = useState<ShopifyProviderDraft>({
    shop_domain: "",
    client_id: "",
    client_secret: "",
    access_token: "",
    scopes: "",
  });

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return;
      if (!data.user) {
        setAdminReady(true);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
        setAuthToken(sessionData.session.access_token);
      }
      const { data: access } = await supabase
        .from("A_iam_user_access_maps")
        .select("is_admin")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!mounted) return;
      setIsAdmin(Boolean(access?.is_admin));
      setAdminReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthToken(session?.access_token || "");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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

  const parseCsv = useCallback(
    (value: string) =>
      value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    []
  );

  const sortNumbers = useCallback(
    (values: string[]) =>
      [...new Set(values)]
        .map((v) => v.trim())
        .filter(Boolean)
        .sort((a, b) => Number(a) - Number(b)),
    []
  );

  const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const listifyShopDomainPairs = useCallback(
    (stored?: Partial<Cafe24ProviderDraft> | null) => {
      if (!stored) return [] as Array<string | { main: string; meta: string }>;
      const shops = parseCsv(stored.shop_no || "");
      const domains = parseCsv(stored.mall_domain || "");
      if (shops.length === 0 && domains.length === 0) return [];
      if (shops.length === domains.length && shops.length > 0) {
        return shops.map((shop, idx) => ({ main: shop, meta: domains[idx] || "-" }));
      }
      const items: string[] = [];
      if (shops.length > 0) items.push(...shops.map((shop) => `${shop} (-)`));
      if (domains.length > 0) items.push(...domains.map((domain) => `- (${domain})`));
      return items;
    },
    [parseCsv]
  );

  const listifyBoardPairs = useCallback(
    (value: string) => {
      const ids = sortNumbers(parseCsv(value));
      if (ids.length === 0) return [] as Array<string | { main: string; meta: string }>;
      const map = new Map(boardNoOptions.map((opt) => [opt.id, opt.description]));
      return ids.map((id) => {
        const name = map.get(id);
        if (!name) return id;
        return { main: id, meta: name };
      });
    },
    [boardNoOptions, parseCsv, sortNumbers]
  );

  const maskValue = (value?: string) => {
    if (!value) return "";
    if (value.length <= 4) return "*".repeat(value.length);
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
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

  const buildMallDomainFromShopNo = useCallback(
    (values: string[]) =>
      values
        .map((shopNo) => shopDomainByNo.get(shopNo))
        .filter(Boolean)
        .join(", "),
    [shopDomainByNo]
  );

  const allCafe24Scopes = useMemo(() => cafe24ScopeOptions.map((opt) => opt.id), [cafe24ScopeOptions]);

  const loadShops = useCallback(
    async (override?: { mallId?: string; accessToken?: string }) => {
      if (!adminReady) return false;
      if (activeProvider !== "cafe24") return false;
      const mallId = override?.mallId || cafe24Draft.mall_id;
      const accessToken = override?.accessToken || cafe24Draft.access_token;
      if (!mallId || !accessToken || !authToken) return false;
      setShopLoading(true);
      setShopError(null);
      setShopOptions([]);
      try {
        const res = await fetch("/api/cafe24/shops", {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "x-cafe24-mall-id": mallId,
            "x-cafe24-access-token": accessToken,
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
        if (options.length === 0) {
          setShopOptions([]);
          return false;
        }
        setShopOptions(options);
        return true;
      } catch {
        setShopError("shop_no 목록을 불러오지 못했습니다.");
        setShopOptions([]);
        return false;
      } finally {
        setShopLoading(false);
      }
    },
    [
      adminReady,
      activeProvider,
      authToken,
      cafe24Draft.mall_id,
      cafe24Draft.access_token,
    ]
  );

  const loadShopsWithRetry = useCallback(
    async (attempts = 3, delayMs = 1500, override?: { mallId?: string; accessToken?: string }) => {
      for (let i = 0; i < attempts; i += 1) {
        const ok = await loadShops(override);
        if (ok) return true;
        if (i < attempts - 1) {
          await sleep(delayMs);
        }
      }
      return false;
    },
    [loadShops]
  );

  const startCafe24OAuth = useCallback(
    async (override?: { mallId?: string; scope?: string }) => {
      if (!authToken) {
        setShopError("로그인 세션이 없습니다. 다시 로그인해주세요.");
        return false;
      }
      if (!isAdmin) {
        setShopError("관리자 권한이 필요합니다.");
        return false;
      }
      const mallId = (override?.mallId || cafe24Draft.mall_id || "").trim();
      const scope = (override?.scope || cafe24Draft.scope || "").trim();
      if (!mallId || !scope) {
        setShopError("mall_id와 scope를 입력한 뒤 OAuth 연결을 진행해주세요.");
        return false;
      }
      setCafe24Flow("oauth");
      try {
        const res = await fetch(
          `/api/cafe24/authorize?mode=json&mall_id=${encodeURIComponent(mallId)}&scope=${encodeURIComponent(
            scope
          )}`,
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
          return false;
        }
        const popup = window.open(payload.url, "cafe24_oauth", "width=520,height=720");
        if (!popup) {
          setCafe24Flow("idle");
          setShopError("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요.");
          return false;
        }
        return true;
      } catch {
        setShopError("OAuth 연결을 시작할 수 없습니다.");
        return false;
      }
    },
    [authToken, cafe24Draft.mall_id, cafe24Draft.scope, isAdmin]
  );

  const handleMallNext = useCallback(() => {
    if (!isAdmin) {
      setShopError("관리자 권한이 필요합니다.");
      return;
    }
    if (!cafe24Draft.mall_id) {
      setShopError("mall_id를 입력해주세요.");
      return;
    }
    if (cafe24MallBusy) return;
    setCafe24MallBusy(true);
    setCafe24ScopeBusy(true);
    setCafe24MallFailed(false);
    setCafe24MallStatus("OAuth 연결을 시작합니다...");
    const trimmed = cafe24Draft.mall_id.trim();
    lastMallIdRef.current = trimmed;
    oauthRetryRef.current = 0;
    if (trimmed !== cafe24Draft.mall_id) {
      setCafe24Draft((prev) => ({ ...prev, mall_id: trimmed }));
    }
    const forcedScope =
      (process.env.NEXT_PUBLIC_CAFE24_SCOPE || "").trim() || allCafe24Scopes.join(" ");
    setCafe24Draft((prev) => ({ ...prev, scope: forcedScope }));
    setCafe24CallbackUrl("");
    if (oauthTimeoutRef.current) window.clearTimeout(oauthTimeoutRef.current);
    if (advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current);
    setCafe24AdvanceNotice(false);
    startCafe24OAuth({ mallId: trimmed, scope: forcedScope }).then((started) => {
      if (!started) {
        setCafe24MallStatus("OAuth 시작에 실패했습니다. 다시 시도해주세요.");
        setCafe24MallFailed(true);
        setCafe24MallBusy(false);
        setCafe24ScopeBusy(false);
        return;
      }
      setCafe24MallStatus("OAuth 응답을 기다리는 중...");
      oauthTimeoutRef.current = window.setTimeout(() => {
        const nextTry = oauthRetryRef.current + 1;
        if (nextTry <= 3) {
          oauthRetryRef.current = nextTry;
          setCafe24MallStatus(`OAuth 재시도 중... (${nextTry}/3)`);
          startCafe24OAuth({ mallId: trimmed, scope: forcedScope });
        } else {
          setCafe24MallStatus("OAuth 응답이 없습니다. 다시 시도해주세요.");
          setCafe24MallFailed(true);
          setCafe24MallBusy(false);
          setCafe24ScopeBusy(false);
        }
      }, 5_000);
    });
    if (oauthPollRef.current) window.clearInterval(oauthPollRef.current);
  }, [
    allCafe24Scopes,
    cafe24Draft.mall_id,
    cafe24MallBusy,
    isAdmin,
    startCafe24OAuth,
  ]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const allowedOrigins = new Set([window.location.origin, "https://mejai.help", "https://www.mejai.help"]);
      if (!allowedOrigins.has(event.origin)) return;
      const data = event.data as {
        type?: string;
        error?: string;
        trace_id?: string;
        callback_url?: string;
        mall_id?: string;
        scope?: string;
        access_token?: string;
        refresh_token?: string;
        expires_at?: string;
      };
      if (data?.type === "cafe24_oauth_error") {
        const message = data.error || "OAuth 오류가 발생했습니다.";
        const friendly =
          message.includes("Code time expired")
            ? "OAuth 시간이 만료되었습니다. 다시 로그인 후 시도해주세요."
            : message;
        setShopError(`OAuth 오류: ${message}`);
        toast.error(friendly);
        setCafe24Flow("idle");
        setCafe24MallStatus(`OAuth 오류: ${friendly}`);
        setCafe24MallFailed(true);
        setCafe24ScopeBusy(false);
        setCafe24MallBusy(false);
        setCafe24AdvanceNotice(false);
        if (advanceTimeoutRef.current) {
          window.clearTimeout(advanceTimeoutRef.current);
          advanceTimeoutRef.current = null;
        }
        if (oauthTimeoutRef.current) {
          window.clearTimeout(oauthTimeoutRef.current);
          oauthTimeoutRef.current = null;
        }
        const nextTry = oauthRetryRef.current + 1;
        if (nextTry <= 3) {
          oauthRetryRef.current = nextTry;
          const mallId = lastMallIdRef.current || cafe24Draft.mall_id;
          const scope = allCafe24Scopes.join(" ");
          setCafe24MallStatus(`OAuth 재시도 중... (${nextTry}/3)`);
          startCafe24OAuth({ mallId, scope });
        } else {
          setCafe24MallStatus(`OAuth 오류: ${friendly}`);
          setCafe24MallFailed(true);
        }
        if (data.callback_url) setCafe24CallbackUrl(data.callback_url);
        return;
      }
      if (data?.type !== "cafe24_oauth_complete") return;
      if (oauthTimeoutRef.current) {
        window.clearTimeout(oauthTimeoutRef.current);
        oauthTimeoutRef.current = null;
      }
      oauthRetryRef.current = 0;
      if (advanceTimeoutRef.current) {
        window.clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      if (data.callback_url) setCafe24CallbackUrl(data.callback_url);
      const messageMallId = data.mall_id || lastMallIdRef.current;
      const accessToken = data.access_token || "";
      const refreshToken = data.refresh_token || "";
      const expiresAt = data.expires_at || "";
      const scope = data.scope || allCafe24Scopes.join(" ");
      if (messageMallId) setCafe24TokenMallId(messageMallId);
      setCafe24Draft((prev) => ({
        ...prev,
        mall_id: messageMallId || prev.mall_id,
        scope,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      }));
      window.setTimeout(async () => {
        setCafe24Flow("shops");
        setCafe24MallStatus("shop_no 목록을 불러오는 중...");
        const loaded = await loadShopsWithRetry(3, 1500, {
          mallId: messageMallId,
          accessToken,
        });
        if (loaded) {
          setCafe24MallStatus("shop_no 목록 확인 완료. 잠시 후 다음 단계로 이동합니다.");
          setCafe24AdvanceNotice(true);
          if (data.callback_url) setCafe24CallbackUrl(data.callback_url);
          advanceTimeoutRef.current = window.setTimeout(() => {
            setCafe24Step("shop");
            setShopPickerOpen(true);
            setCafe24MallStatus("");
            setCafe24AdvanceNotice(false);
            setCafe24CallbackUrl("");
          }, 3_000);
        } else {
          setCafe24Step("mall");
          setCafe24MallStatus("shop_no 목록을 불러오지 못했습니다. 다시 시도해주세요.");
          setCafe24MallFailed(true);
          setCafe24AdvanceNotice(false);
        }
        setCafe24Flow(loaded ? "done" : "idle");
        setCafe24ScopeBusy(false);
        setCafe24MallBusy(false);
      }, 0);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [allCafe24Scopes, cafe24Draft.mall_id, loadShopsWithRetry, startCafe24OAuth]);

  useEffect(() => {
    const pollId = oauthPollRef.current;
    const oauthTimeoutId = oauthTimeoutRef.current;
    const advanceTimeoutId = advanceTimeoutRef.current;
    const envSaveTimeoutId = envSaveTimeoutRef.current;
    return () => {
      if (pollId) window.clearInterval(pollId);
      if (oauthTimeoutId) window.clearTimeout(oauthTimeoutId);
      if (advanceTimeoutId) window.clearTimeout(advanceTimeoutId);
      if (envSaveTimeoutId) window.clearTimeout(envSaveTimeoutId);
    };
  }, []);

  useEffect(() => {
    setEnvEditorOpen(false);
  }, [activeProvider]);

  useEffect(() => {
    if (activeProvider !== "cafe24") return;
    const values = sortNumbers(parseCsv(cafe24Draft.shop_no));
    if (values.length === 0) return;
    const nextDomain = buildMallDomainFromShopNo(values);
    if (nextDomain && nextDomain !== cafe24Draft.mall_domain) {
      setCafe24Draft((prev) => ({ ...prev, mall_domain: nextDomain }));
    }
  }, [activeProvider, cafe24Draft.shop_no, cafe24Draft.mall_domain, buildMallDomainFromShopNo, parseCsv, sortNumbers]);

  useEffect(() => {
    if (!adminReady || !authToken) return;
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
            if (next.mall_id) {
              setCafe24TokenMallId(next.mall_id);
              lastSavedMallIdRef.current = next.mall_id;
            }
            setCafe24Stored(next);
          } else {
            setShopifyStored(payload.provider as Partial<ShopifyProviderDraft>);
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
  }, [adminReady, authToken, activeProvider]);

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

  const handleProviderSave = useCallback(async () => {
    if (!authToken) {
      setEnvError("로그인 세션이 없습니다. 다시 로그인해주세요.");
      return;
    }
    if (!isAdmin) {
      setEnvError("관리자 권한이 필요합니다.");
      return;
    }
    setEnvLoading(true);
    setEnvError(null);
    try {
      const forcedMallId = lastMallIdRef.current;
      const cafe24Values = forcedMallId ? { ...cafe24Draft, mall_id: forcedMallId } : cafe24Draft;
      let values =
        activeProvider === "cafe24"
          ? {
              ...cafe24Values,
            }
          : shopifyDraft;
      if (activeProvider === "cafe24") {
        delete (values as Record<string, unknown>).scope;
        const normalizedMallId = cafe24Values.mall_id.trim();
        const selectedShopNos = sortNumbers(parseCsv(cafe24Values.shop_no));
        if (selectedShopNos.length === 0) {
          setEnvError("shop_no를 선택해주세요.");
          return;
        }
        if (!cafe24Values.board_no) {
          setEnvError("board_no를 선택해주세요.");
          return;
        }
        if (shopOptions.length === 0) {
          setEnvError("shop_no 목록이 준비되지 않았습니다. OAuth 완료 후 다시 시도해주세요.");
          return;
        }
        if (!cafe24Values.access_token || !cafe24Values.refresh_token || !cafe24Values.expires_at) {
          setEnvError("OAuth 토큰이 없습니다. OAuth를 다시 진행해주세요.");
          return;
        }
        const allowed = new Set(shopOptions.map((opt) => opt.id));
        const invalid = selectedShopNos.filter((shopNo) => !allowed.has(shopNo));
        if (invalid.length > 0) {
          setEnvError("shop_no 목록과 일치하지 않는 값이 있습니다. 목록에서 다시 선택해주세요.");
          return;
        }
        const derivedDomain = buildMallDomainFromShopNo(selectedShopNos);
        if (derivedDomain) {
          cafe24Values.mall_domain = derivedDomain;
        }
        const tokenMallId = cafe24TokenMallId || lastSavedMallIdRef.current;
        const mallIdChanged = tokenMallId && normalizedMallId && normalizedMallId !== tokenMallId;
        if (mallIdChanged) {
          values = {
            ...values,
            access_token: "",
            refresh_token: "",
            expires_at: "",
            shop_no: "",
            board_no: "",
          };
        }
      }
      const res = await fetch("/api/auth-settings/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ provider: activeProvider, values, commit: true }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok || payload.error) {
        setEnvError(payload.error || "저장에 실패했습니다.");
        return;
      }
      if (activeProvider === "cafe24") {
        lastSavedMallIdRef.current = (values as Cafe24ProviderDraft).mall_id;
        setCafe24Stored(values as Cafe24ProviderDraft);
        setCafe24TokenMallId((values as Cafe24ProviderDraft).mall_id);
      } else {
        setShopifyStored(values as ShopifyProviderDraft);
      }
      setEnvEditorOpen(false);
      setEnvSaveNotice("저장이 완료되었습니다.");
      if (envSaveTimeoutRef.current) window.clearTimeout(envSaveTimeoutRef.current);
      envSaveTimeoutRef.current = window.setTimeout(() => setEnvSaveNotice(""), 3_000);
      setEnvSavedAt(new Date().toISOString());
    } catch {
      setEnvError("저장에 실패했습니다.");
    } finally {
      setEnvLoading(false);
    }
  }, [
    activeProvider,
    authToken,
    buildMallDomainFromShopNo,
    cafe24Draft,
    cafe24TokenMallId,
    isAdmin,
    parseCsv,
    shopOptions,
    shopifyDraft,
    sortNumbers,
  ]);

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
  }, [cafe24Draft.board_no, handleProviderSave]);

  const handleStepPrev = useCallback(() => {
    if (cafe24Step === "board") {
      setCafe24Step("shop");
      return;
    }
    if (cafe24Step === "shop") {
      setCafe24Step("mall");
    }
  }, [cafe24Step]);

  return (
    <div className="space-y-4">
      {!isAdmin ? (
        <Card className="p-4">
          <div className="text-sm font-semibold text-slate-900">읽기 전용</div>
          <div className="mt-2 text-sm text-slate-600">환경 변수 편집은 관리자만 가능합니다.</div>
        </Card>
      ) : null}

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
            <div className="w-28 min-w-20">
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

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex min-h-[28px] items-center justify-between">
            <div className="text-xs font-semibold text-slate-900">등록된 정보</div>
            {!envEditorOpen && !envSaveNotice ? (
              <button
                type="button"
                onClick={() => {
                  if (envReadOnly) return;
                  setEnvEditorOpen(true);
                  setCafe24Step("mall");
                  setCafe24MallStatus("");
                  setCafe24MallFailed(false);
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px]",
                  envReadOnly
                    ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
                title={envReadOnly ? "관리자만 수정할 수 있습니다." : "수정"}
                disabled={envReadOnly}
              >
                <Pencil size={12} />
                수정
              </button>
            ) : null}
          </div>
          {activeProvider === "cafe24" ? (
            <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-700">
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <div className="text-[10px] text-slate-500">mall_id</div>
                <div className="mt-2 grid gap-1 text-xs">
                  <div className="px-1 py-0.5 text-slate-700">
                    {cafe24Stored?.mall_id || "-"}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <div className="text-[10px] text-slate-500">shop_no | mall_domain</div>
                <div className="mt-2 grid gap-1 text-xs">
                  {listifyShopDomainPairs(cafe24Stored).length > 0 ? (
                    listifyShopDomainPairs(cafe24Stored).map((item, idx) => (
                      <div
                        key={typeof item === "string" ? `${item}-${idx}` : `${item.main}-${idx}`}
                        className="px-1 py-0.5 text-slate-700"
                      >
                        {typeof item === "string" ? (
                          item
                        ) : (
                          <>
                            {item.main} <span className="text-slate-400">({item.meta})</span>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-1 py-0.5 text-slate-400">-</div>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <div className="text-[10px] text-slate-500">board_no | board_name</div>
                <div className="mt-2 grid gap-1 text-xs">
                  {listifyBoardPairs(cafe24Stored?.board_no || "").length > 0 ? (
                    listifyBoardPairs(cafe24Stored?.board_no || "").map((item, idx) => (
                      <div
                        key={typeof item === "string" ? `${item}-${idx}` : `${item.main}-${idx}`}
                        className="px-1 py-0.5 text-slate-700"
                      >
                        {typeof item === "string" ? (
                          item
                        ) : (
                          <>
                            {item.main} <span className="text-slate-400">({item.meta})</span>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-1 py-0.5 text-slate-400">-</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-700">
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <div className="text-[10px] text-slate-500">shop_domain</div>
                <div className="font-semibold">{shopifyStored?.shop_domain || "-"}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <div className="text-[10px] text-slate-500">scopes</div>
                <div className="font-semibold">{shopifyStored?.scopes || "-"}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <div className="text-[10px] text-slate-500">client_id</div>
                <div className="font-semibold">{maskValue(shopifyStored?.client_id)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <div className="text-[10px] text-slate-500">access_token</div>
                <div className="font-semibold">{maskValue(shopifyStored?.access_token)}</div>
              </div>
            </div>
          )}
        </div>

        {envSaveNotice ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {envSaveNotice}
          </div>
        ) : null}

        {envEditorOpen ? (
          activeProvider === "cafe24" ? (
            <div className="mt-4 space-y-4 min-w-0">
              {cafe24Step === "mall" ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-900">1. mall_id 입력</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    좌측 메뉴 맨 아래의 [⚙️쇼핑몰 설정] → [기본 설정] → [내 쇼핑몰 정보] → [기본정보 설정] → [상점 아이디]에서 확인해주세요.
                  </div>
                  {cafe24MallStatus ? (
                    <div className="mt-2 text-[11px] text-slate-500">{cafe24MallStatus}</div>
                  ) : null}
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
              ) : cafe24Step === "shop" ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-900">2. shop_no 선택</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    mall_id로 선택 가능한 shop_no를 선택합니다.
                  </div>
                  {shopOptions.length > 0 ? (
                    <>
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
                                      <span className="truncate text-[11px] text-slate-500">
                                        {opt.description || ""}
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
                            )}
                          </div>
                        </div>
                      </label>
                    </>
                  ) : null}
                </div>
              ) : cafe24Step === "board" ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-900">3. board_no 선택</div>
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
              {null}
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
                      disabled={cafe24ScopeBusy || cafe24MallBusy || cafe24AdvanceNotice || !cafe24Draft.mall_id}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-xs text-white",
                        cafe24ScopeBusy || cafe24MallBusy || cafe24AdvanceNotice || !cafe24Draft.mall_id
                          ? "cursor-not-allowed border-slate-200 bg-slate-300"
                          : "border-slate-300 bg-stone-800 hover:bg-stone-500"
                      )}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {cafe24ScopeBusy || cafe24MallBusy || cafe24AdvanceNotice ? (
                          <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                        ) : null}
                        {cafe24ScopeBusy || cafe24MallBusy || cafe24AdvanceNotice
                          ? "OAuth 연결중"
                          : cafe24MallFailed
                            ? "다시 시도"
                            : "다음"}
                      </span>
                    </button>
                  ) : null}
                  {cafe24Step === "shop" ? (
                    <button
                      type="button"
                      onClick={handleShopSave}
                      className="w-full rounded-lg border border-slate-300 bg-stone-800 px-3 py-2 text-xs text-white hover:bg-stone-500"
                    >
                      다음
                    </button>
                  ) : null}
                  {cafe24Step === "board" ? (
                    <button
                      type="button"
                      onClick={handleBoardSave}
                      className="w-full rounded-lg border border-slate-300 bg-stone-800 px-3 py-2 text-xs text-white hover:bg-stone-500"
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
          )
        ) : null}
      </Card>
    </div>
  );
}
