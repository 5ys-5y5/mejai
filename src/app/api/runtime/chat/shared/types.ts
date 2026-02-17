export type ProductAliasRow = {
  org_id: string | null;
  alias: string;
  product_id: string;
  match_type: "exact" | "contains" | "regex";
  priority: number | null;
  is_active: boolean | null;
};

export type AgentRow = {
  id: string | null;
  parent_id?: string | null;
  name: string;
  agent_type?: string | null;
  version?: string | null;
  llm: "chatgpt" | "gemini";
  kb_id: string | null;
  mcp_tool_ids?: string[] | null;
};

export type KbRow = {
  id: string;
  title: string;
  content: string | null;
  is_active: boolean | null;
  version: string | null;
  is_admin?: boolean | null;
  apply_groups?: Array<{ path: string; values: string[] }> | null;
  apply_groups_mode?: "all" | "any" | null;
  content_json?: unknown | null;
};

export type ProductRuleRow = {
  org_id: string | null;
  product_id: string;
  answerability: "ALLOW" | "DENY" | "UNKNOWN";
  restock_policy: "NO_RESTOCK" | "RESTOCK_AT" | "UNKNOWN";
  restock_at: string | null;
  updated_at: string | null;
  source?: string | null;
};

export type ProductDecision = {
  product_id: string;
  answerability: ProductRuleRow["answerability"];
  restock_policy: ProductRuleRow["restock_policy"];
  restock_at?: string | null;
  source?: string | null;
};
