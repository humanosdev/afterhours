import { invalidateSocialGraph } from "./socialGraphSync";
import { supabase } from "./supabase/client";

/** PWA `/profile/blocks` unblock — delete row where you are blocker. */
export async function unblockUser(
  meId: string,
  themId: string
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", meId)
    .eq("blocked_id", themId);

  if (error) {
    console.warn("unblockUser:", error.code, error.message);
    return { ok: false, message: "Could not unblock. Try again." };
  }
  invalidateSocialGraph(meId);
  return { ok: true };
}

/** Insert block row — used from public profile menu. */
export async function blockUser(
  meId: string,
  themId: string
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from("blocks").insert({ blocker_id: meId, blocked_id: themId });
  if (error) {
    if (error.code === "23505") {
      invalidateSocialGraph(meId);
      return { ok: true };
    }
    console.warn("blockUser:", error.code, error.message);
    return { ok: false, message: "Could not block user. Try again." };
  }
  invalidateSocialGraph(meId);
  return { ok: true };
}
