import type { UserPresenceRow } from "../types/presence";
import { describeRequestFailure } from "./networkErrors";
import { supabase } from "./supabase/client";

const PRESENCE_COLUMNS =
  "user_id, lng, lat, updated_at, venue_id, zone_type, venue_state, entered_inner_at" as const;
const ID_CHUNK_SIZE = 80;

export async function fetchUserPresenceRows(): Promise<{
  presence: UserPresenceRow[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.from("user_presence").select(PRESENCE_COLUMNS);
    if (error) return { presence: [], error: error.message };

    const presence: UserPresenceRow[] = [];
    for (const row of data ?? []) {
      const r = row as Partial<UserPresenceRow>;
      if (!r.user_id || typeof r.user_id !== "string") continue;
      if (typeof r.lat !== "number" || !Number.isFinite(r.lat)) continue;
      if (typeof r.lng !== "number" || !Number.isFinite(r.lng)) continue;
      presence.push({
        user_id: r.user_id,
        lat: r.lat,
        lng: r.lng,
        venue_id: r.venue_id == null ? null : String(r.venue_id),
        zone_type:
          r.zone_type === "inner" || r.zone_type === "outer" || r.zone_type === "halo"
            ? r.zone_type
            : null,
        venue_state: typeof r.venue_state === "string" ? r.venue_state : null,
        entered_inner_at: typeof r.entered_inner_at === "string" ? r.entered_inner_at : null,
        updated_at: typeof r.updated_at === "string" ? r.updated_at : new Date().toISOString(),
      });
    }
    return { presence, error: null };
  } catch (error) {
    return { presence: [], error: describeRequestFailure(error) };
  }
}

export async function fetchGhostModeByUserIds(userIds: string[]): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  if (!userIds.length) return out;

  for (let i = 0; i < userIds.length; i += ID_CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + ID_CHUNK_SIZE);
    const { data } = await supabase.from("profiles").select("id, ghost_mode").in("id", chunk);
    for (const row of data ?? []) {
      const id = (row as { id?: string }).id;
      if (id) out[id] = !!(row as { ghost_mode?: boolean }).ghost_mode;
    }
  }
  return out;
}
