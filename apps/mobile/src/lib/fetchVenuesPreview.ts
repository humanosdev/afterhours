import type { VenuePublic } from "../types/venue";
import { supabase } from "./supabase/client";

/** Keep payload small; order is stable for UI. RLS decides visibility per project. */
const VENUE_LIMIT = 60;

const VENUE_COLUMNS =
  "id, name, category, lat, lng, image_url, photo_url, cover_image_url, context_copy, inner_radius_m, outer_radius_m" as const;

export type FetchVenuesPreviewResult = {
  venues: VenuePublic[];
  error: string | null;
};

type VenueRow = {
  id: string;
  name: string | null;
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
  image_url?: string | null;
  photo_url?: string | null;
  cover_image_url?: string | null;
  context_copy?: unknown;
  inner_radius_m?: number | null;
  outer_radius_m?: number | null;
};

function normalizeRow(row: VenueRow): VenuePublic | null {
  if (!row?.id || typeof row.id !== "string") return null;
  const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : null;
  if (!name) return null;
  return {
    id: row.id,
    name,
    category: row.category == null ? null : String(row.category),
    lat: typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null,
    lng: typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null,
    image_url: row.image_url == null ? null : String(row.image_url),
    photo_url: row.photo_url == null ? null : String(row.photo_url),
    cover_image_url: row.cover_image_url == null ? null : String(row.cover_image_url),
    context_copy: row.context_copy ?? null,
    inner_radius_m:
      typeof row.inner_radius_m === "number" && Number.isFinite(row.inner_radius_m)
        ? row.inner_radius_m
        : undefined,
    outer_radius_m:
      typeof row.outer_radius_m === "number" && Number.isFinite(row.outer_radius_m)
        ? row.outer_radius_m
        : undefined,
  };
}

/**
 * Phase 2L — read-only `venues` rows for Hub / Map shells.
 * No writes, no `user_presence`, no device location.
 */
async function fetchVenuesWithLimit(limit: number): Promise<FetchVenuesPreviewResult> {
  const { data, error } = await supabase
    .from("venues")
    .select(VENUE_COLUMNS)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    return { venues: [], error: error.message };
  }

  const venues: VenuePublic[] = [];
  for (const row of data ?? []) {
    const v = normalizeRow(row as VenueRow);
    if (v) venues.push(v);
  }

  return { venues, error: null };
}

/** Phase 2L — read-only `venues` rows for Hub / Map shells. */
export async function fetchVenuesPreview(): Promise<FetchVenuesPreviewResult> {
  return fetchVenuesWithLimit(VENUE_LIMIT);
}

/** PWA `/live-places` — full catalog for heat-ranked leaderboard. */
export async function fetchVenuesCatalog(): Promise<FetchVenuesPreviewResult> {
  return fetchVenuesWithLimit(500);
}
