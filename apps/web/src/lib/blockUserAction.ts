import type { SupabaseClient } from "@supabase/supabase-js";

/** Single copy for every UI entry point that blocks a user. */
export const BLOCK_USER_CONFIRM_PROMPT = "Are you sure you want to block this user?";

/**
 * Prompts for confirmation, then removes friendship/pending requests and inserts a block row.
 * Dispatches `friend-removed` and `friends-updated` on success (same as legacy profile flow).
 * @returns true if the viewer ended up blocking them (including already blocked), false if cancelled or insert failed.
 */
export async function confirmAndBlockUser(
  supabase: SupabaseClient,
  me: string,
  them: string
): Promise<boolean> {
  if (me === them) return false;
  if (typeof window !== "undefined" && !window.confirm(BLOCK_USER_CONFIRM_PROMPT)) {
    return false;
  }

  const { data: existing } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", me)
    .eq("blocked_id", them)
    .maybeSingle();

  if (existing) return true;

  await supabase
    .from("friend_requests")
    .delete()
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me})`
    );

  await supabase
    .from("friend_requests")
    .delete()
    .eq("status", "pending")
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me})`
    );

  const { error } = await supabase.from("blocks").insert({
    blocker_id: me,
    blocked_id: them,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Block failed:", error);
    return false;
  }

  window.dispatchEvent(new CustomEvent("friend-removed", { detail: { userId: them } }));
  window.dispatchEvent(new Event("friends-updated"));
  return true;
}
