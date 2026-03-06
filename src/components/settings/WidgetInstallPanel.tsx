"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import { encodeWidgetOverrides } from "@/lib/widgetOverrides";

type TemplateItem = {
  id: string;
  name?: string | null;
  page_keys?: string[] | null;
};

export function WidgetInstallPanel() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [instanceByTemplate, setInstanceByTemplate] = useState<Record<string, { public_key: string }>>({});
  const [overridesText, setOverridesText] = useState("");
  const [installOverrides, setInstallOverrides] = useState<Record<string, unknown>>({});
  const [pageKeysText, setPageKeysText] = useState("");
  const [savingPageKeys, setSavingPageKeys] = useState(false);

  const normalizeListInput = (value: string) =>
    value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch<{ items: TemplateItem[] }>("/api/widget-templates");
        if (!mounted) return;
        setTemplates(res.items || []);
        if (!selectedId && res.items?.length) setSelectedId(res.items[0].id);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!overridesText.trim()) {
      setInstallOverrides({});
      return;
    }
    try {
      const parsed = JSON.parse(overridesText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setInstallOverrides(parsed as Record<string, unknown>);
      }
    } catch {
      // ignore until valid JSON
    }
  }, [overridesText]);

  const template = templates.find((item) => item.id === selectedId) || null;
  const instance = selectedId ? instanceByTemplate[selectedId] || null : null;
  const templateOptions = useMemo<SelectOption[]>(
    () =>
      templates.map((item) => ({
        id: item.id,
        label: item.name || item.id,
      })),
    [templates]
  );

  useEffect(() => {
    setPageKeysText(template?.page_keys?.join("\n") || "");
  }, [template]);

  useEffect(() => {
    let mounted = true;
    async function issue() {
      if (!template || instanceByTemplate[template.id]) return;
      try {
        const res = await apiFetch<{ item: { public_key: string } }>("/api/widget-instances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template_id: template.id }),
        });
        if (!mounted) return;
        setInstanceByTemplate((prev) => ({ ...prev, [template.id]: { public_key: res.item.public_key } }));
      } catch {
        // ignore
      }
    }
    void issue();
    return () => {
      mounted = false;
    };
  }, [template, instanceByTemplate]);

  const installScript = useMemo(() => {
    if (!instance?.public_key) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "https://mejai.help";
    const overrides =
      Object.keys(installOverrides).length > 0 ? JSON.stringify(installOverrides, null, 2).replace(/\n/g, "\\n") : "";
    const overridesSnippet = overrides
      ? `window.mejaiWidget = { key: \"${instance.public_key}\", overrides: ${overrides} };\\n`
      : `window.mejaiWidget = { key: \"${instance.public_key}\" };\\n`;
    return `<script>\\n${overridesSnippet}</script>\\n<script async src=\\\"${base}/widget.js\\\" data-key=\\\"${instance.public_key}\\\"></script>`;
  }, [installOverrides, instance?.public_key]);

  const installUrl = useMemo(() => {
    if (!instance?.public_key) return "";
    const overridesParam =
      Object.keys(installOverrides).length > 0 ? encodeWidgetOverrides(installOverrides) : "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const src = `${base}/embed/${instance.public_key}`;
    return overridesParam ? `${src}?ovr=${encodeURIComponent(overridesParam)}` : src;
  }, [installOverrides, instance?.public_key]);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-900">템플릿 선택</div>
        <SelectPopover
          value={selectedId}
          options={templateOptions}
          onChange={(value) => setSelectedId(value)}
          className="w-full"
          buttonClassName="h-9 text-xs"
        />
        <label className="block">
          <div className="mb-1 text-xs text-slate-600">템플릿 사용 페이지 키 (줄바꿈 또는 콤마)</div>
          <textarea
            value={pageKeysText}
            onChange={(e) => setPageKeysText(e.target.value)}
            className="w-full min-h-[70px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            placeholder="/app/install\n/app/conversation-dup"
          />
          <div className="mt-1 text-[11px] text-slate-500">
            예: <span className="font-mono">/app/install</span>, <span className="font-mono">/app/conversation-dup</span>
          </div>
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={!template || savingPageKeys}
          onClick={async () => {
            if (!template) return;
            setSavingPageKeys(true);
            try {
              const pageKeys = normalizeListInput(pageKeysText);
              const res = await apiFetch<{ item: TemplateItem }>(`/api/widget-templates/${template.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ page_keys: pageKeys }),
              });
              setTemplates((prev) =>
                prev.map((item) => (item.id === template.id ? { ...item, page_keys: res.item.page_keys } : item))
              );
            } finally {
              setSavingPageKeys(false);
            }
          }}
        >
          페이지 키 저장
        </Button>
        {loading ? <div className="text-xs text-slate-500">불러오는 중...</div> : null}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-900">Overrides (JSON)</div>
        <textarea
          value={overridesText}
          onChange={(e) => setOverridesText(e.target.value)}
          className="w-full min-h-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          placeholder='{"allowed_domains":["example.com"]}'
        />
        <div className="text-[11px] text-slate-500">템플릿 기본값을 덮어쓸 수 있습니다.</div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-900">설치 코드</div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-700 whitespace-pre-wrap">
          {installScript || "템플릿을 선택하세요."}
        </div>
        <div className="text-[11px] text-slate-500">Preview URL: {installUrl || "-"}</div>
        <Button
          type="button"
          variant="outline"
          disabled={!installScript}
          onClick={() => {
            if (!installScript) return;
            void navigator.clipboard.writeText(installScript);
          }}
        >
          설치 코드 복사
        </Button>
      </Card>
    </div>
  );
}
