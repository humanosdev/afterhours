"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Avatar, StoryRing } from "@/components/ui";
import HubFeedSkeleton from "@/components/skeletons/HubFeedSkeleton";
import HubShareFeedCard from "@/components/HubShareFeedCard";
import StoryViewerModal, { type StoryViewerGroup } from "@/components/StoryViewerModal";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuthRouteTransition } from "@/components/AuthRouteTransition";
import { isFriendOnlineNow, isPresenceLive, isValidCoordinatePair, getFriendSocialActivitySubtitle } from "@/lib/presence";
import { subscribeUserPresenceChanges } from "@/lib/userPresenceRealtime";
import { preloadImage } from "@/lib/preloadImage";
import { acceptedFriendIdsExcludingBlocks } from "@/lib/pairBlockStatus";
import { venueAccentRgba } from "@/lib/venueCategoryAccent";
import { venueHeatHexFromActivity } from "@/lib/venueHeatColors";
import { fetchViewedStoryIds, STORY_VIEWED_EVENT } from "@/lib/storyViews";
import { fetchShareInteractionStatsByStoryId } from "@/lib/storyFeedInteractions";
import { createNotification } from "@/lib/notifications";
import { withTimeout } from "@/lib/withTimeout";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TAIL_PADDING_HUB_CLASS,
  APP_PAGE_TOP_PADDING_CLASS,
  APP_TAB_PAGE_ROOT_CLASS,
} from "@/lib/appShellLayout";
import { ChevronRight } from "lucide-react";

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
  context_copy?: unknown;
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
  const [friendShares, setFriendShares] = useState<ShareItem[]>([]);
  const [shareStatsById, setShareStatsById] = useState<
    Record<string, { likesCount: number; commentsCount: number; liked: boolean }>
  >({});
  const [venuesReady, setVenuesReady] = useState(false);
  const [storiesReady, setStoriesReady] = useState(false);
  const [sharesReady, setSharesReady] = useState(false);
  const [avatarPaintReady, setAvatarPaintReady] = useState(false);
  const [presenceClock, setPresenceClock] = useState(0);
  /** After full-page skeleton clears, keep upper horizontal swipers on skeleton strips briefly so real rings mount after. */
  const [hubSwipersReady, setHubSwipersReady] = useState(false);

  const [activeViewerGroup, setActiveViewerGroup] = useState<StoryViewerGroup | null>(null);
  /** Story ids the signed-in user has opened in the viewer (server-backed). */
  const [viewedStoryIds, setViewedStoryIds] = useState<Record<string, boolean>>({});

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;
      const sid = sessionData.session?.user?.id;
      if (sid) setMeId(sid);

      const res = await withTimeout(supabase.auth.getUser(), 10_000, {
        data: { user: null },
        error: null,
      } as any);
      if (cancelled) return;
      const uid = res.data?.user?.id;
      if (uid) setMeId(uid);
    })();
    return () => {
      cancelled = true;
    };
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
      try {
        const res = await withTimeout(
          supabase.from("profiles").select("avatar_url, display_name, username").eq("id", meId).maybeSingle(),
          8000,
          { data: null, error: null } as any
        );
        if (cancelled) return;

        if (res.error) {
          console.error("hub profile fetch:", res.error);
        }
        const data = res.data;
        const nextUrl = data?.avatar_url ?? null;
        setAvatarUrl(nextUrl);
        setMyStoryFallback(
          data?.display_name?.trim() ||
            data?.username?.trim() ||
            "AH"
        );
        await preloadImage(nextUrl, 3500);
      } catch (e) {
        console.error("hub avatar load:", e);
      } finally {
        if (!cancelled) setAvatarPaintReady(true);
      }
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
      prof?.forEach((p: any) => {
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
    const id = window.setInterval(() => setPresenceClock((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  /* ---------------- DATA ---------------- */

  useEffect(() => {
    let mounted = true;
    let presenceInterval: number | null = null;

    const loadVenuesOnce = async () => {
      const res = await withTimeout(
        supabase.from("venues").select("*").then((r) => r),
        12_000,
        { data: [] as any[], error: null } as any
      );
      if (!mounted) return;
      setVenues((res.data as any[]) || []);
      setVenuesReady(true);
    };

    const loadPresence = async () => {
      const { data: p } = await supabase.from("user_presence").select("*");
      if (!mounted) return;
      setPresence(p || []);
    };

    loadVenuesOnce();
    loadPresence();

    const unsub = subscribeUserPresenceChanges(supabase, {
      channelName: "hub-user-presence",
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

    presenceInterval = window.setInterval(loadPresence, 25_000);

    return () => {
      mounted = false;
      unsub();
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

      const preferred = await withTimeout(
        supabase
          .from("stories")
          .select("id, user_id, image_url, created_at, expires_at, is_share")
          .in("user_id", allowedIds)
          .limit(200)
          .then((r) => r),
        14_000,
        { data: [], error: null } as any
      );
      const fallback = preferred.error
        ? await withTimeout(
            supabase
              .from("stories")
              .select("id, user_id, image_url, created_at, expires_at")
              .in("user_id", allowedIds)
              .limit(200)
              .then((r) => r),
            12_000,
            { data: [], error: null } as any
          )
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
        const { data: profileRows } = await withTimeout(
          supabase.from("profiles").select("id, username, avatar_url").in("id", userIds).then((r) => r),
          8000,
          { data: [], error: null } as any
        );
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
      const preferred = await withTimeout(
        supabase
          .from("stories")
          .select("id, user_id, image_url, created_at, is_share, share_visible, share_hidden")
          .in("user_id", feedUserIds)
          .eq("is_share", true)
          .eq("share_visible", true)
          .eq("share_hidden", false)
          .order("created_at", { ascending: false })
          .limit(120)
          .then((r) => r),
        12_000,
        { data: [], error: null } as any
      );

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
        const { data: profileRows } = await withTimeout(
          supabase.from("profiles").select("id, username, avatar_url").in("id", ownerIds).then((r) => r),
          8000,
          { data: [], error: null } as any
        );
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
    let cancelled = false;
    const ids = friendShares.map((s) => s.id);
    if (!ids.length) {
      setShareStatsById({});
      return;
    }
    (async () => {
      const stats = await fetchShareInteractionStatsByStoryId(supabase, ids, meId);
      if (!cancelled) setShareStatsById(stats);
    })();
    return () => {
      cancelled = true;
    };
  }, [friendShares, meId]);

  useEffect(() => {
    const onThreadUpdated = (e: Event) => {
      const d = (e as CustomEvent<{ storyId?: string; deltaComments?: number }>).detail;
      if (!d?.storyId) return;
      const deltaComments = d.deltaComments;
      if (typeof deltaComments !== "number" || !Number.isFinite(deltaComments)) return;
      setShareStatsById((p) => {
        const c = p[d.storyId!];
        if (!c) return p;
        return {
          ...p,
          [d.storyId!]: {
            ...c,
            commentsCount: Math.max(0, c.commentsCount + deltaComments),
          },
        };
      });
    };
    const onLikesUpdated = (e: Event) => {
      const d = (e as CustomEvent<{ storyId?: string; deltaLikes?: number; likedByViewer?: boolean }>).detail;
      if (!d?.storyId) return;
      const deltaLikes = d.deltaLikes;
      if (typeof deltaLikes !== "number" || !Number.isFinite(deltaLikes)) return;
      setShareStatsById((p) => {
        const c = p[d.storyId!];
        if (!c) return p;
        return {
          ...p,
          [d.storyId!]: {
            ...c,
            likesCount: Math.max(0, c.likesCount + deltaLikes),
            liked: typeof d.likedByViewer === "boolean" ? d.likedByViewer : c.liked,
            commentsCount: c.commentsCount,
          },
        };
      });
    };
    window.addEventListener("ah-share-threads-updated", onThreadUpdated);
    window.addEventListener("ah-share-likes-updated", onLikesUpdated);
    return () => {
      window.removeEventListener("ah-share-threads-updated", onThreadUpdated);
      window.removeEventListener("ah-share-likes-updated", onLikesUpdated);
    };
  }, []);

  const onlineFriends = useMemo(
    () =>
      presence.filter(
        (p) =>
          friends.includes(p.user_id) &&
          !friendGhostById[p.user_id] &&
          isValidCoordinatePair(p.lat, p.lng) &&
          isFriendOnlineNow(p.updated_at)
      ),
    [presence, friends, friendGhostById, presenceClock]
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

  const allFeedStoryIds = useMemo(() => stories.map((s) => s.id), [stories]);

  useEffect(() => {
    if (!meId || !allFeedStoryIds.length) {
      setViewedStoryIds({});
      return;
    }
    let cancelled = false;
    (async () => {
      const viewed = await fetchViewedStoryIds(supabase, meId, allFeedStoryIds);
      if (cancelled) return;
      const next: Record<string, boolean> = {};
      for (const id of allFeedStoryIds) {
        if (viewed.has(id)) next[id] = true;
      }
      setViewedStoryIds(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [meId, allFeedStoryIds]);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ storyId?: string }>).detail?.storyId;
      if (!id || typeof id !== "string") return;
      setViewedStoryIds((p) => (p[id] ? p : { ...p, [id]: true }));
    };
    window.addEventListener(STORY_VIEWED_EVENT, handler);
    return () => window.removeEventListener(STORY_VIEWED_EVENT, handler);
  }, []);

  const friendStoryHasUnseen = (user: StoryGroup) =>
    user.stories.some((s) => hasActiveStoryMedia(s) && !viewedStoryIds[s.id]);

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

  const myStoriesHaveUnseen =
    hasMyActiveStory &&
    !!myStoryGroup?.stories?.some((s) => hasActiveStoryMedia(s) && !viewedStoryIds[s.id]);

  const hubVenueStrip = useMemo(() => {
    const statsFor = (venue: Venue) => {
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
        friendsTotal: friendsInside + friendsNearby,
      };
    };
    return venues
      .map((v) => ({ ...v, ...statsFor(v) }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.friendsTotal !== a.friendsTotal) return b.friendsTotal - a.friendsTotal;
        return a.name.localeCompare(b.name);
      });
  }, [venues, presence, friends, friendGhostById]);

  const friendShareCards = useMemo(
    () =>
      friendShares.map((share) => {
        const username = share.username || profiles[share.user_id] || "friend";
        const avatar = share.avatar_url ?? avatars[share.user_id] ?? null;
        return { ...share, username, avatar };
      }),
    [friendShares, profiles, avatars]
  );

  const toggleHubShareLike = async (shareId: string, ownerUserId: string) => {
    if (!meId) return;
    const cur = shareStatsById[shareId];
    if (!cur) return;
    if (cur.liked) {
      const { error } = await supabase.from("story_likes").delete().eq("story_id", shareId).eq("user_id", meId);
      if (error) return;
      setShareStatsById((p) => {
        const c = p[shareId];
        if (!c) return p;
        return {
          ...p,
          [shareId]: { ...c, liked: false, likesCount: Math.max(0, c.likesCount - 1) },
        };
      });
      return;
    }
    const { error } = await supabase.from("story_likes").insert({ story_id: shareId, user_id: meId });
    if (error) return;
    setShareStatsById((p) => {
      const c = p[shareId];
      if (!c) return p;
      return {
        ...p,
        [shareId]: { ...c, liked: true, likesCount: c.likesCount + 1 },
      };
    });
    if (ownerUserId !== meId) {
      await createNotification({
        recipientId: ownerUserId,
        actorId: meId,
        type: "story_like",
        storyId: shareId,
        dedupeKey: `story_like:${shareId}:${meId}`,
        pushTitle: "Your post got a new like",
        pushBody: "A friend liked your post.",
        route: `/moments/${shareId}`,
      });
    }
  };

  const feedReady =
    !!meId &&
    venuesReady &&
    storiesReady &&
    sharesReady &&
    avatarPaintReady;

  const feedReadyRef = useRef(feedReady);
  feedReadyRef.current = feedReady;

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

  /**
   * Login/onboarding call `start()` on the auth-route overlay; `end()` normally runs when `feedReady`
   * is true. If any hub fetch hangs or `avatarPaintReady` stalls, the overlay (and sometimes the cold
   * splash waiting on `ah-hub-feed-ready`) could feel stuck until refresh — clear both after a short cap.
   */
  useEffect(() => {
    const HUB_AUTH_OVERLAY_CAP_MS = 10_000;
    const id = window.setTimeout(() => {
      endAuthRouteTransition();
      if (!feedReadyRef.current) {
        window.dispatchEvent(new CustomEvent("ah-hub-feed-ready"));
      }
    }, HUB_AUTH_OVERLAY_CAP_MS);
    return () => window.clearTimeout(id);
  }, [endAuthRouteTransition]);

  useEffect(() => {
    if (!feedReady) {
      setHubSwipersReady(false);
      return;
    }
    let cancelled = false;
    const id = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setHubSwipersReady(true);
        });
      });
    }, 560);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [feedReady]);

  useEffect(() => {
    if (!hubSwipersReady) return;
    window.dispatchEvent(new CustomEvent("ah-hub-ui-ready"));
  }, [hubSwipersReady]);

  /* ---------------- UI ---------------- */

  return (
    <ProtectedRoute>
    <div className={`${APP_TAB_PAGE_ROOT_CLASS} w-full max-w-none text-text-primary`}>
      <div
        className={`${APP_CONTENT_MAX_CLASS} flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] px-4 ${APP_PAGE_TAIL_PADDING_HUB_CLASS} ${APP_PAGE_TOP_PADDING_CLASS} sm:px-5`}
      >
      {/* Top bar — IG-style thin chrome; story strip is the hero below */}
      <header className="flex items-center justify-between gap-3 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center">
            <Image
              src="/hub-logo.png"
              alt="Intencity"
              width={486}
              height={514}
              priority
              quality={100}
              sizes="72px"
              className="h-9 w-auto max-w-[2.25rem] object-contain object-center"
            />
          </div>
          <div className="min-w-0 self-center">
            <p className="text-[12px] font-medium leading-snug text-white/55">
              Live the city, feel the{" "}
              <span className="font-semibold text-accent-violet-active">intencity</span>.
            </p>
          </div>
        </div>
        <div className="relative h-10 w-10 shrink-0">
          <button
            type="button"
            onClick={() => router.push("/notifications")}
            className="ah-glass-control ah-glass-control-interactive grid h-10 w-10 place-items-center rounded-full text-[15px] text-white/85"
            aria-label="Open notifications"
          >
            <span className="relative z-[1]">♡</span>
          </button>
          {unreadCount > 0 ? (
            <span
              className="pointer-events-none absolute -right-0.5 -top-0.5 z-[3] min-w-[1.125rem] rounded-full bg-accent-violet px-1 py-0.5 text-center text-[10px] font-semibold leading-none text-white shadow-[0_0_12px_rgba(59,102,255,0.5)]"
              aria-hidden
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </div>
      </header>

      {!feedReady ? (
        <HubFeedSkeleton />
      ) : (
        <div className="ah-content-reveal">
      {!hubSwipersReady ? (
        <HubFeedSkeleton />
      ) : (
        <>
      {/* Moments — large story rings first (dominant like Instagram home) */}
      <section className="-mx-4 relative pb-3 pt-0 sm:-mx-5" aria-labelledby="hub-moments-heading">
        <h2 id="hub-moments-heading" className="sr-only">
          Moments
        </h2>
        <div className="scrollbar-none flex items-start gap-[14px] overflow-x-auto px-4 py-2.5 pb-3 sm:px-5">
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
                active={myStoriesHaveUnseen}
              />
              {!hasMyActiveStory ? (
                <div className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-primary bg-accent-violet text-text-primary shadow-[0_0_14px_rgba(59,102,255,0.58)]">
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
                active={friendStoryHasUnseen(user)}
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
            className="ah-glass-control ah-glass-control-interactive rounded-full px-3 py-1.5 text-[11px] font-medium text-white/78"
          >
            <span>Open friends</span>
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
          <div className="scrollbar-none -mx-0.5 flex gap-4 overflow-x-auto px-0.5 pb-2">
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
                      {getFriendSocialActivitySubtitle(
                        {
                          ghostMode: false,
                          updatedAt: f.updated_at,
                          venueId: f.venue_id,
                          venueName: venueName,
                        },
                        Date.now()
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-14 mb-5 h-px bg-white/[0.08]" aria-hidden />

      <section className="pt-6 sm:pt-8">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-white">Live Places</h2>
          <button
            type="button"
            onClick={() => router.push("/live-places")}
            className="ah-glass-control ah-glass-control-interactive inline-flex shrink-0 items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-white/78"
          >
            <span className="inline-flex items-center gap-0.5">
              All
              <ChevronRight className="text-white/45" size={14} strokeWidth={2.2} aria-hidden />
            </span>
          </button>
        </div>
        {hubVenueStrip.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-white/42">Venues appear here as people get nearby.</p>
        ) : (
          <div className="-mx-4 sm:-mx-5">
            <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-2 sm:gap-2.5 sm:px-5 sm:pb-3">
            {hubVenueStrip.slice(0, 16).map((v) => {
              const heatHex = venueHeatHexFromActivity(v.total);
              const venueImage = v.image_url || v.photo_url || v.cover_image_url || null;
              const glowAlpha = v.total > 0 ? 0.07 : 0.035;
              return (
                <div
                  key={v.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${v.name}, activity ${v.total}`}
                  onClick={() => router.push(`/map?venueId=${encodeURIComponent(v.id)}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/map?venueId=${encodeURIComponent(v.id)}`);
                    }
                  }}
                  className="ah-glass-control w-[min(72vw,15.5rem)] shrink-0 cursor-pointer overflow-hidden rounded-2xl text-left transition active:scale-[0.99]"
                  style={{
                    boxShadow: `0 0 28px ${venueAccentRgba(heatHex, glowAlpha)}, 0 14px 44px rgba(0,0,0,0.5)`,
                  }}
                >
                  <div className="relative aspect-[5/6] w-full overflow-hidden bg-white/[0.06]">
                    {venueImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={venueImage} alt={v.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[11px] font-medium text-white/30">
                        {v.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, ${venueAccentRgba(heatHex, v.total > 0 ? 0.55 : 0.22)} 0%, ${venueAccentRgba(heatHex, v.total > 0 ? 0.12 : 0.06)} 44%, transparent 78%)`,
                      }}
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
                      <p className="min-w-0 truncate text-[14px] font-semibold leading-tight text-white drop-shadow-sm">
                        {v.name}
                      </p>
                      <span
                        className="flex shrink-0 items-baseline gap-1.5 rounded-full px-2 py-1"
                        style={{ backgroundColor: venueAccentRgba(heatHex, v.total > 0 ? 0.32 : 0.18) }}
                      >
                        <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/88">
                          Activity
                        </span>
                        <span className="text-[13px] font-bold tabular-nums leading-none text-white">{v.total}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </section>

      <div className="my-4 h-px bg-white/[0.08]" aria-hidden />

      <section>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-white">Shares</h2>
        </div>
        {friendShareCards.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-white/45">Be the first to share.</p>
        ) : (
          <div>
            {friendShareCards.map((share) => {
              const stats = shareStatsById[share.id] ?? {
                likesCount: 0,
                commentsCount: 0,
                liked: false,
              };
              const openPost = () => router.push(`/moments/${encodeURIComponent(share.id)}`);
              const openComments = () => router.push(`/moments/${encodeURIComponent(share.id)}#comments`);
              const openProfile = () => {
                if (share.user_id === meId) {
                  router.push("/profile");
                  return;
                }
                if (share.username) {
                  router.push(`/u/${encodeURIComponent(share.username)}`);
                  return;
                }
                router.push(`/profile/${share.user_id}`);
              };
              return (
                <HubShareFeedCard
                  key={share.id}
                  share={{
                    id: share.id,
                    user_id: share.user_id,
                    username: share.username,
                    image_url: share.image_url,
                    created_at: share.created_at,
                    avatar: share.avatar,
                  }}
                  meId={meId}
                  likesCount={stats.likesCount}
                  commentsCount={stats.commentsCount}
                  liked={stats.liked}
                  onToggleLike={() => void toggleHubShareLike(share.id, share.user_id)}
                  onOpenPost={openPost}
                  onOpenComments={openComments}
                  onOpenProfile={openProfile}
                />
              );
            })}
            {friendShareCards.length > 0 && !friendShareCards.some((s) => s.user_id !== meId) ? (
              <p className="pt-1 text-center text-[12px] text-white/38">
                When friends post, they&apos;ll show up here too.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <div className="h-3 shrink-0" aria-hidden />
        </>
      )}
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