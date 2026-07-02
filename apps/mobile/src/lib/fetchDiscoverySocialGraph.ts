import { getBlockDirections } from "./pairBlockStatus";
import { supabase } from "./supabase/client";

export type DiscoverySocialGraph = {
  pendingOut: Set<string>;
  pendingIn: Set<string>;
  theyBlockedMe: Set<string>;
  iBlockedThem: Set<string>;
};

/**
 * Read-only social graph for discovery search pills — mirrors PWA `/search` social bundle (no realtime).
 */
export async function fetchDiscoverySocialGraph(meId: string): Promise<DiscoverySocialGraph> {
  const dirs = await getBlockDirections(meId);

  const { data: reqs } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id, status")
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
    .in("status", ["pending", "accepted"]);

  const out = new Set<string>();
  const inn = new Set<string>();
  for (const r of (reqs ?? []) as {
    requester_id: string;
    addressee_id: string;
    status: string;
  }[]) {
    if (r.status !== "pending") continue;
    if (r.requester_id === meId) out.add(r.addressee_id);
    if (r.addressee_id === meId) inn.add(r.requester_id);
  }

  const pruneBlocked = (s: Set<string>) => {
    const next = new Set(s);
    for (const id of next) {
      if (dirs.theyBlockedMe.has(id) || dirs.iBlockedThem.has(id)) next.delete(id);
    }
    return next;
  };

  return {
    pendingOut: pruneBlocked(out),
    pendingIn: pruneBlocked(inn),
    theyBlockedMe: dirs.theyBlockedMe,
    iBlockedThem: dirs.iBlockedThem,
  };
}
