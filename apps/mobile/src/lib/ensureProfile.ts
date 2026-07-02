import { supabase } from "./supabase/client";

/** Ensures a `profiles` row exists after auth signup (mirrors web `ensureProfileExists`). */
export async function ensureProfileExists(userId: string): Promise<void> {
  if (!userId) return;
  const { error } = await supabase.from("profiles").upsert({ id: userId }, { onConflict: "id" });
  if (error) {
    console.warn("[ensureProfile] upsert failed:", error.message);
  }
}
