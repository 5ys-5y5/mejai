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
      } catch {
        if (!mounted) return;
        setError("\uD658\uACBD \uC124\uC815\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
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
      setNotice("\uC124\uC815\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
    } catch {
      setError("\uC124\uC815 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
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
    setNotice("\uCD5C\uB300 \uC131\uB2A5 \uC124\uC815\uC744 \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4. \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
  }

  function formatValue(value: PerformanceConfig[keyof PerformanceConfig]) {
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">{"\uC131\uB2A5 \uC124\uC815"}</div>
        <div className="mt-2 text-sm text-slate-600">
          {"\uC11C\uBC84 \uCC98\uB9AC \uCD5C\uC801\uD654\uC640 \uAC1C\uC120 \uC124\uC815\uC744 \uC870\uC815\uD569\uB2C8\uB2E4. \uD544\uC694 \uC2DC \uC801\uC6A9 \uD6C4 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694."}
        </div>
      </Card>

      <Card className="p-4">
        {loading ? <div className="text-sm text-slate-500">{"\uBD88\uB7EC\uC624\uB294 \uC911..."}</div> : null}
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        {notice ? (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {notice}
          </div>
        ) : null}

        {!loading ? (
          <div className="space-y-1">
            <div className="grid grid-cols-[220px_1fr_220px_70px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
              <div>{"\uD0A4"}</div>
              <div>{"\uC124\uBA85"}</div>
              <div>{"\uC785\uB825"}</div>
              <div>{"\uC0C1\uD0DC"}</div>
            </div>
            {listItems.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-[220px_1fr_220px_70px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <div className="truncate font-semibold text-slate-900">{item.label}</div>
                <div className="truncate text-slate-500">
                  {item.purpose} | {"\uAE30\uBCF8"} {formatValue(DEFAULT_PERFORMANCE_CONFIG[item.key])} | {"\uD604\uC7AC"} {formatValue(loaded[item.key])}
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
            {"\uB9C8\uC9C0\uB9C9 \uC801\uC6A9 \uC81C\uAC70"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-lg border border-slate-300 bg-stone-800 px-3 py-2 text-xs text-white hover:bg-stone-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300"
          >
            {saving ? "\uC800\uC7A5 \uC911" : "\uC800\uC7A5"}
          </button>
        </div>
      </Card>
    </div>
  );
}
