import { supabase } from "./supabase/client";
import { isStoryRowShareFlag } from "./hubFeedSemantics";

export type ProfileArchiveRow = {
  id: string;
  image_url: string;
  created_at: string | null;
  is_share: boolean;
};

/** Mirrors web `ProfileStoriesGrid` mode `archive` (owner-only). */
export function filterProfileArchiveRows(rows: unknown[], nowMs = Date.now()): ProfileArchiveRow[] {
  return (rows as Record<string, unknown>[])
    .filter((s) => {
      const isShare = isStoryRowShareFlag(s.is_share);
      const shareHidden = !!s.share_hidden;
      const createdAtMs = new Date(String(s.created_at ?? "")).getTime();
      const fallbackExpiresMs = Number.isFinite(createdAtMs)
        ? createdAtMs + 24 * 60 * 60 * 1000
        : 0;
      const expiresAt = s.expires_at;
      const expiresMs = expiresAt ? new Date(String(expiresAt)).getTime() : fallbackExpiresMs;
      const isExpiredMoment = !isShare && Number.isFinite(expiresMs) && expiresMs <= nowMs;
      return isExpiredMoment || (isShare && shareHidden);
    })
    .map((s) => ({
      id: String(s.id),
      image_url: String(s.image_url ?? "").trim(),
      created_at: (s.created_at as string | null) ?? null,
      is_share: isStoryRowShareFlag(s.is_share),
    }))
    .filter((s) => Boolean(s.image_url));
}

export async function fetchMyProfileArchive(userId: string): Promise<{
  rows: ProfileArchiveRow[];
  error: string | null;
}> {
  const preferred = await supabase
    .from("stories")
    .select("id, image_url, created_at, expires_at, is_share, share_hidden")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (preferred.error) {
    const fallback = await supabase
      .from("stories")
      .select("id, image_url, created_at, expires_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fallback.error) {
      return { rows: [], error: fallback.error.message };
    }

    const rows = (fallback.data ?? []).map((row) => ({
      ...row,
      is_share: false,
      share_hidden: false,
    }));
    return { rows: filterProfileArchiveRows(rows), error: null };
  }

  return { rows: filterProfileArchiveRows(preferred.data ?? []), error: null };
}
