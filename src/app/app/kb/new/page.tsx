"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
      .split(/[^a-z0-9가-힣+]/g)
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
      title: "?곸슜 踰붿쐞/?덉쇅 議곌굔",
      detail: "?뺤콉???곸슜 ??곴낵 ?덉쇅瑜?紐낇솗???섏뿬 紐⑦샇?깆쓣 以꾩엯?덈떎.",
      insertText: "## ?곸슜 踰붿쐞/?덉쇅\n- ?곸슜 ???n- ?덉쇅 議곌굔\n",
    },
    {
      id: "process",
      title: "泥섎━ ?덉감/?뱀씤 ?먮쫫",
      detail: "怨좉컼 ?덈궡 ?④퀎? ?대? ?뱀씤 ?먮쫫??遺꾨━???덈궡?⑸땲??",
      insertText: "## 泥섎━ ?덉감\n- 怨좉컼 ?덈궡 ?④퀎\n- ?대? ?뱀씤/寃???④퀎\n",
    },
    {
      id: "limits",
      title: "?쒗븳?ы빆/?쒓퀎",
      detail: "遺덇? ??ぉ怨??쒗븳 議곌굔??誘몃━ 怨좎????댁뒋瑜?以꾩엯?덈떎.",
      insertText: "## ?쒗븳?ы빆\n- 遺덇? ??ぉ\n- ?쒗븳 議곌굔\n",
    },
    {
      id: "evidence",
      title: "利앸튃/?꾩닔 ?뺤씤 ??ぉ",
      detail: "?꾩닔 ?쒖텧 ?먮즺? ?뺤씤 ?덉감瑜?紐낆떆?⑸땲??",
      insertText: "## ?꾩슂 利앸튃\n- ?꾩닔 ?쒖텧 ?먮즺\n- ?뺤씤 ?덉감\n",
    },
    {
      id: "escalation",
      title: "?먯뒪而щ젅?댁뀡 湲곗?",
      detail: "?곸쐞 ?닿? 湲곗?怨??곕씫 梨꾨꼸??援щ텇?⑸땲??",
      insertText: "## ?먯뒪而щ젅?댁뀡 湲곗?\n- 利됱떆 ?닿? 議곌굔\n- ?대떦 遺???곕씫 梨꾨꼸\n",
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
      title: "?좎궗 臾몄꽌 湲곕컲 FAQ 蹂닿컯",
      detail: "?좎궗 臾몄꽌?먯꽌 ?먯＜ ?깆옣??吏덈Ц/?덈궡瑜?異붽??⑸땲??",
      insertText: `## ???? ???? ????\n${topBullets.map((line) => `- ${line}`).join("\n")}\n`,
    });
  }

  const normalizedContent = content.toLowerCase();
  return recos.filter((item) => !normalizedContent.includes(item.title.toLowerCase()));
}

const RECO_SEPARATOR = "Unknown";

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


  const rulePresets = useMemo<PolicyRulePreset[]>(
    () => [
    {
      id: "abuse",
      title: "욕설 차단",
      summary: "입력에 욕설이 포함되면 경고 템플릿 강제 + 도구 차단",
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
      summary: "諛섎났 ?잛닔 珥덇낵 ???덈궡 ?쒗뵆由?媛뺤젣",
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
      title: "주문번호 필요",
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
      title: "배송지 변경 확정 후 티켓 생성",
      summary: "배송지 변경 확정 시 티켓을 생성합니다.",
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
                title: "Unknown",
                content: "Unknown",
              },
            },
          ],
        },
      },
    },
    {
      id: "format_output",
      title: "Unknown",
      summary: "?묐떟???붿빟?믨렐嫄겸넂?곸꽭?믩떎???≪뀡 ?뺥깭濡?媛뺤젣",
      rule: {
        id: "R030_output_format",
        stage: "output",
        priority: 800,
        when: { any: [{ predicate: "text.contains_pii" }] },
        enforce: { actions: [{ type: "format_output" }] },
      },
    },
    ],
    []
  );

  const templatePresets = useMemo<PolicyTemplatePreset[]>(
    () => [
    {
      id: "abuse_warn",
      title: "?뺤꽕 寃쎄퀬",
      summary: "?뺤꽕 ?낅젰 ???ш낵 + ?뺣낫 ?붿껌",
      value:
        "遺덊렪???쒕젮 二꾩넚?⑸땲?? ?먰솢???덈궡瑜??꾪빐 ?뺤쨷???쒗쁽?쇰줈 留먯? 遺?곷뱶由쎈땲?? 二쇰Ц踰덊샇???대???踰덊샇瑜??뚮젮二쇱떆硫?諛붾줈 ?뺤씤???쒕━寃좎뒿?덈떎.",
    },
    {
      id: "repeat_block",
      title: "Unknown",
      summary: "Unknown",
      value: "媛숈? 臾몄쓽媛 諛섎났?섍퀬 ?덉뒿?덈떎. 二쇰Ц踰덊샇/?대???踰덊샇 以??섎굹瑜??뚮젮二쇱떆硫?利됱떆 泥섎━?섍쿋?듬땲??",
    },
    {
      id: "need_order_id",
      title: "Unknown",
      summary: "二쇰Ц踰덊샇 ?꾩슂 ?덈궡",
      value: "Unknown",
    },
    ],
    []
  );

  const toolPolicyPresets = useMemo<PolicyToolPreset[]>(
    () => [
    {
      id: "lookup_order",
      title: "lookup_order 필수 인자/검증",
      summary: "order_id 필수 + 형식 검증",
      policy: {
        required_args: ["order_id"],
        arg_validators: { order_id: { regex: "^[0-9]{8}-[0-9]{7}$" } },
      },
    },
    {
      id: "track_shipment",
      title: "track_shipment ?꾩닔 ?몄옄",
      summary: "order_id ?꾩닔",
      policy: { required_args: ["order_id"] },
    },
    {
      id: "create_ticket",
      title: "create_ticket ?꾩닔 ?몄옄",
      summary: "title/content ?꾩닔",
      policy: { required_args: ["title", "content"] },
    },
    ],
    []
  );

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

  const buildPolicyFromSelection = useCallback(() => {
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
  }, [rulePresets, selectedRules, customRules, templatePresets, selectedTemplates, toolPolicyPresets, selectedToolPolicies]);

  useEffect(() => {
    if (kbType !== "admin" || adminInputMode !== "builder") return;
    const next = buildPolicyFromSelection();
    const nextText = JSON.stringify(next, null, 2);
    setPolicyJson(nextText);
  }, [kbType, adminInputMode, customRules, selectedRules, selectedTemplates, selectedToolPolicies, buildPolicyFromSelection]);

  const handleAddCustomRule = () => {
    const title = customRuleTitle.trim() || "CUSTOM_RULE";
    const predicate = customRulePredicate.trim();
    const action = customRuleAction.trim();
    if (!predicate || !action) {
      toast.error("議곌굔(predicate)怨??≪뀡(type)???낅젰??二쇱꽭??");
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
      toast.error("?쒕ぉ怨??댁슜???낅젰??二쇱꽭??");
      return;
    }
    if (isAdminUser && kbType === "admin") {
      try {
        JSON.parse(policyJson);
        setPolicyError(null);
      } catch {
        setPolicyError("Policy JSON ?뺤떇???щ컮瑜댁? ?딆뒿?덈떎.");
        toast.error("Policy JSON ?뺤떇???щ컮瑜댁? ?딆뒿?덈떎.");
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

      toast.success("臾몄꽌媛 ?앹꽦?섏뿀?듬땲??");
      router.push("/app/kb");
    } catch (err) {
      const message = err instanceof Error ? err.message : "臾몄꽌 ?앹꽦???ㅽ뙣?덉뒿?덈떎.";
      toast.error(message || "臾몄꽌 ?앹꽦???ㅽ뙣?덉뒿?덈떎.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">臾몄꽌 ?앹꽦</h1>
            <p className="mt-1 text-sm text-slate-500">Unknown</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdminUser ? (
              <button
                type="button"
                onClick={() => setKbType((prev) => (prev === "admin" ? "normal" : "admin"))}
                className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {kbType === "admin" ? "Unknown" : "Unknown"}
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
                <label className="text-sm font-medium text-slate-900">Unknown</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="?? 諛섑뭹 ?뺤콉 ?덈궡"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">카테고리</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="?? ?뺤콉"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>

              {isAdminUser && kbType === "admin" ? (
                <div className="grid gap-2">
                  <label className="flex items-center justify-between gap-2 text-sm font-medium text-slate-900">
                    <span>Unknown</span>
                    <span className="flex items-center gap-2 text-xs text-slate-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="group-match-mode"
                          checked={groupMatchMode === "all"}
                          onChange={() => setGroupMatchMode("all")}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                        />
                        ??? ????
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="group-match-mode"
                          checked={groupMatchMode === "any"}
                          onChange={() => setGroupMatchMode("any")}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                        />
                        ?섎굹?쇰룄 ?ы븿
                      </label>
                    </span>
                  </label>
                  {groupOptions.length === 0 ? (
                    <div className="text-sm text-slate-500">?좏깮 媛?ν븳 洹몃９???놁뒿?덈떎.</div>
                  ) : (
                    <InlineGroupSelect
                      label={`??? ???? (${groupOptions.length})`}
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
                  <label className="text-sm font-medium text-slate-900">?댁슜 *</label>
                  <InlineSelectBox
                    label={`??o ???????? ${Object.values(selectedRecos).filter(Boolean).length}/${recommendations.length}`}
                    sections={[
                      {
                        title: "Unknown",
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
                    placeholder="異붿쿇 吏移??몄쓽 吏移⑥쓣 吏곸젒 ?낅젰?????덉뒿?덈떎."
                    className="min-h-[160px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                  />
                  <textarea
                    value={selectedRecoText}
                    readOnly
                    placeholder="異붿쿇 吏移⑥씠 ???곸뿭???먮룞?쇰줈 異붽??⑸땲??"
                    className="min-h-[160px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-900">?댁슜 *</label>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span>?뺤콉 ?낅젰 諛⑹떇</span>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="admin-input-mode"
                          checked={adminInputMode === "builder"}
                          onChange={() => setAdminInputMode("builder")}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                        />
                        ?좏깮 ?낅젰
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="admin-input-mode"
                          checked={adminInputMode === "manual"}
                          onChange={() => setAdminInputMode("manual")}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0"
                        />
                        ?섎룞 ?낅젰
                      </label>
                    </div>
                  </div>
                  {adminInputMode === "builder" ? (
                    <InlineSelectBox
                      label={`洹쒖튃/?쒗뵆由????뺤콉 ?좏깮`}
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
                          title: `?쒗뵆由?(${Object.values(selectedTemplates).filter(Boolean).length}/${templatePresets.length})`,
                          items: templatePresets.map((item) => ({
                            id: item.id,
                            title: item.title,
                            summary: item.summary,
                          })),
                        },
                        {
                          title: `???뺤콉 (${Object.values(selectedToolPolicies).filter(Boolean).length}/${toolPolicyPresets.length})`,
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
                          <div className="text-xs font-semibold text-slate-700">Unknown</div>
                          <div className="grid gap-4 text-xs text-slate-600">
                            <div className="grid gap-4 md:grid-cols-2">
                              <input
                                value={customRuleTitle}
                                onChange={(e) => setCustomRuleTitle(e.target.value)}
                                placeholder="洹쒖튃 ?대쫫 ?덉떆: R050_custom_rule"
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
                              placeholder="predicate ?덉떆: text.contains_abuse"
                              className="h-8 rounded-lg border border-slate-200 px-2"
                            />
                            <input
                              value={customRuleAction}
                              onChange={(e) => setCustomRuleAction(e.target.value)}
                              placeholder="action ?덉떆: force_response_template"
                              className="h-8 rounded-lg border border-slate-200 px-2"
                            />
                            <button
                              type="button"
                              onClick={handleAddCustomRule}
                              className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <Plus className="h-3 w-3" />
                              ??? ????
                            </button>
                            {customRules.length > 0 ? (
                              <div className="grid gap-2">
                                {customRules.map((rule) => (
                                  <div key={rule.id} className="flex items-center gap-2 text-xs text-slate-600">
                                    {rule.needsCode ? <AlertTriangle className="h-3 w-3 text-amber-500" /> : null}
                                    <span>{rule.id}</span>
                                    {rule.needsCode ? <span className="text-amber-600">?섎뱶肄붾뵫 ?꾩슂</span> : null}
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
                      洹쒖튃/?쒗뵆由????뺤콉 ?좏깮 ?놁씠 吏곸젒 JSON???낅젰?⑸땲??
                    </div>
                  )}
                  <textarea
                    value={policyJson}
                    onChange={(e) => {
                      setPolicyJson(e.target.value);
                      setPolicyError(null);
                    }}
                    placeholder="Policy JSON???낅젰?섏꽭??"
                    className={cn(
                      "min-h-[260px] w-full rounded-xl border px-3 py-2 font-mono text-xs",
                      adminInputMode === "manual"
                        ? "border-slate-200 bg-white text-slate-800"
                        : "border-slate-200 bg-slate-100 text-slate-700"
                    )}
                  />
                  {policyError ? <div className="text-xs text-rose-600">{policyError}</div> : null}
                  <div className="grid gap-2 text-xs text-slate-500">
                    <div>?섎뱶肄붾뵫 ?꾩슂 ?곸뿭:</div>
                    <div>Unknown</div>
                    <div>Unknown</div>
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
            {saving ? "?앹꽦 以?.." : "臾몄꽌 ?앹꽦"}
          </button>
        </div>
      </div>
    </div>
  );
}
