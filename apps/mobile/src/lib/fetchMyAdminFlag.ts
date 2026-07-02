import { supabase } from "./supabase/client";

export async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return data.is_admin === true;
}
