import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationFeaturesProviderShape, ConversationPageFeatures } from "@/lib/conversation/pageFeaturePolicy";

type ChatSettingsRow = {
  id: string;
  chat_policy: ConversationFeaturesProviderShape | null;
  runtime_env?: Record<string, unknown> | null;
  updated_at?: string | null;
  created_at?: string | null;
  updated_by?: string | null;
};

type ChatSettingsResult = {
  row: ChatSettingsRow | null;
  error: { message: string } | null;
};

function stripUserKbIds(
  policy: ConversationFeaturesProviderShape | null
): ConversationFeaturesProviderShape | null {
  if (!policy?.pages) return policy;
  const nextPages: NonNullable<ConversationFeaturesProviderShape["pages"]> = {};
  let changed = false;
  Object.entries(policy.pages).forEach(([pageKey, override]) => {
    if (!override) {
      nextPages[pageKey as keyof typeof nextPages] = override;
      return;
    }
    const setup = (override as { setup?: ConversationPageFeatures["setup"] }).setup;
    if (!setup || !Object.prototype.hasOwnProperty.call(setup, "kbIds")) {
      nextPages[pageKey as keyof typeof nextPages] = override;
      return;
    }
    const { kbIds: _kbIds, ...restSetup } = setup;
    const nextOverride = {
      ...override,
      setup: restSetup as ConversationPageFeatures["setup"],
    };
    nextPages[pageKey as keyof typeof nextPages] = nextOverride;
    changed = true;
  });
  return changed ? { ...policy, pages: nextPages } : policy;
}

export async function fetchChatPolicyRow(
  supabase: SupabaseClient,
  agentId: string
): Promise<ChatSettingsResult> {
  void agentId;
  return fetchGlobalChatPolicyRow(supabase);
}

export async function fetchGlobalChatPolicyRow(
  supabase: SupabaseClient
): Promise<ChatSettingsResult> {
  const { data, error } = await supabase
    .from("B_chat_settings")
    .select("id, chat_policy, runtime_env, updated_at, created_at, updated_by")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) return { row: null, error: { message: error.message } };
  const rows = (data || []) as ChatSettingsRow[];
  return { row: rows[0] || null, error: null };
}

export async function fetchRuntimeEnvRow(
  supabase: SupabaseClient,
  agentId: string
): Promise<ChatSettingsResult> {
  void agentId;
  return fetchGlobalChatPolicyRow(supabase);
}

export function normalizeChatPolicy(
  provider: ConversationFeaturesProviderShape | null
): ConversationFeaturesProviderShape | null {
  if (!provider) return null;
  const sanitized = stripUserKbIds(provider);
  const source = sanitized || provider;
  const pages = source.pages ? { ...(source.pages || {}) } : undefined;
  const debugCopy = source.debug_copy ? { ...(source.debug_copy || {}) } : undefined;
  const settingsUi = source.settings_ui ? { ...(source.settings_ui || {}) } : undefined;
  const setupFields = settingsUi?.setup_fields ? { ...(settingsUi.setup_fields || {}) } : undefined;

  return {
    ...source,
    ...(pages ? { pages } : {}),
    ...(debugCopy ? { debug_copy: debugCopy } : {}),
    ...(settingsUi
      ? {
          settings_ui: {
            ...settingsUi,
            ...(setupFields ? { setup_fields: setupFields } : {}),
          },
        }
      : {}),
  };
}

export async function fetchChatPolicy(
  supabase: SupabaseClient,
  agentId: string
): Promise<ConversationFeaturesProviderShape | null> {
  const { row, error } = await fetchGlobalChatPolicyRow(supabase);
  if (error) return null;
  return normalizeChatPolicy(row?.chat_policy || null);
}

export async function upsertChatPolicy(
  supabase: SupabaseClient,
  agentId: string,
  policy: ConversationFeaturesProviderShape,
  updatedBy?: string | null
): Promise<{ error: { message: string } | null }> {
  void agentId;
  const sanitized = stripUserKbIds(policy) || policy;
  const payload: Record<string, unknown> = {
    chat_policy: sanitized,
    updated_at: new Date().toISOString(),
  };
  if (updatedBy !== undefined) {
    payload.updated_by = updatedBy;
  }
  const existing = await fetchGlobalChatPolicyRow(supabase);
  if (existing.row?.id) {
    const { error } = await supabase.from("B_chat_settings").update(payload).eq("id", existing.row.id);
    if (error) return { error: { message: error.message } };
    return { error: null };
  }
  const { error } = await supabase.from("B_chat_settings").insert(payload);
  if (error) return { error: { message: error.message } };
  return { error: null };
}

export async function fetchRuntimeEnvCiphertext(
  supabase: SupabaseClient,
  agentId: string
): Promise<{ value: Record<string, unknown> | null; updatedAt: string | null; error: { message: string } | null }> {
  const { row, error } = await fetchRuntimeEnvRow(supabase, agentId);
  if (error) return { value: null, updatedAt: null, error };
  return {
    value: (row?.runtime_env as Record<string, unknown> | null) || null,
    updatedAt: row?.updated_at || null,
    error: null,
  };
}

export async function upsertRuntimeEnv(
  supabase: SupabaseClient,
  agentId: string,
  encryptedPayload: Record<string, unknown>,
  updatedBy?: string | null
): Promise<{ error: { message: string } | null }> {
  void agentId;
  const payload: Record<string, unknown> = {
    runtime_env: encryptedPayload,
    updated_at: new Date().toISOString(),
  };
  if (updatedBy !== undefined) {
    payload.updated_by = updatedBy;
  }
  const existing = await fetchGlobalChatPolicyRow(supabase);
  if (existing.row?.id) {
    const { error } = await supabase.from("B_chat_settings").update(payload).eq("id", existing.row.id);
    if (error) return { error: { message: error.message } };
    return { error: null };
  }
  const { error } = await supabase.from("B_chat_settings").insert(payload);
  if (error) return { error: { message: error.message } };
  return { error: null };
}
