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
  entity?: {
    order_id?: string | null;
    address?: string | null;
    zipcode?: string | null;
    phone?: string | null;
    channel?: string | null;
  };
  product?: {
    id?: string | null;
    answerable?: boolean | null;
    restock_known?: boolean | null;
    restock_policy?: string | null;
    restock_at?: string | null;
  };
  user?: { confirmed?: boolean };
  conversation?: { repeat_count?: number; flags?: Record<string, unknown> };
};

export type PolicyActionResult = {
  forcedResponse?: string;
  forceReason?: string;
  isSoftForced?: boolean;
  denyTools?: string[];
  allowTools?: string[];
  forcedToolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  flags?: Record<string, unknown>;
  outputFormat?: "default";
};

const ABUSE_PATTERN = /(미친|병신|새끼|욕|꺼져|좆)/;
const PHONE_PATTERN = /\b01[016789]-?\d{3,4}-?\d{4}\b/;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const RESTOCK_PATTERN = /재입고|입고|재고|품절|다시\s*입고|다시\s*들어|재판매/;
const RESTOCK_SUBSCRIBE_PATTERN = /(알림|알려|입고되면|재입고되면|문자|카카오|카톡|이메일|메일)/;

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
    case "entity.phone.present":
      return Boolean(ctx.entity?.phone);
    case "entity.phone.missing":
      return !ctx.entity?.phone;
    case "entity.address.present":
      return Boolean(ctx.entity?.address);
    case "entity.address.missing":
      return !ctx.entity?.address;
    case "user.confirmed":
      return Boolean(ctx.user?.confirmed) === Boolean(args?.value);
    case "conversation.repeat_over":
      return (ctx.conversation?.repeat_count || 0) > Number(args?.count || 0);
    case "text.matches": {
      const pattern = String(args?.regex || "");
      const flags = String(args?.flags || "i");
      if (!pattern) return false;
      try {
        return new RegExp(pattern, flags).test(ctx.input.text);
      } catch {
        return false;
      }
    }
    case "text.restock_inquiry":
      return RESTOCK_PATTERN.test(ctx.input.text) && !RESTOCK_SUBSCRIBE_PATTERN.test(ctx.input.text);
    case "text.restock_subscribe":
      return RESTOCK_PATTERN.test(ctx.input.text) && RESTOCK_SUBSCRIBE_PATTERN.test(ctx.input.text);
    case "product.answerable":
      if (!ctx.product?.id) return false;
      return Boolean(ctx.product?.answerable) === Boolean(args?.value);
    case "product.restock_known":
      if (!ctx.product?.id) return false;
      return Boolean(ctx.product?.restock_known) === Boolean(args?.value);
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

function readPathValue(ctx: PolicyEvalContext, path: string) {
  const keys = path.split(".").filter(Boolean);
  let current: unknown = ctx;
  for (const key of keys) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function resolveTemplateString(value: string, ctx: PolicyEvalContext) {
  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, rawPath) => {
    const path = String(rawPath || "").trim();
    if (!path) return "";
    const resolved = readPathValue(ctx, path);
    if (resolved === undefined || resolved === null) return "";
    return String(resolved);
  });
}

function resolveTemplateArgs(input: unknown, ctx: PolicyEvalContext): unknown {
  if (typeof input === "string") {
    return resolveTemplateString(input, ctx);
  }
  if (Array.isArray(input)) {
    return input.map((item) => resolveTemplateArgs(item, ctx));
  }
  if (input && typeof input === "object") {
    const next: Record<string, unknown> = {};
    Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
      next[key] = resolveTemplateArgs(value, ctx);
    });
    return next;
  }
  return input;
}

function applyActions(
  actions: Array<Record<string, unknown>>,
  templates: Record<string, string>,
  ctx: PolicyEvalContext
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
        result.isSoftForced = Boolean(action.soft || action.soft_enforce);
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
      const resolvedArgs = resolveTemplateArgs(argsTemplate, ctx) as Record<string, unknown>;
      if (tool) result.forcedToolCalls!.push({ name: tool, args: resolvedArgs });
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
  const actionResults = matched.map((rule) => {
    const res = applyActions(rule.enforce.actions || [], compiled.templates, ctx);
    if (res.forcedResponse) res.forceReason = `RULE:${rule.id}`;
    return res;
  });
  const merged: PolicyActionResult = {
    denyTools: [],
    allowTools: [],
    forcedToolCalls: [],
    flags: {},
  };
  actionResults.forEach((res) => {
    if (res.forcedResponse && !merged.forcedResponse) {
      merged.forcedResponse = res.forcedResponse;
      merged.forceReason = res.forceReason;
      merged.isSoftForced = res.isSoftForced;
    }
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
