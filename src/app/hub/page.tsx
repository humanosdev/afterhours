"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Avatar, EmptyState, SectionHeader, SocialCard, StatusBadge, StoryRing } from "@/components/ui";
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
    <div className="min-h-screen bg-primary text-text-primary px-4 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+112px)] space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold tracking-[0.24em] text-violet-300/75">
            AFTERHOURS
          </div>
          <div className="mt-1 text-[30px] leading-none font-bold">What&apos;s alive right now</div>
          <div className="mt-1 text-sm text-white/65">Friends, places, and activity near you.</div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/notifications")}
          className="relative rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-text-primary backdrop-blur"
          aria-label="Open notifications"
        >
          ♡
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-accent-violet px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* MOMENTS */}
      <div className="rounded-2xl border border-white/10 bg-[#0b0f18cc] p-3 backdrop-blur">
      <div className="scrollbar-none flex items-center gap-4 overflow-x-auto pb-1">
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
            className="flex flex-col items-center min-w-[76px]"
          >
            <div className="relative">
              <StoryRing
                src={avatarUrl}
                alt="your moment"
                fallbackText={myStoryFallback}
                size="lg"
                active={hasMyActiveStory}
              />
              {!hasMyActiveStory ? (
                <div className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border border-subtle bg-accent-violet text-text-primary shadow-glow-violet">
                  <span className="text-sm leading-none">+</span>
                </div>
              ) : null}
            </div>
            <span className="mt-2 w-16 truncate text-center text-xs text-text-secondary">
              Moments
            </span>
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
              className="flex flex-col items-center min-w-[76px] text-left"
            >
              <StoryRing
                src={user.avatar_url}
                fallbackText={user.username}
                size="lg"
                active={user.stories.length > 0}
              />
              <span className="mt-2 w-16 truncate text-center text-xs text-text-secondary">
                {user.username || "user"}
              </span>
            </button>
          ))}
      </div>
      {friendStoryGroups.length === 0 ? (
        <p className="mt-2 text-xs text-white/55">Post what&apos;s happening around you.</p>
      ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0b0f18cc] p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Live pulse</p>
            <p className="text-xs text-white/55">{pulseLine}</p>
          </div>
          <span className="text-[11px] text-violet-300/85">Updated just now</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-sky-300/25 bg-sky-500/10 px-3 py-2">
            <p className="text-[11px] text-white/60">Friends active</p>
            <p className="text-lg font-semibold">{liveFriendsCount}</p>
          </div>
          <div className="rounded-xl border border-teal-300/25 bg-teal-500/10 px-3 py-2">
            <p className="text-[11px] text-white/60">Places active</p>
            <p className="text-lg font-semibold">{liveVenuesCount}</p>
          </div>
          <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2">
            <p className="text-[11px] text-white/60">Nearby now</p>
            <p className="text-lg font-semibold">{nearbyActivityCount}</p>
          </div>
          <div className="rounded-xl border border-violet-300/25 bg-violet-500/10 px-3 py-2">
            <p className="text-[11px] text-white/60">Trending place</p>
            <p className="truncate text-sm font-semibold">{trendingPlace ?? "No activity yet"}</p>
          </div>
        </div>
      </div>

      {/* ACTIVE FRIENDS */}
      <div className="rounded-2xl border border-white/10 bg-[#0b0f18cc] p-4 space-y-3 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <SectionHeader
            title="Active friends"
            subtitle="Online in the last few minutes"
          />
          <button
            type="button"
            onClick={() => router.push("/profile/friends")}
            className="rounded-full border border-violet-300/30 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-100"
          >
            View all
          </button>
        </div>

        {onlineFriends.length === 0 ? (
          <EmptyState
            title="No friends active yet"
            description="They’ll show up here when they pop out."
            className="bg-surface"
          />
        ) : (
          <div className="scrollbar-none flex items-center gap-3 overflow-x-auto pb-1">
            {onlineFriends.map((f) => {
              const name = profiles[f.user_id] || "Friend";
              const venueName = f.venue_id ? venues.find((v) => v.id === f.venue_id)?.name ?? null : null;
              return (
                <button
                  key={f.user_id}
                  onClick={() => {
                    const uname = profiles[f.user_id];
                    if (uname) router.push(`/u/${uname}`);
                  }}
                  className="min-w-[120px] rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={avatars[f.user_id] ?? null}
                      fallbackText={name}
                      size="sm"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {name}
                      </div>
                      <div className="text-[11px] text-white/60">
                        {venueName ? `At ${venueName}` : "Online"}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* VENUES */}
      <div className="rounded-2xl border border-white/10 bg-[#0b0f18cc] p-4 space-y-3 backdrop-blur">
        <SectionHeader
          title="Live Places"
          subtitle="Where the night is happening right now"
        />

        {venuesToShow.length === 0 ? (
          <EmptyState
            title="No venues yet"
            description="As people show up near venues, they’ll appear here."
            className="bg-surface"
          />
        ) : (
          <div className="space-y-3">
            {venuesToShow.map((v: any, index) => {
              let vibe = "No activity yet";
              let vibeVariant: "neutral" | "cyan" | "violet" = "neutral";
              if (v.total >= 16) {
                vibe = "Packed";
                vibeVariant = "violet";
              } else if (v.total >= 8) {
                vibe = "Active";
                vibeVariant = "cyan";
              } else if (v.total >= 2) {
                vibe = "Warming Up";
                vibeVariant = "neutral";
              }

              const previewIds = friendPreviewForVenue(v.id);
              const distanceMi =
                myPresence
                  ? distanceMeters(myPresence.lat, myPresence.lng, v.lat, v.lng) / 1609.34
                  : null;
              const hasActivity = storyVenueIds.has(v.id);
              const venueImage = v.image_url || v.photo_url || v.cover_image_url || null;

              return (
                <SocialCard
                  key={v.id}
                  className="bg-surface border border-white/10"
                  interactive
                  onClick={() => router.push(`/map?venueId=${encodeURIComponent(v.id)}`)}
                >
                  {venueImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={venueImage}
                      alt={v.name}
                      className="mb-3 h-28 w-full rounded-xl border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="mb-3 grid h-28 w-full place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/12 via-sky-500/8 to-teal-400/10">
                      <p className="text-xs text-white/60">Venue photo coming soon</p>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-violet-300/80">#{index + 1}</div>
                      <div className="mt-1 truncate text-base font-semibold">
                        {v.name}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
                        <span>{v.category ?? "Venue"}</span>
                        {distanceMi !== null ? <span>• {distanceMi.toFixed(1)} mi</span> : null}
                      </div>
                    </div>
                    <StatusBadge label={vibe} variant={vibeVariant} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span className="text-text-primary font-semibold">
                        {v.total}
                      </span>
                      <span>people</span>
                    </div>

                    {/* Avatar preview (friends) */}
                    {previewIds.length > 0 ? (
                      <div className="flex -space-x-2">
                        {previewIds.map((id: string) => (
                          <Avatar
                            key={id}
                            src={avatars[id] ?? null}
                            fallbackText={profiles[id] || "F"}
                            size="xs"
                            className="border border-subtle"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-text-secondary">
                        {v.friendsInside > 0
                          ? `${v.friendsInside} friends inside`
                          : "Waiting for the first check-in"}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-text-secondary">
                    <div className="rounded-xl border border-subtle bg-secondary px-3 py-2">
                      <div className="text-[11px]">Inside</div>
                      <div className="mt-1 font-semibold text-text-primary">
                        {v.inside}
                      </div>
                    </div>
                    <div className="rounded-xl border border-subtle bg-secondary px-3 py-2">
                      <div className="text-[11px]">Nearby</div>
                      <div className="mt-1 font-semibold text-text-primary">
                        {v.nearby}
                      </div>
                    </div>
                    <div className="rounded-xl border border-subtle bg-secondary px-3 py-2">
                      <div className="text-[11px]">Friends</div>
                      <div className="mt-1 font-semibold text-text-primary">
                        {v.friendsInside}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasActivity) {
                        router.push(`/venue-activity?venueId=${encodeURIComponent(v.id)}`);
                        return;
                      }
                      router.push(`/map?venueId=${encodeURIComponent(v.id)}`);
                    }}
                    className="mt-3 w-full rounded-xl border border-violet-300/30 bg-violet-500/20 px-3 py-2 text-sm font-semibold text-violet-100"
                  >
                    {hasActivity ? "View Activity" : "Open on Map"}
                  </button>
                </SocialCard>
              );
            })}
          </div>
        )}
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