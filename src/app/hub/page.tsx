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
  /* ---------------- UI ---------------- */

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-primary text-text-primary px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold tracking-[0.24em] text-text-secondary">
            AFTERHOURS
          </div>
          <div className="mt-1 text-lg font-semibold">Hub</div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/notifications")}
          className="relative rounded-full border border-subtle bg-secondary px-3 py-2 text-sm text-text-primary"
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

      {/* STORIES */}
      <div className="scrollbar-none flex items-center gap-4 overflow-x-auto pb-1">
          {/* YOUR STORY */}
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
                alt="your story"
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
              Your story
            </span>
          </button>

          {/* FRIEND STORIES */}
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

      {/* ACTIVE FRIENDS */}
      <div className="rounded-2xl border border-subtle bg-secondary p-4 space-y-3">
        <SectionHeader
          title="Active friends"
          subtitle="Online in the last few minutes"
        />

        {onlineFriends.length === 0 ? (
          <EmptyState
            title="Quiet right now"
            description="Friends will appear here as they jump in."
            className="bg-surface"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {onlineFriends.map((f) => {
              const name = profiles[f.user_id] || "Friend";
              return (
                <button
                  key={f.user_id}
                  onClick={() => {
                    const uname = profiles[f.user_id];
                    if (uname) router.push(`/u/${uname}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-subtle bg-surface p-3 text-left"
                >
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
                    <div className="text-xs text-text-secondary">Active</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* VENUES */}
      <div className="rounded-2xl border border-subtle bg-secondary p-4 space-y-3">
        <SectionHeader
          title="Venues with people"
          subtitle="Where the night is happening"
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
              let vibe = "Quiet";
              let vibeVariant: "neutral" | "cyan" | "violet" = "neutral";
              if (v.total > 10) {
                vibe = "LIT";
                vibeVariant = "violet";
              } else if (v.total > 4) {
                vibe = "Active";
                vibeVariant = "cyan";
              } else if (v.total > 0) {
                vibe = "Chill";
                vibeVariant = "neutral";
              }

              const previewIds = friendPreviewForVenue(v.id);

              return (
                <SocialCard
                  key={v.id}
                  className="bg-surface"
                  interactive
                  onClick={() => router.push(`/map?venueId=${encodeURIComponent(v.id)}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-text-secondary">
                        #{index + 1}
                      </div>
                      <div className="mt-1 truncate text-base font-semibold">
                        {v.name}
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
                          : "Be the first there"}
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