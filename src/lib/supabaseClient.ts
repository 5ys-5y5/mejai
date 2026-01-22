import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (typeof window === "undefined") return null;
  if (!browserClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("SUPABASE_ENV_MISSING");
    }
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return browserClient;
}
