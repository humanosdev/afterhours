import { supabase } from "./supabase/client";

export async function resolvePushActorLabel(actorId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", actorId)
    .maybeSingle();
  if (!data) return null;
  const display = typeof data.display_name === "string" ? data.display_name.trim() : "";
  if (display) return display;
  const username = typeof data.username === "string" ? data.username.trim() : "";
  if (username) return username.startsWith("@") ? username : `@${username}`;
  return null;
}
