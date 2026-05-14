"use client";

import { supabase } from "@/lib/supabaseClient";

export async function ensureProfileExists(userId: string) {
  if (!userId) return;
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
      },
      { onConflict: "id" }
    );
  if (error) {
    console.error("Failed to ensure profile row:", error);
  }
}
