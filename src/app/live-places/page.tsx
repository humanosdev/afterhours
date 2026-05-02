"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ProtectedRoute from "@/components/ProtectedRoute";
import LivePlacesListSkeleton from "@/components/skeletons/LivePlacesListSkeleton";
import { Avatar } from "@/components/ui";
import { isPresenceLive, isValidCoordinatePair } from "@/lib/presence";

type Venue = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  cover_image_url?: string | null;
  inner_radius_m: number;
  outer_radius_m: number;
};

type Presence = {
  user_id: string;
  lat: number;
  lng: number;
  venue_id: string | null;
  updated_at: string;
};

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LivePlacesPage() {
  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);
  const [friends, setFriends] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [friendGhostById, setFriendGhostById] = useState<Record<string, boolean>>({});
  const [venues, setVenues] = useState<Venue[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [storyVenueIds, setStoryVenueIds] = useState<Set<string>>(new Set());
  const [venuesHydrated, setVenuesHydrated] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMeId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!meId) return;
    (async () => {
      const { data } = await supabase
        .from("friend_requests")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`);
      if (!data) return;

      const ids: string[] = [];
      for (const r of data) {
        const id = r.requester_id === meId ? r.addressee_id : r.requester_id;
        ids.push(id);
      }
      setFriends(ids);

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, ghost_mode")
        .in("id", ids);
      const map: Record<string, string> = {};
      const av: Record<string, string | null> = {};
      const ghostMap: Record<string, boolean> = {};
      (prof ?? []).forEach((p: any) => {
        map[p.id] = p.username;
        av[p.id] = p.avatar_url ?? null;
        ghostMap[p.id] = !!p.ghost_mode;
      });
      setProfiles(map);
      setAvatars(av);
      setFriendGhostById(ghostMap);
    })();
  }, [meId]);

  useEffect(() => {
    let mounted = true;
    let presenceInterval: ReturnType<typeof setInterval> | null = null;
    const loadVenuesOnce = async () => {
      const { data: v } = await supabase.from("venues").select("*");
      if (!mounted) return;
      setVenues((v ?? []) as Venue[]);
      setVenuesHydrated(true);
    };
    const loadPresence = async () => {
      const { data: p } = await supabase.from("user_presence").select("*");
      if (!mounted) return;
      setPresence((p ?? []) as Presence[]);
    };
    loadVenuesOnce();
    loadPresence();
    presenceInterval = setInterval(loadPresence, 5000);
    return () => {
      mounted = false;
      if (presenceInterval) clearInterval(presenceInterval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadStoryVenueLinks = async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("venue_id")
        .not("venue_id", "is", null)
        .limit(500);
      if (error) {
        if (mounted) setStoryVenueIds(new Set());
        return;
      }
      const ids = new Set<string>();
      (data ?? []).forEach((row: any) => {
        if (row?.venue_id) ids.add(row.venue_id);
      });
      if (mounted) setStoryVenueIds(ids);
    };
    loadStoryVenueLinks();
    const onStoryPosted = () => loadStoryVenueLinks();
    window.addEventListener("story-posted", onStoryPosted);
    return () => {
      mounted = false;
      window.removeEventListener("story-posted", onStoryPosted);
    };
  }, []);

  const myPresence = useMemo(
    () =>
      meId
        ? presence.find(
            (p) =>
              p.user_id === meId &&
              isValidCoordinatePair(p.lat, p.lng) &&
              isPresenceLive(p.updated_at)
          ) ?? null
        : null,
    [presence, meId]
  );

  const getVenueStats = (venue: Venue) => {
    let inside = 0;
    let nearby = 0;
    let friendsInside = 0;
    let friendsNearby = 0;

    for (const p of presence) {
      if (!isValidCoordinatePair(p.lat, p.lng)) continue;
      if (!isPresenceLive(p.updated_at)) continue;
      const d = distanceMeters(p.lat, p.lng, venue.lat, venue.lng);
      if (d <= venue.inner_radius_m) {
        inside++;
        if (friends.includes(p.user_id)) friendsInside++;
      } else if (d <= venue.outer_radius_m) {
        nearby++;
        if (friends.includes(p.user_id)) friendsNearby++;
      }
    }
    return {
      inside,
      nearby,
      total: inside + nearby,
      friendsInside,
      friendsTotal: friendsInside + friendsNearby,
    };
  };

  const venueCards = useMemo(
    () =>
      venues
        .map((v) => ({ ...v, ...getVenueStats(v) }))
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          if (b.friendsTotal !== a.friendsTotal) return b.friendsTotal - a.friendsTotal;
          return 0;
        }),
    [venues, presence, friends]
  );

  const friendPreviewForVenue = (venueId: string) => {
    const ids = presence
      .filter(
        (p) =>
          p.venue_id === venueId &&
          friends.includes(p.user_id) &&
          !friendGhostById[p.user_id] &&
          isValidCoordinatePair(p.lat, p.lng) &&
          isPresenceLive(p.updated_at)
      )
      .map((p) => p.user_id);
    return Array.from(new Set(ids)).slice(0, 5);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[100dvh] bg-black px-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] text-white sm:px-5">
        <div className="mb-4 flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[17px] text-white/80"
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="text-[1.1rem] font-semibold tracking-tight">Live Places</h1>
        </div>

        {!venuesHydrated ? (
          <LivePlacesListSkeleton rows={7} />
        ) : venueCards.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[14px] text-white/65">Quiet right now</p>
            <p className="mt-1 text-[12px] text-white/38">Venues show up as people get nearby.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.08]">
            {venueCards.map((v: any) => {
              let vibe = "Quiet";
              if (v.total >= 16) vibe = "Packed";
              else if (v.total >= 8) vibe = "Active";
              else if (v.total >= 2) vibe = "Warming up";

              const previewIds = friendPreviewForVenue(v.id);
              const distanceMi =
                myPresence
                  ? distanceMeters(myPresence.lat, myPresence.lng, v.lat, v.lng) / 1609.34
                  : null;
              const hasActivity = storyVenueIds.has(v.id);
              const venueImage = v.image_url || v.photo_url || v.cover_image_url || null;

              return (
                <li key={v.id} className="py-2.5 first:pt-0">
                  <button
                    type="button"
                    className="flex w-full gap-3 text-left"
                    onClick={() => router.push(`/map?venueId=${encodeURIComponent(v.id)}`)}
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-white/[0.06] ring-1 ring-white/[0.08]">
                      {venueImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={venueImage} alt={v.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[10px] font-medium text-white/35">AH</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="truncate text-[15px] font-semibold leading-tight text-white">{v.name}</p>
                      <p className="mt-0.5 truncate text-[12px] text-white/45">
                        {vibe}
                        <span className="text-white/25"> · </span>
                        {v.category ?? "Venue"}
                        {distanceMi !== null ? (
                          <>
                            <span className="text-white/25"> · </span>
                            {distanceMi.toFixed(1)} mi
                          </>
                        ) : null}
                      </p>
                      <p className="mt-1 text-[11px] text-white/38">
                        {v.total} around · {v.inside} in · {v.nearby} near
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-center gap-0.5 pr-0.5">
                      <span className="text-[16px] font-bold tabular-nums text-white">{v.total}</span>
                      <ChevronRight className="text-white/30" size={18} strokeWidth={2} aria-hidden />
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-between gap-2 pl-[68px]">
                    {previewIds.length > 0 ? (
                      <div className="flex -space-x-1.5">
                        {previewIds.map((id: string) => (
                          <Avatar
                            key={id}
                            src={avatars[id] ?? null}
                            fallbackText={profiles[id] || "F"}
                            size="xs"
                            className="ring-2 ring-[#0a0a0c]"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="min-w-0" aria-hidden />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (hasActivity) {
                          router.push(`/venue-activity?venueId=${encodeURIComponent(v.id)}`);
                          return;
                        }
                        router.push(`/map?venueId=${encodeURIComponent(v.id)}`);
                      }}
                      className="rounded-[10px] bg-white/[0.08] px-3 py-2 text-[12px] font-semibold text-white/90 ring-1 ring-white/[0.08] transition hover:bg-white/[0.11]"
                    >
                      {hasActivity ? "View activity" : "Map"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ProtectedRoute>
  );
}
