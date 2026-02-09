"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import RagStorageBadge from "@/components/RagStorageBadge";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiClient";
import { calcRagUsageBytes, DEFAULT_RAG_LIMIT_BYTES, getRagLimitBytes } from "@/lib/ragStorage";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, Plus } from "lucide-react";

type KbItem = {
  id: string;
  title: string;
  category: string | null;
  content: string | null;
};

type Recommendation = {
  id: string;
  title: string;
  detail: string;
  insertText: string;
};

type GroupOption = {
  path: string;
  values: string[];
};

type PolicyRulePreset = {
  id: string;
  title: string;
  summary: string;
  rule: Record<string, unknown>;
};

type PolicyTemplatePreset = {
  id: string;
  title: string;
  summary: string;
  value: string;
};

type PolicyToolPreset = {
  id: string;
  title: string;
  summary: string;
  policy: Record<string, unknown>;
};

function InlineSelectBox({
  label,
  sections,
  selected,
  onToggle,
  footer,
}: {
  label: string;
  sections: Array<{ title: string; items: Array<{ id: string; title: string; summary: string }> }>;
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", open ? "rotate-180" : "")} />
      </button>
      {open ? (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {sections.map((section) => (
            <div key={section.title} className="grid gap-2">
              <div className="text-xs font-semibold text-slate-700">{section.title}</div>
              <div className="grid gap-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggle(item.id)}
                    className={cn(
                      "w-full rounded-lg px-2 py-2 text-left text-xs",
                      selected[item.id] ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 h-3 w-3 rounded border border-slate-300 bg-white">
                        {selected[item.id] ? <span className="block h-full w-full bg-emerald-500" /> : null}
                      </span>
                      <div>
                        <div className="font-semibold">{item.title}</div>
                        <div className="text-slate-500">{item.summary}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {footer ? <div className="border-t border-slate-200 pt-3">{footer}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function InlineGroupSelect({
  label,
  options,
  selections,
  onChange,
}: {
  label: string;
  options: GroupOption[];
  selections: Record<string, Record<string, boolean>>;
  onChange: (path: string, value: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", open ? "rotate-180" : "")} />
      </button>
      {open ? (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {options.map((opt) => (
            <div key={opt.path} className="grid gap-2">
              <div className="text-xs font-semibold text-slate-700">{opt.path}</div>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((value) => (
                  <label
                    key={`${opt.path}-${value}`}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selections[opt.path]?.[value])}
                      onChange={(e) => onChange(opt.path, value, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildKeywordSet(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9가-힣]+/g)
      .filter((token) => token.length >= 2)
  );
}

function extractBulletLines(content?: string | null) {
  if (!content) return [];
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*") || line.startsWith("•"))
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function buildRecommendations(
  title: string,
  category: string,
  content: string,
  items: KbItem[]
): Recommendation[] {
  const recos: Recommendation[] = [
    {
      id: "scope",
      title: "적용 범위/예외 조건",
      detail: "정책의 적용 대상과 예외를 명확히 하여 모호성을 줄입니다.",
      insertText: "## 적용 범위/예외\n- 적용 대상\n- 예외 조건\n",
    },
    {
      id: "process",
      title: "처리 절차/승인 흐름",
      detail: "고객 안내 단계와 내부 승인 흐름을 분리해 안내합니다.",
      insertText: "## 처리 절차\n- 고객 안내 단계\n- 내부 승인/검토 단계\n",
    },
    {
      id: "limits",
      title: "제한사항/한계",
      detail: "불가 항목과 제한 조건을 미리 고지해 이슈를 줄입니다.",
      insertText: "## 제한사항\n- 불가 항목\n- 제한 조건\n",
    },
    {
      id: "evidence",
      title: "증빙/필수 확인 항목",
      detail: "필수 제출 자료와 확인 절차를 명시합니다.",
      insertText: "## 필요 증빙\n- 필수 제출 자료\n- 확인 절차\n",
    },
    {
      id: "escalation",
      title: "에스컬레이션 기준",
      detail: "상위 이관 기준과 연락 채널을 구분합니다.",
      insertText: "## 에스컬레이션 기준\n- 즉시 이관 조건\n- 담당 부서/연락 채널\n",
    },
  ];

  const keywordSet = buildKeywordSet(`${title} ${category}`);
  const similar = items.filter((item) => {
    if (!item.title) return false;
    if (category && item.category === category) return true;
    const tokens = buildKeywordSet(item.title);
    for (const token of tokens) {
      if (keywordSet.has(token)) return true;
    }
    return false;
  });

  const bulletPool = new Map<string, number>();
  similar.forEach((item) => {
    extractBulletLines(item.content).forEach((line) => {
      bulletPool.set(line, (bulletPool.get(line) || 0) + 1);
    });
  });

  const topBullets = Array.from(bulletPool.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([line]) => line)
    .slice(0, 3);

  if (topBullets.length > 0) {
    recos.push({
      id: "faq",
      title: "유사 문서 기반 FAQ 보강",
      detail: "유사 문서에서 자주 등장한 질문/안내를 추가합니다.",
      insertText: `## 자주 묻는 질문\n${topBullets.map((line) => `- ${line}`).join("\n")}\n`,
    });
  }

  const normalizedContent = content.toLowerCase();
  return recos.filter((item) => !normalizedContent.includes(item.title.toLowerCase()));
}

const RECO_SEPARATOR = "\n\n--- 추천 지침 ---\n\n";

export default function NewKbPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [userContent, setUserContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [usedBytes, setUsedBytes] = useState(0);
  const [limitBytes, setLimitBytes] = useState(DEFAULT_RAG_LIMIT_BYTES);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecos, setSelectedRecos] = useState<Record<string, boolean>>({});
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [kbType, setKbType] = useState<"normal" | "admin">("normal");
  const [createAsSample, setCreateAsSample] = useState(false);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [groupSelections, setGroupSelections] = useState<Record<string, Record<string, boolean>>>({});
  const [groupMatchMode, setGroupMatchMode] = useState<"all" | "any">("all");
  const [policyJson, setPolicyJson] = useState("");
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [adminInputMode, setAdminInputMode] = useState<"builder" | "manual">("builder");
  const [selectedRules, setSelectedRules] = useState<Record<string, boolean>>({});
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, boolean>>({});
  const [selectedToolPolicies, setSelectedToolPolicies] = useState<Record<string, boolean>>({});
  const [customRuleTitle, setCustomRuleTitle] = useState("");
  const [customRuleStage, setCustomRuleStage] = useState<"input" | "tool" | "output">("input");
  const [customRulePredicate, setCustomRulePredicate] = useState("");
  const [customRuleAction, setCustomRuleAction] = useState("");
  const [customRules, setCustomRules] = useState<Array<{ id: string; rule: Record<string, unknown>; needsCode: boolean }>>([]);

  useEffect(() => {
    if (kbType === "admin") setCreateAsSample(false);
  }, [kbType]);

  useEffect(() => {
    let mounted = true;
    async function loadUsage() {
      try {
        const [res, profile] = await Promise.all([
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
          apiFetch<{ plan?: string; is_admin?: boolean }>("/api/user-profile").catch(() => null),
        ]);
        if (!mounted) return;
        const rawItems = res.items || [];
        setKbItems(rawItems);
        setUsedBytes(calcRagUsageBytes(rawItems));
        if (profile?.plan) {
          setLimitBytes(getRagLimitBytes(profile.plan));
        }
        if (profile?.is_admin) {
          setIsAdminUser(true);
          apiFetch<{ items: GroupOption[] }>("/api/user-access/groups")
            .then((groupRes) => {
              setGroupOptions(groupRes.items || []);
            })
            .catch(() => {
              setGroupOptions([]);
            });
        }
      } catch {
        // keep defaults if usage cannot be loaded
      }
    }
    loadUsage();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (kbType === "admin") return;
    const next = buildRecommendations(title, category, userContent, kbItems);
    setRecommendations(next);
  }, [title, category, userContent, kbItems, kbType]);

  useEffect(() => {
    if (kbType !== "admin" || adminInputMode !== "builder") return;
    if (!policyJson.trim()) {
      const seed = {
        rules: [],
        templates: {},
        tool_policies: {},
      };
      const seedText = JSON.stringify(seed, null, 2);
      setPolicyJson(seedText);
    }
  }, [kbType, policyJson, adminInputMode]);


  const rulePresets: PolicyRulePreset[] = [
    {
      id: "abuse",
      title: "욕설 대응",
      summary: "입력에 욕설이 포함되면 사과 템플릿 강제 + 툴 차단",
      rule: {
        id: "R001_abuse",
        stage: "input",
        priority: 1000,
        when: { any: [{ predicate: "text.contains_abuse" }] },
        enforce: {
          actions: [
            { type: "set_flag", flag: "conversation.abusive", value: true },
            { type: "force_response_template", template_id: "abuse_warn" },
            { type: "deny_tools", tools: ["*"] },
          ],
        },
      },
    },
    {
      id: "repeat",
      title: "반복 질문 차단",
      summary: "반복 횟수 초과 시 안내 템플릿 강제",
      rule: {
        id: "R005_repeat_cooldown",
        stage: "input",
        priority: 900,
        when: { any: [{ predicate: "conversation.repeat_over", args: { count: 2 } }] },
        enforce: { actions: [{ type: "force_response_template", template_id: "repeat_block" }] },
      },
    },
    {
      id: "need_order",
      title: "주문번호 없으면 조회 금지",
      summary: "주문번호 없을 때 lookup/track 차단 + 안내 템플릿",
      rule: {
        id: "R010_need_order_id_for_lookup",
        stage: "tool",
        priority: 950,
        when: {
          all: [
            { predicate: "intent.is_one_of", args: { values: ["shipment", "order_lookup"] } },
            { predicate: "entity.order_id.missing" },
          ],
        },
        enforce: {
          actions: [
            { type: "deny_tools", tools: ["lookup_order", "track_shipment"] },
            { type: "force_response_template", template_id: "need_order_id" },
          ],
        },
      },
    },
    {
      id: "address_ticket",
      title: "배송지 변경 확정 시 티켓 생성",
      summary: "주문번호+주소+확정이면 create_ticket 강제",
      rule: {
        id: "R020_address_change_create_ticket",
        stage: "tool",
        priority: 920,
        when: {
          all: [
            { predicate: "intent.is", args: { value: "change" } },
            { predicate: "entity.order_id.present" },
            { predicate: "entity.address.present" },
            { predicate: "user.confirmed", args: { value: true } },
          ],
        },
        enforce: {
          actions: [
            {
              type: "force_tool_call",
              tool: "create_ticket",
              args_template: {
                title: "배송지 변경 요청 - {{entity.order_id}}",
                content: "배송지 변경 요청: {{entity.address}}\n주문번호: {{entity.order_id}}\n요청: {{input.text}}",
              },
            },
          ],
        },
      },
    },
    {
      id: "format_output",
      title: "출력 포맷 강제",
      summary: "응답을 요약→근거→상세→다음 액션 형태로 강제",
      rule: {
        id: "R030_output_format",
        stage: "output",
        priority: 800,
        when: { any: [{ predicate: "text.contains_pii" }] },
        enforce: { actions: [{ type: "format_output" }] },
      },
    },
  ];

  const templatePresets: PolicyTemplatePreset[] = [
    {
      id: "abuse_warn",
      title: "욕설 경고",
      summary: "욕설 입력 시 사과 + 정보 요청",
      value:
        "불편을 드려 죄송합니다. 원활한 안내를 위해 정중한 표현으로 말씀 부탁드립니다. 주문번호나 휴대폰 번호를 알려주시면 바로 확인해 드리겠습니다.",
    },
    {
      id: "repeat_block",
      title: "반복 질문 안내",
      summary: "반복 질문 차단 안내",
      value: "같은 문의가 반복되고 있습니다. 주문번호/휴대폰 번호 중 하나를 알려주시면 즉시 처리하겠습니다.",
    },
    {
      id: "need_order_id",
      title: "주문번호 요청",
      summary: "주문번호 필요 안내",
      value: "주문 조회를 위해 주문번호가 필요합니다. 주문번호를 알려주세요.",
    },
  ];

  const toolPolicyPresets: PolicyToolPreset[] = [
    {
      id: "lookup_order",
      title: "lookup_order 필수 인자/검증",
      summary: "order_id 필수 + 포맷 검증",
      policy: {
        required_args: ["order_id"],
        arg_validators: { order_id: { regex: "^[0-9]{8}-[0-9]{7}$" } },
      },
    },
    {
      id: "track_shipment",
      title: "track_shipment 필수 인자",
      summary: "order_id 필수",
      policy: { required_args: ["order_id"] },
    },
    {
      id: "create_ticket",
      title: "create_ticket 필수 인자",
      summary: "title/content 필수",
      policy: { required_args: ["title", "content"] },
    },
  ];

  useEffect(() => {
    if (kbType !== "admin" || adminInputMode !== "builder") return;
    if (Object.keys(selectedRules).length === 0 && rulePresets.length > 0) {
      setSelectedRules(Object.fromEntries(rulePresets.map((r) => [r.id, true])));
    }
    if (Object.keys(selectedTemplates).length === 0 && templatePresets.length > 0) {
      setSelectedTemplates(Object.fromEntries(templatePresets.map((t) => [t.id, true])));
    }
    if (Object.keys(selectedToolPolicies).length === 0 && toolPolicyPresets.length > 0) {
      setSelectedToolPolicies(Object.fromEntries(toolPolicyPresets.map((t) => [t.id, true])));
    }
  }, [
    kbType,
    adminInputMode,
    rulePresets,
    templatePresets,
    toolPolicyPresets,
    selectedRules,
    selectedTemplates,
    selectedToolPolicies,
  ]);

  const selectedRecoText = useMemo(() => {
    return recommendations
      .filter((item) => selectedRecos[item.id])
      .map((item) => item.insertText.trim())
      .join("\n\n")
      .trim();
  }, [recommendations, selectedRecos]);

  const combinedContent = useMemo(() => {
    const base = userContent.trimEnd();
    if (!selectedRecoText) return base;
    return `${base}${base ? RECO_SEPARATOR : ""}${selectedRecoText}`;
  }, [userContent, selectedRecoText]);

  const canSubmit = useMemo(() => {
    if (isAdminUser && kbType === "admin") {
      return title.trim().length > 0 && policyJson.trim().length > 0;
    }
    return title.trim().length > 0 && userContent.trim().length > 0;
  }, [title, userContent, policyJson, isAdminUser, kbType]);

  const buildApplyGroups = () => {
    const entries: Array<{ path: string; values: string[] }> = [];
    Object.entries(groupSelections).forEach(([path, values]) => {
      const selected = Object.entries(values)
        .filter(([, checked]) => checked)
        .map(([value]) => value);
      if (selected.length > 0) {
        entries.push({ path, values: selected });
      }
    });
    return entries;
  };

  const buildPolicyFromSelection = () => {
    const rules = [
      ...rulePresets.filter((r) => selectedRules[r.id]).map((r) => r.rule),
      ...customRules.map((rule) => rule.rule),
    ];
    const templates: Record<string, string> = {};
    templatePresets.forEach((tpl) => {
      if (selectedTemplates[tpl.id]) templates[tpl.id] = tpl.value;
    });
    const tool_policies: Record<string, unknown> = {};
    toolPolicyPresets.forEach((tool) => {
      if (selectedToolPolicies[tool.id]) tool_policies[tool.id] = tool.policy;
    });
    return { rules, templates, tool_policies };
  };

  useEffect(() => {
    if (kbType !== "admin" || adminInputMode !== "builder") return;
    const next = buildPolicyFromSelection();
    const nextText = JSON.stringify(next, null, 2);
    setPolicyJson(nextText);
  }, [kbType, adminInputMode, customRules, selectedRules, selectedTemplates, selectedToolPolicies]);

  const handleAddCustomRule = () => {
    const title = customRuleTitle.trim() || "CUSTOM_RULE";
    const predicate = customRulePredicate.trim();
    const action = customRuleAction.trim();
    if (!predicate || !action) {
      toast.error("조건(predicate)과 액션(type)을 입력해 주세요.");
      return;
    }
    const knownPredicates = new Set([
      "text.contains_abuse",
      "text.contains_pii",
      "intent.is",
      "intent.is_one_of",
      "entity.order_id.present",
      "entity.order_id.missing",
      "entity.address.present",
      "entity.address.missing",
      "user.confirmed",
      "conversation.repeat_over",
    ]);
    const knownActions = new Set([
      "set_flag",
      "force_response_template",
      "deny_tools",
      "allow_tools",
      "force_tool_call",
      "format_output",
    ]);
    const needsCode = !knownPredicates.has(predicate) || !knownActions.has(action);
    const newRule = {
      id: title,
      stage: customRuleStage,
      priority: 700,
      when: { any: [{ predicate }] },
      enforce: { actions: [{ type: action }] },
    };
    setCustomRules((prev) => [...prev, { id: newRule.id, rule: newRule, needsCode }]);
    setCustomRuleTitle("");
    setCustomRulePredicate("");
    setCustomRuleAction("");
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("제목과 내용을 입력해 주세요.");
      return;
    }
    if (isAdminUser && kbType === "admin") {
      try {
        JSON.parse(policyJson);
        setPolicyError(null);
      } catch {
        setPolicyError("Policy JSON 형식이 올바르지 않습니다.");
        toast.error("Policy JSON 형식이 올바르지 않습니다.");
        return;
      }
    }
    setSaving(true);
    try {
      const payload: {
        title: string;
        content: string;
        category?: string | null;
        is_active: boolean;
        is_admin?: boolean;
        is_sample?: boolean;
        apply_groups?: Array<{ path: string; values: string[] }>;
        apply_groups_mode?: "all" | "any";
        content_json?: unknown;
      } = {
        title: title.trim(),
        content: userContent.trim(),
        is_active: true,
      };

      const trimmedCategory = category.trim();
      if (trimmedCategory) {
        payload.category = trimmedCategory;
      }

      if (isAdminUser && kbType === "admin") {
        payload.is_admin = true;
        payload.apply_groups = buildApplyGroups();
        payload.apply_groups_mode = groupMatchMode;
        const parsed = JSON.parse(policyJson || "{}");
        payload.content_json = parsed;
        payload.content = policyJson.trim();
      } else {
        if (isAdminUser && createAsSample) {
          payload.is_sample = true;
        }
        payload.content = combinedContent.trim();
      }

      await apiFetch("/api/kb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      toast.success("문서가 생성되었습니다.");
      router.push("/app/kb");
    } catch (err) {
      const message = err instanceof Error ? err.message : "문서 생성에 실패했습니다.";
      toast.error(message || "문서 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">문서 생성</h1>
            <p className="mt-1 text-sm text-slate-500">지식 베이스에 새 문서를 추가합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdminUser ? (
              <button
                type="button"
                onClick={() => setKbType((prev) => (prev === "admin" ? "normal" : "admin"))}
                className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {kbType === "admin" ? "ADMIN 모드" : "일반 모드"}
              </button>
            ) : null}
            {isAdminUser && kbType === "normal" ? (
              <label className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={createAsSample}
                  onChange={(e) => setCreateAsSample(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                />
                sample
              </label>
            ) : null}
            <RagStorageBadge usedBytes={usedBytes} limitBytes={limitBytes} />
          </div>
        </div>

        <Card className="mt-6 p-6">
          <div className="grid items-start gap-6">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">문서 제목 *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 반품 정책 안내"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">카테고리</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 정책"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>

              {isAdminUser && kbType === "admin" ? (
                <div className="grid gap-2">
                  <label className="flex items-center justify-between gap-2 text-sm font-medium text-slate-900">
                    <span>적용 대상 그룹 *</span>
                    <span className="flex items-center gap-2 text-xs text-slate-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="group-match-mode"
                          checked={groupMatchMode === "all"}
                          onChange={() => setGroupMatchMode("all")}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                        />
                        모두 포함
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="group-match-mode"
                          checked={groupMatchMode === "any"}
                          onChange={() => setGroupMatchMode("any")}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                        />
                        하나라도 포함
                      </label>
                    </span>
                  </label>
                  {groupOptions.length === 0 ? (
                    <div className="text-sm text-slate-500">선택 가능한 그룹이 없습니다.</div>
                  ) : (
                    <InlineGroupSelect
                      label={`그룹 선택 (${groupOptions.length})`}
                      options={groupOptions}
                      selections={groupSelections}
                      onChange={(path, value, checked) =>
                        setGroupSelections((prev) => ({
                          ...prev,
                          [path]: {
                            ...(prev[path] || {}),
                            [value]: checked,
                          },
                        }))
                      }
                    />
                  )}
                </div>
              ) : null}

              {kbType !== "admin" ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-900">내용 *</label>
                  <InlineSelectBox
                    label={`추천 지침 선택 ${Object.values(selectedRecos).filter(Boolean).length}/${recommendations.length}`}
                    sections={[
                      {
                        title: "추천 지침",
                        items: recommendations.map((rec) => ({
                          id: rec.id,
                          title: rec.title,
                          summary: rec.detail,
                        })),
                      },
                    ]}
                    selected={selectedRecos}
                    onToggle={(id) =>
                      setSelectedRecos((prev) => ({
                        ...prev,
                        [id]: !prev[id],
                      }))
                    }
                  />
                  <textarea
                    value={userContent}
                    onChange={(e) => setUserContent(e.target.value)}
                    placeholder="추천 지침 외의 지침을 직접 입력할 수 있습니다."
                    className="min-h-[160px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                  />
                  <textarea
                    value={selectedRecoText}
                    readOnly
                    placeholder="추천 지침이 이 영역에 자동으로 추가됩니다."
                    className="min-h-[160px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-900">내용 *</label>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span>정책 입력 방식</span>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="admin-input-mode"
                          checked={adminInputMode === "builder"}
                          onChange={() => setAdminInputMode("builder")}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                        />
                        선택 입력
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="admin-input-mode"
                          checked={adminInputMode === "manual"}
                          onChange={() => setAdminInputMode("manual")}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                        />
                        수동 입력
                      </label>
                    </div>
                  </div>
                  {adminInputMode === "builder" ? (
                    <InlineSelectBox
                      label={`규칙/템플릿/툴 정책 선택`}
                      sections={[
                        {
                          title: `규칙 (${Object.values(selectedRules).filter(Boolean).length}/${rulePresets.length})`,
                          items: rulePresets.map((item) => ({
                            id: item.id,
                            title: item.title,
                            summary: item.summary,
                          })),
                        },
                        {
                          title: `템플릿 (${Object.values(selectedTemplates).filter(Boolean).length}/${templatePresets.length})`,
                          items: templatePresets.map((item) => ({
                            id: item.id,
                            title: item.title,
                            summary: item.summary,
                          })),
                        },
                        {
                          title: `툴 정책 (${Object.values(selectedToolPolicies).filter(Boolean).length}/${toolPolicyPresets.length})`,
                          items: toolPolicyPresets.map((item) => ({
                            id: item.id,
                            title: item.title,
                            summary: item.summary,
                          })),
                        },
                      ]}
                      selected={{ ...selectedRules, ...selectedTemplates, ...selectedToolPolicies }}
                      onToggle={(id) => {
                        if (selectedRules[id] !== undefined) {
                          setSelectedRules((prev) => ({ ...prev, [id]: !prev[id] }));
                          return;
                        }
                        if (selectedTemplates[id] !== undefined) {
                          setSelectedTemplates((prev) => ({ ...prev, [id]: !prev[id] }));
                          return;
                        }
                        setSelectedToolPolicies((prev) => ({ ...prev, [id]: !prev[id] }));
                      }}
                      footer={
                        <div className="grid gap-4">
                          <div className="text-xs font-semibold text-slate-700">새 규칙 추가</div>
                          <div className="grid gap-4 text-xs text-slate-600">
                            <div className="grid gap-4 md:grid-cols-2">
                              <input
                                value={customRuleTitle}
                                onChange={(e) => setCustomRuleTitle(e.target.value)}
                                placeholder="규칙 이름 예시: R050_custom_rule"
                                className="h-8 rounded-lg border border-slate-200 px-2"
                              />
                              <select
                                value={customRuleStage}
                                onChange={(e) => setCustomRuleStage(e.target.value as "input" | "tool" | "output")}
                                className="h-8 rounded-lg border border-slate-200 px-2"
                              >
                                <option value="input">input</option>
                                <option value="tool">tool</option>
                                <option value="output">output</option>
                              </select>
                            </div>
                            <input
                              value={customRulePredicate}
                              onChange={(e) => setCustomRulePredicate(e.target.value)}
                              placeholder="predicate 예시: text.contains_abuse"
                              className="h-8 rounded-lg border border-slate-200 px-2"
                            />
                            <input
                              value={customRuleAction}
                              onChange={(e) => setCustomRuleAction(e.target.value)}
                              placeholder="action 예시: force_response_template"
                              className="h-8 rounded-lg border border-slate-200 px-2"
                            />
                            <button
                              type="button"
                              onClick={handleAddCustomRule}
                              className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <Plus className="h-3 w-3" />
                              규칙 추가
                            </button>
                            {customRules.length > 0 ? (
                              <div className="grid gap-2">
                                {customRules.map((rule) => (
                                  <div key={rule.id} className="flex items-center gap-2 text-xs text-slate-600">
                                    {rule.needsCode ? <AlertTriangle className="h-3 w-3 text-amber-500" /> : null}
                                    <span>{rule.id}</span>
                                    {rule.needsCode ? <span className="text-amber-600">하드코딩 필요</span> : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      }
                    />
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      규칙/템플릿/툴 정책 선택 없이 직접 JSON을 입력합니다.
                    </div>
                  )}
                  <textarea
                    value={policyJson}
                    onChange={(e) => {
                      setPolicyJson(e.target.value);
                      setPolicyError(null);
                    }}
                    placeholder="Policy JSON을 입력하세요."
                    className={cn(
                      "min-h-[260px] w-full rounded-xl border px-3 py-2 font-mono text-xs",
                      adminInputMode === "manual"
                        ? "border-slate-200 bg-white text-slate-800"
                        : "border-slate-200 bg-slate-100 text-slate-700"
                    )}
                  />
                  {policyError ? <div className="text-xs text-rose-600">{policyError}</div> : null}
                  <div className="grid gap-2 text-xs text-slate-500">
                    <div>하드코딩 필요 영역:</div>
                    <div>- 새 predicate 추가 시: matchPredicate() 구현 필요</div>
                    <div>- 새 action 타입 추가 시: applyActions() 구현 필요</div>
                  </div>
                </div>
              )}
            </div>

            
          </div>
        </Card>

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/app/kb")}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-sm font-semibold",
              canSubmit && !saving
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-200 text-slate-400"
            )}
          >
            {saving ? "생성 중..." : "문서 생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
