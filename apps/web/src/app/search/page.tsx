"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Avatar, SectionHeader, Skeleton, SkeletonCircle, SkeletonLine, StatusBadge } from "@/components/ui";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TOP_PADDING_CLASS,
  APP_TAB_PAGE_ROOT_CLASS,
  APP_TAB_PRIMARY_SCROLL_CLASS,
  emitPrimarySurfaceReady,
} from "@/lib/appShellLayout";
import { acceptedFriendIdsExcludingBlocks, getBlockDirections } from "@/lib/pairBlockStatus";
import { loadFriendsOfFriendsSuggestions, type FriendsOfFriendsRow } from "@/lib/friendsOfFriends";
import { getRecentDiscoverySearches, pushRecentDiscoverySearch, type RecentSearchItem } from "@/lib/recentDiscoverySearches";
import { isPresenceLive, isValidCoordinatePair } from "@/lib/presence";
import { venueAccentRgba } from "@/lib/venueCategoryAccent";
import { venueHeatHexFromActivity } from "@/lib/venueHeatColors";
import { withTimeout } from "@/lib/withTimeout";
import { subscribeUserPresenceChanges } from "@/lib/userPresenceRealtime";
import { searchProfilesDiscovery } from "@/lib/searchProfilesDiscovery";

function escapeIlike(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type VenueLite = {
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
  neighborhood?: string | null;
  city?: string | null;
};

type PresenceLite = {
  user_id: string;
  lat: number;
  lng: number;
  venue_id: string | null;
  updated_at: string;
};

type ProfileHit = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function venueLocationLine(v: VenueLite): string | null {
  const n = (v.neighborhood ?? "").trim();
  const c = (v.city ?? "").trim();
  if (n && c) return `${n}, ${c}`;
  if (n) return n;
  if (c) return c;
  return null;
}

function venueThumb(v: VenueLite) {
  return v.image_url || v.photo_url || v.cover_image_url || null;
}

/** Single loading surface for Recent + Suggested + Trending so sections don’t pop in separately. */
function SearchExploreSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading discovery">
      <section>
        <div className="flex items-end justify-between gap-4">
          <SkeletonLine width={128} height={15} className="opacity-85" />
          <SkeletonLine width={44} height={12} className="opacity-50" />
        </div>
        <div className="scrollbar-none mt-3 flex gap-2 overflow-hidden pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 shrink-0 rounded-full" style={{ width: 72 + i * 16 }} />
          ))}
        </div>
      </section>
      <section>
        <SkeletonLine width={140} height={15} className="mb-3 opacity-85" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonCircle size={48} />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonLine width={`${58 + (i % 3) * 8}%`} height={14} />
                <SkeletonLine width={`${32 + (i % 2) * 10}%`} height={11} />
              </div>
              <SkeletonLine width={52} height={30} className="rounded-full" />
            </div>
          ))}
        </div>
      </section>
      <section>
        <SkeletonLine width={120} height={15} className="mb-3 opacity-85" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonLine width={48} height={48} className="rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonLine width={`${62 + (i % 3) * 6}%`} height={14} />
                <SkeletonLine width={`${36 + (i % 2) * 8}%`} height={11} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function GlobalSearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [recent, setRecent] = useState<RecentSearchItem[]>([]);
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [fof, setFof] = useState<FriendsOfFriendsRow[]>([]);
  /** False until venues, presence, FoF, friend graph, and recents are hydrated together. */
  const [exploreDataReady, setExploreDataReady] = useState(false);
  const [venues, setVenues] = useState<VenueLite[]>([]);
  const [presence, setPresence] = useState<PresenceLite[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [friendGhostById, setFriendGhostById] = useState<Record<string, boolean>>({});
  const [peopleHits, setPeopleHits] = useState<ProfileHit[]>([]);
  const [venueHits, setVenueHits] = useState<VenueLite[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [friendSet, setFriendSet] = useState<Set<string>>(new Set());
  const [pendingOut, setPendingOut] = useState<Set<string>>(new Set());
  const [pendingIn, setPendingIn] = useState<Set<string>>(new Set());
  const [theyBlockedMe, setTheyBlockedMe] = useState<Set<string>>(new Set());
  const [iBlockedThem, setIBlockedThem] = useState<Set<string>>(new Set());
  const [socialGraphEpoch, setSocialGraphEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setSocialGraphEpoch((n) => n + 1);
    window.addEventListener("friends-updated", bump);
    window.addEventListener("friend-removed", bump);
    return () => {
      window.removeEventListener("friends-updated", bump);
      window.removeEventListener("friend-removed", bump);
    };
  }, []);

  useEffect(() => {
    if (!meId) return;
    const ch = supabase
      .channel(`search-blocks-refresh:${meId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocks", filter: `blocker_id=eq.${meId}` },
        () => setSocialGraphEpoch((n) => n + 1)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocks", filter: `blocked_id=eq.${meId}` },
        () => setSocialGraphEpoch((n) => n + 1)
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [meId]);

  useEffect(() => {
    if (exploreDataReady) emitPrimarySurfaceReady();
  }, [exploreDataReady]);

  useEffect(() => {
    if (!meId) {
      setExploreDataReady(false);
      return;
    }

    let cancelled = false;
    let unsubPresence: (() => void) | undefined;
    let pollId: number | undefined;

    void (async () => {
      setExploreDataReady(false);

      const socialBundlePromise = (async () => {
        const friendIds = await acceptedFriendIdsExcludingBlocks(supabase, meId);
        const dirs = await getBlockDirections(supabase, meId);
        const ghostMap: Record<string, boolean> = {};
        if (friendIds.length) {
          const { data: prof } = await supabase.from("profiles").select("id, ghost_mode").in("id", friendIds);
          (prof ?? []).forEach((p: { id: string; ghost_mode?: boolean }) => {
            ghostMap[p.id] = !!p.ghost_mode;
          });
        }
        const { data: reqs } = await supabase
          .from("friend_requests")
          .select("requester_id, addressee_id, status")
          .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
          .in("status", ["pending", "accepted"]);
        const out = new Set<string>();
        const inn = new Set<string>();
        for (const r of (reqs ?? []) as { requester_id: string; addressee_id: string; status: string }[]) {
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
          friendIds,
          ghostMap,
          pendingOut: pruneBlocked(out),
          pendingIn: pruneBlocked(inn),
          blockDirs: dirs,
        };
      })();

      const [venueRes, presenceRes, fofRows, social] = await Promise.all([
        withTimeout(
          supabase.from("venues").select("*").then((r) => r),
          12_000,
          { data: [] as VenueLite[], error: null } as any
        ),
        supabase.from("user_presence").select("*"),
        loadFriendsOfFriendsSuggestions(supabase, meId),
        socialBundlePromise,
      ]);

      if (cancelled) return;

      setVenues((venueRes.data as VenueLite[]) || []);
      setPresence((presenceRes.data as PresenceLite[]) || []);
      const blockedEither = new Set<string>([
        ...social.blockDirs.theyBlockedMe,
        ...social.blockDirs.iBlockedThem,
      ]);
      setFof(fofRows.filter((row) => !blockedEither.has(row.id)));
      setFriends(social.friendIds);
      setFriendGhostById(social.ghostMap);
      setFriendSet(new Set(social.friendIds));
      setPendingOut(social.pendingOut);
      setPendingIn(social.pendingIn);
      setTheyBlockedMe(social.blockDirs.theyBlockedMe);
      setIBlockedThem(social.blockDirs.iBlockedThem);
      setRecent(getRecentDiscoverySearches(meId));

      if (cancelled) return;

      unsubPresence = subscribeUserPresenceChanges(supabase, {
        channelName: `search-user-presence:${meId}`,
        onInsertOrUpdate: (row) => {
          if (!row.user_id) return;
          setPresence((prev) => {
            const i = prev.findIndex((x) => x.user_id === row.user_id);
            const lat = typeof row.lat === "number" ? row.lat : prev[i]?.lat ?? 0;
            const lng = typeof row.lng === "number" ? row.lng : prev[i]?.lng ?? 0;
            const merged: PresenceLite = {
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

      pollId = window.setInterval(() => {
        void supabase.from("user_presence").select("*").then(({ data: p }) => {
          if (!cancelled) setPresence((p as PresenceLite[]) || []);
        });
      }, 28_000);

      if (cancelled) {
        if (pollId !== undefined) window.clearInterval(pollId);
        unsubPresence?.();
        return;
      }

      setExploreDataReady(true);
    })();

    return () => {
      cancelled = true;
      if (pollId !== undefined) window.clearInterval(pollId);
      unsubPresence?.();
    };
  }, [meId, socialGraphEpoch]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 240);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setMeId(id);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const friendIdSet = useMemo(() => new Set(friends), [friends]);

  const trendingRanked = useMemo(() => {
    const statsFor = (venue: VenueLite) => {
      let inside = 0;
      let nearby = 0;
      let friendsInside = 0;
      let friendsNearby = 0;
      for (const p of presence) {
        if (!isValidCoordinatePair(p.lat, p.lng)) continue;
        if (!isPresenceLive(p.updated_at)) continue;
        const d = distanceMeters(p.lat, p.lng, venue.lat, venue.lng);
        const isFriend = friendIdSet.has(p.user_id) && !friendGhostById[p.user_id];
        if (d <= venue.inner_radius_m) {
          inside++;
          if (isFriend) friendsInside++;
        } else if (d <= venue.outer_radius_m) {
          nearby++;
          if (isFriend) friendsNearby++;
        }
      }
      const total = inside + nearby;
      const friendsTotal = friendsInside + friendsNearby;
      const live = total > 0;
      return { total, friendsTotal, live };
    };
    return venues
      .map((v) => {
        const s = statsFor(v);
        return { ...v, ...s };
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.friendsTotal !== a.friendsTotal) return b.friendsTotal - a.friendsTotal;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 24);
  }, [venues, presence, friendIdSet, friendGhostById]);

  useEffect(() => {
    if (!meId || debounced.length < 1) {
      setPeopleHits([]);
      setVenueHits([]);
      setSearchLoading(false);
      return;
    }
    if (!exploreDataReady) {
      setSearchLoading(true);
      return;
    }
    let alive = true;
    setSearchLoading(true);
    const run = async () => {
      const qNorm = debounced.trim().toLowerCase().replace(/^@/, "");

      const friendIdsForSearch = friends.filter((id) => id && id !== meId);
      const friendProfilesPromise =
        friendIdsForSearch.length && qNorm.length
          ? supabase
              .from("profiles")
              .select("id, username, display_name, avatar_url")
              .in("id", friendIdsForSearch)
          : Promise.resolve({ data: [] as ProfileHit[], error: null });

      const [peopleRows, vnRes, catRes, friendProfRes] = await Promise.all([
        searchProfilesDiscovery(supabase, meId, debounced),
        supabase.from("venues").select("*").ilike("name", `%${escapeIlike(debounced)}%`).limit(20),
        supabase.from("venues").select("*").ilike("category", `%${escapeIlike(debounced)}%`).limit(20),
        friendProfilesPromise,
      ]);
      if (!alive) return;

      const friendMatches: ProfileHit[] = [];
      const friendSeen = new Set<string>();
      for (const row of (friendProfRes.data ?? []) as ProfileHit[]) {
        if (!row?.id) continue;
        const d = (row.display_name ?? "").toLowerCase();
        const u = (row.username ?? "").toLowerCase();
        if (!d.includes(qNorm) && !u.includes(qNorm)) continue;
        friendMatches.push(row);
        friendSeen.add(row.id);
      }

      const peopleMap = new Map<string, ProfileHit>();
      for (const row of peopleRows as ProfileHit[]) {
        peopleMap.set(row.id, row);
      }
      const others: ProfileHit[] = [];
      for (const p of peopleMap.values()) {
        if (friendSeen.has(p.id)) continue;
        others.push(p);
      }
      setPeopleHits([...friendMatches, ...others]);
      const venueMap = new Map<string, VenueLite>();
      for (const row of [...(vnRes.data ?? []), ...(catRes.data ?? [])] as VenueLite[]) {
        venueMap.set(row.id, row);
      }
      setVenueHits([...venueMap.values()]);
      setSearchLoading(false);
    };
    void run();
    return () => {
      alive = false;
    };
  }, [debounced, meId, exploreDataReady, friends]);

  const goHub = () => router.push("/hub");

  const saveRecentUser = useCallback(
    (p: ProfileHit) => {
      if (!meId) return;
      const next = pushRecentDiscoverySearch(meId, {
        kind: "user",
        id: p.id,
        label: p.display_name || p.username || "User",
        subtitle: p.username ? `@${p.username}` : undefined,
      });
      setRecent(next);
    },
    [meId]
  );

  const saveRecentVenue = useCallback(
    (v: VenueLite) => {
      if (!meId) return;
      const loc = venueLocationLine(v);
      const next = pushRecentDiscoverySearch(meId, {
        kind: "venue",
        id: v.id,
        label: v.name,
        subtitle: loc ?? undefined,
      });
      setRecent(next);
    },
    [meId]
  );

  const openVenueOnMap = (v: VenueLite) => {
    saveRecentVenue(v);
    router.push(`/map?venueId=${encodeURIComponent(v.id)}`);
  };

  const openUser = (p: ProfileHit) => {
    saveRecentUser(p);
    if (p.username) router.push(`/u/${encodeURIComponent(p.username)}`);
    else router.push(`/profile/${p.id}`);
  };

  const peopleTrailingKind = (userId: string) => {
    if (iBlockedThem.has(userId)) return "you_blocked" as const;
    if (theyBlockedMe.has(userId)) return "they_blocked" as const;
    if (friendSet.has(userId)) return "friend" as const;
    if (pendingOut.has(userId)) return "requested" as const;
    if (pendingIn.has(userId)) return "incoming" as const;
    return "view" as const;
  };

  const peopleTrailingSlot = (userId: string) => {
    const kind = peopleTrailingKind(userId);
    const mutedPill =
      "pointer-events-none shrink-0 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/40 opacity-[0.72]";
    if (kind === "you_blocked") {
      return <span className={mutedPill}>You blocked</span>;
    }
    if (kind === "they_blocked") {
      return <span className={mutedPill}>Blocked you</span>;
    }
    if (kind === "friend") {
      return (
        <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/65">
          Friend
        </span>
      );
    }
    if (kind === "requested") {
      return (
        <span className="shrink-0 rounded-full border border-accent-violet/30 bg-accent-violet/10 px-3 py-1.5 text-[11px] font-semibold text-accent-violet-active">
          Requested
        </span>
      );
    }
    if (kind === "incoming") {
      return (
        <button
          type="button"
          onClick={() => router.push("/profile/friends")}
          className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/78"
        >
          Respond
        </button>
      );
    }
    return (
      <span className="pointer-events-none shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/38">
        View
      </span>
    );
  };

  const venueIsLive = (v: VenueLite) => {
    for (const p of presence) {
      if (!isValidCoordinatePair(p.lat, p.lng)) continue;
      if (!isPresenceLive(p.updated_at)) continue;
      const d = distanceMeters(p.lat, p.lng, v.lat, v.lng);
      if (d <= v.outer_radius_m) return true;
    }
    return false;
  };

  const friendPeopleRows = useMemo(
    () => peopleHits.filter((p) => friendSet.has(p.id)),
    [peopleHits, friendSet]
  );
  const otherPeopleRows = useMemo(
    () => peopleHits.filter((p) => !friendSet.has(p.id)),
    [peopleHits, friendSet]
  );

  const showExplore = debounced.length === 0;

  return (
    <ProtectedRoute>
      <div className={`${APP_TAB_PAGE_ROOT_CLASS} text-text-primary`}>
        <div className={`${APP_CONTENT_MAX_CLASS} flex min-h-0 flex-1 flex-col`}>
          <div
            className={`sticky top-0 z-30 border-b border-white/[0.08] bg-primary/88 px-4 pb-3 backdrop-blur-md ${APP_PAGE_TOP_PADDING_CLASS}`}
          >
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-white/40"
                  size={17}
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search friends, people, places, venues..."
                  enterKeyHint="search"
                  className="ah-glass-control h-[48px] w-full rounded-full pl-10 pr-3 text-[15px] text-white outline-none ring-0 placeholder:text-white/38 focus:border-accent-violet/35"
                />
              </div>
              <button
                type="button"
                onClick={goHub}
                className="shrink-0 rounded-full px-2 py-2 text-[15px] font-medium text-white/78 transition active:opacity-80"
              >
                Cancel
              </button>
            </div>
          </div>

          <div
            className={`${APP_TAB_PRIMARY_SCROLL_CLASS} px-4 pt-4 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+20px))]`}
          >
            {!showExplore ? (
              <div className="space-y-6">
                {searchLoading ? (
                  <div className="space-y-3">
                    <SkeletonLine width={120} height={14} className="opacity-80" />
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 py-1">
                        <SkeletonCircle size={44} />
                        <div className="min-w-0 flex-1 space-y-2">
                          <SkeletonLine width="72%" height={13} />
                          <SkeletonLine width="40%" height={11} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <section>
                      <h2 className="mb-2 text-[13px] font-semibold text-white">People</h2>
                      {friendPeopleRows.length === 0 && otherPeopleRows.length === 0 ? (
                        <p className="py-2 text-[13px] text-white/45">No people found.</p>
                      ) : (
                        <div className="space-y-5">
                          {friendPeopleRows.length > 0 ? (
                            <div>
                              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                                Friends
                              </h3>
                              <ul className="space-y-1">
                                {friendPeopleRows.map((p) => {
                                  const blockedRow = iBlockedThem.has(p.id) || theyBlockedMe.has(p.id);
                                  return (
                                    <li
                                      key={`f-${p.id}`}
                                      className={`flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 ${
                                        blockedRow ? "opacity-[0.72]" : ""
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => openUser(p)}
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                      >
                                        <Avatar src={p.avatar_url?.trim() || null} fallbackText={p.display_name || p.username} size="md" />
                                        <div className="min-w-0">
                                          <div className="truncate text-[14px] font-semibold text-white">
                                            {p.display_name || p.username || "User"}
                                          </div>
                                          <div className="truncate text-[12px] text-white/45">
                                            {p.username ? `@${p.username}` : ""}
                                          </div>
                                        </div>
                                      </button>
                                      {peopleTrailingSlot(p.id)}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : null}
                          {otherPeopleRows.length > 0 ? (
                            <div>
                              {friendPeopleRows.length > 0 ? (
                                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                                  People
                                </h3>
                              ) : null}
                              <ul className="space-y-1">
                                {otherPeopleRows.map((p) => {
                                  const blockedRow = iBlockedThem.has(p.id) || theyBlockedMe.has(p.id);
                                  return (
                                    <li
                                      key={`p-${p.id}`}
                                      className={`flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 ${
                                        blockedRow ? "opacity-[0.72]" : ""
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => openUser(p)}
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                      >
                                        <Avatar src={p.avatar_url?.trim() || null} fallbackText={p.display_name || p.username} size="md" />
                                        <div className="min-w-0">
                                          <div className="truncate text-[14px] font-semibold text-white">
                                            {p.display_name || p.username || "User"}
                                          </div>
                                          <div className="truncate text-[12px] text-white/45">
                                            {p.username ? `@${p.username}` : ""}
                                          </div>
                                        </div>
                                      </button>
                                      {peopleTrailingSlot(p.id)}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </section>

                    <section>
                      <h2 className="mb-2 text-[13px] font-semibold text-white">Places / Venues</h2>
                      {venueHits.length === 0 ? (
                        <p className="py-2 text-[13px] text-white/45">No places found.</p>
                      ) : (
                        <ul className="space-y-1">
                          {venueHits.map((v) => {
                            const live = venueIsLive(v);
                            const heatHex = venueHeatHexFromActivity(
                              presence.filter((p) => {
                                if (!isValidCoordinatePair(p.lat, p.lng)) return false;
                                if (!isPresenceLive(p.updated_at)) return false;
                                return distanceMeters(p.lat, p.lng, v.lat, v.lng) <= v.outer_radius_m;
                              }).length
                            );
                            const img = venueThumb(v);
                            const loc = venueLocationLine(v);
                            return (
                              <li key={v.id}>
                                <button
                                  type="button"
                                  onClick={() => openVenueOnMap(v)}
                                  className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left transition active:scale-[0.99]"
                                >
                                  <div
                                    className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/[0.06]"
                                    style={{
                                      boxShadow: `0 0 0 1px ${venueAccentRgba(heatHex, 0.28)}, 0 0 14px ${venueAccentRgba(heatHex, 0.22)}`,
                                    }}
                                  >
                                    {img ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={img} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-white/30">
                                        {v.name.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-[14px] font-semibold text-white">{v.name}</div>
                                    <div className="truncate text-[12px] text-white/45">{loc || (v.category ?? "Venue")}</div>
                                  </div>
                                  {live ? (
                                    <div className="flex shrink-0 items-center gap-1.5 pr-0.5">
                                      <span
                                        className="h-2 w-2 rounded-full shadow-[0_0_10px_rgba(122,60,255,0.9)]"
                                        style={{ backgroundColor: heatHex }}
                                      />
                                      <span className="text-[12px] font-medium text-white/70">Live</span>
                                    </div>
                                  ) : null}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  </>
                )}
              </div>
            ) : !meId || !exploreDataReady ? (
              <SearchExploreSkeleton />
            ) : (
              <div className="space-y-8">
                <section>
                  <SectionHeader
                    title="Recent searches"
                    right={
                      <button
                        type="button"
                        onClick={() => setRecentExpanded((v) => !v)}
                        className="text-[12px] font-medium text-white/45"
                      >
                        See all
                      </button>
                    }
                  />
                  {recent.length === 0 ? (
                    <p className="mt-2 text-[13px] text-white/45">Your recent searches will appear here.</p>
                  ) : recentExpanded ? (
                    <ul className="mt-3 space-y-2">
                      {recent.map((r) => (
                        <li key={`${r.kind}:${r.id}:${r.at}`}>
                          <button
                            type="button"
                            onClick={() => {
                              if (r.kind === "user") {
                                openUser({
                                  id: r.id,
                                  username: r.subtitle?.replace(/^@/, "") ?? null,
                                  display_name: r.label,
                                  avatar_url: null,
                                });
                              } else {
                                const v = venues.find((x) => x.id === r.id);
                                if (v) openVenueOnMap(v);
                                else router.push(`/map?venueId=${encodeURIComponent(r.id)}`);
                              }
                            }}
                            className="flex w-full items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left"
                          >
                            <span className="truncate text-[14px] font-medium text-white">{r.kind === "user" ? r.subtitle || r.label : r.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
                      {recent.map((r) => (
                        <button
                          key={`${r.kind}:${r.id}:${r.at}`}
                          type="button"
                          onClick={() => {
                            if (r.kind === "user") {
                              openUser({
                                id: r.id,
                                username: r.subtitle?.replace(/^@/, "") ?? null,
                                display_name: r.label,
                                avatar_url: null,
                              });
                            } else {
                              const v = venues.find((x) => x.id === r.id);
                              if (v) openVenueOnMap(v);
                              else router.push(`/map?venueId=${encodeURIComponent(r.id)}`);
                            }
                          }}
                          className="ah-glass-control ah-glass-control-interactive shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium text-white/85 transition active:scale-[0.98]"
                        >
                          {r.kind === "user" ? r.subtitle || r.label : r.label}
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <SectionHeader title="Suggested friends" />
                  {fof.length === 0 ? (
                    <p className="mt-2 text-[13px] text-white/45">No friend suggestions yet.</p>
                  ) : (
                    <ul className="mt-3 space-y-1">
                      {fof.map((row) => {
                        const mutualLabel = row.mutualCount === 1 ? "1 mutual" : `${row.mutualCount} mutuals`;
                        const blockedRow = iBlockedThem.has(row.id) || theyBlockedMe.has(row.id);
                        return (
                          <li
                            key={row.id}
                            className={`flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 ${
                              blockedRow ? "opacity-[0.72]" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                openUser({
                                  id: row.id,
                                  username: row.username,
                                  display_name: row.display_name,
                                  avatar_url: row.avatar_url,
                                })
                              }
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                              <Avatar src={row.avatar_url?.trim() || null} fallbackText={row.display_name || row.username} size="md" />
                              <div className="min-w-0">
                                <div className="truncate text-[14px] font-semibold text-white">{row.display_name || row.username}</div>
                                <div className="truncate text-[12px] text-white/45">
                                  {row.username ? `@${row.username}` : ""} · {mutualLabel}
                                </div>
                              </div>
                            </button>
                            {peopleTrailingSlot(row.id)}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section>
                  <SectionHeader title="Trending places" />
                  {trendingRanked.length === 0 ? (
                    <p className="mt-2 text-[13px] text-white/45">Venues appear here as activity picks up.</p>
                  ) : (
                    <ul className="mt-3 space-y-1">
                      {trendingRanked.slice(0, 16).map((v) => {
                        const heatHex = venueHeatHexFromActivity(v.total);
                        const img = venueThumb(v);
                        const loc = venueLocationLine(v);
                        return (
                          <li key={v.id}>
                            <button
                              type="button"
                              onClick={() => openVenueOnMap(v)}
                              className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left transition active:scale-[0.99]"
                            >
                              <div
                                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/[0.06]"
                                style={{
                                  boxShadow: `0 0 0 1px ${venueAccentRgba(heatHex, 0.3)}, 0 0 16px ${venueAccentRgba(heatHex, 0.2)}`,
                                }}
                              >
                                {img ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={img} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-[11px] font-semibold text-white/28">
                                    {v.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[14px] font-semibold text-white">{v.name}</div>
                                <div className="truncate text-[12px] text-white/45">{loc || (v.category ?? "Venue")}</div>
                              </div>
                              {v.live ? (
                                <StatusBadge label="Live" variant="violet" className="shrink-0 border-accent-violet/35" />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
