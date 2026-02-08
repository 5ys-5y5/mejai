import type { SupabaseClient } from "@supabase/supabase-js";
import { getSelfUpdateVisibilityDefault, isSelfUpdateEnabledByDefault } from "@/app/api/runtime/chat/policies/principles";

const CONFIG_EVENT_TYPE = "RUNTIME_GOVERNANCE_CONFIG_UPDATED";

export type GovernanceConfig = {
  enabled: boolean;
  visibility_mode: "user" | "admin";
  source: "principles_default" | "event_override";
  updated_at: string | null;
  updated_by: string | null;
};

function readObject(payload: unknown) {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

export async function readGovernanceConfig(input: {
  supabase: SupabaseClient;
  orgId: string;
}): Promise<GovernanceConfig> {
  const { data, error } = await input.supabase
    .from("F_audit_events")
    .select("payload, created_at")
    .eq("event_type", CONFIG_EVENT_TYPE)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return {
      enabled: isSelfUpdateEnabledByDefault(),
      visibility_mode: getSelfUpdateVisibilityDefault(),
      source: "principles_default",
      updated_at: null,
      updated_by: null,
    };
  }
  const rows = (data || []) as Array<{ payload: Record<string, unknown> | null; created_at: string | null }>;
  const matched = rows.find((row) => {
    const payload = readObject(row.payload);
    return String(payload.org_id || "") === input.orgId;
  });
  if (!matched) {
    return {
      enabled: isSelfUpdateEnabledByDefault(),
      visibility_mode: getSelfUpdateVisibilityDefault(),
      source: "principles_default",
      updated_at: null,
      updated_by: null,
    };
  }
  const payload = readObject(matched.payload);
  return {
    enabled: Boolean(payload.enabled),
    visibility_mode:
      String(payload.visibility_mode || "").toLowerCase() === "user" ? "user" : "admin",
    source: "event_override",
    updated_at: String(matched.created_at || "") || null,
    updated_by: String(payload.updated_by || "") || null,
  };
}

export async function writeGovernanceConfig(input: {
  supabase: SupabaseClient;
  orgId: string;
  enabled: boolean;
  visibilityMode: "user" | "admin";
  updatedBy: string | null;
}) {
  await input.supabase.from("F_audit_events").insert({
    session_id: null,
    turn_id: null,
    event_type: CONFIG_EVENT_TYPE,
    payload: {
      org_id: input.orgId,
      enabled: input.enabled,
      visibility_mode: input.visibilityMode,
      updated_by: input.updatedBy,
      baseline_source: "src/app/api/runtime/chat/policies/principles.ts",
    },
    created_at: new Date().toISOString(),
    bot_context: { org_id: input.orgId, action: "governance_config_update" },
  });
}
