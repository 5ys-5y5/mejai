import type { SupabaseClient } from "@supabase/supabase-js";

export type McpProviderKey = "cafe24" | "solapi" | "juso" | "unknown";

type McpProviderInfo = {
  key: McpProviderKey;
  title: string;
  description: string;
  initials: string;
};

const MCP_PROVIDER_INFO: Record<McpProviderKey, McpProviderInfo> = {
  cafe24: {
    key: "cafe24",
    title: "Cafe24",
    description: "커머스 주문/고객/상품/설정 API",
    initials: "C",
  },
  solapi: {
    key: "solapi",
    title: "Solapi",
    description: "문자 인증(OTP) 발송/검증",
    initials: "S",
  },
  juso: {
    key: "juso",
    title: "Juso",
    description: "주소 정합성/우편번호 조회",
    initials: "J",
  },
  unknown: {
    key: "unknown",
    title: "Unknown",
    description: "분류되지 않은 MCP 액션",
    initials: "U",
  },
};

export type McpToolPolicy = {
  tool_id: string;
  is_allowed: boolean;
  allowed_scopes: string[] | null;
  rate_limit_per_min: number | null;
  masking_rules: unknown;
  conditions: unknown;
};

export type McpToolItem = {
  id: string;
  name: string;
  scope_key?: string | null;
  endpoint_path?: string | null;
  http_method?: string | null;
  usage_count: number;
  provider_key: McpProviderKey;
  tool_key: string;
  description: string | null;
  schema: Record<string, unknown> | null;
  version: string | null;
  policy: McpToolPolicy | null;
  provider: McpProviderKey;
  meta: {
    visibility: "public";
    access: "open_world";
    destructive: boolean;
  };
};

type ToolRow = {
  id: string;
  name: string;
  scope_key?: string | null;
  endpoint_path?: string | null;
  http_method?: string | null;
  usage_count: number | null;
  description: string | null;
  schema_json: Record<string, unknown> | null;
  version: string | null;
  provider_key: string | null;
  visibility: string | null;
  access: string | null;
  is_destructive: boolean | null;
  rate_limit_per_min?: number | null;
  masking_rules?: unknown;
  conditions?: unknown;
};

function normalizeProvider(value?: string | null): McpProviderKey {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "cafe24" || normalized === "solapi" || normalized === "juso") return normalized;
  return "unknown";
}

function inferProviderByName(name: string): McpProviderKey {
  const normalized = String(name || "").trim().toLowerCase();
  const toolName = String(name || "").trim().toLowerCase();
  if (normalized === "search_address" || toolName === "search_address") return "juso";
  if (normalized === "send_otp" || normalized === "verify_otp") return "solapi";
  if (toolName === "send_otp" || toolName === "verify_otp") return "solapi";
  if (toolName.startsWith("scope_mall_")) return "cafe24";
  if (toolName.startsWith("cafe24_")) return "cafe24";
  return "unknown";
}

function inferMeta(name: string) {
  const normalized = String(name || "").trim().toLowerCase();
  const destructive =
    normalized.startsWith("update_") ||
    normalized.startsWith("create_") ||
    normalized.startsWith("trigger_") ||
    normalized.startsWith("send_") ||
    normalized.startsWith("scope_mall_write_") ||
    normalized === "cafe24_admin_request" ||
    normalized === "admin_request";
  return {
    visibility: "public" as const,
    access: "open_world" as const,
    destructive,
  };
}

function buildToolKey(provider: McpProviderKey, name: string) {
  return `${provider}:${name}`;
}

export async function loadMcpToolsForOrg(supabase: SupabaseClient, orgId: string): Promise<McpToolItem[]> {
  void orgId;
  const dbResult = await supabase
    .from("C_mcp_tools")
    .select(
      "id, name, scope_key, endpoint_path, http_method, usage_count, description, schema_json, version, provider_key, visibility, access, is_destructive, rate_limit_per_min, masking_rules, conditions, is_active"
    )
    .eq("is_active", true);

  if (dbResult.error) {
    throw new Error(dbResult.error.message);
  }

  const items: McpToolItem[] = ((dbResult.data || []) as ToolRow[]).map((tool) => {
    const policy: McpToolPolicy = {
      tool_id: tool.id,
      is_allowed: true,
      allowed_scopes: null,
      rate_limit_per_min: tool.rate_limit_per_min ?? null,
      masking_rules: tool.masking_rules ?? null,
      conditions: tool.conditions ?? null,
    };
    const providerFromDb = tool.provider_key ? normalizeProvider(tool.provider_key) : null;
    const provider = providerFromDb ?? inferProviderByName(tool.name);
    const inferredMeta = inferMeta(tool.name);
    const visibility = tool.visibility === "public" ? "public" : inferredMeta.visibility;
    const access = tool.access === "open_world" ? "open_world" : inferredMeta.access;
    const destructive = typeof tool.is_destructive === "boolean" ? tool.is_destructive : inferredMeta.destructive;

    return {
      id: tool.id,
      name: tool.name,
      scope_key: tool.scope_key ?? null,
      endpoint_path: tool.endpoint_path ?? null,
      http_method: tool.http_method ?? null,
      usage_count: Number(tool.usage_count || 0),
      provider_key: provider,
      tool_key: buildToolKey(provider, tool.name),
      description: tool.description || null,
      schema: tool.schema_json || null,
      version: tool.version || null,
      policy,
      provider,
      meta: {
        visibility,
        access,
        destructive,
      },
    };
  });

  return items.sort((a, b) => a.tool_key.localeCompare(b.tool_key));
}

export function buildMcpProviderGroups(items: McpToolItem[]) {
  const byProvider = new Map<McpProviderKey, McpToolItem[]>();
  for (const item of items) {
    const key = item.provider || "unknown";
    const list = byProvider.get(key) || [];
    list.push(item);
    byProvider.set(key, list);
  }
  const order: McpProviderKey[] = ["cafe24", "solapi", "juso", "unknown"];
  return order
    .filter((key) => byProvider.has(key))
    .map((key) => {
      const actions = (byProvider.get(key) || []).sort((a, b) => a.tool_key.localeCompare(b.tool_key));
      const info = MCP_PROVIDER_INFO[key];
      return {
        key,
        title: info.title,
        description: info.description,
        initials: info.initials,
        connected: actions.length > 0,
        action_count: actions.length,
        actions,
      };
    });
}
