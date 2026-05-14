"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { StoryRing } from "@/components/ui";
import ProfileStoriesGrid from "@/components/ProfileStoriesGrid";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuthRouteTransition } from "@/components/AuthRouteTransition";
import ProfilePageSkeleton from "@/components/skeletons/ProfilePageSkeleton";
import { getFriendProfileVenueHeadline } from "@/lib/presence";
import { preloadImage } from "@/lib/preloadImage";
import { acceptedFriendIdsExcludingBlocks } from "@/lib/pairBlockStatus";
import { formatVenueCategoryLabel } from "@/lib/venueCategoryLabel";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TAIL_PADDING_CLASS,
  APP_PAGE_TOP_PADDING_CLASS,
  APP_TAB_PAGE_ROOT_CLASS,
  emitPrimarySurfaceReady,
} from "@/lib/appShellLayout";
import { Menu, Plus } from "lucide-react";
import StoryViewerModal, { type StoryViewerGroup, type StoryViewerStory } from "@/components/StoryViewerModal";
import { fetchViewedStoryIds, STORY_VIEWED_EVENT } from "@/lib/storyViews";

export default function ProfilePage() {
  const router = useRouter();
  const { end } = useAuthRouteTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [myGhostMode, setMyGhostMode] = useState(false);
  const [venueText, setVenueText] = useState<string>("Not at a venue");
  const [presenceUpdatedAt, setPresenceUpdatedAt] = useState<string | null>(null);
  const [presenceClock, setPresenceClock] = useState(0);
  const [momentsCount, setMomentsCount] = useState(0);
  const [myStoryViewerStories, setMyStoryViewerStories] = useState<StoryViewerStory[]>([]);
  const [viewedStoryIds, setViewedStoryIds] = useState<Record<string, boolean>>({});
  const [activeViewerGroup, setActiveViewerGroup] = useState<StoryViewerGroup | null>(null);
  const [places, setPlaces] = useState<Array<{ id: string; name: string; category?: string | null }>>([]);
  const [activeTab, setActiveTab] = useState<"shares" | "archive" | "places">("shares");

  const [userId, setUserId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) emitPrimarySurfaceReady();
  }, [loading]);

  async function signOut() {
    const accountLabel = username?.trim() ? username.trim() : "your account";
    const confirmed = window.confirm(
      `Are you sure you want to sign out of "${accountLabel}"?`
    );
    if (!confirmed) return;
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      setUserId(auth.user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, bio, avatar_url, ghost_mode")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (error) {
        console.error("Profile fetch error:", error);
        setProfileError("Could not load your profile. Check connection or try again.");
        setLoading(false);
        return;
      }

      if (!data) {
        setProfileError(null);
        setUsername(null);
        setDisplayName(null);
        setBio(null);
        setAvatarUrl(null);
        setMyGhostMode(false);
        setLoading(false);
        return;
      }

      setProfileError(null);
      setUsername(data.username);
      setDisplayName(data.display_name);
      setBio(data.bio);
      setAvatarUrl(data.avatar_url);
      setMyGhostMode(!!data.ghost_mode);
      await preloadImage(data.avatar_url);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (loading) return;
    end();
  }, [loading, end]);

  useEffect(() => {
    if (!userId) return;

    const loadCountsAndPlaces = async () => {
      const [friendIds, momentsCountRes, momentsRowsRes, presenceRes] = await Promise.all([
        acceptedFriendIdsExcludingBlocks(supabase, userId),
        supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_share", true),
        supabase
          .from("stories")
          .select("id, image_url, created_at, expires_at, venue_id, is_share")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("user_presence")
          .select("venue_id, updated_at")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      setFriendCount(friendIds.length);
      setMomentsCount(momentsCountRes.count ?? 0);
      const now = Date.now();
      const activeMoments = (momentsRowsRes.data ?? []).filter((m: any) => {
        if (m?.is_share) return false;
        const media = String(m?.image_url ?? m?.media_url ?? "").trim();
        if (!media) return false;
        const createdMs = new Date(m.created_at).getTime();
        if (!Number.isFinite(createdMs)) return false;
        const fallbackExpiresMs = createdMs + 24 * 60 * 60 * 1000;
        const expiresMs = m.expires_at ? new Date(m.expires_at).getTime() : fallbackExpiresMs;
        return Number.isFinite(expiresMs) && expiresMs > now;
      });
      const viewerStories: StoryViewerStory[] = activeMoments.map((m: any) => ({
        id: m.id,
        user_id: userId,
        media_url: String(m.image_url ?? m.media_url ?? "").trim(),
        created_at: m.created_at,
        expires_at: m.expires_at ?? null,
      }));
      setMyStoryViewerStories(viewerStories);
      setPresenceUpdatedAt(presenceRes.data?.updated_at ?? null);

      // Stable visited-venues list: dedupe from all story venue_ids only (no live presence).
      const historyByVenue = new Map<string, number>();
      for (const row of momentsRowsRes.data ?? []) {
        const venueId = (row as any)?.venue_id as string | null | undefined;
        if (!venueId) continue;
        const ts = new Date((row as any)?.created_at).getTime();
        const prev = historyByVenue.get(venueId) ?? 0;
        if (Number.isFinite(ts) && ts > prev) historyByVenue.set(venueId, ts);
      }

      if (!historyByVenue.size) {
        setPlaces([]);
      } else {
        const ids = Array.from(historyByVenue.keys());
        const { data: venueRows } = await supabase
          .from("venues")
          .select("id, name, category")
          .in("id", ids);
        const sorted = (venueRows ?? [])
          .slice()
          .sort((a: any, b: any) => (historyByVenue.get(b.id) ?? 0) - (historyByVenue.get(a.id) ?? 0));
        setPlaces(sorted as any);
      }
    };

    loadCountsAndPlaces();
    const onStoryPosted = () => loadCountsAndPlaces();
    window.addEventListener("story-posted", onStoryPosted);
    const bumpFriendCount = () => {
      void acceptedFriendIdsExcludingBlocks(supabase, userId).then((ids) => setFriendCount(ids.length));
    };
    window.addEventListener("friends-updated", bumpFriendCount);
    window.addEventListener("friend-removed", bumpFriendCount);
    const interval = window.setInterval(loadCountsAndPlaces, 15000);
    return () => {
      window.removeEventListener("story-posted", onStoryPosted);
      window.removeEventListener("friends-updated", bumpFriendCount);
      window.removeEventListener("friend-removed", bumpFriendCount);
      window.clearInterval(interval);
    };
  }, [userId]);

  useEffect(() => {
    const id = window.setInterval(() => setPresenceClock((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data: pres } = await supabase
        .from("user_presence")
        .select("venue_id, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      setPresenceUpdatedAt(pres?.updated_at ?? null);

      if (myGhostMode) {
        setVenueText("Ghost mode on");
        return;
      }

      if (!pres?.venue_id || !pres.updated_at) {
        setVenueText("Not at a venue");
        return;
      }

      const { data: v } = await supabase
        .from("venues")
        .select("name")
        .eq("id", pres.venue_id)
        .maybeSingle();

      if (!v?.name) {
        setVenueText("Not at a venue");
        return;
      }

      setVenueText(
        getFriendProfileVenueHeadline(
          { updatedAt: pres.updated_at, venueName: v.name.trim() },
          Date.now()
        )
      );
    })();
  }, [userId, myGhostMode, presenceClock]);

  const myStoryIdsKey = useMemo(
    () =>
      myStoryViewerStories
        .map((s) => s.id)
        .sort()
        .join(","),
    [myStoryViewerStories]
  );

  useEffect(() => {
    if (!userId || !myStoryIdsKey) {
      setViewedStoryIds({});
      return;
    }
    const ids = myStoryIdsKey.split(",").filter(Boolean);
    let cancelled = false;
    (async () => {
      const viewed = await fetchViewedStoryIds(supabase, userId, ids);
      if (cancelled) return;
      const next: Record<string, boolean> = {};
      for (const id of ids) {
        if (viewed.has(id)) next[id] = true;
      }
      setViewedStoryIds(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, myStoryIdsKey]);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ storyId?: string }>).detail?.storyId;
      if (!id || typeof id !== "string") return;
      setViewedStoryIds((p) => (p[id] ? p : { ...p, [id]: true }));
    };
    window.addEventListener(STORY_VIEWED_EVENT, handler);
    return () => window.removeEventListener(STORY_VIEWED_EVENT, handler);
  }, []);

  const nameToShow = displayName || username || "You";
  const nameUnderAvatar = displayName?.trim() || username || "You";
  const hasLiveMoment = myStoryViewerStories.length > 0;
  const storyRingActive =
    hasLiveMoment && myStoryViewerStories.some((s) => !viewedStoryIds[s.id]);
  const activeLabel =
    venueText === "Ghost mode on"
      ? "Ghost mode on"
      : venueText.startsWith("At ")
        ? venueText
        : venueText.startsWith("Away · At ")
          ? venueText
          : venueText.startsWith("Recently at ")
            ? `Last at ${venueText.replace("Recently at ", "")}`
            : venueText === "Not at a venue"
              ? "Not at a venue"
              : "Last active recently";
  const openMomentsTab = () => {
    if (myStoryViewerStories.length > 0 && userId) {
      setActiveViewerGroup({
        user_id: userId,
        username,
        avatar_url: avatarUrl,
        stories: myStoryViewerStories,
      });
      return;
    }
    setActiveTab("shares");
  };
  const profileTabs = [
    { key: "shares" as const, label: "Shares" },
    { key: "archive" as const, label: "Archive" },
    { key: "places" as const, label: "Places" },
  ];

  return (
    <ProtectedRoute>
      <>
      {loading ? (
        <ProfilePageSkeleton />
      ) : (
      <div className={`${APP_TAB_PAGE_ROOT_CLASS} text-white`}>
        <div
          className={`${APP_CONTENT_MAX_CLASS} flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] px-4 ${APP_PAGE_TAIL_PADDING_CLASS} ${APP_PAGE_TOP_PADDING_CLASS} sm:px-5`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-[17px] font-bold tracking-tight">Profile</h1>
              <p className="mt-0.5 truncate text-[14px] font-semibold text-white/45">
                @{username ?? "user"}
              </p>
              {profileError ? (
                <p className="mt-2 text-[13px] leading-snug text-amber-200/90">{profileError}</p>
              ) : null}
              {!profileError && userId && !username && !displayName ? (
                <p className="mt-2 text-[13px] leading-snug text-white/50">
                  No profile row yet — open Edit profile to finish setup.
                </p>
              ) : null}
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="ah-glass-control ah-glass-control-interactive grid h-10 w-10 place-items-center rounded-full text-white/88 transition"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Open menu"
              >
                <Menu size={20} strokeWidth={2} className="opacity-90" />
              </button>
              {menuOpen ? (
                <div
                  className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-white/[0.12] bg-primary/92 shadow-[0_16px_48px_rgba(0,0,0,0.65)] backdrop-blur-xl"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/settings");
                    }}
                    className="w-full px-4 py-3 text-left text-[14px] text-white/92 transition hover:bg-white/[0.06]"
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/profile/edit");
                    }}
                    className="w-full px-4 py-3 text-left text-[14px] text-white/92 transition hover:bg-white/[0.06]"
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/archive/hidden");
                    }}
                    className="w-full px-4 py-3 text-left text-[14px] text-white/92 transition hover:bg-white/[0.06]"
                  >
                    Hidden shares
                  </button>
                  <div className="border-t border-white/[0.08]" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className="w-full px-4 py-3 text-left text-[14px] font-medium text-red-400/95 transition hover:bg-red-500/12"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="pt-5">
            <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-start gap-x-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-x-5">
              <button
                type="button"
                onClick={openMomentsTab}
                className="col-start-1 row-start-1 justify-self-start"
                aria-label="Open active Moment or Moments tab"
              >
                <StoryRing
                  src={avatarUrl}
                  alt="profile avatar"
                  fallbackText={nameToShow}
                  size="xl"
                  active={storyRingActive}
                />
              </button>
              <div className="col-start-2 row-start-1 row-span-2 flex min-h-[5.5rem] min-w-0 flex-col justify-center gap-3 sm:min-h-[6rem]">
                <div className="grid w-full grid-cols-3 gap-x-1 text-center sm:gap-x-2">
                  <button
                    type="button"
                    onClick={() => router.push("/profile/friends")}
                    className="min-w-0 px-0.5"
                  >
                    <p className="text-lg font-semibold tabular-nums text-white sm:text-xl">{friendCount}</p>
                    <p className="mt-1 text-[11px] text-white/48">Friends</p>
                  </button>
                  <div className="min-w-0 px-0.5">
                    <p className="text-lg font-semibold tabular-nums text-white sm:text-xl">{places.length}</p>
                    <p className="mt-1 text-[11px] text-white/48">Places</p>
                  </div>
                  <div className="min-w-0 px-0.5">
                    <p className="text-lg font-semibold tabular-nums text-white sm:text-xl">{momentsCount}</p>
                    <p className="mt-1 text-[11px] text-white/48">Shares</p>
                  </div>
                </div>
                <div className="ah-glass-control flex w-full items-center justify-center rounded-full px-2.5 py-1 text-center text-[11px] font-medium leading-snug text-white/72 sm:text-[12px]">
                  <span>{activeLabel}</span>
                </div>
              </div>
              <p className="col-start-1 row-start-2 mt-2.5 min-w-0 w-full text-left text-[0.9375rem] font-semibold leading-snug tracking-tight text-white line-clamp-2">
                {nameUnderAvatar}
              </p>
              {bio?.trim() ? (
                <p className="col-span-2 row-start-3 mt-4 min-w-0 text-[14px] leading-[1.45] text-white/72">
                  {bio.trim()}
                </p>
              ) : (
                <p className="col-span-2 row-start-3 mt-4 min-w-0 text-[14px] text-white/38">
                  Add a line so people know your vibe.
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => router.push("/profile/edit")}
                className="h-11 rounded-[10px] bg-white text-[15px] font-semibold text-black transition active:opacity-90"
              >
                Edit profile
              </button>
              <button
                type="button"
                onClick={async () => {
                  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
                  if (navigator.share) {
                    await navigator.share({ title: `${nameToShow} on Intencity`, url: shareUrl });
                    return;
                  }
                  if (shareUrl) await navigator.clipboard.writeText(shareUrl);
                }}
                className="h-11 rounded-[10px] border border-white/[0.12] bg-white/[0.05] text-[15px] font-semibold text-white/92 transition hover:bg-white/[0.08]"
              >
                Share profile
              </button>
            </div>
          </div>

          <div className="mt-5 border-b border-white/[0.08]">
            <nav className="-mb-px flex gap-5 sm:gap-6">
              {profileTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative pb-2.5 text-[15px] font-semibold transition ${
                    activeTab === tab.key ? "text-white" : "text-white/42 hover:text-white/65"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key ? (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-accent-violet shadow-[0_0_12px_rgba(59,102,255,0.42)]" />
                  ) : null}
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-3">
            {activeTab === "shares" ? (
              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-white">Shares</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("open-create-composer", {
                          detail: { mode: "both", tab: "shares" },
                        })
                      )
                    }
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-black shadow-glow-violet transition active:scale-[0.98]"
                  >
                    <Plus size={16} strokeWidth={2.5} aria-hidden />
                    New
                  </button>
                </div>
                <ProfileStoriesGrid
                  userId={userId}
                  viewerId={userId}
                  mode="shares"
                  emptyLabel="No shares yet"
                  emptySubtitle="Hidden shares are moved to Hidden shares in your menu."
                />
              </div>
            ) : null}

            {activeTab === "archive" ? (
              <div>
                <div className="mb-3">
                  <p className="text-[15px] font-semibold text-white">Archive</p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
                    Expired moments · hidden shares
                  </p>
                </div>
                <ProfileStoriesGrid
                  userId={userId}
                  viewerId={userId}
                  mode="archive"
                  emptyLabel="No archived moments yet"
                  emptySubtitle="Your expired moments and hidden shares show up here with timestamps."
                />
              </div>
            ) : null}

            {activeTab === "places" ? (
              <div>
                {places.length ? (
                  <ul className="divide-y divide-white/[0.08]">
                    {places.map((place) => (
                      <li
                        key={place.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-white">{place.name}</p>
                          <p className="truncate text-[12px] text-white/42">{formatVenueCategoryLabel(place.category)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push(`/map?venueId=${encodeURIComponent(place.id)}`)}
                          className="h-9 shrink-0 rounded-[10px] bg-white/[0.08] px-3 text-[12px] font-semibold text-white/90 ring-1 ring-white/[0.08]"
                        >
                          Open on Map
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                    <p className="py-8 text-center text-[13px] text-white/42">
                      Places you have visited will appear here.
                    </p>
                )}
              </div>
            ) : null}

          </div>

          <div className="h-3 shrink-0" aria-hidden />
        </div>
      </div>
      )}
      <StoryViewerModal
        open={!!activeViewerGroup}
        group={activeViewerGroup}
        currentUserId={userId}
        onClose={() => setActiveViewerGroup(null)}
        onStoryDeleted={(storyId) => {
          setMyStoryViewerStories((prev) => prev.filter((s) => s.id !== storyId));
          setActiveViewerGroup((prev) => {
            if (!prev) return null;
            const nextStories = prev.stories.filter((s) => s.id !== storyId);
            if (!nextStories.length) return null;
            return { ...prev, stories: nextStories };
          });
        }}
      />
      </>
    </ProtectedRoute>
  );
}
