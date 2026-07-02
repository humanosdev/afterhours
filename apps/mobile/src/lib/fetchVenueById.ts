import type { VenuePublic } from "../types/venue";
import { supabase } from "./supabase/client";

const VENUE_COLUMNS = "id, name, category, lat, lng, image_url, photo_url, cover_image_url, context_copy" as const;

export async function fetchVenueById(venueId: string): Promise<{
  venue: VenuePublic | null;
  error: string | null;
}> {
  const { data, error } = await supabase.from("venues").select(VENUE_COLUMNS).eq("id", venueId).maybeSingle();

  if (error) {
    return { venue: null, error: error.message };
  }

  if (!data?.id || typeof data.name !== "string" || !data.name.trim()) {
    return { venue: null, error: null };
  }

  const row = data as Record<string, unknown>;
  return {
    venue: {
      id: String(row.id),
      name: String(row.name).trim(),
      category: row.category == null ? null : String(row.category),
      lat: typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null,
      lng: typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null,
      image_url: row.image_url == null ? null : String(row.image_url),
      photo_url: row.photo_url == null ? null : String(row.photo_url),
      cover_image_url: row.cover_image_url == null ? null : String(row.cover_image_url),
      context_copy: row.context_copy ?? null,
    },
    error: null,
  };
}
