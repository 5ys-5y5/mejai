import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WIDGET_PAGE_KEY,
  type ConversationFeaturesProviderShape,
} from "@/lib/conversation/pageFeaturePolicy";

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

  const pageOverride = provider.pages?.[WIDGET_PAGE_KEY];
  const debugOverride = provider.debug_copy?.[WIDGET_PAGE_KEY];
  const setupOverride = provider.settings_ui?.setup_fields?.[WIDGET_PAGE_KEY];

  const trimmed: ConversationFeaturesProviderShape = {};
  if (pageOverride) trimmed.pages = { [WIDGET_PAGE_KEY]: pageOverride };
  if (debugOverride) trimmed.debug_copy = { [WIDGET_PAGE_KEY]: debugOverride };
  if (setupOverride) trimmed.settings_ui = { setup_fields: { [WIDGET_PAGE_KEY]: setupOverride } };

  return trimmed;
}
