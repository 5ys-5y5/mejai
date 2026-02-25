import type { SupabaseClient, User } from "@supabase/supabase-js";
import { compilePolicy, type PolicyEvalContext } from "@/lib/policyEngine";

export type RuntimeContext = {
  supabase: SupabaseClient;
  user: User;
  agentId: string | null;
  agentId: string | null;
  agentRole?: string | null;
  runtimeTraceId?: string;
  runtimeRequestStartedAt?: string;
  runtimeTurnId?: string;
  runtimeEndUser?: Record<string, any> | null;
};

export type CompiledPolicy = ReturnType<typeof compilePolicy>;

export type AddressSearchResult = {
  status: "success" | "error";
  data?: Record<string, unknown>;
  error?: string;
};

export type McpToolResult<T = Record<string, unknown>> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type PolicyContext = PolicyEvalContext;
