import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseConfig } from "../env";
import { secureStoreAdapter } from "./sessionStorage";

function createSupabaseClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/** Only imported after `hasSupabaseConfig()` — root layout gates auth routes. */
export const supabase: SupabaseClient = hasSupabaseConfig()
  ? createSupabaseClient()
  : (undefined as unknown as SupabaseClient);
