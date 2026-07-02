import { emitProfileUpdated } from "./profileSyncEvents";
import { supabase } from "./supabase/client";

export async function updateMyProfile(
  userId: string,
  fields: { username: string; display_name: string | null; bio: string | null }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update({
      username: fields.username,
      display_name: fields.display_name,
      bio: fields.bio,
    })
    .eq("id", userId);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken." };
    }
    return { error: error.message || "Failed to save profile." };
  }

  emitProfileUpdated();
  return { error: null };
}
