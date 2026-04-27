"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Avatar, StoryRing } from "@/components/ui";
import StoryViewerModal, { type StoryViewerGroup } from "@/components/StoryViewerModal";
import ProtectedRoute from "@/components/ProtectedRoute";

/* ---------------- TYPES ---------------- */

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

type Story = {
  id: string;
  user_id: string;
  image_url: string;
  media_url: string;
  created_at: string;
  expires_at: string | null;
  username: string | null;
  avatar_url: string | null;
};

type StoryGroup = {
  user_id: string;
  avatar_url: string | null;
  username: string | null;
  stories: Story[];
};

/* ---------------- UTILS ---------------- */

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

/* ---------------- COMPONENT ---------------- */

export default function HubPage() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [meId, setMeId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [myStoryFallback, setMyStoryFallback] = useState<string>("AH");
  const [unreadCount, setUnreadCount] = useState(0);
  const [storyVenueIds, setStoryVenueIds] = useState<Set<string>>(new Set());

  const [activeViewerGroup, setActiveViewerGroup] = useState<StoryViewerGroup | null>(null);

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMeId(data.user.id);
    });
  }, []);
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadUnread = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted || !user) {
        if (mounted) setUnreadCount(0);
        return;
      }
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", user.id)
        .eq("read", false);
      if (mounted) setUnreadCount(count ?? 0);
    };

    loadUnread();
    timer = setInterval(loadUnread, 15000);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);
  useEffect(() => {
  if (!meId) return;

  const loadAvatar = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, display_name, username")
      .eq("id", meId)
      .single();

    setAvatarUrl(data?.avatar_url ?? null);
    setMyStoryFallback(
      data?.display_name?.trim() ||
        data?.username?.trim() ||
        "AH"
    );
  };

  loadAvatar();
}, [meId]);

  /* ---------------- FRIENDS ---------------- */

  useEffect(() => {
    if (!meId) return;

    const loadFriends = async () => {
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
        .select("id, username, avatar_url")
        .in("id", ids);

      const map: Record<string, string> = {};
      const av: Record<string, string | null> = {};
      prof?.forEach((p: any) => {
        map[p.id] = p.username;
        av[p.id] = p.avatar_url ?? null;
      });
      setProfiles(map);
      setAvatars(av);
    };

    loadFriends();
  }, [meId]);

  /* ---------------- DATA ---------------- */

  useEffect(() => {
    let mounted = true;
    let presenceInterval: ReturnType<typeof setInterval> | null = null;

    const loadVenuesOnce = async () => {
      const { data: v } = await supabase.from("venues").select("*");
      if (!mounted) return;
      setVenues(v || []);
    };

    const loadPresence = async () => {
      const { data: p } = await supabase.from("user_presence").select("*");
      if (!mounted) return;
      setPresence(p || []);
    };

    loadVenuesOnce();
    loadPresence();
    presenceInterval = setInterval(loadPresence, 5000);

    return () => {
      mounted = false;
      if (presenceInterval) clearInterval(presenceInterval);
    };
  }, []);

  /* ---------------- STORIES FIX ---------------- */

  useEffect(() => {
    const loadStories = async () => {
      if (!meId) return;
      const allowedIds = Array.from(new Set([meId, ...friends]));
      if (!allowedIds.length) {
        setStories([]);
        return;
      }

      // Keep this baseline query schema-safe first; add richer filters after it is stable.
      const { data, error } = await supabase
        .from("stories")
        .select("id, user_id, image_url, created_at, expires_at")
        .in("user_id", allowedIds)
        .limit(200);
      if (error) {
        console.error("stories fetch error:", error);
        return;
      }

      const rows = (data ?? []) as any[];
      const userIds = Array.from(
        new Set(rows.map((s) => s.user_id).filter(Boolean))
      ) as string[];
      const profileById: Record<string, { username: string | null; avatar_url: string | null }> = {};

      if (userIds.length) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);
        (profileRows ?? []).forEach((p: any) => {
          profileById[p.id] = {
            username: p.username ?? null,
            avatar_url: p.avatar_url ?? null,
          };
        });
      }

      const nowMs = Date.now();
      const cleaned: Story[] = rows
        .map((s) => {
          const mediaUrl = s.media_url ?? s.image_url ?? "";
          return {
            id: s.id,
            user_id: s.user_id,
            image_url: mediaUrl,
            media_url: mediaUrl,
            created_at: s.created_at,
            expires_at: s.expires_at ?? null,
            username: profileById[s.user_id]?.username ?? null,
            avatar_url: profileById[s.user_id]?.avatar_url ?? null,
          };
        })
        .filter((s) => !!s.media_url)
        .filter((s) => {
          const createdMs = new Date(s.created_at).getTime();
          if (!Number.isFinite(createdMs)) return false;
          const fallbackExpiresMs = createdMs + 24 * 60 * 60 * 1000;
          const expiresMs = s.expires_at
            ? new Date(s.expires_at).getTime()
            : fallbackExpiresMs;
          return Number.isFinite(expiresMs) && expiresMs > nowMs;
        });

      setStories(cleaned);
    };

    loadStories();
    const onStoryPosted = () => loadStories();
    window.addEventListener("story-posted", onStoryPosted);
    return () => window.removeEventListener("story-posted", onStoryPosted);
  }, [friends, meId]);

  useEffect(() => {
    let mounted = true;
    const loadStoryVenueLinks = async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("venue_id")
        .not("venue_id", "is", null)
        .limit(400);
      if (error) {
        // TODO: keep this fallback until venue_id is guaranteed on stories in all environments.
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

  /* ---------------- HELPERS ---------------- */

  const isActive = (ts: string) =>
    Date.now() - new Date(ts).getTime() < 5 * 60_000;

  const onlineFriends = presence.filter(
    (p) => friends.includes(p.user_id) && isActive(p.updated_at)
  );

  /* ---------------- GROUP STORIES ---------------- */

  const groupedStories: StoryGroup[] = Object.values(
    stories.reduce((acc: Record<string, StoryGroup>, story) => {
      if (!acc[story.user_id]) {
        acc[story.user_id] = {
          user_id: story.user_id,
          avatar_url: story.avatar_url,
          username: story.username,
          stories: [],
        };
      }
      acc[story.user_id].stories.push(story);
      return acc;
    }, {})
  );
  const hasActiveStoryMedia = (story: Story | undefined) => {
    if (!story) return false;
    if (!story.media_url) return false;
    const createdMs = new Date(story.created_at).getTime();
    if (!Number.isFinite(createdMs)) return false;
    const fallbackExpiresMs = createdMs + 24 * 60 * 60 * 1000;
    const expiresMs = story.expires_at
      ? new Date(story.expires_at).getTime()
      : fallbackExpiresMs;
    return Number.isFinite(expiresMs) && expiresMs > Date.now();
  };

  const validGroupedStories = useMemo(
    () =>
      groupedStories
        .map((group) => ({
          ...group,
          stories: group.stories.filter((story) => hasActiveStoryMedia(story)),
        }))
        .filter((group) => group.stories.length > 0),
    [groupedStories]
  );
  const myStoryGroup = useMemo(
    () => validGroupedStories.find((g) => g.user_id === meId) ?? null,
    [validGroupedStories, meId]
  );
  const friendStoryGroups = useMemo(
    () => validGroupedStories.filter((g) => g.user_id !== meId),
    [validGroupedStories, meId]
  );

  const canRenderStoryMedia = (url: string) =>
    new Promise<boolean>((resolve) => {
      if (!url) {
        resolve(false);
        return;
      }
      const img = new Image();
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      const timer = window.setTimeout(() => finish(false), 2500);
      img.onload = () => {
        window.clearTimeout(timer);
        finish(true);
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        finish(false);
      };
      img.src = url;
    });

  const openStoryViewerForUser = async (userId: string) => {
    const group = validGroupedStories.find((g) => g.user_id === userId);
    if (!group) return;
    const firstStory = group.stories?.[0];
    if (!hasActiveStoryMedia(firstStory)) return;
    const okToRender = await canRenderStoryMedia(firstStory.media_url);
    if (!okToRender) return;
    setActiveViewerGroup({
      user_id: group.user_id,
      username: group.username,
      avatar_url: group.avatar_url,
      stories: group.stories.map((s) => ({
        id: s.id,
        user_id: s.user_id,
        media_url: s.media_url,
        created_at: s.created_at,
        expires_at: s.expires_at,
      })),
    });
  };
  const hasMyActiveStory = !!myStoryGroup?.stories?.some((s) => hasActiveStoryMedia(s));
/* ---------------- VENUE LOGIC ---------------- */

const getVenueStats = (venue: Venue) => {
  let inside = 0;
  let nearby = 0;
  let friendsInside = 0;
  let friendsNearby = 0;

  for (const p of presence) {
    if (!isActive(p.updated_at)) continue;

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

const venueCards = venues
  .map((v) => {
    const stats = getVenueStats(v);
    return { ...v, ...stats };
  })
  .sort((a, b) => {
    // Expected ranking:
    // 1) total activity (inside + nearby) desc
    // 2) if tie, prioritize venues with friends present (inside or nearby) desc
    if (b.total !== a.total) return b.total - a.total;
    if (b.friendsTotal !== a.friendsTotal) return b.friendsTotal - a.friendsTotal;
    return 0;
  });

// Always show top 3 venues for quick jump-to-map navigation.
const venuesToShow = venueCards.slice(0, 3);

  // UI-only helper: preview a few friend names present at/near a venue
  const friendPreviewForVenue = (venueId: string) => {
    const ids = presence
      .filter(
        (p) =>
          p.venue_id === venueId &&
          friends.includes(p.user_id) &&
          isActive(p.updated_at)
      )
      .map((p) => p.user_id);
    return Array.from(new Set(ids)).slice(0, 3);
  };

  const myPresence = useMemo(
    () => (meId ? presence.find((p) => p.user_id === meId) ?? null : null),
    [presence, meId]
  );
  const liveFriendsCount = onlineFriends.length;
  const liveVenuesCount = venueCards.filter((v: any) => v.total > 0).length;
  const nearbyActivityCount = venueCards.reduce((sum: number, v: any) => sum + (v.total ?? 0), 0);
  const trendingPlace = venueCards[0]?.name ?? null;
  const pulseLine =
    liveVenuesCount === 0
      ? "Quiet right now"
      : liveVenuesCount === 1
      ? "1 place active nearby"
      : `${liveVenuesCount} places active nearby`;
  /* ---------------- UI ---------------- */

  return (
    <ProtectedRoute>
    <div className="flex min-h-[100dvh] w-full max-w-none flex-col bg-primary text-text-primary">
      <div className="flex w-full flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+8px)] sm:px-5 sm:pt-3">
      {/* Top bar — IG-style thin chrome; story strip is the hero below */}
      <header className="flex items-center justify-between gap-3 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/38">AfterHours</p>
        <button
          type="button"
          onClick={() => router.push("/notifications")}
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[15px] text-white/85"
          aria-label="Open notifications"
        >
          ♡
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-[1.125rem] rounded-full bg-accent-violet px-1 py-0.5 text-center text-[10px] font-semibold leading-none text-white shadow-[0_0_12px_rgba(168,85,247,0.45)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </header>

      {/* Moments — large story rings first (dominant like Instagram home) */}
      <section className="-mx-4 border-b border-white/[0.08] pb-4 pt-1 sm:-mx-5" aria-labelledby="hub-moments-heading">
        <h2 id="hub-moments-heading" className="sr-only">
          Moments
        </h2>
        <div className="scrollbar-none flex items-start gap-[14px] overflow-x-auto px-4 pb-1 sm:px-5">
          {/* YOUR MOMENT */}
          <button
            type="button"
            onClick={async () => {
              if (hasMyActiveStory && myStoryGroup) {
                const firstStory = myStoryGroup.stories[0];
                if (hasActiveStoryMedia(firstStory)) {
                  const okToRender = await canRenderStoryMedia(firstStory.media_url);
                  if (okToRender) {
                    openStoryViewerForUser(myStoryGroup.user_id);
                    return;
                  }
                }
                window.dispatchEvent(new Event("open-story-camera"));
              } else {
                window.dispatchEvent(new Event("open-story-camera"));
              }
            }}
            className="flex w-[84px] shrink-0 flex-col items-center"
          >
            <div className="relative">
              <StoryRing
                src={avatarUrl}
                alt="your moment"
                fallbackText={myStoryFallback}
                size="storyLg"
                active={hasMyActiveStory}
              />
              {!hasMyActiveStory ? (
                <div className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-black bg-accent-violet text-text-primary shadow-[0_0_14px_rgba(168,85,247,0.55)]">
                  <span className="text-[13px] font-semibold leading-none">+</span>
                </div>
              ) : null}
            </div>
            <span className="mt-2 w-full truncate text-center text-[12px] leading-tight text-white/55">Your story</span>
          </button>

          {/* FRIEND MOMENTS */}
          {friendStoryGroups.map((user) => (
            <button
              key={user.user_id}
              onClick={async () => {
                if (!user.stories.some((s) => hasActiveStoryMedia(s))) return;
                const firstStory = user.stories[0];
                if (!hasActiveStoryMedia(firstStory)) return;
                const okToRender = await canRenderStoryMedia(firstStory.media_url);
                if (!okToRender) return;
                openStoryViewerForUser(user.user_id);
              }}
              className="flex w-[84px] shrink-0 flex-col items-center text-left"
            >
              <StoryRing
                src={user.avatar_url}
                fallbackText={user.username}
                size="storyLg"
                active={user.stories.length > 0}
              />
              <span className="mt-2 w-full truncate text-center text-[12px] leading-tight text-white/55">
                {user.username || "user"}
              </span>
            </button>
          ))}
        </div>
        {friendStoryGroups.length === 0 ? (
          <p className="mt-2 px-4 text-center text-[12px] text-white/42 sm:px-5">Post what&apos;s happening around you.</p>
        ) : null}
      </section>

      <div className="pt-5">
        <h1 className="text-[1.375rem] font-bold leading-[1.15] tracking-tight text-white">What&apos;s alive right now</h1>
        <p className="mt-1 text-[13px] leading-snug text-white/48">Friends, places, and activity near you.</p>
      </div>

      <div className="my-4 h-px bg-white/[0.08]" aria-hidden />

      {/* Live pulse — compact metrics */}
      <section className="space-y-2">
        <p className="text-[17px] font-semibold leading-snug text-white">{pulseLine}</p>
        <p className="text-[13px] text-white/48">
          <span className="font-semibold text-white/90">{liveFriendsCount}</span> friends
          <span className="mx-1.5 text-white/25">·</span>
          <span className="font-semibold text-white/90">{liveVenuesCount}</span> places
          <span className="mx-1.5 text-white/25">·</span>
          <span className="font-semibold text-white/90">{nearbyActivityCount}</span> nearby
        </p>
        {trendingPlace ? (
          <p className="text-[12px] text-white/42">
            Trending <span className="text-white/65">{trendingPlace}</span>
          </p>
        ) : (
          <p className="text-[12px] text-white/42">No trending spot yet — be the first there.</p>
        )}
      </section>

      <div className="my-4 h-px bg-white/[0.08]" aria-hidden />

      {/* Active friends */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-white">Active friends</h2>
          <button
            type="button"
            onClick={() => router.push("/profile/friends")}
            className="text-[13px] font-semibold text-violet-300/95"
          >
            See all
          </button>
        </div>
        <p className="text-[12px] text-white/42">Online in the last few minutes</p>

        {onlineFriends.length === 0 ? (
          <div className="py-5 text-center">
            <p className="text-[14px] text-white/72">No friends active yet</p>
            <p className="mt-1 text-[12px] text-white/42">They&apos;ll show up here when they pop out.</p>
          </div>
        ) : (
          <div className="scrollbar-none -mx-0.5 flex gap-4 overflow-x-auto px-0.5 pb-0.5">
            {onlineFriends.map((f) => {
              const name = profiles[f.user_id] || "Friend";
              const venueName = f.venue_id ? venues.find((v) => v.id === f.venue_id)?.name ?? null : null;
              return (
                <button
                  key={f.user_id}
                  type="button"
                  onClick={() => {
                    const uname = profiles[f.user_id];
                    if (uname) router.push(`/u/${uname}`);
                  }}
                  className="flex w-[64px] shrink-0 flex-col items-center gap-1.5 text-center"
                >
                  <Avatar
                    src={avatars[f.user_id] ?? null}
                    fallbackText={name}
                    size="lg"
                    className="shrink-0 ring-1 ring-white/[0.08]"
                  />
                  <div className="w-full">
                    <div className="truncate text-[12px] font-semibold text-white">{name}</div>
                    <div className="truncate text-[10px] text-white/42">
                      {venueName ? `At ${venueName}` : "Online"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="my-4 h-px bg-white/[0.08]" aria-hidden />

      {/* Live places — dense rows: thumb | meta | chevron */}
      <section>
        <h2 className="text-[15px] font-semibold text-white">Live Places</h2>
        <p className="mt-0.5 text-[12px] text-white/42">Open on map or view activity</p>

        {venuesToShow.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[14px] text-white/65">Quiet right now</p>
            <p className="mt-1 text-[12px] text-white/38">Venues show up as people get nearby.</p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-white/[0.08]">
            {venuesToShow.map((v: any) => {
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
                <li key={v.id} className="py-3 first:pt-0">
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
                        <div className="grid h-full w-full place-items-center text-[10px] font-medium text-white/35">
                          AH
                        </div>
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
                        {previewIds.length > 0 ? (
                          <span className="text-white/25"> · </span>
                        ) : null}
                        {previewIds.length > 0 ? (
                          <span className="text-white/50">
                            {v.friendsInside > 0 ? `${v.friendsInside} friends` : "Friends here"}
                          </span>
                        ) : v.friendsInside === 0 ? (
                          <span className="text-white/35"> · First check-in wins</span>
                        ) : null}
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
      </section>

      <div className="min-h-6 flex-1 shrink-0" aria-hidden />
      </div>

      <StoryViewerModal
        open={!!activeViewerGroup}
        group={activeViewerGroup}
        currentUserId={meId}
        onClose={() => setActiveViewerGroup(null)}
        onStoryDeleted={(storyId) => {
          setStories((prev) => prev.filter((s) => s.id !== storyId));
          setActiveViewerGroup((prev) => {
            if (!prev) return null;
            const nextStories = prev.stories.filter((s) => s.id !== storyId);
            if (!nextStories.length) return null;
            return { ...prev, stories: nextStories };
          });
        }}
      />
    </div>
    </ProtectedRoute>
);
}