"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { StateBanner } from "@/components/design-system";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CreateListTable, CreateResourceShell } from "@/components/create/CreateResourceShell";
import { apiFetch } from "@/lib/apiClient";
import { encodeWidgetOverrides } from "@/lib/widgetOverrides";
import { toast } from "sonner";

type TemplateItem = {
  id: string;
  name?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
};

type ChatInstanceItem = {
  id: string;
  template_id: string;
  template_name?: string | null;
  template_is_active?: boolean | null;
  public_key?: string | null;
  name?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  editable_id?: string[] | null;
  usable_id?: string[] | null;
  chat_policy?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  can_edit?: boolean;
  can_delete?: boolean;
};

function formatJson(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) return "";
  return JSON.stringify(value, null, 2);
}

function parseIdList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function formatDateLabel(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function CreateChatTab() {
  const [instances, setInstances] = useState<ChatInstanceItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [editableIdsText, setEditableIdsText] = useState("");
  const [usableIdsText, setUsableIdsText] = useState("");
  const [chatPolicyText, setChatPolicyText] = useState("");

  const loadData = async (nextSelectedId?: string | null, preserveCreateMode = false) => {
    setLoading(true);
    setError(null);
    try {
      const [instanceRes, templateRes] = await Promise.all([
        apiFetch<{ items: ChatInstanceItem[] }>("/api/widget-instances"),
        apiFetch<{ items: TemplateItem[] }>("/api/widget-templates"),
      ]);
      const nextInstances = instanceRes.items || [];
      const nextTemplates = templateRes.items || [];

      setInstances(nextInstances);
      setTemplates(nextTemplates);

      if (preserveCreateMode) {
        setSelectedId(null);
        setIsCreating(true);
      } else if (nextSelectedId && nextInstances.some((item) => item.id === nextSelectedId)) {
        setSelectedId(nextSelectedId);
        setIsCreating(false);
      } else if (!selectedId && nextInstances.length > 0) {
        setSelectedId(nextInstances[0].id);
      } else if (selectedId && !nextInstances.some((item) => item.id === selectedId)) {
        setSelectedId(nextInstances[0]?.id || null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "대화창 목록을 불러오지 못했습니다.");
      setInstances([]);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedInstance = useMemo(
    () => instances.find((item) => item.id === selectedId) || null,
    [instances, selectedId]
  );

  const templateById = useMemo(() => {
    const map = new Map<string, TemplateItem>();
    templates.forEach((item) => map.set(item.id, item));
    return map;
  }, [templates]);

  useEffect(() => {
    if (isCreating) {
      const defaultTemplate = templates.find((item) => item.is_active !== false)?.id || templates[0]?.id || "";
      setName("새 대화창");
      setTemplateId(defaultTemplate);
      setIsPublic(true);
      setIsActive(true);
      setEditableIdsText("");
      setUsableIdsText("");
      setChatPolicyText("");
      return;
    }
    if (!selectedInstance) return;
    setName(selectedInstance.name || "대화창");
    setTemplateId(selectedInstance.template_id || "");
    setIsPublic(selectedInstance.is_public !== false);
    setIsActive(selectedInstance.is_active !== false);
    setEditableIdsText((selectedInstance.editable_id || []).join(", "));
    setUsableIdsText((selectedInstance.usable_id || []).join(", "));
    setChatPolicyText(formatJson(selectedInstance.chat_policy));
  }, [isCreating, selectedInstance, templates]);

  useEffect(() => {
    if (!isCreating && !selectedId && instances.length > 0) {
      setSelectedId(instances[0].id);
    }
  }, [instances, isCreating, selectedId]);

  const templateOptions = useMemo<SelectOption[]>(
    () =>
      templates.map((item) => ({
        id: item.id,
        label: item.name || item.id,
        description: item.is_active === false ? "비활성 템플릿" : item.is_public ? "공개" : "비공개",
      })),
    [templates]
  );

  const selectedTemplate = templateId ? templateById.get(templateId) || null : null;
  const readOnly = !isCreating && Boolean(selectedInstance) && selectedInstance?.can_edit === false;

  const parsedPolicy = useMemo(() => {
    const trimmed = chatPolicyText.trim();
    if (!trimmed) return { value: null as Record<string, unknown> | null, error: null as string | null };
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed === null) return { value: null as Record<string, unknown> | null, error: null as string | null };
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { value: parsed as Record<string, unknown>, error: null as string | null };
      }
      return { value: null as Record<string, unknown> | null, error: "오버라이드 JSON은 객체 형태여야 합니다." };
    } catch {
      return { value: null as Record<string, unknown> | null, error: "오버라이드 JSON 형식이 올바르지 않습니다." };
    }
  }, [chatPolicyText]);

  const installScript = useMemo(() => {
    if (!selectedInstance?.id || !selectedInstance.public_key || !templateId) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "https://mejai.help";
    const overrides =
      parsedPolicy.value && Object.keys(parsedPolicy.value).length > 0
        ? JSON.stringify(parsedPolicy.value, null, 2).replace(/\n/g, "\\n")
        : "";
    const configLine = overrides
      ? `window.mejaiWidget = { instance_id: "${selectedInstance.id}", public_key: "${selectedInstance.public_key}", template_id: "${templateId}", overrides: ${overrides} };\\n`
      : `window.mejaiWidget = { instance_id: "${selectedInstance.id}", public_key: "${selectedInstance.public_key}", template_id: "${templateId}" };\\n`;
    return `<script>\\n${configLine}</script>\\n<script async src="${base}/widget.js" data-instance-id="${selectedInstance.id}" data-public-key="${selectedInstance.public_key}" data-template-id="${templateId}"></script>`;
  }, [parsedPolicy.value, selectedInstance, templateId]);

  const installUrl = useMemo(() => {
    if (!selectedInstance?.id || !selectedInstance.public_key || !templateId) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const source = `${base}/embed/instance_id=${encodeURIComponent(selectedInstance.id)}?public_key=${encodeURIComponent(
      selectedInstance.public_key
    )}&template_id=${encodeURIComponent(templateId)}`;
    const encodedOverrides =
      parsedPolicy.value && Object.keys(parsedPolicy.value).length > 0
        ? encodeWidgetOverrides(parsedPolicy.value)
        : "";
    return encodedOverrides ? `${source}&ovr=${encodeURIComponent(encodedOverrides)}` : source;
  }, [parsedPolicy.value, selectedInstance, templateId]);

  const isDirty = useMemo(() => {
    if (isCreating) {
      return Boolean(
        name.trim() ||
          templateId ||
          editableIdsText.trim() ||
          usableIdsText.trim() ||
          chatPolicyText.trim()
      );
    }
    if (!selectedInstance) return false;
    return (
      name.trim() !== (selectedInstance.name || "").trim() ||
      templateId !== selectedInstance.template_id ||
      isPublic !== (selectedInstance.is_public !== false) ||
      isActive !== (selectedInstance.is_active !== false) ||
      editableIdsText.trim() !== (selectedInstance.editable_id || []).join(", ").trim() ||
      usableIdsText.trim() !== (selectedInstance.usable_id || []).join(", ").trim() ||
      chatPolicyText.trim() !== formatJson(selectedInstance.chat_policy).trim()
    );
  }, [
    chatPolicyText,
    editableIdsText,
    isActive,
    isCreating,
    isPublic,
    name,
    selectedInstance,
    templateId,
    usableIdsText,
  ]);

  const handleCreate = () => {
    setSelectedId(null);
    setIsCreating(true);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsCreating(false);
  };

  const handleSave = async (rotateKey = false) => {
    if (!templateId) {
      toast.error("연결할 템플릿을 선택해 주세요.");
      return;
    }
    if (parsedPolicy.error) {
      toast.error(parsedPolicy.error);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        template_id: templateId,
        name: name.trim() || selectedTemplate?.name || "대화창",
        is_public: isPublic,
        is_active: isActive,
        editable_id: parseIdList(editableIdsText),
        usable_id: parseIdList(usableIdsText),
        chat_policy: parsedPolicy.value,
        rotate_key: rotateKey,
      };

      if (isCreating) {
        const created = await apiFetch<{ item: ChatInstanceItem }>("/api/widget-instances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("대화창이 생성되었습니다.");
        await loadData(created.item.id);
        setSelectedId(created.item.id);
        setIsCreating(false);
      } else if (selectedInstance?.id) {
        const saved = await apiFetch<{ item: ChatInstanceItem }>(`/api/widget-instances/${selectedInstance.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success(rotateKey ? "발급키가 재생성되었습니다." : "대화창이 저장되었습니다.");
        await loadData(saved.item.id);
      }
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "대화창 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInstance?.id) return;
    if (!window.confirm("선택한 대화창을 삭제할까요?")) return;
    try {
      await apiFetch(`/api/widget-instances/${selectedInstance.id}`, { method: "DELETE" });
      toast.success("대화창이 삭제되었습니다.");
      setSelectedId(null);
      setIsCreating(false);
      await loadData();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "대화창 삭제에 실패했습니다.");
    }
  };

  const banner = (
    <>
      {error ? <StateBanner tone="danger" title="대화창 로딩 실패" description={error} /> : null}
      {!error && templates.length === 0 && !loading ? (
        <StateBanner
          tone="warning"
          title="사용 가능한 템플릿 없음"
          description="대화창을 만들려면 먼저 관리자 계정에서 템플릿을 한 개 이상 준비해야 합니다."
        />
      ) : null}
      {readOnly ? (
        <StateBanner
          tone="warning"
          title="읽기 전용 대화창"
          description="이 대화창은 조회만 가능하며, 저장·삭제·키 재발급은 수정 권한이 있는 사용자만 수행할 수 있습니다."
        />
      ) : null}
    </>
  );

  return (
    <CreateResourceShell
      description="대화창 인스턴스를 목록에서 선택하고, 우측에서 템플릿 연결·접근 권한·설치 코드를 함께 관리합니다."
      helperText="`/app/install` 과 독립적으로 동작하며, 설치 코드와 Preview URL도 이 탭에서 바로 확인할 수 있습니다."
      banner={banner}
      listTitle="대화창 목록"
      listCountLabel={`총 ${loading ? "-" : instances.length}개`}
      createLabel="새 대화창"
      onCreate={handleCreate}
      onRefresh={() => void loadData(selectedId, isCreating)}
      refreshDisabled={loading}
      createDisabled={loading || templates.length === 0}
      listContent={
        instances.length === 0 && !loading ? (
          <div className="p-4 text-sm text-slate-500">생성된 대화창이 없습니다.</div>
        ) : (
          <CreateListTable
            rows={instances}
            getRowId={(item) => item.id}
            selectedId={!isCreating ? selectedId : null}
            onSelect={(item) => handleSelect(item.id)}
            columns={[
              {
                id: "name",
                label: "대화창",
                width: "minmax(0, 1.8fr)",
                render: (item) => <div className="truncate text-sm font-semibold text-slate-900">{item.name || "대화창"}</div>,
              },
              {
                id: "template",
                label: "템플릿",
                width: "minmax(0, 1.65fr)",
                render: (item) => item.template_name || item.template_id,
              },
              {
                id: "visibility",
                label: "공개",
                width: "minmax(0, 0.72fr)",
                render: (item) => (item.is_public ? "공개" : "비공개"),
              },
              {
                id: "editable",
                label: "수정권한",
                width: "minmax(0, 0.85fr)",
                render: (item) => `${(item.editable_id || []).length}명`,
              },
              {
                id: "issued",
                label: "발급키",
                width: "minmax(0, 0.76fr)",
                render: (item) => (item.public_key ? "발급됨" : "-"),
              },
              {
                id: "updated",
                label: "수정일",
                width: "minmax(0, 0.9fr)",
                render: (item) => formatDateLabel(item.updated_at),
              },
              {
                id: "status",
                label: "상태",
                width: "minmax(0, 0.72fr)",
                render: (item) => (item.is_active === false ? "비활성" : "활성"),
              },
            ]}
          />
        )
      }
      detailTitle={isCreating ? "새 대화창" : selectedInstance?.name || "대화창을 선택하세요"}
      detailDescription={
        isCreating
          ? "템플릿을 선택하고, 권한/오버라이드 값을 입력해 새 대화창을 생성합니다."
          : selectedInstance
            ? "선택한 대화창의 권한, 오버라이드, 설치 코드를 수정합니다."
            : "좌측 목록에서 대화창을 선택하면 상세 편집이 열립니다."
      }
      detailActions={
        !isCreating && selectedInstance?.id ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSave(true)}
              disabled={saving || readOnly}
              className="rounded-xl border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50"
            >
              <KeyRound className="mr-1 h-4 w-4" />
              키 재발급
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={readOnly || selectedInstance.can_delete === false}
              className="rounded-xl border-rose-200 bg-rose-50 px-3 text-xs text-rose-600 hover:bg-rose-100"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              삭제
            </Button>
          </div>
        ) : null
      }
      detailContent={
        <div className="space-y-4">
          {isCreating || selectedInstance ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">대화창 이름</div>
                  <Input value={name} onChange={(event) => setName(event.target.value)} className="h-10" disabled={readOnly} />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">연결 템플릿</div>
                  <SelectPopover
                    value={templateId}
                    onChange={setTemplateId}
                    options={templateOptions}
                    placeholder="템플릿 선택"
                    className="w-full"
                    buttonClassName="h-10"
                    disabled={readOnly}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} disabled={readOnly} />
                  공개 대화창으로 사용
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={readOnly} />
                  활성 상태 유지
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">수정 가능 user_id</div>
                  <textarea
                    value={editableIdsText}
                    onChange={(event) => setEditableIdsText(event.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                    placeholder="uuid를 쉼표 또는 줄바꿈으로 구분"
                    disabled={readOnly}
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs text-slate-600">사용 가능 user_id</div>
                  <textarea
                    value={usableIdsText}
                    onChange={(event) => setUsableIdsText(event.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                    placeholder="uuid를 쉼표 또는 줄바꿈으로 구분"
                    disabled={readOnly}
                  />
                </label>
              </div>

              <label className="block">
                <div className="mb-1 text-xs text-slate-600">오버라이드 JSON</div>
                <textarea
                  value={chatPolicyText}
                  onChange={(event) => setChatPolicyText(event.target.value)}
                  className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                  placeholder='{"chat_policy": {...}, "theme": {...}, "setup_config": {...}}'
                  disabled={readOnly}
                />
                {parsedPolicy.error ? <div className="mt-2 text-xs text-rose-600">{parsedPolicy.error}</div> : null}
              </label>

              {!isCreating && selectedInstance ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">배포/설치</div>
                  <div className="space-y-1 text-xs text-slate-600">
                    <div>
                      발급키: <span className="font-mono text-slate-800">{selectedInstance.public_key || "-"}</span>
                    </div>
                    <div>
                      Preview URL:{" "}
                      <span className="break-all font-mono text-slate-800">{installUrl || "-"}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-mono whitespace-pre-wrap text-slate-700">
                    {installScript || "저장 후 설치 코드를 확인할 수 있습니다."}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!installScript}
                    onClick={() => {
                      if (!installScript) return;
                      void navigator.clipboard.writeText(installScript);
                      toast.success("설치 코드가 복사되었습니다.");
                    }}
                    className="rounded-xl border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="mr-1 h-4 w-4" />
                    설치 코드 복사
                  </Button>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <div className="text-xs text-slate-500">
                  {isCreating ? "새 대화창을 생성합니다." : isDirty ? "저장되지 않은 변경 사항이 있습니다." : "변경 사항이 없습니다."}
                </div>
                <div className="flex items-center gap-2">
                  {isCreating ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false);
                        setSelectedId(instances[0]?.id || null);
                      }}
                      className="rounded-xl border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      취소
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => void handleSave(false)}
                    disabled={readOnly || saving || parsedPolicy.error !== null || (!isCreating && !isDirty)}
                    className="rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    {saving ? "저장 중..." : isCreating ? "대화창 생성" : "저장"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              좌측 목록에서 대화창을 선택하거나 새 대화창을 생성해 주세요.
            </div>
          )}
        </div>
      }
    />
  );
}
