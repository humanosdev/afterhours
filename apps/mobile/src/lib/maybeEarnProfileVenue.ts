import { hasProfileVenueDwell } from "@intencity/shared";
import { supabase } from "./supabase/client";

/** Idempotent earn — 15+ min inner dwell; deduped server-side. */
export async function maybeEarnProfileVenue(args: {
  userId: string;
  venueId: string | null;
  zoneType: string | null;
  enteredInnerAt: string | null;
}): Promise<void> {
  if (
    !hasProfileVenueDwell({
      zoneType: args.zoneType,
      venueId: args.venueId,
      enteredInnerAt: args.enteredInnerAt,
    })
  ) {
    return;
  }

  await supabase.rpc("maybe_earn_profile_venue", {
    p_user_id: args.userId,
    p_venue_id: args.venueId,
    p_zone_type: args.zoneType,
    p_entered_inner_at: args.enteredInnerAt,
  });
}
