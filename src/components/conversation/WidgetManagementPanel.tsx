 "use client";



import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Trash2 } from "lucide-react";

import { Card } from "@/components/ui/Card";

import { ChatSettingsPanel } from "@/components/conversation/ChatSettingsPanel";

import { Button } from "@/components/ui/Button";

import { Input } from "@/components/ui/Input";

import { apiFetch } from "@/lib/apiClient";

import {

  WidgetSettingsForm,

  type AgentItem,

  type WidgetConfig,

  type WidgetSavePayload,

} from "@/components/conversation/WidgetSettingsForm";

import { buildWidgetVisibilityQuery } from "@/lib/widgetInstanceOverrides";

import {

  diffConversationFeatureProviders,

  readConversationFeatureProvider,

} from "@/lib/conversation/policyMerge";

import {
  normalizeConversationFeatureProvider,
  normalizeWidgetChatPolicyConfig,
  type ConversationFeaturesProviderShape,
  type WidgetChatPolicyConfig,
  WIDGET_PAGE_KEY,
} from "@/lib/conversation/pageFeaturePolicy";

import { toast } from "sonner";



type PreviewWidget = WidgetConfig & { public_key?: string | null };



type PreviewMode = {

  id: "chat" | "list" | "setup";

  label: string;

  access: "public" | "user" | "admin";

};



const PREVIEW_MODES: PreviewMode[] = [

  { id: "chat", label: "Chat", access: "public" },

  { id: "list", label: "List", access: "user" },

  { id: "setup", label: "Setup", access: "admin" },

];



const PREVIEW_OVERRIDE_QUERY = buildWidgetVisibilityQuery({

  showHeader: true,

  showLogo: true,

  showStatus: true,

  showTabBar: true,

  showChatTab: true,

  showListTab: true,

  showPolicyTab: true,

  showChatPanel: true,

  showHistoryPanel: true,

});

function mergeWidgetPolicyFromConfig(
  provider: ConversationFeaturesProviderShape | null,
  widgetConfig: WidgetConfig | null
): ConversationFeaturesProviderShape | null {
  if (!widgetConfig) return provider;
  const base = provider ? { ...provider } : {};
  const policyWidget = normalizeWidgetChatPolicyConfig((provider as { widget?: WidgetChatPolicyConfig } | null)?.widget || {});
  const theme = { ...(policyWidget.theme || {}) };
  const widgetTheme = widgetConfig.theme || {};
  const launcherLogoId =
    theme.launcher_logo_id ||
    (widgetTheme as Record<string, unknown>).launcher_logo_id ||
    (widgetTheme as Record<string, unknown>).launcher_icon_url;
  if (launcherLogoId && !theme.launcher_logo_id) {
    theme.launcher_logo_id = String(launcherLogoId);
  }
  const mergedWidget: WidgetChatPolicyConfig = {
    ...policyWidget,
    ...(policyWidget.name ? {} : { name: widgetConfig.name || undefined }),
    ...(policyWidget.agent_id ? {} : { agent_id: widgetConfig.agent_id || undefined }),
    ...(Object.keys(theme).length ? { theme } : {}),
  };
  if (Object.keys(mergedWidget).length === 0) return provider;
  return { ...base, widget: mergedWidget };
}



export function WidgetManagementPanel() {

  const [loading, setLoading] = useState(true);

  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);

  const [agents, setAgents] = useState<AgentItem[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newWidgetMode, setNewWidgetMode] = useState(false);

  const agentNameById = useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach((agent) => {
      if (agent.id) map.set(agent.id, agent.name || agent.id);
    });
    return map;
  }, [agents]);



  const [origin, setOrigin] = useState("");

  const [pageUrl, setPageUrl] = useState("");

  const [referrer, setReferrer] = useState("");

  const [visitorId, setVisitorId] = useState("");

  const [testUserId, setTestUserId] = useState("");

  const [testUserEmail, setTestUserEmail] = useState("");

  const [testUserName, setTestUserName] = useState("");

  const [previewCodeByMode, setPreviewCodeByMode] = useState<Record<PreviewMode["id"], string>>({

    chat: "",

    list: "",

    setup: "",

  });

  const [policySnapshot, setPolicySnapshot] = useState<ConversationFeaturesProviderShape | null>(null);

  const policySyncRef = useRef<Record<string, string>>({});



  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});



  const loadWidgets = useCallback(async () => {

    setLoading(true);

    try {

      const [widgetRes, agentRes] = await Promise.all([

        apiFetch<{ items: WidgetConfig[]; item?: WidgetConfig | null }>("/api/widgets"),

        apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200"),

      ]);

      const items = Array.isArray(widgetRes.items) ? widgetRes.items : [];

      setWidgets(items);

      setAgents(agentRes.items || []);

      if (newWidgetMode) {
        setSelectedId(null);
      } else {
        setSelectedId((prev) => prev || items[0]?.id || null);
      }

    } catch {

      setWidgets([]);

    } finally {

      setLoading(false);

    }

  }, [newWidgetMode]);



  useEffect(() => {

    void loadWidgets();

  }, [loadWidgets]);



  useEffect(() => {

    if (newWidgetMode) return;

    if (!selectedId) return;

    if (widgets.some((widget) => widget.id === selectedId)) return;

    setSelectedId(widgets[0]?.id || null);

  }, [selectedId, widgets, newWidgetMode]);

  useEffect(() => {

    if (typeof window === "undefined") return;

    if (!origin) {

      const base = window.location.origin;

      setOrigin(base);

      setPageUrl(`${base}/support`);

      setReferrer(`${base}/`);

    }

    if (!visitorId) {

      setVisitorId(`mw_preview_${Math.random().toString(36).slice(2, 10)}`);

    }

  }, [origin, visitorId]);



  const selectedWidget = useMemo(

    () => widgets.find((widget) => widget.id === selectedId) || null,

    [widgets, selectedId]

  );
  const showDetails = Boolean(selectedWidget) || newWidgetMode;



  const previewWidget = useMemo(() => (selectedWidget ? (selectedWidget as PreviewWidget) : null), [selectedWidget]);



  const parsedPolicy = useMemo(

    () => readConversationFeatureProvider(selectedWidget?.chat_policy ?? null),

    [selectedWidget?.chat_policy]

  );



  useEffect(() => {
    const merged = mergeWidgetPolicyFromConfig(parsedPolicy, selectedWidget);
    setPolicySnapshot(merged);
  }, [parsedPolicy, selectedWidget]);



  useEffect(() => {

    if (!selectedWidget?.id) return;

    const rawPolicy = selectedWidget.chat_policy ?? null;

    const normalized = rawPolicy ? normalizeConversationFeatureProvider(rawPolicy) : null;

    if (!rawPolicy || !normalized) return;

    const diff = diffConversationFeatureProviders(rawPolicy as ConversationFeaturesProviderShape, normalized);

    if (!diff) return;

    const syncKey = `${selectedWidget.id}:${JSON.stringify(rawPolicy)}`;

    if (policySyncRef.current[selectedWidget.id] === syncKey) return;

    policySyncRef.current[selectedWidget.id] = syncKey;

    void (async () => {

      try {

        const res = await apiFetch<{ item: WidgetConfig }>(`/api/widgets/${selectedWidget.id}`, {

          method: "PATCH",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ chat_policy: normalized }),

        });

        setWidgets((prev) => {

          const next = [...prev];

          const idx = next.findIndex((item) => item.id === res.item.id);

          if (idx >= 0) next[idx] = res.item;

          return next;

        });

        setPolicySnapshot(readConversationFeatureProvider(res.item.chat_policy ?? null));

      } catch {

        // ignore sync failure

      }

    })();

  }, [selectedWidget?.id, selectedWidget?.chat_policy]);

  const handlePolicyChange = useCallback((next: ConversationFeaturesProviderShape) => {

    setPolicySnapshot(normalizeConversationFeatureProvider(next));

  }, []);

  const handleSave = async (payload: WidgetSavePayload) => {

    const targetId = selectedWidget?.id;

    const nextPolicy = policySnapshot ?? parsedPolicy ?? null;

    const payloadWithPolicy = { ...payload, chat_policy: normalizeConversationFeatureProvider(nextPolicy) };
    const policyWidget = (nextPolicy as { widget?: WidgetChatPolicyConfig } | null)?.widget || null;
    const nextTheme = { ...(payloadWithPolicy.theme || {}) };
    if (policyWidget?.theme) {
      Object.assign(nextTheme, policyWidget.theme);
    }
    if (policyWidget?.theme?.launcher_logo_id) {
      nextTheme.launcher_logo_id = policyWidget.theme.launcher_logo_id;
    }
    const payloadWithWidgetPolicy = {
      ...payloadWithPolicy,
      name: policyWidget?.name ?? payloadWithPolicy.name,
      agent_id: policyWidget?.agent_id ?? payloadWithPolicy.agent_id,
      theme: nextTheme,
    };

    const res = await apiFetch<{ item: WidgetConfig }>(targetId ? `/api/widgets/${targetId}` : "/api/widgets", {

      method: targetId ? "PATCH" : "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(payloadWithWidgetPolicy),

    });

    setWidgets((prev) => {

      const next = [...prev];

      const idx = next.findIndex((item) => item.id === res.item.id);

      if (idx >= 0) {

        next[idx] = res.item;

        return next;

      }

      return [res.item, ...next];

    });

    setSelectedId(res.item.id || null);
    setNewWidgetMode(false);

    setPolicySnapshot(readConversationFeatureProvider(res.item.chat_policy ?? null));

    return res.item;

  };

  const handleCopy = useCallback(async (value: string, label: string) => {
    const text = String(value || "").trim();
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Copy failed.");
    }
  }, []);



  const handleDelete = async (widget: WidgetConfig) => {

    if (!widget?.id) return;

    const name = widget.name || "Widget";

    if (!window.confirm(`Delete widget "${name}"?`)) return;

    try {

      await apiFetch<{ ok: boolean }>(`/api/widgets/${widget.id}`, { method: "DELETE" });

      setWidgets((prev) => prev.filter((item) => item.id !== widget.id));

      setSelectedId((prev) => {

        if (prev !== widget.id) return prev;

        const remaining = widgets.filter((item) => item.id !== widget.id);

        return remaining[0]?.id || null;

      });

      toast.success("Widget deleted.");

    } catch {

      toast.error("Delete failed.");

    }

  };



  const buildDefaultPreviewCode = useCallback(

    (widget: PreviewWidget, mode: PreviewMode) => {

      const publicKey = String(widget.public_key || "").trim();

      if (!publicKey) return "";

      const base =

        origin || (typeof window !== "undefined" && window.location.origin ? window.location.origin : "http://localhost:3000");

      const params = new URLSearchParams();

      params.set("vid", visitorId || "mw_preview");

      params.set("embed_view", mode.id);

      if (PREVIEW_OVERRIDE_QUERY) {

        const extra = new URLSearchParams(PREVIEW_OVERRIDE_QUERY);

        extra.forEach((value, key) => params.set(key, value));

      }

      const src = `${base}/embed/${encodeURIComponent(publicKey)}?${params.toString()}`;

      return `<iframe src="${src}" style="width:360px;height:560px;border:0;"></iframe>`;

    },

    [origin, visitorId]

  );



  useEffect(() => {

    if (!previewWidget) {

      setPreviewCodeByMode({ chat: "", list: "", setup: "" });

      return;

    }

    const next: Record<PreviewMode["id"], string> = { chat: "", list: "", setup: "" };

    PREVIEW_MODES.forEach((mode) => {

      next[mode.id] = buildDefaultPreviewCode(previewWidget, mode);

    });

    setPreviewCodeByMode(next);

  }, [buildDefaultPreviewCode, previewWidget]);



  const extractPreviewUrl = useCallback((code: string) => {

    const trimmed = String(code || "").trim();

    if (!trimmed) return "";

    const sliceUntilTerminator = (value: string) => {

      for (let i = 0; i < value.length; i += 1) {

        const ch = value[i];

        if (ch <= " " || ch === '"' || ch === "'" || ch === "<" || ch === ">") {

          return value.slice(0, i);

        }

      }

      return value;

    };

    const lower = trimmed.toLowerCase();

    const srcIndex = lower.indexOf("src=");

    if (srcIndex >= 0) {

      const after = trimmed.slice(srcIndex + 4).trimStart();

      const quote = after[0];

      if (quote === '"' || quote === "'") {

        const endIndex = after.indexOf(quote, 1);

        if (endIndex > 1) return after.slice(1, endIndex);

      }

    }

    const httpIndex = lower.indexOf("http://");

    const httpsIndex = lower.indexOf("https://");

    let startIndex = -1;

    if (httpIndex >= 0 && httpsIndex >= 0) startIndex = Math.min(httpIndex, httpsIndex);

    else startIndex = Math.max(httpIndex, httpsIndex);

    if (startIndex >= 0) return sliceUntilTerminator(trimmed.slice(startIndex));

    const embedIndex = trimmed.indexOf("/embed/");

    if (embedIndex >= 0) return sliceUntilTerminator(trimmed.slice(embedIndex));

    return "";

  }, []);



  const readPreviewParamsFromCode = useCallback(

    (code: string) => {

      const url = extractPreviewUrl(code);

      if (!url) return null;

      try {

        const base =

          origin || (typeof window !== "undefined" && window.location.origin ? window.location.origin : "http://localhost:3000");

        const parsed = new URL(url, base);

        return parsed.searchParams;

      } catch {

        return null;

      }

    },

    [extractPreviewUrl, origin]

  );



  const buildPreviewSrc = useCallback(

    (widget: PreviewWidget, mode: PreviewMode, code?: string) => {

      const publicKey = String(widget.public_key || "").trim();

      if (!publicKey) return "";

      const params = new URLSearchParams();

      params.set("vid", visitorId || "mw_preview");

      params.set("embed_view", mode.id);

      if (PREVIEW_OVERRIDE_QUERY) {

        const extra = new URLSearchParams(PREVIEW_OVERRIDE_QUERY);

        extra.forEach((value, key) => params.set(key, value));

      }

      const codeParams = code ? readPreviewParamsFromCode(code) : null;

      if (codeParams) {

        codeParams.forEach((value, key) => params.set(key, value));

      }

      params.set("embed_view", mode.id);

      return `/embed/${encodeURIComponent(publicKey)}?${params.toString()}`;

    },

    [readPreviewParamsFromCode, visitorId]

  );



  const buildInitPayload = useCallback(() => {

    const userPayload: Record<string, any> = {};

    if (testUserId.trim()) userPayload.id = testUserId.trim();

    if (testUserEmail.trim()) userPayload.email = testUserEmail.trim();

    if (testUserName.trim()) userPayload.name = testUserName.trim();

    return {

      type: "mejai_widget_init",

      origin: origin || "",

      page_url: pageUrl || "",

      referrer: referrer || "",

      visitor_id: visitorId || "",

      user: Object.keys(userPayload).length > 0 ? userPayload : null,

    };

  }, [origin, pageUrl, referrer, testUserEmail, testUserId, testUserName, visitorId]);



  const sendInit = useCallback(

    (iframe: HTMLIFrameElement | null) => {

      if (!iframe) return;

      try {

        iframe.contentWindow?.postMessage(buildInitPayload(), "*");

      } catch {

        // ignore

      }

    },

    [buildInitPayload]

  );



  const broadcastInit = useCallback(() => {

    Object.values(iframeRefs.current).forEach((iframe) => sendInit(iframe));

    toast.success("초기화 요청 전송");

  }, [sendInit]);



  if (loading) {

    return <div className="text-sm text-slate-500">{"불러오는 중..."}</div>;

  }



  const policyPanel = (
    <ChatSettingsPanel
      value={policySnapshot ?? parsedPolicy ?? null}
      onChange={handlePolicyChange}
      showHeader={false}
      showRegistryPanel={false}
      includeHeaderColumn={false}
      pageLabelOverride={selectedWidget?.id || "widget"}
      pageScope={[WIDGET_PAGE_KEY]}
          />
  );



  return (

    <div className="space-y-6">

      <Card className="p-4 space-y-3">

        <div className="flex items-center justify-between">

          <div className="text-sm font-semibold text-slate-900">Widget List</div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (newWidgetMode) {
                setNewWidgetMode(false);
                return;
              }
              setNewWidgetMode(true);
              setSelectedId(null);
            }}
          >
            {newWidgetMode ? "X" : "New Widget"}
          </Button>

        </div>

        {widgets.length === 0 ? (

          <div className="text-xs text-slate-500">{"위젯이 없습니다."}</div>

        ) : (

          <div className="flex flex-nowrap gap-2 overflow-x-auto">

            {widgets.map((item, index) => {

              const isSelected = item.id === selectedId;

              const rowKey = item.id || item.public_key || item.name || `widget-${index}`;

              const mergedPolicy = readConversationFeatureProvider(item.chat_policy ?? null);

              const widgetPolicy = (mergedPolicy as { widget?: WidgetChatPolicyConfig } | null)?.widget || null;

              const displayName = widgetPolicy?.name || item.name || "Web Widget";

              const widgetId = item.id || "-";

              const agentId = widgetPolicy?.agent_id || item.agent_id || "";
              const agentName = agentId ? agentNameById.get(agentId) || "Unknown agent" : "Unassigned";

              const isActive = widgetPolicy?.is_active !== false;

              return (

                <div

                  key={rowKey}

                  className={`min-w-[240px] flex-1 rounded-lg border px-3 py-2 text-xs ${

                    isSelected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"

                  }`}

                >

                  <div className="flex items-start justify-between gap-2">

                    <button

                      type="button"

                      onClick={() => {
                        if (isSelected) {
                          setSelectedId(null);
                          return;
                        }
                        setSelectedId(item.id || null);
                        if (newWidgetMode) setNewWidgetMode(false);
                      }}

                      className="text-left flex-1"

                    >

                      <div
                        className="font-semibold text-slate-900 hover:underline cursor-pointer"
                        title="Click to copy widget_id"
                        onClick={() => handleCopy(widgetId, "widget_id")}
                      >
                        {displayName}
                      </div>
                      <div
                        className="mt-1 text-[11px] text-slate-600 hover:underline cursor-pointer"
                        title="Click to copy agent_id"
                        onClick={() => handleCopy(agentId, "agent_id")}
                      >
                        {agentName}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        status:{" "}
                        <span className={isActive ? "text-emerald-700" : "text-rose-600"}>
                          {isActive ? "active" : "inactive"}
                        </span>
                      </div>

                    </button>

                    <div className="flex items-center gap-1">

                      <button

                        type="button"

                        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:border-rose-300 hover:text-rose-600"

                        onClick={() => handleDelete(item)}

                        title="Delete"

                      >

                        <Trash2 className="h-4 w-4" />

                      </button>

                    </div>

                  </div>

                </div>

              );

            })}

          </div>

        )}

      </Card>



      {showDetails ? (
      <Card className="p-4 space-y-6">

        <div className="grid grid-cols-1 gap-6">

          <WidgetSettingsForm

            widget={selectedWidget}


            onSave={handleSave}

            onSaved={(next) => {
              setSelectedId(next.id || null);
              setNewWidgetMode(false);
            }}

            title={"위젯 설정"}

            extra={policyPanel}

          />

        </div>



        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">테스트 호출</div>
            <Button type="button" variant="outline" onClick={broadcastInit}>
              초기화 요청
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <label className="text-xs text-slate-600">
              방문 Origin
              <Input value={origin} onChange={(e) => setOrigin(e.target.value)} className="mt-1 h-9" />
            </label>
            <label className="text-xs text-slate-600">
              페이지 URL
              <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} className="mt-1 h-9" />
            </label>
            <label className="text-xs text-slate-600">
              리퍼러
              <Input value={referrer} onChange={(e) => setReferrer(e.target.value)} className="mt-1 h-9" />
            </label>
            <label className="text-xs text-slate-600">
              방문자 ID
              <Input value={visitorId} onChange={(e) => setVisitorId(e.target.value)} className="mt-1 h-9" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs text-slate-600">
              테스트 사용자 ID
              <Input value={testUserId} onChange={(e) => setTestUserId(e.target.value)} className="mt-1 h-9" />
            </label>
            <label className="text-xs text-slate-600">
              테스트 사용자 이메일
              <Input value={testUserEmail} onChange={(e) => setTestUserEmail(e.target.value)} className="mt-1 h-9" />
            </label>
            <label className="text-xs text-slate-600">
              테스트 사용자 이름
              <Input value={testUserName} onChange={(e) => setTestUserName(e.target.value)} className="mt-1 h-9" />
            </label>
          </div>

          {!previewWidget ? (

              <div className="text-xs text-slate-500">{"미리보기 위젯을 선택하세요."}</div>

            ) : (

              <div className="space-y-4">

                {(() => {

                  const widget = previewWidget;

                  const mergedPolicy = policySnapshot ?? readConversationFeatureProvider(widget?.chat_policy ?? null);

                  const widgetPolicy = (mergedPolicy as { widget?: WidgetChatPolicyConfig } | null)?.widget || null;

                  const isActive = widgetPolicy?.is_active !== false;

                  const displayName = widgetPolicy?.name || widget.name || widget.public_key || widget.id;

                  return (

                    <div key={widget.id} className="space-y-3">

                      <div className="text-xs font-semibold text-slate-700">

                        {displayName}

                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                        {PREVIEW_MODES.map((mode) => {

                          const previewCode = previewCodeByMode[mode.id] || "";

                          const src = buildPreviewSrc(widget, mode, previewCode);

                          const frameKey = `${widget.id}-${mode.id}`;

                          return (

                            <div

                              key={frameKey}

                              className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col gap-3"

                            >

                              <div className="text-xs font-semibold text-slate-700">{mode.label}</div>

                              <iframe

                                ref={(el) => {

                                  iframeRefs.current[frameKey] = el;

                                }}

                                title={`widget-preview-${widget.id}-${mode.id}`}

                                src={src}

                                className="w-full h-[420px] border border-slate-200 rounded-md bg-white"

                                onLoad={(event) => sendInit(event.currentTarget)}

                              />

                              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">

                                <div className="flex items-center gap-2">

                                  <span

                                    className={`rounded-full px-2 py-[2px] text-[10px] font-semibold ${

                                      isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"

                                    }`}

                                  >

                                    {isActive ? "ON" : "OFF"}

                                  </span>

                                  <span className="rounded-full bg-slate-900 px-2 py-[2px] text-[10px] font-semibold text-white">

                                    {mode.access}

                                  </span>

                                </div>

                              </div>

                              <div className="space-y-1">

                                <div className="text-[11px] text-slate-500">Install code</div>

                                <textarea

                                  value={previewCode}

                                  onChange={(e) =>

                                    setPreviewCodeByMode((prev) => ({ ...prev, [mode.id]: e.target.value }))

                                  }

                                  className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] font-mono text-slate-700"

                                />

                                <div className="text-[10px] text-slate-500">

                                  Add query params to override chat_policy (e.g. <span className="font-mono">policy=&#123;...&#125;</span>).

                                </div>

                              </div>

                            </div>

                          );

                        })}

                      </div>

                    </div>

                  );

                })()}

              </div>

            )}

        </div>

      </Card>
      ) : null}

    </div>

  );

}











