"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { SelectOption } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import {
  WIDGET_PAGE_KEY,
  normalizeConversationFeatureProvider,
  type ConversationFeaturesProviderShape,
} from "@/lib/conversation/pageFeaturePolicy";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { WidgetSetupConfig } from "@/lib/widgetTemplateMeta";
import {
  getPolicyWidgetTheme,
  setPolicyWidgetTheme,
  stripConversationPolicyTransientFields,
  withNullFeatureDefaults,
} from "@/lib/widgetPolicyUtils";
import { encodeWidgetOverrides } from "@/lib/widgetOverrides";
import { toast } from "sonner";

export type WidgetTemplateListItem = {
  id: string;
  name?: string | null;
  agent_id?: string | null;
  public_key?: string | null;
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
  is_public?: boolean | null;
  usable_id?: string[] | string | null;
  editable_id?: string[] | string | null;
  applies_to_user?: boolean | null;
};

export type WidgetTemplateAgentItem = {
  id: string;
  name?: string | null;
  version?: string | null;
  is_active?: boolean | null;
  kb_id?: string | null;
  llm?: string | null;
  editable_id?: string[] | string | null;
  usable_id?: string[] | string | null;
  is_public?: boolean | null;
};

type McpTool = {
  id: string;
  provider_key?: string | null;
  name: string;
  is_public?: boolean | null;
  usable_id?: string[] | string | null;
  editable_id?: string[] | string | null;
};

type PreviewMeta = {
  origin: string;
  page_url: string;
  referrer: string;
};

export type WidgetTemplateSettingsController = {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  templates: WidgetTemplateListItem[];
  templateOptions: SelectOption[];
  selectedTemplateId: string;
  selectTemplate: (id: string) => void;
  selectedTemplate: WidgetTemplateListItem | null;
  draft: WidgetTemplateListItem | null;
  updateDraftName: (next: string) => void;
  updateDraftActive: (next: boolean) => void;
  policyValue: ConversationFeaturesProviderShape | null;
  setPolicyValue: Dispatch<SetStateAction<ConversationFeaturesProviderShape | null>>;
  policyLoading: boolean;
  policySaving: boolean;
  templateDirty: boolean;
  policyDirty: boolean;
  hasUnsavedChanges: boolean;
  createTemplate: () => Promise<void>;
  deleteSelectedTemplate: () => Promise<void>;
  refresh: () => Promise<void>;
  saveAll: () => Promise<void>;
  editableAgents: WidgetTemplateAgentItem[];
  userKbOptions: SelectOption[];
  adminKbOptions: SelectOption[];
  inlineKbSampleOptions: SelectOption[];
  routeOptions: SelectOption[];
  mcpProviderOptions: SelectOption[];
  mcpToolOptions: SelectOption[];
  theme: Record<string, unknown>;
  setThemeField: (key: string, value: string) => void;
  previewMeta: PreviewMeta;
  updatePreviewMeta: (key: keyof PreviewMeta, value: string) => void;
  installOverridesText: string;
  setInstallOverridesText: (next: string) => void;
  installOverrides: Record<string, unknown>;
  previewOverridesParam: string;
  previewInitNonce: number;
  applyPreview: () => void;
  installScript: string;
  installUrl: string;
  templatePreviewUrl: string;
};

type UseWidgetTemplateSettingsControllerOptions = {
  enabled: boolean;
  isAdmin: boolean;
  selectedTemplateId?: string | null;
  onSelectedTemplateIdChange?: (next: string) => void;
};

function normalizeIdList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function hasUserAccess(
  item: { is_public?: boolean | null; editable_id?: unknown; usable_id?: unknown },
  userId: string,
  isAdmin: boolean
) {
  if (isAdmin) return true;
  if (!userId) return false;
  if (item.is_public) return true;
  const editable = normalizeIdList(item.editable_id);
  const usable = normalizeIdList(item.usable_id);
  return editable.includes(userId) || usable.includes(userId);
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildPolicyFingerprint(value: ConversationFeaturesProviderShape | null | undefined) {
  const normalized = normalizeConversationFeatureProvider(value);
  const merged = withNullFeatureDefaults(normalized, WIDGET_PAGE_KEY);
  return JSON.stringify(merged);
}

function buildTemplateFingerprint(value: WidgetTemplateListItem | null) {
  return JSON.stringify({
    name: String(value?.name || "").trim(),
    is_active: value?.is_active !== false,
  });
}

export function useWidgetTemplateSettingsController({
  enabled,
  isAdmin,
  selectedTemplateId,
  onSelectedTemplateIdChange,
}: UseWidgetTemplateSettingsControllerOptions): WidgetTemplateSettingsController {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<WidgetTemplateListItem[]>([]);
  const [selectedIdState, setSelectedIdState] = useState(String(selectedTemplateId || "").trim());
  const [draft, setDraft] = useState<WidgetTemplateListItem | null>(null);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [inlineKbSampleOptions, setInlineKbSampleOptions] = useState<SelectOption[]>([]);
  const [agents, setAgents] = useState<WidgetTemplateAgentItem[]>([]);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [policyValue, setPolicyValue] = useState<ConversationFeaturesProviderShape | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyRefreshNonce, setPolicyRefreshNonce] = useState(0);
  const [policyBaselineFingerprint, setPolicyBaselineFingerprint] = useState("");
  const [installOverridesText, setInstallOverridesText] = useState("");
  const [installOverrides, setInstallOverrides] = useState<Record<string, unknown>>({});
  const [previewMeta, setPreviewMeta] = useState<PreviewMeta>({
    origin: "",
    page_url: "",
    referrer: "",
  });
  const [previewInitNonce, setPreviewInitNonce] = useState(0);
  const selectedIdRef = useRef(selectedIdState);

  useEffect(() => {
    selectedIdRef.current = selectedIdState;
  }, [selectedIdState]);

  useEffect(() => {
    const normalized = String(selectedTemplateId || "").trim();
    if (normalized === selectedIdState) return;
    setSelectedIdState(normalized);
  }, [selectedIdState, selectedTemplateId]);

  const selectTemplate = useCallback(
    (next: string) => {
      const normalized = String(next || "").trim();
      setSelectedIdState(normalized);
      onSelectedTemplateIdChange?.(normalized);
    },
    [onSelectedTemplateIdChange]
  );

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id || "");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUserId(session?.user?.id || "");
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [enabled]);

  const loadTemplates = useCallback(
    async (preferredId?: string | null) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ items: WidgetTemplateListItem[] }>("/api/widget-templates");
        const nextTemplates = res.items || [];
        setTemplates(nextTemplates);
        const requestedId = String(preferredId || selectedIdRef.current || "").trim();
        const nextSelectedId =
          requestedId && nextTemplates.some((item) => item.id === requestedId)
            ? requestedId
            : nextTemplates[0]?.id || "";
        if (nextSelectedId !== selectedIdRef.current) {
          selectTemplate(nextSelectedId);
        }
      } catch (loadError) {
        setTemplates([]);
        setError(loadError instanceof Error ? loadError.message : "템플릿 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [enabled, selectTemplate]
  );

  const loadDependencies = useCallback(async () => {
    if (!enabled) return;
    const [kbRes, agentRes, mcpRes, sampleRes] = await Promise.all([
      apiFetch<{ items: KbItem[] }>("/api/kb?limit=200").catch(() => ({ items: [] })),
      apiFetch<{ items: WidgetTemplateAgentItem[] }>("/api/agents?limit=200").catch(() => ({ items: [] })),
      apiFetch<{ items: McpTool[] }>("/api/mcp/tools").catch(() => ({ items: [] })),
      apiFetch<{ items: Array<{ id: string; title: string }> }>("/api/kb/samples").catch(() => ({ items: [] })),
    ]);
    setKbItems(kbRes.items || []);
    setAgents(agentRes.items || []);
    setMcpTools(mcpRes.items || []);
    setInlineKbSampleOptions(
      (sampleRes.items || [])
        .map((item) => ({
          id: String(item.id || "").trim(),
          label: String(item.title || "샘플"),
        }))
        .filter((item) => item.id)
    );
  }, [enabled]);

  const loadPolicy = useCallback(async (templateId: string) => {
    if (!enabled || !templateId) {
      setPolicyValue(null);
      setPolicyBaselineFingerprint(buildPolicyFingerprint(null));
      return;
    }
    setPolicyLoading(true);
    try {
      const res = await apiFetch<{ provider?: ConversationFeaturesProviderShape | null }>(
        `/api/widget-templates/${templateId}/chat-policy`
      );
      setPolicyValue(res.provider || null);
      setPolicyBaselineFingerprint(buildPolicyFingerprint(res.provider || null));
    } catch {
      setPolicyValue(null);
      setPolicyBaselineFingerprint(buildPolicyFingerprint(null));
    } finally {
      setPolicyLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void loadTemplates(selectedTemplateId);
    void loadDependencies();
  }, [enabled, loadDependencies, loadTemplates, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedIdState) || null,
    [selectedIdState, templates]
  );

  useEffect(() => {
    if (!selectedTemplate) {
      setDraft(null);
      setPolicyValue(null);
      setPolicyBaselineFingerprint(buildPolicyFingerprint(null));
      return;
    }
    setDraft(selectedTemplate);
    setInstallOverridesText("");
    setInstallOverrides({});
    if (Object.prototype.hasOwnProperty.call(selectedTemplate, "chat_policy")) {
      setPolicyValue(selectedTemplate.chat_policy || null);
      setPolicyBaselineFingerprint(buildPolicyFingerprint(selectedTemplate.chat_policy || null));
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (!enabled) return;
    const templateId = selectedTemplate?.id && isValidUuid(String(selectedTemplate.id)) ? String(selectedTemplate.id) : "";
    if (!templateId) {
      setPolicyValue(null);
      setPolicyBaselineFingerprint(buildPolicyFingerprint(null));
      setPolicyLoading(false);
      return;
    }
    void loadPolicy(templateId);
  }, [enabled, loadPolicy, policyRefreshNonce, selectedTemplate?.id]);

  useEffect(() => {
    if (!policyValue) return;
    const theme = getPolicyWidgetTheme(policyValue);
    const setupConfig =
      policyValue.widget?.setup_config && isObject(policyValue.widget.setup_config)
        ? (policyValue.widget.setup_config as WidgetSetupConfig)
        : null;
    const agentId = typeof setupConfig?.agent_id === "string" ? setupConfig.agent_id : null;
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        theme,
        agent_id: agentId,
        setup_config: setupConfig,
      };
    });
  }, [policyValue]);

  useEffect(() => {
    if (!draft) return;
    if (previewMeta.origin || previewMeta.page_url || previewMeta.referrer) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const path = "/";
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
      // ignore invalid draft JSON until it becomes valid
    }
  }, [installOverridesText]);

  const templateOptions = useMemo<SelectOption[]>(
    () =>
      templates.map((item) => ({
        id: item.id,
        label: item.name || item.id,
      })),
    [templates]
  );

  const editableAgents = useMemo(
    () => agents.filter((agent) => hasUserAccess(agent, userId, isAdmin)),
    [agents, isAdmin, userId]
  );

  const userKbOptions = useMemo<SelectOption[]>(
    () =>
      kbItems
        .filter((kb) => !kb.is_admin && hasUserAccess(kb, userId, isAdmin) && kb.applies_to_user !== false)
        .map((kb) => ({
          id: kb.id,
          label: kb.title,
        })),
    [isAdmin, kbItems, userId]
  );

  const adminKbOptions = useMemo<SelectOption[]>(
    () =>
      kbItems
        .filter((kb) => kb.is_admin && hasUserAccess(kb, userId, isAdmin) && kb.applies_to_user !== false)
        .map((kb) => ({
          id: kb.id,
          label: kb.title,
        })),
    [isAdmin, kbItems, userId]
  );

  const accessibleMcpTools = useMemo(
    () => mcpTools.filter((tool) => hasUserAccess(tool, userId, isAdmin)),
    [isAdmin, mcpTools, userId]
  );

  const mcpProviderOptions = useMemo<SelectOption[]>(() => {
    const providerKeys = new Set<string>();
    accessibleMcpTools.forEach((tool) => {
      const key = String(tool.provider_key || "").trim();
      if (key) providerKeys.add(key);
    });
    return Array.from(providerKeys)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => ({ id: key, label: key }));
  }, [accessibleMcpTools]);

  const mcpToolOptions = useMemo<SelectOption[]>(
    () =>
      accessibleMcpTools.map((tool) => ({
        id: tool.id,
        label: tool.name,
        group: String(tool.provider_key || "").trim() || undefined,
      })),
    [accessibleMcpTools]
  );

  const routeOptions = useMemo<SelectOption[]>(
    () => [{ id: "shipping", label: "Core Runtime", description: "/api/runtime/chat" }],
    []
  );

  const updateDraftName = useCallback((next: string) => {
    setDraft((current) => (current ? { ...current, name: next } : current));
  }, []);

  const updateDraftActive = useCallback((next: boolean) => {
    setDraft((current) => (current ? { ...current, is_active: next } : current));
  }, []);

  const theme = useMemo(() => getPolicyWidgetTheme(policyValue), [policyValue]);

  const setThemeField = useCallback((key: string, value: string) => {
    setPolicyValue((current) => {
      const nextTheme = {
        ...getPolicyWidgetTheme(current),
        [key]: value,
      };
      return setPolicyWidgetTheme(current, nextTheme);
    });
  }, []);

  const templateFingerprint = useMemo(() => buildTemplateFingerprint(selectedTemplate), [selectedTemplate]);
  const draftFingerprint = useMemo(() => buildTemplateFingerprint(draft), [draft]);
  const templateDirty = useMemo(() => {
    if (!selectedTemplate || !draft) return false;
    return draftFingerprint !== templateFingerprint;
  }, [draft, draftFingerprint, selectedTemplate, templateFingerprint]);

  const policyFingerprint = useMemo(() => buildPolicyFingerprint(policyValue), [policyValue]);
  const policyDirty = useMemo(() => {
    if (!policyBaselineFingerprint) return false;
    return policyFingerprint !== policyBaselineFingerprint;
  }, [policyBaselineFingerprint, policyFingerprint]);

  const hasUnsavedChanges = templateDirty || policyDirty;

  const createTemplate = useCallback(async () => {
    if (!isAdmin) {
      toast.error("템플릿 생성은 관리자만 가능합니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ item: WidgetTemplateListItem }>("/api/widget-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Widget Template" }),
      });
      setTemplates((current) => {
        const next = current.filter((item) => item.id !== res.item.id);
        return [res.item, ...next];
      });
      selectTemplate(res.item.id);
      toast.success("템플릿을 생성했습니다.");
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "템플릿 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectTemplate]);

  const deleteSelectedTemplate = useCallback(async () => {
    if (!selectedTemplate?.id) return;
    if (!isAdmin) {
      toast.error("템플릿 삭제는 관리자만 가능합니다.");
      return;
    }
    if (!window.confirm("선택한 템플릿을 삭제할까요?")) return;
    try {
      await apiFetch(`/api/widget-templates/${selectedTemplate.id}`, { method: "DELETE" });
      setTemplates((current) => {
        const next = current.filter((item) => item.id !== selectedTemplate.id);
        const nextSelectedId = next[0]?.id || "";
        selectTemplate(nextSelectedId);
        return next;
      });
      setDraft(null);
      setPolicyValue(null);
      setPolicyBaselineFingerprint(buildPolicyFingerprint(null));
      toast.success("템플릿을 삭제했습니다.");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "템플릿 삭제에 실패했습니다.");
    }
  }, [isAdmin, selectTemplate, selectedTemplate?.id]);

  const refresh = useCallback(async () => {
    await loadTemplates(selectedIdRef.current);
    await loadDependencies();
    setPolicyRefreshNonce((current) => current + 1);
    setPreviewInitNonce((current) => current + 1);
  }, [loadDependencies, loadTemplates]);

  const saveAll = useCallback(async () => {
    const templateId = draft?.id && isValidUuid(String(draft.id)) ? String(draft.id) : "";
    if (!templateId || !draft) return;
    if (!isAdmin) {
      toast.error("템플릿 저장은 관리자만 가능합니다.");
      return;
    }
    setPolicySaving(true);
    try {
      if (templateDirty) {
        const res = await apiFetch<{ item: WidgetTemplateListItem }>(`/api/widget-templates/${templateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            is_active: draft.is_active !== false,
          }),
        });
        setTemplates((current) => current.map((item) => (item.id === res.item.id ? res.item : item)));
        setDraft(res.item);
      }
      const normalizedPolicy = normalizeConversationFeatureProvider(policyValue);
      const mergedPolicy = withNullFeatureDefaults(normalizedPolicy, WIDGET_PAGE_KEY);
      const cleanedPolicy = stripConversationPolicyTransientFields(mergedPolicy);
      await apiFetch(`/api/widget-templates/${templateId}/chat-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: cleanedPolicy }),
      });
      await loadTemplates(templateId);
      await loadPolicy(templateId);
      toast.success("템플릿 정책을 저장했습니다.");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "템플릿 저장에 실패했습니다.");
    } finally {
      setPolicySaving(false);
    }
  }, [draft, isAdmin, loadPolicy, loadTemplates, policyValue, templateDirty]);

  const updatePreviewMeta = useCallback((key: keyof PreviewMeta, value: string) => {
    setPreviewMeta((current) => ({ ...current, [key]: value }));
  }, []);

  const previewOverridesParam = useMemo(() => {
    if (Object.keys(installOverrides).length === 0) return "";
    return encodeWidgetOverrides(installOverrides);
  }, [installOverrides]);

  const installOverridesJson = useMemo(() => {
    if (Object.keys(installOverrides).length === 0) return "";
    return JSON.stringify(installOverrides, null, 2);
  }, [installOverrides]);

  const installScript = useMemo(() => {
    if (!draft?.public_key || !draft?.id) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "https://mejai.help";
    const escapedOverrides = installOverridesJson.replace(/\n/g, "\\n");
    const overridesSnippet =
      installOverridesJson.length > 0
        ? `window.mejaiWidget = { widget_id: "${draft.id}", public_key: "${draft.public_key}", overrides: ${escapedOverrides} };\n`
        : `window.mejaiWidget = { widget_id: "${draft.id}", public_key: "${draft.public_key}" };\n`;
    return `<script>\n${overridesSnippet}</script>\n<script async src="${base}/widget.js" data-widget-id="${draft.id}" data-public-key="${draft.public_key}"></script>`;
  }, [draft?.id, draft?.public_key, installOverridesJson]);

  const installUrl = useMemo(() => {
    if (!draft?.public_key || !draft?.id) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const src = `${base}/embed/widget_id=${encodeURIComponent(draft.id)}?public_key=${encodeURIComponent(
      draft.public_key
    )}`;
    return previewOverridesParam ? `${src}&ovr=${encodeURIComponent(previewOverridesParam)}` : src;
  }, [draft?.id, draft?.public_key, previewOverridesParam]);

  const templatePreviewUrl = useMemo(() => {
    if (!draft?.id || !draft?.public_key) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    if (!base) return "";
    const overrides = policyValue ? { chat_policy: policyValue } : {};
    const overridesParam =
      Object.keys(overrides).length > 0 ? encodeWidgetOverrides(overrides as Record<string, unknown>) : "";
    const url = new URL(`${base}/embed/widget_id=${draft.id}`);
    url.searchParams.set("public_key", draft.public_key);
    url.searchParams.set("preview", "1");
    if (overridesParam) url.searchParams.set("ovr", overridesParam);
    return url.toString();
  }, [draft?.id, draft?.public_key, policyValue]);

  const applyPreview = useCallback(() => {
    setPreviewInitNonce((current) => current + 1);
  }, []);

  return {
    isAdmin,
    loading,
    error,
    templates,
    templateOptions,
    selectedTemplateId: selectedIdState,
    selectTemplate,
    selectedTemplate,
    draft,
    updateDraftName,
    updateDraftActive,
    policyValue,
    setPolicyValue,
    policyLoading,
    policySaving,
    templateDirty,
    policyDirty,
    hasUnsavedChanges,
    createTemplate,
    deleteSelectedTemplate,
    refresh,
    saveAll,
    editableAgents,
    userKbOptions,
    adminKbOptions,
    inlineKbSampleOptions,
    routeOptions,
    mcpProviderOptions,
    mcpToolOptions,
    theme,
    setThemeField,
    previewMeta,
    updatePreviewMeta,
    installOverridesText,
    setInstallOverridesText,
    installOverrides,
    previewOverridesParam,
    previewInitNonce,
    applyPreview,
    installScript,
    installUrl,
    templatePreviewUrl,
  };
}
