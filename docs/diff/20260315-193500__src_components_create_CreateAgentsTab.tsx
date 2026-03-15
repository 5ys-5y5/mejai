"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { MultiSelectPopover, SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { StateBanner } from "@/components/design-system";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CreateListTable, CreateResourceShell } from "@/components/create/CreateResourceShell";
import { apiFetch } from "@/lib/apiClient";
import {
  buildAgentMcpBindingsFromSelections,
  createEmptyProviderToolSelections,
  groupSupportedToolIdsByProvider,
  normalizeAgentMcpBindings,
} from "@/lib/agentMcpBindings";
import {
  SUPPORTED_PROVIDER_KEYS,
  SUPPORTED_PROVIDER_META,
  readSupportedProviderState,
  type SupportedProviderKey,
  type SupportedProviderState,
} from "@/lib/providerConnections";
import { formatKstDateTime } from "@/lib/kst";
import { toast } from "sonner";

type AgentItem = {
  id: string;
  parent_id?: string | null;
  name: string;
  llm: string | null;
  kb_id: string | null;
  mcp_tool_ids?: string[] | null;
  mcp_provider_bindings?: Record<string, unknown> | null;
  version: string | null;
  is_active: boolean | null;
  created_at?: string | null;
  website?: string | null;
  goal?: string | null;
};

type KbItem = {
  id: string;
  title: string;
  version: string | null;
  is_active: boolean | null;
};

type McpTool = {
  id: string;
  name: string;
  tool_key?: string;
  provider_key?: string;
  description?: string | null;
};

type ProviderStateMap = {
  cafe24: SupportedProviderState<"cafe24">;
  juso: SupportedProviderState<"juso">;
  solapi: SupportedProviderState<"solapi">;
};

type ProviderToolSelections = Record<SupportedProviderKey, string[]>;
type ProviderConnectionSelections = Partial<Record<SupportedProviderKey, string>>;

function parseVersionParts(value?: string | null) {
  if (!value) return null;
  const raw = value.trim();
  const match = raw.match(/^v?(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?$/i);
  if (!match) return null;
  return [Number(match[1] || 0), Number(match[2] || 0), Number(match[3] || 0)];
}

function compareAgentVersions(a: AgentItem, b: AgentItem) {
  const aParts = parseVersionParts(a.version);
  const bParts = parseVersionParts(b.version);
  if (aParts && bParts) {
    for (let index = 0; index < 3; index += 1) {
      if (aParts[index] !== bParts[index]) return bParts[index] - aParts[index];
    }
  } else if (aParts && !bParts) {
    return -1;
  } else if (!aParts && bParts) {
    return 1;
  }
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bTime - aTime;
}

function getActiveAgents(items: AgentItem[]) {
  const map = new Map<string, AgentItem>();
  items.forEach((item) => {
    const key = item.parent_id ?? item.id;
    if (item.is_active) {
      map.set(key, item);
      return;
    }
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      return;
    }
    if (!existing.is_active && compareAgentVersions(item, existing) < 0) {
      map.set(key, item);
    }
  });
  return Array.from(map.values()).sort(compareAgentVersions);
}

export function CreateAgentsTab() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [providerStates, setProviderStates] = useState<ProviderStateMap>({
    cafe24: { connections: [] },
    juso: { connections: [] },
    solapi: { connections: [] },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [name, setName] = useState("");
  const [llm, setLlm] = useState("chatgpt");
  const [kbId, setKbId] = useState("");
  const [website, setWebsite] = useState("");
  const [goal, setGoal] = useState("");
  const [selectedProviders, setSelectedProviders] = useState<SupportedProviderKey[]>([]);
  const [selectedToolIdsByProvider, setSelectedToolIdsByProvider] =
    useState<ProviderToolSelections>(createEmptyProviderToolSelections);
  const [selectedConnectionIdsByProvider, setSelectedConnectionIdsByProvider] = useState<ProviderConnectionSelections>({});
  const [legacyToolIds, setLegacyToolIds] = useState<string[]>([]);

  const loadData = async (nextSelectedId?: string | null, preserveCreateMode = false) => {
    setLoading(true);
    setError(null);
    try {
      const [agentRes, kbRes, toolRes, cafe24Res, jusoRes, solapiRes] = await Promise.all([
        apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200"),
        apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
        apiFetch<{ items: McpTool[] }>("/api/mcp/tools").catch(() => ({ items: [] })),
        apiFetch<{ provider: Record<string, unknown> }>("/api/auth-settings/providers?provider=cafe24"),
        apiFetch<{ provider: Record<string, unknown> }>("/api/auth-settings/providers?provider=juso"),
        apiFetch<{ provider: Record<string, unknown> }>("/api/auth-settings/providers?provider=solapi"),
      ]);
      const nextAgents = agentRes.items || [];
      const active = getActiveAgents(nextAgents);
      setAgents(nextAgents);
      setKbItems(kbRes.items || []);
      setMcpTools(toolRes.items || []);
      setProviderStates({
        cafe24: readSupportedProviderState({ cafe24: cafe24Res.provider }, "cafe24"),
        juso: readSupportedProviderState({ juso: jusoRes.provider }, "juso"),
        solapi: readSupportedProviderState({ solapi: solapiRes.provider }, "solapi"),
      });

      if (preserveCreateMode) {
        setSelectedId(null);
        setIsCreating(true);
      } else if (nextSelectedId && active.some((item) => item.id === nextSelectedId)) {
        setSelectedId(nextSelectedId);
        setIsCreating(false);
      } else if (!selectedId && active.length > 0) {
        setSelectedId(active[0].id);
      } else if (selectedId && !active.some((item) => item.id === selectedId)) {
        setSelectedId(active[0]?.id || null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "비서 목록을 불러오지 못했습니다.");
      setAgents([]);
      setKbItems([]);
      setMcpTools([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeAgents = useMemo(() => getActiveAgents(agents), [agents]);
  const selectedAgent = useMemo(
    () => activeAgents.find((item) => item.id === selectedId) || null,
    [activeAgents, selectedId]
  );

  const kbById = useMemo(() => {
    const map = new Map<string, KbItem>();
    kbItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [kbItems]);

  const toolProviderById = useMemo(() => {
    const map = new Map<string, string>();
    mcpTools.forEach((tool) => {
      if (tool.id) {
        map.set(tool.id, String(tool.provider_key || "").trim().toLowerCase());
      }
    });
    return map;
  }, [mcpTools]);

  useEffect(() => {
    if (isCreating) {
      setName("");
      setLlm("chatgpt");
      setKbId("");
      setWebsite("");
      setGoal("");
      setSelectedProviders([]);
      setSelectedToolIdsByProvider(createEmptyProviderToolSelections());
      setSelectedConnectionIdsByProvider({});
      setLegacyToolIds([]);
      return;
    }
    if (!selectedAgent) return;
    const bindings = normalizeAgentMcpBindings(selectedAgent.mcp_provider_bindings);
    const supportedSelections = groupSupportedToolIdsByProvider(selectedAgent.mcp_tool_ids ?? [], toolProviderById);
    const unsupported = (selectedAgent.mcp_tool_ids ?? []).filter((toolId) => {
      const providerKey = toolProviderById.get(toolId);
      return !providerKey || !SUPPORTED_PROVIDER_KEYS.includes(providerKey as SupportedProviderKey);
    });
    const nextProviders = SUPPORTED_PROVIDER_KEYS.filter(
      (providerKey) => (supportedSelections[providerKey]?.length || 0) > 0 || Boolean(bindings[providerKey])
    );
    setName(selectedAgent.name || "");
    setLlm(selectedAgent.llm === "gemini" ? "gemini" : "chatgpt");
    setKbId(selectedAgent.kb_id || "");
    setWebsite(selectedAgent.website || "");
    setGoal(selectedAgent.goal || "");
    setSelectedProviders(nextProviders);
    setSelectedToolIdsByProvider({
      cafe24: supportedSelections.cafe24 || [],
      juso: supportedSelections.juso || [],
      solapi: supportedSelections.solapi || [],
    });
    setSelectedConnectionIdsByProvider({
      cafe24: bindings.cafe24?.connection_id,
      juso: bindings.juso?.connection_id,
      solapi: bindings.solapi?.connection_id,
    });
    setLegacyToolIds(unsupported);
  }, [isCreating, selectedAgent, toolProviderById]);

  useEffect(() => {
    if (!isCreating && !selectedId && activeAgents.length > 0) {
      setSelectedId(activeAgents[0].id);
    }
  }, [activeAgents, isCreating, selectedId]);

  const kbOptions = useMemo<SelectOption[]>(
    () =>
      kbItems.map((item) => ({
        id: item.id,
        label: `${item.title}${item.version ? ` (${item.version})` : ""}`,
        description: item.is_active ? "배포" : "비활성",
      })),
    [kbItems]
  );

  const providerOptions = useMemo<SelectOption[]>(
    () =>
      SUPPORTED_PROVIDER_KEYS.map((providerKey) => ({
        id: providerKey,
        label: SUPPORTED_PROVIDER_META[providerKey].label,
        description: `${providerStates[providerKey].connections.length} connections`,
      })),
    [providerStates]
  );

  const toolOptionsByProvider = useMemo(
    () =>
      SUPPORTED_PROVIDER_KEYS.reduce(
        (accumulator, providerKey) => {
          accumulator[providerKey] = mcpTools
            .filter((tool) => String(tool.provider_key || "").trim().toLowerCase() === providerKey)
            .map((tool) => ({
              id: tool.id,
              label: tool.tool_key || tool.name,
              description: tool.description || undefined,
            }));
          return accumulator;
        },
        {} as Record<SupportedProviderKey, SelectOption[]>
      ),
    [mcpTools]
  );

  const connectionOptionsByProvider = useMemo(
    () =>
      SUPPORTED_PROVIDER_KEYS.reduce(
        (accumulator, providerKey) => {
          accumulator[providerKey] = providerStates[providerKey].connections.map((connection) => ({
            id: connection.id,
            label: connection.label,
            description: connection.is_active ? "활성" : "비활성",
          }));
          return accumulator;
        },
        {} as Record<SupportedProviderKey, SelectOption[]>
      ),
    [providerStates]
  );

  const connectionLabelsByProvider = useMemo(
    () =>
      SUPPORTED_PROVIDER_KEYS.reduce(
        (accumulator, providerKey) => {
          accumulator[providerKey] = new Map(
            providerStates[providerKey].connections.map((connection) => [connection.id, connection.label])
          );
          return accumulator;
        },
        {} as Record<SupportedProviderKey, Map<string, string>>
      ),
    [providerStates]
  );

  const flatSupportedToolIds = useMemo(
    () => SUPPORTED_PROVIDER_KEYS.flatMap((providerKey) => selectedToolIdsByProvider[providerKey] || []),
    [selectedToolIdsByProvider]
  );

  const isDirty = useMemo(() => {
    const nextBindings = buildAgentMcpBindingsFromSelections({
      selectedProviders,
      selectedConnectionIdsByProvider,
      connectionLabelsByProvider,
    });
    const nextToolIds = [...flatSupportedToolIds, ...legacyToolIds].sort();
    if (isCreating) {
      return Boolean(name.trim() || kbId || website.trim() || goal.trim() || nextToolIds.length > 0 || selectedProviders.length > 0);
    }
    if (!selectedAgent) return false;
    const currentBindings = JSON.stringify(normalizeAgentMcpBindings(selectedAgent.mcp_provider_bindings));
    const candidateBindings = JSON.stringify(nextBindings);
    return (
      name.trim() !== (selectedAgent.name || "").trim() ||
      llm !== (selectedAgent.llm === "gemini" ? "gemini" : "chatgpt") ||
      kbId !== (selectedAgent.kb_id || "") ||
      JSON.stringify(nextToolIds) !== JSON.stringify([...(selectedAgent.mcp_tool_ids ?? [])].sort()) ||
      currentBindings !== candidateBindings ||
      website.trim() !== (selectedAgent.website || "").trim() ||
      goal.trim() !== (selectedAgent.goal || "").trim()
    );
  }, [
    connectionLabelsByProvider,
    flatSupportedToolIds,
    goal,
    isCreating,
    kbId,
    legacyToolIds,
    llm,
    name,
    selectedAgent,
    selectedConnectionIdsByProvider,
    selectedProviders,
    website,
  ]);

  const handleCreate = () => {
    setSelectedId(null);
    setIsCreating(true);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("비서 이름을 입력해 주세요.");
      return;
    }
    if (!kbId) {
      toast.error("연결할 지식을 선택해 주세요.");
      return;
    }
    for (const providerKey of selectedProviders) {
      if (!selectedConnectionIdsByProvider[providerKey]) {
        toast.error(`${SUPPORTED_PROVIDER_META[providerKey].label} 연결 정보를 선택해 주세요.`);
        return;
      }
      if ((selectedToolIdsByProvider[providerKey] || []).length === 0) {
        toast.error(`${SUPPORTED_PROVIDER_META[providerKey].label} 하위 기능을 최소 1개 선택해 주세요.`);
        return;
      }
    }

    const mcpProviderBindings = buildAgentMcpBindingsFromSelections({
      selectedProviders,
      selectedConnectionIdsByProvider,
      connectionLabelsByProvider,
    });
    const mcpToolIds = [...flatSupportedToolIds, ...legacyToolIds];

    setSaving(true);
    try {
      if (isCreating) {
        const created = await apiFetch<AgentItem>("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            llm,
            kb_id: kbId,
            mcp_tool_ids: mcpToolIds,
            mcp_provider_bindings: mcpProviderBindings,
            website: website.trim() || null,
            goal: goal.trim() || null,
            is_active: true,
          }),
        });
        toast.success("비서가 생성되었습니다.");
        await loadData(created.id);
        setSelectedId(created.id);
        setIsCreating(false);
      } else if (selectedAgent) {
        const saved = await apiFetch<AgentItem>(`/api/agents/${selectedAgent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            llm,
            kb_id: kbId,
            mcp_tool_ids: mcpToolIds,
            mcp_provider_bindings: mcpProviderBindings,
            website: website.trim() || null,
            goal: goal.trim() || null,
          }),
        });
        toast.success("비서가 저장되었습니다.");
        await loadData(saved.id);
      }
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "비서 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAgent) return;
    if (!window.confirm("선택한 비서를 삭제할까요?")) return;
    try {
      await apiFetch(`/api/agents/${selectedAgent.id}`, { method: "DELETE" });
      toast.success("비서가 삭제되었습니다.");
      setSelectedId(null);
      setIsCreating(false);
      await loadData();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "비서 삭제에 실패했습니다.");
    }
  };

  const banner = error ? (
    <StateBanner tone="danger" title="비서 로딩 실패" description={error} />
  ) : mcpTools.length === 0 ? (
    <StateBanner tone="warning" title="도구 없음" description="MCP 도구 목록을 불러오지 못했습니다." />
  ) : null;

  return (
    <CreateResourceShell
      description="좌측에서 비서를 고르고, 우측에서 provider -> connection -> tools 구조로 MCP 연결을 저장합니다."
      helperText="저장 시 `mcp_tool_ids` 는 하위 기능 allowlist로, `mcp_provider_bindings` 는 provider별 connection_id binding으로 함께 기록됩니다."
      banner={banner}
      listTitle="비서 목록"
      listCountLabel={`총 ${loading ? "-" : activeAgents.length}개`}
      createLabel="새 비서"
      onCreate={handleCreate}
      onRefresh={() => void loadData(selectedId, isCreating)}
      refreshDisabled={loading}
      listContent={
        activeAgents.length === 0 && !loading ? (
          <div className="p-4 text-sm text-slate-500">생성된 비서가 없습니다.</div>
        ) : (
          <CreateListTable
            rows={activeAgents}
            getRowId={(agent) => agent.id}
            selectedId={!isCreating ? selectedId : null}
            onSelect={(agent) => handleSelect(agent.id)}
            columns={[
              {
                id: "name",
                label: "비서",
                width: "minmax(0, 2.15fr)",
                cellClassName: "text-left",
                render: (agent) => <div className="truncate text-sm font-semibold text-slate-900">{agent.name}</div>,
              },
              {
                id: "llm",
                label: "LLM",
                width: "minmax(0, 0.95fr)",
                render: (agent) => agent.llm || "-",
              },
              {
                id: "kb",
                label: "지식",
                width: "minmax(0, 1.75fr)",
                render: (agent) => {
                  const linkedKb = agent.kb_id ? kbById.get(agent.kb_id) ?? null : null;
                  return linkedKb?.title || "-";
                },
              },
              {
                id: "mcp",
                label: "도구",
                width: "minmax(0, 0.55fr)",
                render: (agent: AgentItem) => String(Array.isArray(agent.mcp_tool_ids) ? agent.mcp_tool_ids.length : 0),
              },
              {
                id: "version",
                label: "버전",
                width: "minmax(0, 0.65fr)",
                render: (agent) => agent.version || "-",
              },
              {
                id: "created",
                label: "생성일",
                width: "minmax(0, 1.2fr)",
                render: (agent) => formatKstDateTime(agent.created_at),
              },
              {
                id: "status",
                label: "상태",
                width: "minmax(0, 0.95fr)",
                render: (agent) => {
                  const hasIssue = !agent.llm || !agent.kb_id;
                  return hasIssue ? (
                    <span className="inline-flex max-w-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      확인 필요
                    </span>
                  ) : (
                    <span className="text-emerald-600">정상</span>
                  );
                },
              },
            ]}
          />
        )
      }
      detailTitle={isCreating ? "새 비서" : selectedAgent?.name || "비서를 선택하세요"}
      detailDescription={
        isCreating
          ? "기본 정보와 provider binding을 입력해 새 비서를 생성합니다."
          : selectedAgent
            ? `현재 버전 ${selectedAgent.version || "-"}`
            : "좌측 목록에서 비서를 선택하면 상세 편집이 열립니다."
      }
      detailActions={
        !isCreating && selectedAgent ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="rounded-xl border-rose-200 bg-rose-50 px-3 text-xs text-rose-600 hover:bg-rose-100"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            삭제
          </Button>
        ) : null
      }
      detailContent={
        <div className="space-y-4">
          {isCreating || selectedAgent ? (
            <>
              <label className="block">
                <div className="mb-1 text-xs text-slate-600">비서 이름</div>
                <Input value={name} onChange={(event) => setName(event.target.value)} className="h-10" />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">LLM</div>
                  <SelectPopover
                    value={llm}
                    onChange={setLlm}
                    options={[
                      { id: "chatgpt", label: "chatGPT" },
                      { id: "gemini", label: "GEMINI" },
                    ]}
                    className="w-full"
                    buttonClassName="h-10"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">지식</div>
                  <SelectPopover
                    value={kbId}
                    onChange={setKbId}
                    options={kbOptions}
                    placeholder="지식 선택"
                    className="w-full"
                    buttonClassName="h-10"
                  />
                </label>
              </div>

              <label className="block">
                <div className="mb-1 text-xs text-slate-600">사용할 도구(provider)</div>
                <MultiSelectPopover
                  values={selectedProviders}
                  onChange={(values) => {
                    const nextProviders = SUPPORTED_PROVIDER_KEYS.filter((providerKey) => values.includes(providerKey));
                    setSelectedProviders(nextProviders);
                    setSelectedToolIdsByProvider((current) => ({
                      cafe24: nextProviders.includes("cafe24") ? current.cafe24 : [],
                      juso: nextProviders.includes("juso") ? current.juso : [],
                      solapi: nextProviders.includes("solapi") ? current.solapi : [],
                    }));
                    setSelectedConnectionIdsByProvider((current) => ({
                      cafe24: nextProviders.includes("cafe24") ? current.cafe24 : undefined,
                      juso: nextProviders.includes("juso") ? current.juso : undefined,
                      solapi: nextProviders.includes("solapi") ? current.solapi : undefined,
                    }));
                  }}
                  options={providerOptions}
                  placeholder="provider 선택"
                  className="w-full"
                  buttonClassName="min-h-10"
                  searchable={false}
                />
              </label>

              {selectedProviders.map((providerKey) => (
                <Card key={providerKey} className="space-y-4 border-slate-200 bg-slate-50 p-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{SUPPORTED_PROVIDER_META[providerKey].label}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      connection을 하나 고르고, 해당 provider의 하위 기능을 선택합니다.
                    </div>
                  </div>

                  <label className="block">
                    <div className="mb-1 text-xs text-slate-600">연결 정보</div>
                    <SelectPopover
                      value={selectedConnectionIdsByProvider[providerKey] || ""}
                      onChange={(value) =>
                        setSelectedConnectionIdsByProvider((current) => ({ ...current, [providerKey]: value }))
                      }
                      options={connectionOptionsByProvider[providerKey]}
                      placeholder={
                        connectionOptionsByProvider[providerKey].length > 0
                          ? "connection 선택"
                          : "API 탭에서 connection을 먼저 등록하세요"
                      }
                      className="w-full"
                      buttonClassName="h-10"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-slate-600">하위 기능</div>
                    <MultiSelectPopover
                      values={selectedToolIdsByProvider[providerKey] || []}
                      onChange={(values) =>
                        setSelectedToolIdsByProvider((current) => ({ ...current, [providerKey]: values }))
                      }
                      options={toolOptionsByProvider[providerKey]}
                      placeholder="하위 기능 선택"
                      className="w-full"
                      buttonClassName="min-h-10"
                    />
                  </label>
                </Card>
              ))}

              <label className="block">
                <div className="mb-1 text-xs text-slate-600">웹사이트</div>
                <Input value={website} onChange={(event) => setWebsite(event.target.value)} className="h-10" />
              </label>

              <label className="block">
                <div className="mb-1 text-xs text-slate-600">목표</div>
                <textarea
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <div className="text-xs text-slate-500">
                  {isCreating ? "새 비서를 생성합니다." : isDirty ? "저장되지 않은 변경 사항이 있습니다." : "변경 사항이 없습니다."}
                </div>
                <div className="flex items-center gap-2">
                  {isCreating ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false);
                        setSelectedId(activeAgents[0]?.id || null);
                      }}
                      className="rounded-xl border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      취소
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || (!isCreating && !isDirty)}
                    className="rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    {saving ? "저장 중..." : isCreating ? "비서 생성" : "저장"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              좌측 목록에서 비서를 선택하거나 새 비서를 생성해 주세요.
            </div>
          )}
        </div>
      }
    />
  );
}
