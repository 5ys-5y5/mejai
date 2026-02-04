"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/apiClient";
import {
  DEFAULT_PERFORMANCE_CONFIG,
  PERFORMANCE_CONFIG_ITEMS,
  type PerformanceConfig,
  sanitizePerformanceConfig,
  writePerformanceConfigToStorage,
} from "@/lib/performanceConfig";

type PerformanceConfigResponse = { provider?: Record<string, unknown> };

function toTextValue(config: PerformanceConfig, key: keyof PerformanceConfig) {
  const value = config[key];
  return typeof value === "boolean" ? (value ? "true" : "false") : String(value);
}

export function PerformanceSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [draft, setDraft] = useState<PerformanceConfig>(DEFAULT_PERFORMANCE_CONFIG);
  const [loaded, setLoaded] = useState<PerformanceConfig>(DEFAULT_PERFORMANCE_CONFIG);

  useEffect(() => {
    let mounted = true;
    async function loadConfig() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<PerformanceConfigResponse>("/api/auth-settings/providers?provider=performance");
        const next = sanitizePerformanceConfig(res.provider || {});
        if (!mounted) return;
        setDraft(next);
        setLoaded(next);
        writePerformanceConfigToStorage(next);
      } catch (err) {
        if (!mounted) return;
        setError("성능 설정을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  const listItems = useMemo(() => PERFORMANCE_CONFIG_ITEMS, []);

  function updateField(key: keyof PerformanceConfig, raw: string) {
    if (raw === "") {
      setDraft((prev) => ({ ...prev, [key]: DEFAULT_PERFORMANCE_CONFIG[key] }));
      return;
    }
    if (typeof DEFAULT_PERFORMANCE_CONFIG[key] === "string") {
      setDraft((prev) => ({ ...prev, [key]: raw as PerformanceConfig[typeof key] }));
      return;
    }
    if (typeof DEFAULT_PERFORMANCE_CONFIG[key] === "boolean") {
      setDraft((prev) => ({
        ...prev,
        [key]: raw.trim().toLowerCase() === "true" || raw.trim() === "1",
      }));
      return;
    }
    setDraft((prev) => ({ ...prev, [key]: Number(raw) }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice("");
    const sanitized = sanitizePerformanceConfig(draft);
    try {
      await apiFetch<{ ok: boolean }>("/api/auth-settings/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "performance",
          values: sanitized,
          commit: true,
        }),
      });
      setDraft(sanitized);
      setLoaded(sanitized);
      writePerformanceConfigToStorage(sanitized);
      setNotice("성능 설정이 저장되었습니다.");
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function applyMaxPerformance() {
    const maxPerformance: PerformanceConfig = {
      ...draft,
      sidebar_poll_review_ms: 60_000,
      sidebar_poll_default_ms: 600_000,
      sidebar_review_limit: 1,
      sidebar_refresh_on_auth_change: true,
      sidebar_auth_event_mode: "sign_in_out",
      sidebar_auth_cooldown_ms: 30_000,
      help_panel_poll_review_ms: 60_000,
      help_panel_poll_default_ms: 600_000,
      help_panel_review_limit: 20,
      help_panel_refresh_on_focus: false,
      help_panel_focus_cooldown_ms: 30_000,
      help_panel_refresh_on_auth_change: true,
      help_panel_auth_event_mode: "sign_in_out",
      help_panel_auth_cooldown_ms: 30_000,
      dashboard_poll_ms: 900_000,
      dashboard_sessions_limit: 200,
      dashboard_review_limit: 200,
      dashboard_refresh_on_auth_change: true,
      dashboard_auth_event_mode: "sign_in_out",
      dashboard_auth_cooldown_ms: 30_000,
      multi_tab_leader_enabled: true,
      multi_tab_leader_lock_ttl_ms: 15_000,
    };
    setDraft(sanitizePerformanceConfig(maxPerformance));
    setNotice("최대 성능 프리셋을 적용했습니다. 저장을 눌러 반영하세요.");
  }

  function formatValue(value: PerformanceConfig[keyof PerformanceConfig]) {
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">성능 설정</div>
        <div className="mt-2 text-sm text-slate-600">
          하드코딩된 폴링 주기/조회 건수를 이 화면에서 일괄 관리합니다. 저장 후 즉시 앱 동작에 반영됩니다.
        </div>
      </Card>

      <Card className="p-4">
        {loading ? <div className="text-sm text-slate-500">불러오는 중...</div> : null}
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        {notice ? (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {notice}
          </div>
        ) : null}

        {!loading ? (
          <div className="space-y-1">
            <div className="grid grid-cols-[220px_1fr_220px_70px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
              <div>항목</div>
              <div>설명</div>
              <div>값(input)</div>
              <div>단위</div>
            </div>
            {listItems.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-[220px_1fr_220px_70px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <div className="truncate font-semibold text-slate-900">{item.label}</div>
                <div className="truncate text-slate-500">
                  {item.purpose} | 기본: {formatValue(DEFAULT_PERFORMANCE_CONFIG[item.key])} | 현재저장:{" "}
                  {formatValue(loaded[item.key])}
                </div>
                <div>
                  {item.unit === "boolean" ? (
                    <select
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
                      value={toTextValue(draft, item.key)}
                      onChange={(event) => updateField(item.key, event.target.value)}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : item.unit === "enum" ? (
                    <select
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
                      value={toTextValue(draft, item.key)}
                      onChange={(event) => updateField(item.key, event.target.value)}
                    >
                      {(item.options || []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
                      type="number"
                      min={0}
                      step={1}
                      value={toTextValue(draft, item.key)}
                      onChange={(event) => updateField(item.key, event.target.value)}
                    />
                  )}
                </div>
                <div className="text-slate-500">{item.unit}</div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={applyMaxPerformance}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100"
            disabled={saving || loading}
          >
            최대 성능 프리셋
          </button>
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_PERFORMANCE_CONFIG)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            disabled={saving}
          >
            기본값으로 되돌리기
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-lg border border-slate-300 bg-stone-800 px-3 py-2 text-xs text-white hover:bg-stone-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </Card>
    </div>
  );
}
