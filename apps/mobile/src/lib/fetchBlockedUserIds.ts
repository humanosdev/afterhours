import { supabase } from "./supabase/client";

/** PWA map `hiddenIds` — both directions of block involving `meId`. */
export async function fetchBlockedUserIds(meId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${meId},blocked_id.eq.${meId}`);

  if (error) {
    console.warn("fetchBlockedUserIds:", error.message);
    return new Set();
  }

  const hidden = new Set<string>();
  for (const row of data ?? []) {
    const blocker = (row as { blocker_id?: string }).blocker_id;
    const blocked = (row as { blocked_id?: string }).blocked_id;
    if (blocker === meId && blocked) hidden.add(blocked);
    if (blocked === meId && blocker) hidden.add(blocker);
  }
  return hidden;
}
