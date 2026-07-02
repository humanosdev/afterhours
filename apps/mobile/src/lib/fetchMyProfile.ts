import type { MyProfile } from "../types/profile";
import { supabase } from "./supabase/client";

const MY_PROFILE_COLUMNS =
  "username, display_name, bio, avatar_url, ghost_mode" as const;

export type FetchMyProfileResult = {
  profile: MyProfile | null;
  error: string | null;
};

/**
 * Read-only: current user's `profiles` row. Phase 2F.
 * Other reads: accepted friends (2K), venues preview (2L), hub shares preview (2M) — dedicated modules.
 */
export async function fetchMyProfile(userId: string): Promise<FetchMyProfileResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select(MY_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: (data as MyProfile | null) ?? null, error: null };
}
