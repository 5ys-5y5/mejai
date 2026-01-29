type PredicateArgs = Record<string, unknown>;

export type PolicyRule = {
  id: string;
  stage: "input" | "tool" | "output";
  priority?: number;
  when: {
    any?: Array<{ predicate: string; args?: PredicateArgs }>;
    all?: Array<{ predicate: string; args?: PredicateArgs }>;
  };
  enforce: {
    actions: Array<Record<string, unknown>>;
  };
};

export type PolicyPack = {
  rules?: PolicyRule[];
  templates?: Record<string, string>;
  tool_policies?: Record<
    string,
    {
      required_args?: string[];
      arg_validators?: Record<string, { regex?: string }>;
    }
  >;
};

export type PolicyEvalContext = {
  input: { text: string };
  intent?: { name?: string };
  entity?: { order_id?: string | null; address?: string | null; phone?: string | null };
  user?: { confirmed?: boolean };
  conversation?: { repeat_count?: number; flags?: Record<string, unknown> };
};

export type PolicyActionResult = {
  forcedResponse?: string;
  denyTools?: string[];
  allowTools?: string[];
  forcedToolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  flags?: Record<string, unknown>;
  outputFormat?: "default";
};

const ABUSE_PATTERN = /(미친|병신|새끼|욕|꺼져|좆)/;
const PHONE_PATTERN = /\b01[016789]-?\d{3,4}-?\d{4}\b/;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function matchPredicate(predicate: string, ctx: PolicyEvalContext, args?: PredicateArgs) {
  switch (predicate) {
    case "text.contains_abuse":
      return ABUSE_PATTERN.test(ctx.input.text);
    case "text.contains_pii":
      return PHONE_PATTERN.test(ctx.input.text) || EMAIL_PATTERN.test(ctx.input.text);
    case "intent.is":
      return ctx.intent?.name === String(args?.value || "");
    case "intent.is_one_of":
      return Array.isArray(args?.values) && args?.values.includes(ctx.intent?.name);
    case "entity.order_id.present":
      return Boolean(ctx.entity?.order_id);
    case "entity.order_id.missing":
      return !ctx.entity?.order_id;
    case "entity.address.present":
      return Boolean(ctx.entity?.address);
    case "entity.address.missing":
      return !ctx.entity?.address;
    case "user.confirmed":
      return Boolean(ctx.user?.confirmed) === Boolean(args?.value);
    case "conversation.repeat_over":
      return (ctx.conversation?.repeat_count || 0) > Number(args?.count || 0);
    default:
      return false;
  }
}

function whenMatches(rule: PolicyRule, ctx: PolicyEvalContext) {
  const any = rule.when.any || [];
  const all = rule.when.all || [];
  if (any.length === 0 && all.length === 0) return false;
  const anyPass = any.length === 0 ? true : any.some((c) => matchPredicate(c.predicate, ctx, c.args));
  const allPass = all.length === 0 ? true : all.every((c) => matchPredicate(c.predicate, ctx, c.args));
  return anyPass && allPass;
}

function applyActions(
  actions: Array<Record<string, unknown>>,
  templates: Record<string, string>
): PolicyActionResult {
  const result: PolicyActionResult = {
    denyTools: [],
    allowTools: [],
    forcedToolCalls: [],
    flags: {},
  };

  actions.forEach((action) => {
    const type = String(action.type || "");
    if (type === "set_flag") {
      const flag = String(action.flag || "");
      if (flag) {
        result.flags![flag] = action.value;
      }
    }
    if (type === "force_response_template") {
      const templateId = String(action.template_id || "");
      if (templateId && templates[templateId]) {
        result.forcedResponse = templates[templateId];
      }
    }
    if (type === "deny_tools") {
      const tools = Array.isArray(action.tools) ? action.tools.map(String) : [];
      result.denyTools!.push(...tools);
    }
    if (type === "allow_tools") {
      const tools = Array.isArray(action.tools) ? action.tools.map(String) : [];
      result.allowTools!.push(...tools);
    }
    if (type === "force_tool_call") {
      const tool = String(action.tool || "");
      const argsTemplate = (action.args_template || {}) as Record<string, unknown>;
      if (tool) result.forcedToolCalls!.push({ name: tool, args: argsTemplate });
    }
    if (type === "format_output") {
      result.outputFormat = "default";
    }
  });

  return result;
}

export function compilePolicy(packs: PolicyPack[]) {
  const rules: PolicyRule[] = [];
  const templates: Record<string, string> = {};
  const toolPolicies: Record<string, { required_args?: string[]; arg_validators?: Record<string, { regex?: string }> }> = {};

  packs.forEach((pack) => {
    (pack.rules || []).forEach((rule) => rules.push(rule));
    if (pack.templates) {
      Object.assign(templates, pack.templates);
    }
    if (pack.tool_policies) {
      Object.assign(toolPolicies, pack.tool_policies);
    }
  });

  rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return { rules, templates, toolPolicies };
}

export function runPolicyStage(
  compiled: ReturnType<typeof compilePolicy>,
  stage: "input" | "tool" | "output",
  ctx: PolicyEvalContext
) {
  const matched = compiled.rules.filter((rule) => rule.stage === stage && whenMatches(rule, ctx));
  const actionResults = matched.map((rule) => applyActions(rule.enforce.actions || [], compiled.templates));
  const merged: PolicyActionResult = {
    denyTools: [],
    allowTools: [],
    forcedToolCalls: [],
    flags: {},
  };
  actionResults.forEach((res) => {
    if (res.forcedResponse) merged.forcedResponse = res.forcedResponse;
    if (res.outputFormat) merged.outputFormat = res.outputFormat;
    merged.denyTools!.push(...(res.denyTools || []));
    merged.allowTools!.push(...(res.allowTools || []));
    merged.forcedToolCalls!.push(...(res.forcedToolCalls || []));
    Object.assign(merged.flags!, res.flags || {});
  });
  return { matched, actions: merged };
}

export function validateToolArgs(
  toolName: string,
  args: Record<string, unknown>,
  compiled: ReturnType<typeof compilePolicy>
) {
  const policy = compiled.toolPolicies[toolName];
  if (!policy) return { ok: true as const };
  const required = policy.required_args || [];
  for (const key of required) {
    if (args[key] === undefined || args[key] === null || args[key] === "") {
      return { ok: false as const, error: `MISSING_ARG_${key}` };
    }
  }
  const validators = policy.arg_validators || {};
  for (const [key, rule] of Object.entries(validators)) {
    if (!rule?.regex) continue;
    const value = String(args[key] ?? "");
    if (!new RegExp(rule.regex).test(value)) {
      return { ok: false as const, error: `INVALID_ARG_${key}` };
    }
  }
  return { ok: true as const };
}

export function formatOutputDefault(text: string) {
  if (/요약/.test(text) && /근거/.test(text) && /상세/.test(text)) return text;
  const lines = text.split("\n").filter(Boolean);
  const summary = lines[0] || text;
  const detail = lines.slice(1).join("\n") || text;
  return `요약\n${summary}\n\n근거\nKB 기준에 따라 안내드립니다.\n\n상세\n${detail}\n\n다음 액션\n추가로 필요한 정보가 있다면 알려주세요.`;
}
