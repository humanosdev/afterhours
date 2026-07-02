import { supabase } from "./supabase/client";

export type BlockProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function fetchBlockLists(userId: string): Promise<{
  youBlocked: BlockProfile[];
  blockedYou: BlockProfile[];
  error: string | null;
}> {
  const [{ data: outgoing, error: outErr }, { data: incoming, error: inErr }] = await Promise.all([
    supabase.from("blocks").select("blocked_id").eq("blocker_id", userId),
    supabase.from("blocks").select("blocker_id").eq("blocked_id", userId),
  ]);

  if (outErr || inErr) {
    return { youBlocked: [], blockedYou: [], error: (outErr ?? inErr)?.message ?? "Could not load blocks." };
  }

  const outIds = Array.from(new Set((outgoing ?? []).map((b) => b.blocked_id).filter(Boolean))) as string[];
  const inIds = Array.from(new Set((incoming ?? []).map((b) => b.blocker_id).filter(Boolean))) as string[];
  const allIds = Array.from(new Set([...outIds, ...inIds]));

  if (allIds.length === 0) {
    return { youBlocked: [], blockedYou: [], error: null };
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", allIds);

  if (profileError) {
    return { youBlocked: [], blockedYou: [], error: profileError.message };
  }

  const byId = new Map((profiles ?? []).map((p) => [p.id, p as BlockProfile]));

  return {
    youBlocked: outIds.map((id) => byId.get(id)).filter(Boolean) as BlockProfile[],
    blockedYou: inIds.map((id) => byId.get(id)).filter(Boolean) as BlockProfile[],
    error: null,
  };
}
