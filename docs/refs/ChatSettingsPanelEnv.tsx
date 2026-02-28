"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  MANAGED_ENV_KEYS,
  RAILWAY_ONLY_ENV_KEYS,
  SENSITIVE_ENV_KEYS,
  type ManagedEnvKey,
} from "@/lib/managedEnvKeys";

type Props = {
  authToken: string;
};

type RuntimeEnvField = {
  key: ManagedEnvKey;
  label: string;
  description: string;
  multiline?: boolean;
  placeholder?: string;
};

const RUNTIME_ENV_FIELDS: RuntimeEnvField[] = [
  {
    key: "OPENAI_API_KEY",
    label: "OPENAI_API_KEY",
    description: "OpenAI ?몄텧???ъ슜?섎뒗 API ??(?쒕쾭 ?꾩슜).",
  },
  {
    key: "GEMINI_API_KEY",
    label: "GEMINI_API_KEY",
    description: "Gemini ?몄텧???ъ슜?섎뒗 API ??(?쒕쾭 ?꾩슜).",
  },
  {
    key: "SOLAPI_API_KEY",
    label: "SOLAPI_API_KEY",
    description: "?ъ엯怨??뚮┝ SMS 諛쒖넚??Solapi API ??",
  },
  {
    key: "SOLAPI_API_SECRET",
    label: "SOLAPI_API_SECRET",
    description: "?ъ엯怨??뚮┝ SMS 諛쒖넚??Solapi API ?쒗겕由?",
  },
  {
    key: "SOLAPI_FROM",
    label: "SOLAPI_FROM",
    description: "?ъ엯怨??뚮┝ 諛쒖떊 踰덊샇.",
  },
  {
    key: "SOLAPI_BYPASS",
    label: "SOLAPI_BYPASS",
    description: "?ъ엯怨??뚮┝ 諛쒖넚 諛붿씠?⑥뒪 ?щ?(true/false).",
  },
  {
    key: "SOLAPI_TEMP",
    label: "SOLAPI_TEMP",
    description: "Solapi bypass temp code.",
  },
  {
    key: "JUSO_API_KEY",
    label: "JUSO_API_KEY",
    description: "주소 검??API ??",
  },
  {
    key: "SIGNUP_OTP_ORG_ID",
    label: "SIGNUP_OTP_ORG_ID",
    description: "Signup OTP org id.",
  },
  {
    key: "CAFE24_REDIRECT_URI",
    label: "CAFE24_REDIRECT_URI",
    description: "Cafe24 OAuth redirect URI.",
  },
  {
    key: "CAFE24_CLIENT_ID",
    label: "CAFE24_CLIENT_ID",
    description: "Cafe24 OAuth client id.",
  },
  {
    key: "CAFE24_CLIENT_SECRET_KEY",
    label: "CAFE24_CLIENT_SECRET_KEY",
    description: "Cafe24 OAuth client secret.",
  },
  {
    key: "CAFE24_SERVICE_KEY",
    label: "CAFE24_SERVICE_KEY",
    description: "Cafe24 ?쒕퉬????(?꾩옱 肄붾뱶?먯꽌???ъ슜?섏? ?딆쓬).",
  },
  {
    key: "CAFE24_SCOPE",
    label: "CAFE24_SCOPE",
    description: "Cafe24 OAuth scope.",
    multiline: true,
  },
  {
    key: "WIDGET_RUNTIME_BASE_URL",
    label: "WIDGET_RUNTIME_BASE_URL",
    description: "?꾩젽 ?고????몄텧 踰좎씠??URL.",
  },
  {
    key: "WIDGET_RUNTIME_SECRET",
    label: "WIDGET_RUNTIME_SECRET",
    description: "?꾩젽 ?고????몄텧 ???ъ슜?섎뒗 ?쒕쾭 ?쒗겕由?",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "NEXT_PUBLIC_SUPABASE_URL",
    description: "Supabase URL (?대씪?댁뼵??踰덈뱾???ы븿??.",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    description: "Supabase anon key (?대씪?댁뼵??踰덈뱾???ы븿??.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "SUPABASE_SERVICE_ROLE_KEY",
    description: "Supabase service role key.",
  },
  {
    key: "CRON_SECRET",
    label: "CRON_SECRET",
    description: "Cron 蹂댄샇???쒗겕由?",
  },
  {
    key: "CAFE24_OAUTH_STATE_SECRET",
    label: "CAFE24_OAUTH_STATE_SECRET",
    description: "Cafe24 OAuth state 寃利??쒗겕由?",
  },
  {
    key: "NEXT_PUBLIC_CALL_WS_URL",
    label: "NEXT_PUBLIC_CALL_WS_URL",
    description: "肄?WebSocket) ?몄텧 URL (?대씪?댁뼵??踰덈뱾???ы븿??.",
  },
  {
    key: "WIDGET_TOKEN_SECRET",
    label: "WIDGET_TOKEN_SECRET",
    description: "?꾩젽 ?좏겙 ?쒕챸 ?쒗겕由?",
  },
  {
    key: "NEXT_PUBLIC_WIDGET_DEBUG_ORIGINS",
    label: "NEXT_PUBLIC_WIDGET_DEBUG_ORIGINS",
    description: "?꾩젽 ?붾쾭洹??덉슜 ?ㅻ━吏?紐⑸줉 (肄ㅻ쭏).",
  },
  {
    key: "RUNTIME_ENV_ENC_KEY",
    label: "RUNTIME_ENV_ENC_KEY",
    description: "Managed env encryption key (Railway/.env only).",
  },
];

function parseEnvBulk(text: string) {
  const output: Partial<Record<ManagedEnvKey, string>> = {};
  const ignored: string[] = [];
  const keySet = new Set(MANAGED_ENV_KEYS);
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim().replace(/^\uFEFF/, "");
    if (!keySet.has(key as ManagedEnvKey)) {
      ignored.push(key);
      continue;
    }
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    output[key as ManagedEnvKey] = value;
  }
  return { values: output, ignored };
}

async function parseJsonBody<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function ChatSettingsPanelEnv({ authToken }: Props) {
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [envSavedAt, setEnvSavedAt] = useState<string | null>(null);
  const [envDraftDeploy, setEnvDraftDeploy] = useState<Record<ManagedEnvKey, string>>(() => {
    return MANAGED_ENV_KEYS.reduce<Record<ManagedEnvKey, string>>((acc, key) => {
      acc[key] = "";
      return acc;
    }, {} as Record<ManagedEnvKey, string>);
  });
  const [envDraftLocal, setEnvDraftLocal] = useState<Record<ManagedEnvKey, string>>(() => {
    return MANAGED_ENV_KEYS.reduce<Record<ManagedEnvKey, string>>((acc, key) => {
      acc[key] = "";
      return acc;
    }, {} as Record<ManagedEnvKey, string>);
  });
  const [envTouchedDeploy, setEnvTouchedDeploy] = useState<Record<ManagedEnvKey, boolean>>(
    {} as Record<ManagedEnvKey, boolean>
  );
  const [envTouchedLocal, setEnvTouchedLocal] = useState<Record<ManagedEnvKey, boolean>>(
    {} as Record<ManagedEnvKey, boolean>
  );
  const [envBulkText, setEnvBulkText] = useState<string>("");
  const [envActiveMode, setEnvActiveMode] = useState<"deploy" | "local">("deploy");
  const [envReveal, setEnvReveal] = useState<Record<ManagedEnvKey, boolean>>(
    {} as Record<ManagedEnvKey, boolean>
  );
  const [envRevealMode, setEnvRevealMode] = useState(false);
  const revealTimeoutRef = useRef<number | null>(null);

  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) next.Authorization = `Bearer ${authToken}`;
    return next;
  }, [authToken]);

  const loadRuntimeEnv = useCallback(
    async (opts?: { reveal?: boolean }) => {
      setEnvLoading(true);
      setEnvError(null);
      try {
        const reveal = opts?.reveal === true;
        const res = await fetch(
          `/api/auth-settings/providers?provider=runtime_env${reveal ? "&reveal=true" : ""}`,
          {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
          }
        );
        const payload = await parseJsonBody<{ provider?: Record<string, unknown>; error?: string }>(res);
        if (!res.ok) {
          setEnvError(payload?.error || "?섍꼍 蹂???ㅼ젙??遺덈윭?ㅼ? 紐삵뻽?듬땲??");
          return;
        }
        const provider = (payload?.provider || {}) as {
          deploy?: Record<string, unknown>;
          local?: Record<string, unknown>;
        };
        setEnvDraftDeploy((prev) => {
          const next = { ...prev };
          MANAGED_ENV_KEYS.forEach((key) => {
            next[key] = String(provider.deploy?.[key] ?? "");
          });
          return next;
        });
        setEnvDraftLocal((prev) => {
          const next = { ...prev };
          MANAGED_ENV_KEYS.forEach((key) => {
            next[key] = String(provider.local?.[key] ?? "");
          });
          return next;
        });
        setEnvTouchedDeploy({} as Record<ManagedEnvKey, boolean>);
        setEnvTouchedLocal({} as Record<ManagedEnvKey, boolean>);
        setEnvRevealMode(reveal);
      } catch {
        setEnvError("?섍꼍 蹂???ㅼ젙??遺덈윭?ㅼ? 紐삵뻽?듬땲??");
      } finally {
        setEnvLoading(false);
      }
    },
    [authToken]
  );

  const ensureRevealMode = useCallback(
    (next: boolean) => {
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
      if (next) {
        void loadRuntimeEnv({ reveal: true });
        revealTimeoutRef.current = window.setTimeout(() => {
          void loadRuntimeEnv({ reveal: false });
          setEnvReveal((prev) => {
            const cleared = { ...prev } as Record<ManagedEnvKey, boolean>;
            Object.keys(cleared).forEach((key) => {
              cleared[key as ManagedEnvKey] = false;
            });
            return cleared;
          });
        }, 10_000);
      } else {
        void loadRuntimeEnv({ reveal: false });
      }
    },
    [loadRuntimeEnv]
  );

  const handleRuntimeEnvSave = useCallback(async () => {
    setEnvSaving(true);
    setEnvError(null);
    try {
      const touchedDeploy = MANAGED_ENV_KEYS.filter((key) => envTouchedDeploy[key]);
      const touchedLocal = MANAGED_ENV_KEYS.filter((key) => envTouchedLocal[key]);
      if (touchedDeploy.length === 0 && touchedLocal.length === 0) {
        setEnvError("蹂寃쎈맂 媛믪씠 ?놁뒿?덈떎. ?섏젙 ?먮뒗 ?쇨큵 遺숈뿬?ｊ린瑜?癒쇱? 吏꾪뻾?댁＜?몄슂.");
        return;
      }
      if (touchedDeploy.length > 0) {
        const values = touchedDeploy.reduce<Record<ManagedEnvKey, string>>((acc, key) => {
          acc[key] = envDraftDeploy[key] ?? "";
          return acc;
        }, {} as Record<ManagedEnvKey, string>);
        const res = await fetch("/api/auth-settings/providers", {
          method: "POST",
          headers,
          body: JSON.stringify({
            provider: "runtime_env",
            mode: "deploy",
            values,
            commit: true,
          }),
        });
        const payload = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || payload?.error || !payload?.ok) {
          throw new Error(payload?.error || "諛고룷 ?섍꼍 蹂????μ뿉 ?ㅽ뙣?덉뒿?덈떎.");
        }
      }
      if (touchedLocal.length > 0) {
        const values = touchedLocal.reduce<Record<ManagedEnvKey, string>>((acc, key) => {
          acc[key] = envDraftLocal[key] ?? "";
          return acc;
        }, {} as Record<ManagedEnvKey, string>);
        const res = await fetch("/api/auth-settings/providers", {
          method: "POST",
          headers,
          body: JSON.stringify({
            provider: "runtime_env",
            mode: "local",
            values,
            commit: true,
          }),
        });
        const payload = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || payload?.error || !payload?.ok) {
          throw new Error(payload?.error || "濡쒖뺄 ?섍꼍 蹂????μ뿉 ?ㅽ뙣?덉뒿?덈떎.");
        }
      }
      setEnvSavedAt(new Date().toLocaleString("ko-KR"));
      setEnvTouchedDeploy({} as Record<ManagedEnvKey, boolean>);
      setEnvTouchedLocal({} as Record<ManagedEnvKey, boolean>);
    } catch (err) {
      setEnvError(err instanceof Error ? err.message : "?섍꼍 蹂????μ뿉 ?ㅽ뙣?덉뒿?덈떎.");
    } finally {
      setEnvSaving(false);
    }
  }, [envDraftDeploy, envDraftLocal, envTouchedDeploy, envTouchedLocal, headers]);

  useEffect(() => {
    void loadRuntimeEnv({ reveal: false });
  }, [loadRuntimeEnv]);

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">{"\uB7F0\uD0C0\uC784 \uD658\uACBD \uBCC0\uC218"}</div>
        <div className="mt-1 text-xs text-slate-500">
          愿由ъ옄 ?붾㈃?먯꽌 ??ν븯硫??쒕쾭 ?고??꾩뿉??利됱떆 諛섏쁺?⑸땲?? ???媛믪? ?뷀샇?붾릺??蹂닿??섎ŉ, ?붾㈃?먮뒗 留덉뒪?밸맂
          媛믩쭔 ?쒖떆?⑸땲??
          <span className="font-semibold text-amber-600"> 利됱떆 諛섏쁺 遺덇?</span>濡??쒖떆??媛믪? 鍮뚮뱶/?명봽???④퀎?먯꽌留?
          ?곸슜?⑸땲??
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          <span className="font-semibold text-amber-600">利됱떆 諛섏쁺 遺덇?</span> ?쒖떆媛 ?덈뒗 ??ぉ? 濡쒖뺄 .env ?먮뒗 Railway
          ?섍꼍蹂?섏뿉 ?④꺼?먯뼱???⑸땲?? (?? <span className="font-mono">RUNTIME_ENV_ENC_KEY</span>)
        </div>
        {envLoading ? <div className="mt-2 text-xs text-slate-500">遺덈윭?ㅻ뒗 以?..</div> : null}
        {envError ? <div className="mt-2 text-xs text-rose-600">{envError}</div> : null}
        {envSavedAt ? <div className="mt-2 text-xs text-slate-500">??λ맖: {envSavedAt}</div> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-slate-500">{"\uAD00\uB9AC \uBAA8\uB4DC:"}</span>
          <button
            type="button"
            onClick={() => setEnvActiveMode("deploy")}
            className={`rounded-lg border px-2 py-1 ${
              envActiveMode === "deploy"
                ? "border-slate-300 bg-white text-slate-900"
                : "border-slate-200 bg-slate-100 text-slate-500"
            }`}
          >
            {"\uBC30\uD3EC\uC6A9"}
          </button>
          <button
            type="button"
            onClick={() => setEnvActiveMode("local")}
            className={`rounded-lg border px-2 py-1 ${
              envActiveMode === "local"
                ? "border-slate-300 bg-white text-slate-900"
                : "border-slate-200 bg-slate-100 text-slate-500"
            }`}
          >
            {"\uB85C\uCEEC\uC6A9"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void loadRuntimeEnv()} disabled={envLoading || envSaving}>
            {"\uC0C8\uB85C\uACE0\uCE68"}
          </Button>
          <Button type="button" onClick={() => void handleRuntimeEnvSave()} disabled={envLoading || envSaving}>
            {envSaving ? "\uC800\uC7A5 \uC911..." : "\uC800\uC7A5"}
          </Button>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-900">{"\uC77C\uAD04 \uBD99\uC5EC\uB123\uAE30"}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span className="font-semibold">KEY=VALUE</span> {"\uD615\uC2DD\uC73C\uB85C \uBD99\uC5EC\uB123\uAE30 \uD6C4 \uC801\uC6A9\uD558\uC138\uC694."}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-slate-500">{"\uD604\uC7AC \uBAA8\uB4DC:"}</span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-700">
              {envActiveMode === "deploy" ? "\uBC30\uD3EC\uC6A9" : "\uB85C\uCEEC\uC6A9"}
            </span>
          </div>
          <textarea
            value={envBulkText}
            onChange={(e) => setEnvBulkText(e.target.value)}
            className="mt-2 w-full min-h-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            placeholder="OPENAI_API_KEY=...\nGEMINI_API_KEY=..."
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const parsed = parseEnvBulk(envBulkText);
                const keys = Object.keys(parsed.values) as ManagedEnvKey[];
                if (keys.length === 0) {
                  setEnvError("\uBD99\uC5EC\uB123\uAE30\uC5D0\uC11C \uC778\uC2DD\uB41C \uD0A4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
                  return;
                }
                if (parsed.ignored.length > 0) {
                  setEnvError(`\uAD00\uB9AC \uB300\uC0C1\uC774 \uC544\uB2CC \uD0A4\uB294 \uBB34\uC2DC\uD588\uC2B5\uB2C8\uB2E4: ${parsed.ignored.join(", ")}`);
                }
                if (envActiveMode === "local") {
                  setEnvDraftLocal((prev) => ({
                    ...prev,
                    ...(parsed.values as Record<ManagedEnvKey, string>),
                  }));
                  setEnvTouchedLocal((prev) => {
                    const next = { ...prev } as Record<ManagedEnvKey, boolean>;
                    keys.forEach((key) => {
                      next[key] = true;
                    });
                    return next;
                  });
                } else {
                  setEnvDraftDeploy((prev) => ({
                    ...prev,
                    ...(parsed.values as Record<ManagedEnvKey, string>),
                  }));
                  setEnvTouchedDeploy((prev) => {
                    const next = { ...prev } as Record<ManagedEnvKey, boolean>;
                    keys.forEach((key) => {
                      next[key] = true;
                    });
                    return next;
                  });
                }
                setEnvError(null);
              }}
            >
              {"\uC801\uC6A9"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEnvBulkText("")}>
              {"\uCD08\uAE30\uD654"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => ensureRevealMode(!envRevealMode)}
              disabled={envLoading || envSaving}
            >
              {"\uC77C\uAD04 \uB178\uCD9C"}
            </Button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {RUNTIME_ENV_FIELDS.map((field) => {
            const isRailwayOnly = RAILWAY_ONLY_ENV_KEYS.has(field.key);
            const isSensitive = SENSITIVE_ENV_KEYS.has(field.key);
            const inputType = isSensitive && !envReveal[field.key] ? "password" : "text";
            const labelSuffix = isRailwayOnly ? " (즉시 반영 불가)" : "";
            const revealEnabled = envRevealMode && !isRailwayOnly;
            const activeValue =
              envActiveMode === "local" ? envDraftLocal[field.key] || "" : envDraftDeploy[field.key] || "";
            const inactiveValue =
              envActiveMode === "local" ? envDraftDeploy[field.key] || "" : envDraftLocal[field.key] || "";
            const inactiveLabel = envActiveMode === "local" ? "배포용" : "로컬용";
            const inactiveDisplay = inactiveValue === "" ? "null" : inactiveValue;
            return (
              <label key={`env-field-${field.key}`} className="block">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-700">
                    {field.label}
                    {labelSuffix ? <span className="text-amber-600">{labelSuffix}</span> : null}
                  </div>
                  {isSensitive ? (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        className={`rounded-md border px-2 py-1 ${
                          envReveal[field.key]
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}
                        onClick={() =>
                          setEnvReveal((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                        }
                        disabled={!revealEnabled}
                      >
                        {envReveal[field.key] ? "노출" : "미노출"}
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 space-y-2">
                  {field.multiline ? (
                    <>
                      <textarea
                        value={activeValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (envActiveMode === "local") {
                            setEnvDraftLocal((prev) => ({ ...prev, [field.key]: value }));
                            setEnvTouchedLocal((prev) => ({ ...prev, [field.key]: true }));
                          } else {
                            setEnvDraftDeploy((prev) => ({ ...prev, [field.key]: value }));
                            setEnvTouchedDeploy((prev) => ({ ...prev, [field.key]: true }));
                          }
                        }}
                        placeholder={field.placeholder || (envActiveMode === "deploy" ? "배포용" : "로컬용")}
                        className="h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <textarea
                        value={inactiveDisplay}
                        readOnly
                        disabled
                        className="h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400"
                      />
                      <div className="text-[10px] text-slate-400">{inactiveLabel} 값</div>
                    </>
                  ) : (
                    <>
                      <Input
                        value={activeValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (envActiveMode === "local") {
                            setEnvDraftLocal((prev) => ({ ...prev, [field.key]: value }));
                            setEnvTouchedLocal((prev) => ({ ...prev, [field.key]: true }));
                          } else {
                            setEnvDraftDeploy((prev) => ({ ...prev, [field.key]: value }));
                            setEnvTouchedDeploy((prev) => ({ ...prev, [field.key]: true }));
                          }
                        }}
                        placeholder={field.placeholder || (envActiveMode === "deploy" ? "배포용" : "로컬용")}
                        type={inputType}
                        className="h-9 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <Input
                        value={inactiveDisplay}
                        readOnly
                        disabled
                        placeholder={inactiveLabel}
                        type="text"
                        className="h-9 text-xs bg-slate-50 text-slate-400"
                      />
                      <div className="text-[10px] text-slate-400">{inactiveLabel} 값</div>
                    </>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{field.description}</div>
              </label>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

