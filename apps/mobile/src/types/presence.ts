/** Read-only `user_presence` row (P2O-C). */
export type UserPresenceRow = {
  user_id: string;
  lat: number;
  lng: number;
  venue_id: string | null;
  zone_type?: "inner" | "outer" | "halo" | null;
  venue_state?: "outside" | "inner_pending" | "inner_confirmed" | string | null;
  entered_inner_at?: string | null;
  updated_at: string;
};
