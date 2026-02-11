import type { SupabaseClient, User } from "@supabase/supabase-js";
import { compilePolicy, type PolicyEvalContext } from "@/lib/policyEngine";

export type RuntimeContext = {
  supabase: SupabaseClient;
  user: User;
  orgId: string;
  orgRole?: string;
  runtimeTraceId?: string;
  runtimeRequestStartedAt?: string;
  runtimeTurnId?: string;
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
