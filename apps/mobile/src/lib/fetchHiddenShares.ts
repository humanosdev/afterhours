import { supabase } from "./supabase/client";

export type HiddenShareRow = {
  id: string;
  image_url: string;
  created_at: string;
};

export async function fetchHiddenShares(userId: string): Promise<{
  rows: HiddenShareRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("stories")
    .select("id, image_url, created_at, is_share, share_hidden")
    .eq("user_id", userId)
    .eq("is_share", true)
    .eq("share_hidden", true)
    .order("created_at", { ascending: false });

  if (error) {
    return { rows: [], error: error.message };
  }

  const rows: HiddenShareRow[] = [];
  for (const row of data ?? []) {
    const id = typeof row.id === "string" ? row.id : null;
    const image_url = typeof row.image_url === "string" ? row.image_url : null;
    const created_at = typeof row.created_at === "string" ? row.created_at : null;
    if (id && image_url && created_at) {
      rows.push({ id, image_url, created_at });
    }
  }

  return { rows, error: null };
}
