import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchChatPolicy } from "@/lib/chatPolicyStore";
import type { ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";

export async function fetchWidgetChatPolicy(
  supabaseAdmin: SupabaseClient,
  agentId: string
): Promise<ConversationFeaturesProviderShape | null> {
  return fetchChatPolicy(supabaseAdmin, agentId);
}
