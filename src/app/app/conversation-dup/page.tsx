"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { ChatSettingsPanel } from "@/components/conversation/ChatSettingsPanel";
import { apiFetch } from "@/lib/apiClient";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { encodeWidgetOverrides } from "@/lib/widgetOverrides";
import {
  WidgetLauncherRuntime,
  buildWidgetEmbedSrc,
  type WidgetConversationTab,
} from "@/components/design-system/widget/WidgetUI.parts";
import { WIDGET_PAGE_KEY, type ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";
import type { WidgetSetupConfig } from "@/lib/widgetTemplateMeta";

type TemplateItem = {
  id: string;
  name?: string | null;
  agent_id?: string | null;
  public_key?: string | null;
  allowed_domains?: string[] | null;
  allowed_paths?: string[] | null;
  theme?: Record<string, unknown> | null;
  is_active?: boolean | null;
  setup_config?: WidgetSetupConfig | null;
  chat_policy?: ConversationFeaturesProviderShape | null;
};

type KbItem = {
  id: string;
  title: string;
  is_active?: boolean | null;
  is_admin?: boolean | string | null;
};

type AgentItem = {
  id: string;
  name?: string | null;
  version?: string | null;
  is_active?: boolean | null;
  kb_id?: string | null;
};

type McpTool = {
  id: string;
  provider_key?: string | null;
  name: string;
};

function normalizeListInput(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleArrayValue(list: string[], value: string) {
  if (list.includes(value)) {
    return list.filter((item) => item !== value);
  }
  return [...list, value];
}

function readThemeString(theme: Record<string, unknown> | null, key: string) {
  const value = theme?.[key];
  return typeof value === "string" ? value : "";
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function StatusDot({ active }: { active?: boolean | null }) {
  const color =
    active === true ? "bg-emerald-500" : active === false ? "bg-rose-500" : "bg-slate-300";
  return <span className={`inline-flex h-[5px] w-[5px] rounded-full ${color}`} />;
}

export default function ConversationWidgetPage() {
  const [adminReady, setAdminReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<TemplateItem | null>(null);
  const [domainText, setDomainText] = useState("");
  const [pathText, setPathText] = useState("");
  const [setupConfig, setSetupConfig] = useState<WidgetSetupConfig>({
    kb: { mode: "inline", kb_id: "", admin_kb_ids: [] },
    mcp: { provider_keys: [], tool_ids: [] },
    llm: { default: "chatgpt" },
  });
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [activeTab, setActiveTab] = useState<"base" | "setup" | "policy" | "preview" | "install">("base");
  const [installOverridesText, setInstallOverridesText] = useState("");
  const [installOverrides, setInstallOverrides] = useState<Record<string, unknown>>({});
  const [previewMeta, setPreviewMeta] = useState({
    origin: "",
    page_url: "",
    referrer: "",
  });
  const [previewInitNonce, setPreviewInitNonce] = useState(0);
  const [previewHost, setPreviewHost] = useState<HTMLDivElement | null>(null);
  const widgetsPreviewRef = useRef<HTMLDivElement | null>(null);
  const [launcherHighlight, setLauncherHighlight] = useState(false);
  const [policyValue, setPolicyValue] = useState<ConversationFeaturesProviderShape | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyRefreshNonce, setPolicyRefreshNonce] = useState(0);
  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedId) || null,
    [selectedId, templates]
  );
  const agentsById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const kbById = useMemo(() => new Map(kbItems.map((kb) => [kb.id, kb])), [kbItems]);

  const handleCopy = useCallback((value?: string | null) => {
    const text = String(value || "").trim();
    if (!text) return;
    void navigator.clipboard?.writeText(text);
  }, []);

  const normalizeThemeValue = useCallback(
    (value: Record<string, unknown> | null | undefined) => ({
      greeting: readThemeString(value || null, "greeting"),
      input_placeholder: readThemeString(value || null, "input_placeholder"),
      launcher_icon_url: readThemeString(value || null, "launcher_icon_url"),
    }),
    []
  );

  const buildTemplateFingerprint = useCallback(
    (input: {
      name?: string | null;
      agent_id?: string | null;
      allowed_domains?: string[] | null;
      allowed_paths?: string[] | null;
      theme?: Record<string, unknown> | null;
      setup_config?: WidgetSetupConfig | null;
      is_active?: boolean | null;
    }) =>
      JSON.stringify({
        name: String(input.name || "").trim(),
        agent_id: input.agent_id ? String(input.agent_id) : null,
        allowed_domains: (input.allowed_domains || []).map((item) => String(item || "").trim()),
        allowed_paths: (input.allowed_paths || []).map((item) => String(item || "").trim()),
        theme: normalizeThemeValue(input.theme || null),
        setup_config: input.setup_config || null,
        is_active: input.is_active !== false,
      }),
    [normalizeThemeValue]
  );

  const buildDraftFingerprint = useCallback(
    (current: TemplateItem | null) =>
      JSON.stringify({
        name: String(current?.name || "").trim(),
        agent_id: current?.agent_id ? String(current.agent_id) : null,
        allowed_domains: normalizeListInput(domainText),
        allowed_paths: normalizeListInput(pathText),
        theme: normalizeThemeValue(current?.theme || null),
        setup_config: setupConfig,
        is_active: current?.is_active !== false,
      }),
    [domainText, normalizeThemeValue, pathText, setupConfig]
  );

  const isDirty = useMemo(() => {
    if (!selectedTemplate || !draft) return false;
    return buildDraftFingerprint(draft) !== buildTemplateFingerprint(selectedTemplate);
  }, [buildDraftFingerprint, buildTemplateFingerprint, draft, selectedTemplate]);

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
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: TemplateItem[] }>("/api/widget-templates");
      setTemplates(res.items || []);
      if (!selectedId && res.items?.length) {
        setSelectedId(res.items[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadDependencies = useCallback(async () => {
    const [kbRes, agentRes, mcpRes] = await Promise.all([
      apiFetch<{ items: KbItem[] }>("/api/kb?limit=200").catch(() => ({ items: [] })),
      apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200").catch(() => ({ items: [] })),
      apiFetch<{ items: McpTool[] }>("/api/mcp/tools").catch(() => ({ items: [] })),
    ]);
    setKbItems(kbRes.items || []);
    setAgents(agentRes.items || []);
    setMcpTools(mcpRes.items || []);
  }, []);

  useEffect(() => {
    if (!adminReady || !isAdmin) return;
    void loadTemplates();
    void loadDependencies();
  }, [adminReady, isAdmin, loadDependencies, loadTemplates]);

  useEffect(() => {
    if (!selectedId) return;
    const current = templates.find((item) => item.id === selectedId) || null;
    setDraft(current);
    if (current) {
      setDomainText((current.allowed_domains || []).join("\n"));
      setPathText((current.allowed_paths || []).join("\n"));
      setSetupConfig(
        current.setup_config || {
          kb: { mode: "inline", kb_id: "", admin_kb_ids: [] },
          mcp: { provider_keys: [], tool_ids: [] },
          llm: { default: "chatgpt" },
        }
      );
      setInstallOverridesText("");
      setInstallOverrides({});
    }
  }, [selectedId, templates]);

  useEffect(() => {
    if (!draft) return;
    const domainList = (draft.allowed_domains || []).map((item) => String(item || "").trim()).filter(Boolean);
    const pathList = (draft.allowed_paths || []).map((item) => String(item || "").trim()).filter(Boolean);
    const hasPreview = Boolean(previewMeta.origin || previewMeta.page_url || previewMeta.referrer);
    if (hasPreview) return;
    const origin =
      domainList.length > 0
        ? domainList[0].startsWith("http")
          ? domainList[0]
          : `https://${domainList[0]}`
        : typeof window !== "undefined"
          ? window.location.origin
          : "";
    const path = pathList.length > 0 && pathList[0] !== "*" ? pathList[0] : "/";
    setPreviewMeta({
      origin,
      page_url: origin ? `${origin}${path.startsWith("/") ? path : `/${path}`}` : "",
      referrer: origin,
    });
  }, [draft, previewMeta.origin, previewMeta.page_url, previewMeta.referrer]);

  useEffect(() => {
    if (!installOverridesText.trim()) {
      setInstallOverrides({});
      return;
    }
    try {
      const parsed = JSON.parse(installOverridesText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setInstallOverrides(parsed as Record<string, unknown>);
      }
    } catch {
      // ignore until valid JSON
    }
  }, [installOverridesText]);

  const agentOptions = useMemo<SelectOption[]>(
    () =>
      agents.map((agent) => ({
        id: agent.id,
        label: `${agent.name || agent.id}${agent.is_active ? "" : " (비활성)"}`,
        description: agent.version ? `v${agent.version}` : undefined,
      })),
    [agents]
  );

  const userKbOptions = useMemo<SelectOption[]>(
    () =>
      kbItems
        .filter((kb) => !kb.is_admin)
        .map((kb) => ({
          id: kb.id,
          label: kb.title,
        })),
    [kbItems]
  );

  const adminKbOptions = useMemo<SelectOption[]>(
    () =>
      kbItems
        .filter((kb) => kb.is_admin)
        .map((kb) => ({
          id: kb.id,
          label: kb.title,
        })),
    [kbItems]
  );

  const providerKeys = useMemo(() => {
    const map = new Map<string, number>();
    mcpTools.forEach((tool) => {
      const key = String(tool.provider_key || "").trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  }, [mcpTools]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ item: TemplateItem }>("/api/widget-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Widget Template" }),
      });
      setTemplates((prev) => {
        const exists = prev.some((item) => item.id === res.item.id);
        if (exists) {
          return prev.map((item) => (item.id === res.item.id ? res.item : item));
        }
        return [res.item, ...prev];
      });
      setSelectedId(res.item.id);
      setActiveTab("base");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ item: TemplateItem }>(`/api/widget-templates/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          agent_id: draft.agent_id || null,
          allowed_domains: normalizeListInput(domainText),
          allowed_paths: normalizeListInput(pathText),
          theme: draft.theme || {},
          setup_config: setupConfig,
          is_active: draft.is_active !== false,
        }),
      });
      setTemplates((prev) => prev.map((item) => (item.id === res.item.id ? res.item : item)));
      setDraft(res.item);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!draft) return;
    if (!window.confirm("이 위젯 템플릿을 삭제할까요?")) return;
    await apiFetch(`/api/widget-templates/${draft.id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((item) => item.id !== draft.id));
    setDraft(null);
    setSelectedId("");
  };

  const handlePreview = () => {
    setPreviewInitNonce((prev) => prev + 1);
  };

  const installOverridesJson = useMemo(() => {
    if (!installOverrides || Object.keys(installOverrides).length === 0) return "";
    return JSON.stringify(installOverrides, null, 2);
  }, [installOverrides]);

  const previewOverridesParam = useMemo(() => {
    if (!installOverrides || Object.keys(installOverrides).length === 0) return "";
    return encodeWidgetOverrides(installOverrides);
  }, [installOverrides]);

  const buildPreviewSrc = useCallback(
    (tab?: WidgetConversationTab) => {
      if (!draft?.public_key) return "";
      const base = typeof window !== "undefined" ? window.location.origin : "";
      return buildWidgetEmbedSrc(base, draft.public_key, "preview", "", previewOverridesParam, previewMeta, tab);
    },
    [draft?.public_key, previewOverridesParam, previewMeta]
  );

  const handleLauncherClick = useCallback(() => {
    setLauncherHighlight(true);
    widgetsPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!launcherHighlight) return;
    const timer = setTimeout(() => setLauncherHighlight(false), 800);
    return () => clearTimeout(timer);
  }, [launcherHighlight]);

  const installScript = useMemo(() => {
    if (!draft?.public_key) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "https://mejai.help";
    const escapedOverrides = installOverridesJson.replace(/\n/g, "\\n");
    const overridesSnippet =
      installOverridesJson.length > 0
        ? `window.mejaiWidget = { key: "${draft.public_key}", overrides: ${escapedOverrides} };\n`
        : `window.mejaiWidget = { key: "${draft.public_key}" };\n`;
    return `<script>\n${overridesSnippet}</script>\n<script async src="${base}/widget.js" data-key="${draft.public_key}"></script>`;
  }, [draft?.public_key, installOverridesJson]);

  const installUrl = useMemo(() => {
    if (!draft?.public_key) return "";
    const overridesParam =
      Object.keys(installOverrides).length > 0 ? encodeWidgetOverrides(installOverrides) : "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const src = `${base}/embed/${draft.public_key}`;
    return overridesParam ? `${src}?ovr=${encodeURIComponent(overridesParam)}` : src;
  }, [draft?.public_key, installOverrides]);

  const policyTemplateId = draft?.id && isValidUuid(String(draft.id)) ? String(draft.id) : "";
  useEffect(() => {
    if (!policyTemplateId) {
      setPolicyValue(null);
      setPolicyLoading(false);
      return;
    }
    let active = true;
    setPolicyLoading(true);
    apiFetch<{ provider?: ConversationFeaturesProviderShape | null }>(
      `/api/widget-templates/${policyTemplateId}/chat-policy`
    )
      .then((res) => {
        if (!active) return;
        setPolicyValue(res.provider || null);
      })
      .catch(() => {
        if (!active) return;
        setPolicyValue(null);
      })
      .finally(() => {
        if (!active) return;
        setPolicyLoading(false);
      });
    return () => {
      active = false;
    };
  }, [policyTemplateId, policyRefreshNonce]);

  const handleRefresh = useCallback(async () => {
    await loadTemplates();
    await loadDependencies();
    setPolicyRefreshNonce((prev) => prev + 1);
    setPreviewInitNonce((prev) => prev + 1);
  }, [loadDependencies, loadTemplates]);

  const handlePolicySave = useCallback(async () => {
    if (!policyTemplateId) return;
    setPolicySaving(true);
    try {
      await apiFetch(`/api/widget-templates/${policyTemplateId}/chat-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: policyValue }),
      });
    } finally {
      setPolicySaving(false);
    }
  }, [policyTemplateId, policyValue]);

  if (adminReady && !isAdmin) {
    return (
      <div className="px-5 md:px-8 pt-6 pb-[100px]">
        <Card className="p-4 text-sm text-slate-600">관리자 권한이 필요합니다.</Card>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 pt-6 pb-[100px]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">위젯 관리 (Conversation)</div>
            <div className="text-xs text-slate-500">템플릿을 관리하고 설치 코드를 생성합니다.</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">템플릿</div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={loading}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="새로고침"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={loading}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="새 템플릿"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {templates.length === 0 ? <div className="p-4 text-xs text-slate-400">템플릿이 없습니다.</div> : null}
            {templates.length > 0 ? (
              <ul className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_max-content] gap-x-0 divide-y divide-slate-200">
                <li className="contents">
                  <span className="flex min-h-[40px] items-center px-4 py-2 text-left text-[11px] font-semibold text-slate-500">
                    Widget
                  </span>
                  <span className="flex min-h-[40px] items-center px-4 py-2 text-left text-[11px] font-semibold text-slate-500">
                    Agent
                  </span>
                  <span className="flex min-h-[40px] items-center px-4 py-2 text-left text-[11px] font-semibold text-slate-500">
                    KB
                  </span>
                  <span className="flex min-h-[40px] items-center px-0 py-2 text-left text-[11px] font-semibold text-slate-500" />
                </li>
                <li className="col-span-full border-b border-slate-200" />
                {templates.map((item) => {
                  const isSelected = item.id === selectedId;
                  const agent = item.agent_id ? agentsById.get(item.agent_id) : null;
                  const kb = agent?.kb_id ? kbById.get(agent.kb_id) : null;
                  const cellBase =
                    "flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-700";
                  const cellSelected = "hover:bg-slate-50";
                  return (
                    <li
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(item.id);
                        }
                      }}
                      className="contents cursor-pointer"
                    >
                      <div className={`${cellBase} ${cellSelected}`}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCopy(item.id);
                          }}
                          title="클릭하여 위젯 ID 복사"
                          className="inline-flex min-w-0 items-center gap-2 truncate text-left font-semibold text-slate-900 hover:underline cursor-copy"
                        >
                          <StatusDot active={item.is_active} />
                          {item.name || item.id}
                        </button>
                      </div>
                      <div className={`${cellBase} ${cellSelected}`}>
                        {agent ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCopy(agent.id);
                            }}
                            title="클릭하여 agent_id 복사"
                            className="inline-flex min-w-0 items-center gap-2 truncate text-left font-medium text-slate-800 hover:underline cursor-copy"
                          >
                            <StatusDot active={agent.is_active} />
                            {agent.name || agent.id}
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                      <div className={`${cellBase} ${cellSelected}`}>
                        {kb ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCopy(kb.id);
                            }}
                            title="클릭하여 KB ID 복사"
                            className="inline-flex min-w-0 items-center gap-2 truncate text-left font-medium text-slate-800 hover:underline cursor-copy"
                          >
                            <StatusDot active={kb.is_active} />
                            {kb.title}
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                      <div className={`${cellBase} ${cellSelected} px-0 pr-4`}>
                        {isSelected ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (isDirty) void handleSave();
                              }}
                              disabled={!draft || loading || !isDirty}
                              aria-label={isDirty ? "저장" : "수정"}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-slate-700 ${
                                isDirty
                                  ? "border-amber-300 bg-amber-300 text-amber-950 hover:bg-amber-400"
                                  : "border-slate-200 bg-white text-slate-500"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {isDirty ? <Save className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDelete();
                              }}
                              disabled={!draft || loading}
                              aria-label="삭제"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Card>

          <div className="space-y-4">
            <Card className="p-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { key: "base", label: "기본" },
                  { key: "setup", label: "구성" },
                  { key: "policy", label: "대화 정책" },
                  { key: "preview", label: "미리보기" },
                  { key: "install", label: "설치 코드" },
                ].map((tab) => (
                  <Button
                    key={tab.key}
                    type="button"
                    variant={activeTab === tab.key ? "default" : "outline"}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    size="sm"
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </Card>

            {draft && activeTab === "base" ? (
              <Card className="p-4 space-y-3">
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">템플릿 이름</div>
                  <Input
                    value={draft.name || ""}
                    onChange={(e) => setDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                    className="h-9"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">에이전트</div>
                  <SelectPopover
                    value={draft.agent_id || ""}
                    options={agentOptions}
                    onChange={(value) => setDraft((prev) => (prev ? { ...prev, agent_id: value } : prev))}
                    className="w-full"
                    buttonClassName="h-9 text-xs"
                  />
                  <div className="mt-1 text-[11px] text-slate-500">
                    에이전트를 선택하면 MCP/KB 설정은 에이전트 설정을 사용합니다.
                  </div>
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">허용 도메인 (줄바꿈)</div>
                  <textarea
                    value={domainText}
                    onChange={(e) => setDomainText(e.target.value)}
                    className="w-full min-h-[90px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">허용 경로 (줄바꿈)</div>
                  <textarea
                    value={pathText}
                    onChange={(e) => setPathText(e.target.value)}
                    className="w-full min-h-[70px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">인사말</div>
                  <Input
                    value={readThemeString(draft.theme || {}, "greeting")}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, theme: { ...(prev.theme || {}), greeting: e.target.value } } : prev
                      )
                    }
                    className="h-9"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">입력 안내</div>
                  <Input
                    value={readThemeString(draft.theme || {}, "input_placeholder")}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, theme: { ...(prev.theme || {}), input_placeholder: e.target.value } }
                          : prev
                      )
                    }
                    className="h-9"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">아이콘 URL</div>
                  <Input
                    value={readThemeString(draft.theme || {}, "launcher_icon_url")}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, theme: { ...(prev.theme || {}), launcher_icon_url: e.target.value } }
                          : prev
                      )
                    }
                    className="h-9"
                  />
                </label>
              </Card>
            ) : null}

            {draft && activeTab === "setup" ? (
              <Card className="p-4 space-y-4">
                {draft.agent_id ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    에이전트가 선택되어 있으므로 MCP/KB 설정은 비활성화됩니다.
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-xs font-semibold text-slate-700">LLM 기본값</div>
                      <div className="mt-2 flex gap-2">
                        {["chatgpt", "gemini"].map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              setSetupConfig((prev) => ({ ...prev, llm: { ...(prev.llm || {}), default: id } }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${
                              setupConfig.llm?.default === id
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {id}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-700">KB 모드</div>
                      <div className="mt-2 flex gap-2">
                        {(
                          [
                            { key: "inline", label: "사용자 입력 KB" },
                            { key: "select", label: "KB 선택" },
                          ] as const
                        ).map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() =>
                              setSetupConfig((prev) => ({ ...prev, kb: { ...(prev.kb || {}), mode: item.key } }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${
                              setupConfig.kb?.mode === item.key
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {setupConfig.kb?.mode === "select" ? (
                      <div className="space-y-3">
                        <label className="block">
                          <div className="mb-1 text-xs text-slate-600">사용자 KB</div>
                          <SelectPopover
                            value={setupConfig.kb?.kb_id || ""}
                            options={userKbOptions}
                            onChange={(value) =>
                              setSetupConfig((prev) => ({
                                ...prev,
                                kb: { ...(prev.kb || {}), kb_id: value },
                              }))
                            }
                            className="w-full"
                            buttonClassName="h-9 text-xs"
                          />
                        </label>
                        <div>
                          <div className="mb-1 text-xs text-slate-600">관리자 KB</div>
                          <div className="flex flex-wrap gap-2">
                            {adminKbOptions.map((kb) => (
                              <button
                                key={kb.id}
                                type="button"
                                onClick={() =>
                                  setSetupConfig((prev) => ({
                                    ...prev,
                                    kb: {
                                      ...(prev.kb || {}),
                                      admin_kb_ids: toggleArrayValue(prev.kb?.admin_kb_ids || [], kb.id),
                                    },
                                  }))
                                }
                                className={`rounded-full border px-3 py-1 text-xs ${
                                  (setupConfig.kb?.admin_kb_ids || []).includes(kb.id)
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                {kb.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <div className="text-xs font-semibold text-slate-700">MCP Provider</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {providerKeys.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setSetupConfig((prev) => ({
                                ...prev,
                                mcp: {
                                  ...(prev.mcp || {}),
                                  provider_keys: toggleArrayValue(prev.mcp?.provider_keys || [], key),
                                },
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${
                              (setupConfig.mcp?.provider_keys || []).includes(key)
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-700">MCP Tool</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {mcpTools.map((tool) => (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() =>
                              setSetupConfig((prev) => ({
                                ...prev,
                                mcp: {
                                  ...(prev.mcp || {}),
                                  tool_ids: toggleArrayValue(prev.mcp?.tool_ids || [], tool.id),
                                },
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs ${
                              (setupConfig.mcp?.tool_ids || []).includes(tool.id)
                                ? "border-purple-600 bg-purple-600 text-white"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {tool.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </Card>
            ) : null}

            {draft && activeTab === "policy" ? (
              <div className="space-y-3">
                <Card className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">대화 정책 (dup)</div>
                      <div className="text-[11px] text-slate-500">
                        docs/guide/ref/conversation 기준 UI
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handlePolicySave()}
                      disabled={!policyTemplateId || policyLoading || policySaving}
                    >
                      {policySaving ? "저장 중..." : "정책 저장"}
                    </Button>
                  </div>
                </Card>
                {policyLoading ? (
                  <Card className="p-4 text-xs text-slate-500">정책을 불러오는 중...</Card>
                ) : (
                  <ChatSettingsPanel
                    value={policyValue}
                    onChange={setPolicyValue}
                    pageScope={[WIDGET_PAGE_KEY]}
                  />
                )}
              </div>
            ) : null}

            {draft && activeTab === "preview" ? (
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <label className="block">
                      <div className="mb-1 text-xs text-slate-600">Origin</div>
                      <Input
                        value={previewMeta.origin}
                        onChange={(e) => setPreviewMeta((prev) => ({ ...prev, origin: e.target.value }))}
                        className="h-9"
                        placeholder="https://example.com"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-slate-600">Page URL</div>
                      <Input
                        value={previewMeta.page_url}
                        onChange={(e) => setPreviewMeta((prev) => ({ ...prev, page_url: e.target.value }))}
                        className="h-9"
                        placeholder="https://example.com/page"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-slate-600">Referrer</div>
                      <Input
                        value={previewMeta.referrer}
                        onChange={(e) => setPreviewMeta((prev) => ({ ...prev, referrer: e.target.value }))}
                        className="h-9"
                        placeholder="https://ref.example.com"
                      />
                    </label>
                  </div>
                  <Button type="button" variant="outline" onClick={handlePreview}>
                    미리보기 적용
                  </Button>
                </Card>

                <Card className="p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-700">런처 위치 프리뷰</div>
                  <div className="relative h-[260px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div ref={setPreviewHost} className="absolute inset-0" />
                    {previewHost && draft.public_key ? (
                      <WidgetLauncherRuntime
                        cfg={{ overrides: installOverrides }}
                        baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
                        publicKey={draft.public_key}
                        visitorId="preview"
                        sessionId=""
                        sessionStorageKey={`preview_${draft.public_key}`}
                        position="bottom-right"
                        brandName={draft.name || "Mejai"}
                        launcherLabel="💬"
                        mountNode={previewHost}
                        previewMeta={previewMeta}
                        layout="absolute"
                        bottom="16px"
                        right="16px"
                        initNonce={previewInitNonce}
                        disableToggle
                        onLauncherClick={handleLauncherClick}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        미리보기 대상 위젯을 선택하세요.
                      </div>
                    )}
                  </div>
                </Card>

                <Card
                  ref={widgetsPreviewRef}
                  className={`p-4 space-y-3 ${launcherHighlight ? "ring-2 ring-slate-900" : ""}`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>위젯 UI 3분할 프리뷰</span>
                    <span className="text-[11px] font-normal text-slate-500">chat / list / policy</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {([
                      { tab: "chat", label: "Conversation" },
                      { tab: "list", label: "List" },
                      { tab: "policy", label: "Policy" },
                    ] as const).map((panel) => (
                      <div key={panel.tab} className="space-y-2">
                        <div className="text-[11px] font-semibold text-slate-600">{panel.label}</div>
                        <div className="h-[560px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                          {draft.public_key ? (
                            <iframe
                              key={`${draft.public_key}-${panel.tab}-${previewInitNonce}`}
                              title={`Widget ${panel.label} Preview`}
                              src={buildPreviewSrc(panel.tab)}
                              className="h-full w-full"
                              allow="clipboard-write"
                              style={{ border: "none" }}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-slate-400">
                              미리보기 대상 위젯을 선택하세요.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : null}

            {draft && activeTab === "install" ? (
              <Card className="p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-700">설치 코드 (템플릿 기반)</div>
                <div className="text-[11px] text-slate-500">
                  템플릿 기본값을 사용하며, overrides로 사이트별 설정을 덮어쓸 수 있습니다.
                </div>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">Overrides (JSON)</div>
                  <textarea
                    value={installOverridesText}
                    onChange={(e) => setInstallOverridesText(e.target.value)}
                    className="w-full min-h-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  />
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-700 whitespace-pre-wrap">
                  {installScript || "템플릿을 선택하세요."}
                </div>
                <div className="text-[11px] text-slate-500">Preview URL: {installUrl || "-"}</div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
