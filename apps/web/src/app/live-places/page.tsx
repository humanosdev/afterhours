"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Navigation, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ProtectedRoute from "@/components/ProtectedRoute";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";
import LivePlacesListSkeleton from "@/components/skeletons/LivePlacesListSkeleton";
import { Avatar } from "@/components/ui";
import { isPresenceLive, isValidCoordinatePair } from "@/lib/presence";
import { subscribeUserPresenceChanges } from "@/lib/userPresenceRealtime";
import { acceptedFriendIdsExcludingBlocks } from "@/lib/pairBlockStatus";
import { resolveVenueContextLine } from "@/lib/venueContextCopy";
import { formatVenueCategoryLabel } from "@/lib/venueCategoryLabel";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TAIL_PADDING_CLASS,
  APP_PAGE_TOP_PADDING_CLASS,
  APP_TAB_PAGE_ROOT_CLASS,
  APP_TAB_PRIMARY_SCROLL_CLASS,
} from "@/lib/appShellLayout";

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
  context_copy?: unknown;
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

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

    const loadFriends = async () => {
      let ids: string[];
      try {
        ids = await acceptedFriendIdsExcludingBlocks(supabase, meId);
      } catch {
        return;
      }

      setFriends(ids);

      if (!ids.length) {
        setProfiles({});
        setAvatars({});
        setFriendGhostById({});
        return;
      }

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
    };

    void loadFriends();

    const bump = () => void loadFriends();
    window.addEventListener("friends-updated", bump);
    window.addEventListener("friend-removed", bump);
    return () => {
      window.removeEventListener("friends-updated", bump);
      window.removeEventListener("friend-removed", bump);
    };
  }, [meId]);

  useEffect(() => {
    let mounted = true;
    let presenceInterval: number | null = null;
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
    presenceInterval = window.setInterval(loadPresence, 25_000);
    return () => {
      mounted = false;
      if (presenceInterval) clearInterval(presenceInterval);
    };
  }, []);

  useEffect(() => {
    return subscribeUserPresenceChanges(supabase, {
      channelName: "live-places-user-presence",
      onInsertOrUpdate: (row) => {
        if (!row.user_id) return;
        setPresence((prev) => {
          const i = prev.findIndex((x) => x.user_id === row.user_id);
          const lat = typeof row.lat === "number" ? row.lat : prev[i]?.lat ?? 0;
          const lng = typeof row.lng === "number" ? row.lng : prev[i]?.lng ?? 0;
          const merged: Presence = {
            user_id: row.user_id,
            lat,
            lng,
            venue_id: (row.venue_id as string | null | undefined) ?? prev[i]?.venue_id ?? null,
            updated_at: (row.updated_at as string) || prev[i]?.updated_at || new Date().toISOString(),
          };
          if (i >= 0) {
            const next = [...prev];
            next[i] = merged;
            return next;
          }
          return [...prev, merged];
        });
      },
      onDelete: (uid) => {
        setPresence((prev) => prev.filter((x) => x.user_id !== uid));
      },
    });
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
        if (friends.includes(p.user_id) && !friendGhostById[p.user_id]) friendsInside++;
      } else if (d <= venue.outer_radius_m) {
        nearby++;
        if (friends.includes(p.user_id) && !friendGhostById[p.user_id]) friendsNearby++;
      }
    }
    return {
      inside,
      nearby,
      total: inside + nearby,
      friendsInside,
      friendsNearby,
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
    [venues, presence, friends, friendGhostById]
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
      <div className={`${APP_TAB_PAGE_ROOT_CLASS} overflow-hidden text-white`}>
        <div
          className={`relative ${APP_CONTENT_MAX_CLASS} ${APP_TAB_PRIMARY_SCROLL_CLASS} overflow-x-hidden bg-gradient-to-b from-[#101422] via-primary to-[#05060d] px-4 ${APP_PAGE_TAIL_PADDING_CLASS} ${APP_PAGE_TOP_PADDING_CLASS} sm:px-5`}
        >
        <div
          className="pointer-events-none absolute -left-24 top-8 h-[260px] w-[260px] rounded-full bg-accent-violet/[0.07] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-[40%] h-[200px] w-[200px] rounded-full bg-accent-violet/[0.05] blur-3xl"
          aria-hidden
        />

        <div className="relative mb-5 flex items-start gap-2">
          <SubpageBackButton onBack={() => navigateBack(router, "/hub")} />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <MapPin className="shrink-0 text-accent-violet-active/95" size={20} strokeWidth={2.2} aria-hidden />
              <h1 className="text-[1.2rem] font-bold leading-tight tracking-tight">Live Places</h1>
            </div>
            <p className="mt-1.5 pl-[2px] text-[12px] font-medium leading-snug text-white/44">
              Pins ranked by heat — your crew lifts a venue in the stack.
            </p>
          </div>
        </div>

        {!venuesHydrated ? (
          <LivePlacesListSkeleton rows={7} />
        ) : venueCards.length === 0 ? (
          <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent px-6 py-14 text-center shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div
              className="pointer-events-none absolute inset-0 z-[1] rounded-2xl border border-accent-violet/22 shadow-[0_0_32px_rgba(59,102,255,0.1)] ah-premium-surface-pulse"
              aria-hidden
            />
            <div className="relative z-[2]">
              <p
                className="select-none text-[3rem] font-black leading-none tracking-tighter text-white/[0.07]"
                aria-hidden
              >
                ZZZ
              </p>
              <p className="mt-5 text-[15px] font-semibold text-white/88">City&apos;s taking a breath</p>
              <p className="mx-auto mt-2 max-w-[17rem] text-[13px] leading-relaxed text-white/45">
                No venue rows yet. When presence lights up, this list becomes a live leaderboard — check the map in the
                meantime.
              </p>
            </div>
          </div>
        ) : (
          <ul className="relative space-y-3">
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
                <li key={v.id}>
                  <div
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.09] via-white/[0.04] to-transparent shadow-[0_18px_50px_rgba(0,0,0,0.38)] backdrop-blur-xl transition ${
                      hasActivity ? "shadow-[0_0_0_1px_rgba(59,102,255,0.22),0_18px_50px_rgba(0,0,0,0.4)]" : ""
                    }`}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 z-[1] rounded-2xl border border-accent-violet/22 shadow-[0_0_26px_rgba(59,102,255,0.08)] ah-premium-surface-pulse"
                      aria-hidden
                    />
                    <div className="relative z-[2]">
                    <div className="flex w-full gap-2.5 p-3 sm:gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl sm:h-[3.75rem] sm:w-[3.75rem]">
                        {venueImage ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={venueImage} alt={v.name} className="h-full w-full object-cover" />
                            <div
                              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"
                              aria-hidden
                            />
                          </>
                        ) : (
                          <div className="ah-glass-control flex h-full w-full flex-col items-center justify-center rounded-xl">
                            <span className="text-[1.35rem] font-black tracking-tight text-white/[0.18]">
                              {initialsFromName(v.name)}
                            </span>
                          </div>
                        )}
                        {hasActivity ? (
                          <span className="absolute bottom-1 left-1 right-1 rounded-md bg-black/55 px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-accent-violet-active">
                            Live feed
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 py-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate pr-1 text-[14px] font-bold leading-tight tracking-tight text-white">
                            {v.name}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-white/48">
                          {formatVenueCategoryLabel(v.category)}
                          {distanceMi !== null ? (
                            <>
                              <span className="text-white/22"> · </span>
                              {distanceMi.toFixed(1)} mi
                            </>
                          ) : null}
                          <span className="text-white/22"> · </span>
                          <span className="text-white/70">{vibe}</span>
                        </p>
                        {(() => {
                          const line = resolveVenueContextLine(new Date(), v.context_copy);
                          return line ? (
                            <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-snug text-white/40">
                              {line}
                            </p>
                          ) : null;
                        })()}

                        <div className="mt-2 flex rounded-xl bg-black/22 px-0.5 py-2">
                          <div className="min-w-0 flex-1 text-center">
                            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/38">Inside</p>
                            <p className="mt-0.5 text-[1.15rem] font-bold tabular-nums leading-none text-white">
                              {v.inside}
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium leading-tight text-white/40">
                              {v.friendsInside ? `${v.friendsInside} from your list` : "None listed"}
                            </p>
                          </div>
                          <div className="mx-0.5 w-px shrink-0 self-stretch bg-white/[0.08]" aria-hidden />
                          <div className="min-w-0 flex-1 text-center">
                            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/38">Nearby</p>
                            <p className="mt-0.5 text-[1.15rem] font-bold tabular-nums leading-none text-white">
                              {v.nearby}
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium leading-tight text-white/40">
                              {v.friendsNearby ? `${v.friendsNearby} from your list` : "None listed"}
                            </p>
                          </div>
                        </div>

                        {previewIds.length > 0 ? (
                          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {previewIds.map((id: string) => (
                              <div
                                key={id}
                                className="ah-glass-control flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5"
                              >
                                <Avatar
                                  src={(avatars[id] ?? "").trim() || null}
                                  fallbackText={profiles[id] || "F"}
                                  size="xs"
                                  className="ring-2 ring-primary/90"
                                />
                                <span className="max-w-[5.5rem] truncate text-[11px] font-semibold text-white/75">
                                  {profiles[id] || "Friend"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : v.friendsTotal > 0 ? (
                          <p className="mt-2 text-[10px] font-medium text-white/38">Friends in range — not checked in here.</p>
                        ) : v.total > 0 ? (
                          <p className="mt-2 text-[10px] font-medium text-white/38">Crowd building — no friends on this pin yet.</p>
                        ) : (
                          <p className="mt-2 text-[10px] font-medium text-white/35">Dead air at this address for now.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-white/[0.05] px-3 pb-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/map?venueId=${encodeURIComponent(v.id)}`)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.07] py-2 text-[12px] font-bold text-white/90 transition hover:bg-white/[0.1] active:scale-[0.99]"
                      >
                        <Navigation size={15} strokeWidth={2.1} className="text-accent-violet-active/95" aria-hidden />
                        Open on map
                      </button>
                      {hasActivity ? (
                        <button
                          type="button"
                          onClick={() => {
                            const h = new Date().getHours();
                            const mapTone = h >= 7 && h < 18 ? "day" : "night";
                            router.push(
                              `/venue-activity?venueId=${encodeURIComponent(v.id)}&mapTone=${mapTone}`
                            );
                          }}
                          className="flex flex-[1.15] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-violet-active via-accent-violet to-[#3558d4] py-2 text-[12px] font-bold text-white shadow-[0_0_28px_rgba(59,102,255,0.32)] transition hover:brightness-110 active:scale-[0.99]"
                        >
                          <Sparkles size={15} strokeWidth={2.2} className="text-white/95" aria-hidden />
                          Scene
                        </button>
                      ) : null}
                    </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
