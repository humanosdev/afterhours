import type { VenuePublic } from "../types/venue";
import { supabase } from "./supabase/client";

/** Keep payload small; order is stable for UI. RLS decides visibility per project. */
const VENUE_LIMIT = 60;

const VENUE_COLUMNS = "id, name, category, lat, lng" as const;

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
  };
}

/**
 * Phase 2L — read-only `venues` rows for Hub / Map shells.
 * No writes, no `user_presence`, no device location.
 */
export async function fetchVenuesPreview(): Promise<FetchVenuesPreviewResult> {
  const { data, error } = await supabase
    .from("venues")
    .select(VENUE_COLUMNS)
    .order("name", { ascending: true })
    .limit(VENUE_LIMIT);

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
