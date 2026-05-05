"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Avatar, StoryRing } from "@/components/ui";
import HubFeedSkeleton from "@/components/skeletons/HubFeedSkeleton";
import StoryViewerModal, { type StoryViewerGroup } from "@/components/StoryViewerModal";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuthRouteTransition } from "@/components/AuthRouteTransition";
import { isPresenceLive, isValidCoordinatePair } from "@/lib/presence";
import { formatRelativeTime } from "@/lib/time";
import { preloadImage } from "@/lib/preloadImage";
import { Expand } from "lucide-react";

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
  is_share?: boolean;
  username: string | null;
  avatar_url: string | null;
};

type StoryGroup = {
  user_id: string;
  avatar_url: string | null;
  username: string | null;
  stories: Story[];
};

type ShareItem = {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  username?: string | null;
  avatar_url?: string | null;
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
  const { end: endAuthRouteTransition } = useAuthRouteTransition();
  const [stories, setStories] = useState<Story[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [friendGhostById, setFriendGhostById] = useState<Record<string, boolean>>({});
  const [meId, setMeId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [myStoryFallback, setMyStoryFallback] = useState<string>("AH");
  const [unreadCount, setUnreadCount] = useState(0);
  const [storyVenueIds, setStoryVenueIds] = useState<Set<string>>(new Set());
  const [friendShares, setFriendShares] = useState<ShareItem[]>([]);
  const [venuesReady, setVenuesReady] = useState(false);
  const [storiesReady, setStoriesReady] = useState(false);
  const [sharesReady, setSharesReady] = useState(false);
  const [avatarPaintReady, setAvatarPaintReady] = useState(false);

  const [activeViewerGroup, setActiveViewerGroup] = useState<StoryViewerGroup | null>(null);

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMeId(data.user.id);
    });
  }, []);
  useEffect(() => {
    if (!meId) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    const loadUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", meId)
        .eq("read", false)
        .neq("type", "message");
      if (!cancelled) setUnreadCount(count ?? 0);
    };
    void loadUnread();
    const channel = supabase
      .channel(`hub-notifications:${meId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_user_id=eq.${meId}` },
        () => {
          void loadUnread();
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [meId]);
  useEffect(() => {
    setAvatarPaintReady(false);
  }, [meId]);

  useEffect(() => {
    if (!meId) return;

    let cancelled = false;

    const loadAvatar = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url, display_name, username")
        .eq("id", meId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("hub profile fetch:", error);
      }
      const nextUrl = data?.avatar_url ?? null;
      setAvatarUrl(nextUrl);
      setMyStoryFallback(
        data?.display_name?.trim() ||
          data?.username?.trim() ||
          "AH"
      );
      await preloadImage(nextUrl);
      if (!cancelled) setAvatarPaintReady(true);
    };

    loadAvatar();
    return () => {
      cancelled = true;
    };
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
        .select("id, username, avatar_url, ghost_mode")
        .in("id", ids);

      const map: Record<string, string> = {};
      const av: Record<string, string | null> = {};
      const ghostMap: Record<string, boolean> = {};
      prof?.forEach((p: any) => {
        map[p.id] = p.username;
        av[p.id] = p.avatar_url ?? null;
        ghostMap[p.id] = !!p.ghost_mode;
      });
      setProfiles(map);
      setAvatars(av);
      setFriendGhostById(ghostMap);
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
      setVenuesReady(true);
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
      if (!meId) {
        setStories([]);
        setStoriesReady(false);
        return;
      }
      const allowedIds = Array.from(new Set([meId, ...friends]));
      if (!allowedIds.length) {
        setStories([]);
        setStoriesReady(true);
        return;
      }

      const preferred = await supabase
        .from("stories")
        .select("id, user_id, image_url, created_at, expires_at, is_share")
        .in("user_id", allowedIds)
        .limit(200);
      const fallback = preferred.error
        ? await supabase
            .from("stories")
            .select("id, user_id, image_url, created_at, expires_at")
            .in("user_id", allowedIds)
            .limit(200)
        : null;
      const data = preferred.data ?? fallback?.data ?? [];
      const error = preferred.error && fallback?.error ? fallback.error : null;
      if (error) {
        console.error("stories fetch error:", error);
        setStoriesReady(true);
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
            is_share: !!s.is_share,
            username: profileById[s.user_id]?.username ?? null,
            avatar_url: profileById[s.user_id]?.avatar_url ?? null,
          };
        })
        .filter((s) => !s.is_share)
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
      setStoriesReady(true);
    };

    loadStories();
    const onStoryPosted = () => loadStories();
    window.addEventListener("story-posted", onStoryPosted);
    return () => window.removeEventListener("story-posted", onStoryPosted);
  }, [friends, meId]);

  useEffect(() => {
    if (!meId) {
      setFriendShares([]);
      setSharesReady(true);
      return;
    }
    let mounted = true;
    const loadFriendShares = async () => {
      const feedUserIds = Array.from(new Set([meId, ...friends]));
      const preferred = await supabase
        .from("stories")
        .select("id, user_id, image_url, created_at, is_share, share_visible, share_hidden")
        .in("user_id", feedUserIds)
        .eq("is_share", true)
        .eq("share_visible", true)
        .eq("share_hidden", false)
        .order("created_at", { ascending: false })
        .limit(120);

      if (preferred.error) {
        if (mounted) {
          setFriendShares([]);
          setSharesReady(true);
        }
        return;
      }
      if (!mounted) return;
      const shareRows = (preferred.data ?? []) as any[];
      const ownerIds = Array.from(new Set(shareRows.map((row) => row.user_id).filter(Boolean))) as string[];
      let ownerById: Record<string, { username: string | null; avatar_url: string | null }> = {};
      if (ownerIds.length) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", ownerIds);
        (profileRows ?? []).forEach((p: any) => {
          ownerById[p.id] = {
            username: p.username ?? null,
            avatar_url: p.avatar_url ?? null,
          };
        });
      }
      if (!mounted) return;
      setFriendShares(
        shareRows
          .map((row) => ({
            id: row.id as string,
            user_id: row.user_id as string,
            image_url: (row.image_url ?? "") as string,
            created_at: row.created_at as string,
            username: ownerById[row.user_id]?.username ?? null,
            avatar_url: ownerById[row.user_id]?.avatar_url ?? null,
          }))
          .filter((row) => !!row.image_url)
      );
      setSharesReady(true);
    };
    loadFriendShares();
    const onStoryPosted = () => loadFriendShares();
    window.addEventListener("story-posted", onStoryPosted);
    return () => {
      mounted = false;
      window.removeEventListener("story-posted", onStoryPosted);
    };
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

  const onlineFriends = presence.filter(
    (p) =>
      friends.includes(p.user_id) &&
      !friendGhostById[p.user_id] &&
      isValidCoordinatePair(p.lat, p.lng) &&
      isPresenceLive(p.updated_at)
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
      const img = document.createElement("img");
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

  const friendShareCards = useMemo(
    () =>
      friendShares.map((share) => {
        const username = share.username || profiles[share.user_id] || "friend";
        const avatar = share.avatar_url ?? avatars[share.user_id] ?? null;
        return { ...share, username, avatar };
      }),
    [friendShares, profiles, avatars]
  );
  const feedReady =
    !!meId &&
    venuesReady &&
    storiesReady &&
    sharesReady &&
    avatarPaintReady;

  useEffect(() => {
    const w = window as Window & { __ahHubFeedReady?: boolean };
    w.__ahHubFeedReady = feedReady;
    if (feedReady) {
      window.dispatchEvent(new CustomEvent("ah-hub-feed-ready"));
      endAuthRouteTransition();
    }
    return () => {
      w.__ahHubFeedReady = false;
    };
  }, [feedReady, endAuthRouteTransition]);

  /* ---------------- UI ---------------- */

  return (
    <ProtectedRoute>
    <div className="flex min-h-[100dvh] w-full max-w-none flex-col bg-primary text-text-primary">
      <div className="mx-auto flex w-full max-w-[min(100%,28rem)] flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+8px)] sm:max-w-[30rem] sm:px-5 sm:pt-3 lg:max-w-[32rem]">
      {/* Top bar — IG-style thin chrome; story strip is the hero below */}
      <header className="flex items-center justify-between gap-3 pb-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
          <Image
            src="/hub-logo.png"
            alt="Intencity"
            width={180}
            height={180}
            priority
            quality={95}
            sizes="36px"
            className="h-full w-full object-contain drop-shadow-[0_0_12px_rgba(122,60,255,0.5)]"
          />
        </div>
        <button
          type="button"
          onClick={() => router.push("/notifications")}
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[15px] text-white/85"
          aria-label="Open notifications"
        >
          ♡
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-[1.125rem] rounded-full bg-accent-violet px-1 py-0.5 text-center text-[10px] font-semibold leading-none text-white shadow-[0_0_12px_rgba(122,60,255,0.5)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </header>

      {!feedReady ? (
        <HubFeedSkeleton />
      ) : (
        <div className="ah-content-reveal">
      {/* Moments — large story rings first (dominant like Instagram home) */}
      <section className="-mx-4 border-b border-white/[0.08] pb-3 pt-0 sm:-mx-5" aria-labelledby="hub-moments-heading">
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
                window.dispatchEvent(
                  new CustomEvent("open-create-composer", {
                    detail: { mode: "both", tab: "moments" },
                  })
                );
              } else {
                window.dispatchEvent(
                  new CustomEvent("open-create-composer", {
                    detail: { mode: "both", tab: "moments" },
                  })
                );
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
                <div className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-black bg-accent-violet text-text-primary shadow-[0_0_14px_rgba(122,60,255,0.58)]">
                  <span className="text-[13px] font-semibold leading-none">+</span>
                </div>
              ) : null}
            </div>
            <span className="mt-2 w-full truncate text-center text-[12px] leading-tight text-white/55">Your moment</span>
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
      </section>

      {/* Active friends */}
      <section className="pt-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-white">Active friends</h2>
          <button
            type="button"
            onClick={() => router.push("/profile/friends")}
            className="rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/78"
          >
            Open friends
          </button>
        </div>
        {onlineFriends.length === 0 ? (
          <div className="py-5 text-center">
            <p className="text-[15px] font-semibold text-white/85">No friends live right now</p>
            <p className="mt-1.5 max-w-xs mx-auto text-[13px] leading-snug text-white/42">
              When people step out, they surface here first.
            </p>
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

      <section>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-white">Live Places</h2>
          <button
            type="button"
            onClick={() => router.push("/live-places")}
            className="rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/78"
          >
            Open live places
          </button>
        </div>
      </section>

      <div className="my-4 h-px bg-white/[0.08]" aria-hidden />

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-white">Friends shares</h2>
        </div>
        {friendShareCards.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-white/45">Be the first to share.</p>
        ) : (
          <div className="space-y-3">
            {friendShareCards.map((share) => {
              const openMoment = () => router.push(`/moments/${encodeURIComponent(share.id)}`);
              return (
                <div
                  key={share.id}
                  className="w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-black text-left"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (share.user_id === meId) {
                        router.push("/profile");
                        return;
                      }
                      if (share.username) {
                        router.push(`/u/${encodeURIComponent(share.username)}`);
                        return;
                      }
                      router.push(`/profile/${share.user_id}`);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5"
                  >
                    <Avatar src={share.avatar} fallbackText={share.username} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-white">{share.username}</p>
                      <p className="truncate text-[11px] text-white/50">{formatRelativeTime(share.created_at)}</p>
                    </div>
                  </button>
                  <div className="relative w-full shrink-0">
                    <div className="relative aspect-[4/5] w-full max-h-[min(62svh,480px)] overflow-hidden bg-[#0a0a0c] sm:max-h-[min(68svh,560px)] lg:mx-auto lg:max-h-[min(78vh,640px)] lg:max-w-[min(100%,28rem)]">
                      <button
                        type="button"
                        onClick={openMoment}
                        className="absolute inset-0 z-0 block w-full"
                        aria-label="View share"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={share.image_url}
                          alt="Share preview"
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMoment();
                        }}
                        className="absolute bottom-2 right-2 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/75"
                        aria-label="Open full photo"
                      >
                        <Expand size={18} strokeWidth={2.2} className="text-white/95" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {friendShareCards.length > 0 && !friendShareCards.some((s) => s.user_id !== meId) ? (
              <p className="pt-1 text-center text-[12px] text-white/38">
                When friends post shares, they&apos;ll show up here too.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <div className="min-h-6 flex-1 shrink-0" aria-hidden />
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