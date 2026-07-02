import { fetchHubFeedPreview } from "./fetchHubFeedPreview";
import { supabase } from "./supabase/client";
import { isStoryRowShareFlag } from "./hubFeedSemantics";

export type ProfileShareRow = {
  id: string;
  image_url: string;
  created_at: string | null;
};

type RawShareRow = {
  id: string;
  image_url?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  is_share?: unknown;
  share_visible?: boolean | null;
  share_hidden?: boolean | null;
};

const SELECT_VARIANTS = [
  "id, image_url, created_at, expires_at, is_share, share_visible, share_hidden",
  "id, image_url, created_at, expires_at, is_share, share_hidden",
  "id, image_url, created_at, expires_at, is_share",
  "id, image_url, created_at, expires_at",
] as const;

function isMissingColumnError(message: string): boolean {
  return /column\s+.+\s+does not exist/i.test(message);
}

function storyImageUrl(row: RawShareRow): string {
  return String(row.image_url ?? "").trim();
}

/**
 * Owner shares grid — PWA `ProfileStoriesGrid` mode `shares` (owner sees all non-hidden shares).
 * Legacy fallback when `is_share` column missing: `expires_at` null (native upload contract).
 */
function isOwnerShareRow(row: RawShareRow): boolean {
  if (!row.id || !!row.share_hidden || !storyImageUrl(row)) return false;

  const isShare = isStoryRowShareFlag(row.is_share);
  if (isShare) return true;
  if (row.is_share === false) return false;

  const exp = row.expires_at;
  return exp == null || String(exp).trim() === "";
}

function mapRows(rows: RawShareRow[]): ProfileShareRow[] {
  return rows.filter(isOwnerShareRow).map((s) => ({
    id: s.id,
    image_url: storyImageUrl(s),
    created_at: (s.created_at ?? null) as string | null,
  }));
}

async function fetchRawStoriesForUser(userId: string): Promise<{
  rows: RawShareRow[];
  error: string | null;
}> {
  let lastError: string | null = null;

  for (const columns of SELECT_VARIANTS) {
    const { data, error } = await supabase
      .from("stories")
      .select(columns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      return { rows: (data ?? []) as unknown as RawShareRow[], error: null };
    }

    lastError = error.message;
    if (!isMissingColumnError(lastError)) {
      return { rows: [], error: lastError };
    }
  }

  return { rows: [], error: lastError };
}

type FetchMyProfileSharesOptions = {
  /** Skip legacy hub fallback — faster cold open; grid can reconcile on quiet reload. */
  skipHubFallback?: boolean;
};

/** Own profile shares grid — resilient selects (no `media_url`). */
export async function fetchMyProfileShares(
  userId: string,
  opts?: FetchMyProfileSharesOptions
): Promise<{
  shares: ProfileShareRow[];
  count: number;
  error: string | null;
}> {
  const { rows, error } = await fetchRawStoriesForUser(userId);
  if (error) {
    if (__DEV__) {
      console.warn("[profile-shares] fetch failed", error);
    }
    return { shares: [], count: 0, error };
  }

  let shares = mapRows(rows);

  if (shares.length === 0 && !opts?.skipHubFallback) {
    const hub = await fetchHubFeedPreview(userId, []);
    if (!hub.error && hub.shares.length > 0) {
      shares = hub.shares
        .filter((s) => s.user_id === userId)
        .map((s) => ({
          id: s.id,
          image_url: s.image_url,
          created_at: s.created_at ?? null,
        }));
    }
  }

  if (__DEV__) {
    const flagged = rows.filter((r) => isStoryRowShareFlag(r.is_share)).length;
    const nullExp = rows.filter((r) => r.expires_at == null || String(r.expires_at ?? "").trim() === "").length;
    console.log("[profile-shares] loaded", {
      userId,
      raw: rows.length,
      is_share_true: flagged,
      expires_at_null: nullExp,
      grid: shares.length,
    });
  }

  return { shares, count: shares.length, error: null };
}
