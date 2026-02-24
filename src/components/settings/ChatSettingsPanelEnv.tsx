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
    description: "OpenAI 호출에 사용되는 API 키 (서버 전용).",
  },
  {
    key: "GEMINI_API_KEY",
    label: "GEMINI_API_KEY",
    description: "Gemini 호출에 사용되는 API 키 (서버 전용).",
  },
  {
    key: "SOLAPI_API_KEY",
    label: "SOLAPI_API_KEY",
    description: "재입고 알림 SMS 발송용 Solapi API 키.",
  },
  {
    key: "SOLAPI_API_SECRET",
    label: "SOLAPI_API_SECRET",
    description: "재입고 알림 SMS 발송용 Solapi API 시크릿.",
  },
  {
    key: "SOLAPI_FROM",
    label: "SOLAPI_FROM",
    description: "재입고 알림 발신 번호.",
  },
  {
    key: "SOLAPI_BYPASS",
    label: "SOLAPI_BYPASS",
    description: "재입고 알림 발송 바이패스 여부(true/false).",
  },
  {
    key: "JUSO_API_KEY",
    label: "JUSO_API_KEY",
    description: "주소 검색 API 키.",
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
    description: "Cafe24 서비스 키 (현재 코드에서는 사용하지 않음).",
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
    description: "위젯 런타임 호출 베이스 URL.",
  },
  {
    key: "WIDGET_RUNTIME_SECRET",
    label: "WIDGET_RUNTIME_SECRET",
    description: "위젯 런타임 호출 시 사용하는 서버 시크릿.",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "NEXT_PUBLIC_SUPABASE_URL",
    description: "Supabase URL (클라이언트 번들에 포함됨).",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    description: "Supabase anon key (클라이언트 번들에 포함됨).",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "SUPABASE_SERVICE_ROLE_KEY",
    description: "Supabase service role key.",
  },
  {
    key: "CRON_SECRET",
    label: "CRON_SECRET",
    description: "Cron 보호용 시크릿.",
  },
  {
    key: "CAFE24_OAUTH_STATE_SECRET",
    label: "CAFE24_OAUTH_STATE_SECRET",
    description: "Cafe24 OAuth state 검증 시크릿.",
  },
  {
    key: "NEXT_PUBLIC_CALL_WS_URL",
    label: "NEXT_PUBLIC_CALL_WS_URL",
    description: "콜(WebSocket) 호출 URL (클라이언트 번들에 포함됨).",
  },
  {
    key: "WIDGET_TOKEN_SECRET",
    label: "WIDGET_TOKEN_SECRET",
    description: "위젯 토큰 서명 시크릿.",
  },
  {
    key: "NEXT_PUBLIC_WIDGET_DEBUG_ORIGINS",
    label: "NEXT_PUBLIC_WIDGET_DEBUG_ORIGINS",
    description: "위젯 디버그 허용 오리진 목록 (콤마).",
  },
];

function parseEnvBulk(text: string) {
  const output: Partial<Record<ManagedEnvKey, string>> = {};
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    if (!MANAGED_ENV_KEYS.includes(key as ManagedEnvKey)) continue;
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    output[key as ManagedEnvKey] = value;
  }
  return output;
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
  const [envBulkMode, setEnvBulkMode] = useState<"deploy" | "local">("deploy");
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
          setEnvError(payload?.error || "환경 변수 설정을 불러오지 못했습니다.");
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
        setEnvError("환경 변수 설정을 불러오지 못했습니다.");
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
        setEnvError("변경된 값이 없습니다. 수정 또는 일괄 붙여넣기를 먼저 진행해주세요.");
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
          throw new Error(payload?.error || "배포 환경 변수 저장에 실패했습니다.");
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
          throw new Error(payload?.error || "로컬 환경 변수 저장에 실패했습니다.");
        }
      }
      setEnvSavedAt(new Date().toLocaleString("ko-KR"));
      setEnvTouchedDeploy({} as Record<ManagedEnvKey, boolean>);
      setEnvTouchedLocal({} as Record<ManagedEnvKey, boolean>);
    } catch (err) {
      setEnvError(err instanceof Error ? err.message : "환경 변수 저장에 실패했습니다.");
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
        <div className="text-sm font-semibold text-slate-900">런타임 환경 변수</div>
        <div className="mt-1 text-xs text-slate-500">
          관리자 화면에서 저장하면 서버 런타임에서 즉시 반영됩니다. 저장 값은 암호화되어 보관되며, 화면에는 마스킹된
          값만 표시됩니다.
          <span className="font-semibold text-amber-600"> 즉시 반영 불가</span>로 표시된 값은 빌드/인프라 단계에서만
          적용됩니다.
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          <span className="font-semibold text-amber-600">즉시 반영 불가</span> 표시가 있는 항목은 로컬 .env 또는 Railway
          환경변수에 남겨두어야 합니다. (예: <span className="font-mono">RUNTIME_ENV_ENC_KEY</span>)
        </div>
        {envLoading ? <div className="mt-2 text-xs text-slate-500">불러오는 중...</div> : null}
        {envError ? <div className="mt-2 text-xs text-rose-600">{envError}</div> : null}
        {envSavedAt ? <div className="mt-2 text-xs text-slate-500">저장됨: {envSavedAt}</div> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void loadRuntimeEnv()} disabled={envLoading || envSaving}>
            새로고침
          </Button>
          <Button type="button" onClick={() => void handleRuntimeEnvSave()} disabled={envLoading || envSaving}>
            {envSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-900">일괄 붙여넣기</div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span className="font-semibold">KEY=VALUE</span> 형식으로 붙여넣기 후 적용하세요. 마스킹된 기존 값은 저장되지
            않으므로 변경하지 않을 값도 다시 입력해야 유지됩니다. 즉시 반영 불가로 표시된 키는 저장 시 무시됩니다.
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-slate-500">붙여넣기 모드:</span>
            <button
              type="button"
              onClick={() => setEnvBulkMode("deploy")}
              className={`rounded-lg border px-2 py-1 ${
                envBulkMode === "deploy"
                  ? "border-slate-300 bg-white text-slate-900"
                  : "border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              배포용
            </button>
            <button
              type="button"
              onClick={() => setEnvBulkMode("local")}
              className={`rounded-lg border px-2 py-1 ${
                envBulkMode === "local"
                  ? "border-slate-300 bg-white text-slate-900"
                  : "border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              로컬용
            </button>
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
                const keys = Object.keys(parsed) as ManagedEnvKey[];
                if (keys.length === 0) {
                  setEnvError("붙여넣기에서 인식된 키가 없습니다.");
                  return;
                }
                if (envBulkMode === "local") {
                  setEnvDraftLocal((prev) => ({ ...prev, ...(parsed as Record<ManagedEnvKey, string>) }));
                  setEnvTouchedLocal((prev) => {
                    const next = { ...prev } as Record<ManagedEnvKey, boolean>;
                    keys.forEach((key) => {
                      next[key] = true;
                    });
                    return next;
                  });
                } else {
                  setEnvDraftDeploy((prev) => ({ ...prev, ...(parsed as Record<ManagedEnvKey, string>) }));
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
              적용
            </Button>
            <Button type="button" variant="outline" onClick={() => setEnvBulkText("")}>
              초기화
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
                          envRevealMode
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                        }`}
                        onClick={() => ensureRevealMode(!envRevealMode)}
                      >
                        일괄 노출
                      </button>
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
                        {envReveal[field.key] ? "숨김" : "노출"}
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 space-y-2">
                  {field.multiline ? (
                    <textarea
                      value={envDraftDeploy[field.key] || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEnvDraftDeploy((prev) => ({ ...prev, [field.key]: value }));
                        setEnvTouchedDeploy((prev) => ({ ...prev, [field.key]: true }));
                      }}
                      placeholder={field.placeholder || "배포용"}
                      className="h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  ) : (
                    <>
                      <Input
                        value={envDraftDeploy[field.key] || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEnvDraftDeploy((prev) => ({ ...prev, [field.key]: value }));
                          setEnvTouchedDeploy((prev) => ({ ...prev, [field.key]: true }));
                        }}
                        placeholder={field.placeholder || "배포용"}
                        type={inputType}
                        className="h-9 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <Input
                        value={envDraftLocal[field.key] || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEnvDraftLocal((prev) => ({ ...prev, [field.key]: value }));
                          setEnvTouchedLocal((prev) => ({ ...prev, [field.key]: true }));
                        }}
                        placeholder={field.placeholder || "로컬용"}
                        type={inputType}
                        className="h-9 text-xs disabled:bg-slate-100 disabled:text-slate-400"
                      />
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
