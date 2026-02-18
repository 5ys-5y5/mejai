import type { SupabaseClient } from "@supabase/supabase-js";
import { type ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";

type AuthSettingsRow = {
  providers: Record<string, Record<string, unknown> | undefined> | null;
};

export async function fetchWidgetChatPolicy(
  supabaseAdmin: SupabaseClient,
  orgId: string
): Promise<ConversationFeaturesProviderShape | null> {
  const { data, error } = await supabaseAdmin
    .from("A_iam_auth_settings")
    .select("providers, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) return null;
  const rows = (data || []) as AuthSettingsRow[];
  const picked = rows.find((row) => Boolean(row.providers?.chat_policy));
  const provider = picked?.providers?.chat_policy as ConversationFeaturesProviderShape | undefined;
  if (!provider) return null;

  const pages = { ...(provider.pages || {}) };
  const debugCopy = { ...(provider.debug_copy || {}) };
  const setupFields = { ...(provider.settings_ui?.setup_fields || {}) };

  return {
    ...provider,
    ...(Object.keys(pages).length > 0 ? { pages } : {}),
    ...(Object.keys(debugCopy).length > 0 ? { debug_copy: debugCopy } : {}),
    ...(Object.keys(setupFields).length > 0 ? { settings_ui: { setup_fields: setupFields } } : {}),
  };
}
