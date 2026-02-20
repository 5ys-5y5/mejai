import { chooseBestAlias } from "../shared/slotUtils";
import type { AgentRow, KbRow, ProductAliasRow, ProductDecision, ProductRuleRow } from "../shared/types";
import type { RuntimeContext } from "../shared/runtimeTypes";

export function matchesAdminGroup(
  applyGroups: Array<{ path: string; values: string[] }> | null | undefined,
  group: Record<string, any> | null,
  mode: "all" | "any" | null | undefined
) {
  if (!applyGroups || applyGroups.length === 0) return true;
  const matcher = mode === "any" ? "some" : "every";
  return applyGroups[matcher]((rule) => {
    const value = readGroupValue(group, rule.path);
    if (value === null || value === undefined) return false;
    return rule.values.map(String).includes(String(value));
  });
}

function readGroupValue(group: Record<string, any> | null, path: string) {
  if (!group) return null;
  return path.split(".").reduce((acc: unknown, key) => {
    if (!acc || typeof acc !== "object") return null;
    return (acc as Record<string, any>)[key];
  }, group as unknown);
}

async function fetchBestProductRule(context: RuntimeContext, productId: string) {
  const ruleRes = await context.supabase
    .from("G_com_product_rules")
    .select("org_id, product_id, answerability, restock_policy, restock_at, updated_at, source")
    .eq("product_id", productId)
    .or(`org_id.eq.${context.orgId},org_id.is.null`);
  if (ruleRes.error) {
    return { rule: null as ProductRuleRow | null, error: ruleRes.error.message };
  }
  const rules = (ruleRes.data || []) as ProductRuleRow[];
  const bestRule =
    rules.find((row) => row.org_id === context.orgId) ||
    rules.find((row) => row.org_id === null) ||
    null;
  return { rule: bestRule, error: null as string | null };
}

function buildProductDecision(productId: string, rule: ProductRuleRow | null): ProductDecision | null {
  if (!rule) return null;
  return {
    product_id: rule.product_id || productId,
    answerability: rule.answerability || "UNKNOWN",
    restock_policy: rule.restock_policy || "UNKNOWN",
    restock_at: rule.restock_at ?? null,
    source: rule.source ?? null,
  };
}

export async function resolveProductDecision(context: RuntimeContext, text: string, productId?: string | null) {
  const aliasRes = await context.supabase
    .from("G_com_product_aliases")
    .select("org_id, alias, product_id, match_type, priority, is_active")
    .eq("is_active", true)
    .or(`org_id.eq.${context.orgId},org_id.is.null`);
  if (aliasRes.error) {
    return { decision: null as ProductDecision | null, alias: null as ProductAliasRow | null, error: aliasRes.error.message };
  }
  const aliases = (aliasRes.data || []) as ProductAliasRow[];
  const matchedAlias = chooseBestAlias(text, aliases);
  if (!matchedAlias) {
    const fallbackProductId = String(productId || "").trim();
    if (!fallbackProductId) {
      return { decision: null as ProductDecision | null, alias: null as ProductAliasRow | null, error: null as string | null };
    }
    const fallbackRule = await fetchBestProductRule(context, fallbackProductId);
    if (fallbackRule.error) {
      return { decision: null as ProductDecision | null, alias: null as ProductAliasRow | null, error: fallbackRule.error };
    }
    const fallbackDecision = buildProductDecision(fallbackProductId, fallbackRule.rule);
    return { decision: fallbackDecision, alias: null as ProductAliasRow | null, error: null as string | null };
  }

  const ruleRes = await fetchBestProductRule(context, matchedAlias.product_id);
  if (ruleRes.error) {
    return { decision: null as ProductDecision | null, alias: matchedAlias, error: ruleRes.error };
  }
  const decision =
    buildProductDecision(matchedAlias.product_id, ruleRes.rule) ||
    ({
      product_id: matchedAlias.product_id,
      answerability: "UNKNOWN",
      restock_policy: "UNKNOWN",
      restock_at: null,
    } as ProductDecision);

  return { decision, alias: matchedAlias, error: null as string | null };
}

export async function fetchAgent(context: RuntimeContext, agentId: string) {
  const { data, error } = await context.supabase
    .from("B_bot_agents")
    .select("*")
    .eq("id", agentId)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .maybeSingle();
  if (error) return { error: error.message };
  if (data) return { data: data as AgentRow };

  const { data: parent, error: parentError } = await context.supabase
    .from("B_bot_agents")
    .select("*")
    .eq("parent_id", agentId)
    .eq("is_active", true)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .maybeSingle();
  if (parentError) return { error: parentError.message };
  return { data: parent as AgentRow | null };
}

export async function fetchActiveAgentByParent(context: RuntimeContext, parentId: string) {
  const { data, error } = await context.supabase
    .from("B_bot_agents")
    .select("*")
    .eq("parent_id", parentId)
    .eq("is_active", true)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .maybeSingle();
  if (error) return { error: error.message };
  return { data: data as AgentRow | null };
}

export async function fetchKb(context: RuntimeContext, kbId: string) {
  const result = await context.supabase
    .from("B_bot_knowledge_bases")
    .select("id, title, content, is_active, version, is_admin, apply_groups, apply_groups_mode, content_json")
    .eq("id", kbId)
    .or(`org_id.eq.${context.orgId},org_id.is.null`)
    .maybeSingle();
  if (result.error) return { error: result.error.message };
  return { data: result.data as KbRow | null };
}

export async function fetchAdminKbs(context: RuntimeContext) {
  const result = await context.supabase
    .from("B_bot_knowledge_bases")
    .select("id, title, content, is_active, version, is_admin, apply_groups, apply_groups_mode, content_json")
    .eq("is_admin", true)
    .eq("is_active", true)
    .or(`org_id.eq.${context.orgId},org_id.is.null`);
  if (result.error) return { error: result.error.message };
  return { data: (result.data || []) as KbRow[] };
}

export async function createSession(
  context: RuntimeContext,
  agentId: string | null,
  metadata?: Record<string, any> | null
) {
  const sessionCode = `p_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    org_id: context.orgId,
    session_code: sessionCode,
    started_at: new Date().toISOString(),
    channel: "runtime",
    agent_id: agentId,
    metadata: metadata && typeof metadata === "object" ? metadata : {},
  };
  const { data, error } = await context.supabase.from("D_conv_sessions").insert(payload).select("*").single();
  if (error) return { error: error.message };
  return { data };
}

export async function getRecentTurns(context: RuntimeContext, sessionId: string, limit = 5) {
  const { data, error } = await context.supabase
    .from("D_conv_turns")
    .select("*")
    .eq("session_id", sessionId)
    .order("seq", { ascending: false })
    .limit(limit);
  if (error) return { error: error.message };
  return { data: data || [] };
}




