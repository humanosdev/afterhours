"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { StoryRing } from "@/components/ui";
import ProfileStoriesGrid from "@/components/ProfileStoriesGrid";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ProfilePage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [venueText, setVenueText] = useState<string>("Not at a venue");
  const [momentsCount, setMomentsCount] = useState(0);
  const [activeMomentsCount, setActiveMomentsCount] = useState(0);
  const [latestActiveMomentId, setLatestActiveMomentId] = useState<string | null>(null);
  const [places, setPlaces] = useState<Array<{ id: string; name: string; category?: string | null }>>([]);
  const [activeTab, setActiveTab] = useState<"moments" | "places" | "saved">("moments");

  const [userId, setUserId] = useState<string | null>(null);
  const ONLINE_WINDOW_MS = 5 * 60_000;
  const RECENT_VENUE_WINDOW_MS = 120 * 60_000;

  const isActive = (ts: string) =>
    Date.now() - new Date(ts).getTime() < ONLINE_WINDOW_MS;

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.push("/login");
        return;
      }

      setUserId(auth.user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, bio, avatar_url")
        .eq("id", auth.user.id)
        .single();

      if (error || !data) {
        console.error("Profile fetch error:", error);
        setLoading(false);
        return;
      }

      setUsername(data.username);
      setDisplayName(data.display_name);
      setBio(data.bio);
      setAvatarUrl(data.avatar_url);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const loadCountsAndPlaces = async () => {
      const [{ data: friendsData }, momentsCountRes, momentsRowsRes, presenceRes] = await Promise.all([
        supabase
          .from("friend_requests")
          .select("id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
        supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("stories")
          .select("id, image_url, created_at, expires_at, venue_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("user_presence")
          .select("venue_id, updated_at")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      setFriendCount(friendsData?.length || 0);
      setMomentsCount(momentsCountRes.count ?? 0);
      const now = Date.now();
      const activeMoments = (momentsRowsRes.data ?? []).filter((m: any) => {
        const createdMs = new Date(m.created_at).getTime();
        if (!Number.isFinite(createdMs)) return false;
        const fallbackExpiresMs = createdMs + 24 * 60 * 60 * 1000;
        const expiresMs = m.expires_at ? new Date(m.expires_at).getTime() : fallbackExpiresMs;
        return Number.isFinite(expiresMs) && expiresMs > now;
      });
      setActiveMomentsCount(activeMoments.length);
      setLatestActiveMomentId((activeMoments[0] as any)?.id ?? null);

      const venueIds = new Set<string>();
      (momentsRowsRes.data ?? []).forEach((m: any) => {
        if (m?.venue_id) venueIds.add(m.venue_id);
      });
      if (presenceRes.data?.venue_id) venueIds.add(presenceRes.data.venue_id);

      if (venueIds.size) {
        const { data: venueRows } = await supabase
          .from("venues")
          .select("id, name, category")
          .in("id", Array.from(venueIds));
        setPlaces((venueRows ?? []) as any);
      } else {
        setPlaces([]);
      }
    };

    loadCountsAndPlaces();
    const onStoryPosted = () => loadCountsAndPlaces();
    window.addEventListener("story-posted", onStoryPosted);
    const interval = window.setInterval(loadCountsAndPlaces, 15000);
    return () => {
      window.removeEventListener("story-posted", onStoryPosted);
      window.clearInterval(interval);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data: pres } = await supabase
        .from("user_presence")
        .select("venue_id, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

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

      const lastSeenMs = new Date(pres.updated_at).getTime();
      const now = Date.now();
      if (Number.isNaN(lastSeenMs)) {
        setVenueText("Not at a venue");
        return;
      }

      if (isActive(pres.updated_at)) {
        setVenueText(`At ${v.name}`);
      } else if (now - lastSeenMs <= RECENT_VENUE_WINDOW_MS) {
        setVenueText(`Recently at ${v.name}`);
      } else {
        setVenueText("Not at a venue");
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-black px-4 py-6 text-[14px] text-white/50">
        Loading…
      </div>
    );
  }

  const nameToShow = displayName || username || "You";
  const hasLiveMoment = activeMomentsCount > 0;
  const activeLabel = venueText.startsWith("At ")
    ? venueText
    : venueText.startsWith("Recently at ")
      ? `Last at ${venueText.replace("Recently at ", "")}`
      : venueText === "Not at a venue"
        ? "Not at a venue"
        : "Last active recently";
  const openMomentsTab = () => {
    if (latestActiveMomentId) {
      router.push(`/moments/${encodeURIComponent(latestActiveMomentId)}`);
      return;
    }
    setActiveTab("moments");
  };
  const profileTabs = [
    { key: "moments" as const, label: "Moments" },
    { key: "places" as const, label: "Places" },
    { key: "saved" as const, label: "Saved" },
  ];

  const statusValue = hasLiveMoment ? "Active" : "Away";

  return (
    <ProtectedRoute>
      <div className="flex min-h-[100dvh] w-full max-w-none flex-col bg-black px-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] text-white sm:px-5">
        <div className="mx-auto flex w-full flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h1 className="text-[17px] font-bold tracking-tight">Profile</h1>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[15px] text-white/85"
              >
                ☰
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-[12px] border border-white/[0.1] bg-zinc-900/95 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => router.push("/settings")}
                    className="w-full px-4 py-2.5 text-left text-[14px] hover:bg-white/[0.06]"
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/profile/edit")}
                    className="w-full px-4 py-2.5 text-left text-[14px] hover:bg-white/[0.06]"
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full px-4 py-2.5 text-left text-[14px] text-red-400 hover:bg-red-500/15"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="pt-5">
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                onClick={openMomentsTab}
                className="shrink-0"
                aria-label="Open active Moment or Moments tab"
              >
                <StoryRing
                  src={avatarUrl}
                  alt="profile avatar"
                  fallbackText={nameToShow}
                  size="xl"
                  active={hasLiveMoment}
                />
              </button>
              <div className="min-w-0 flex-1 pt-1">
                <p className="truncate text-[1.375rem] font-bold leading-tight tracking-tight">{nameToShow}</p>
                <p className="mt-0.5 truncate text-[14px] text-white/48">@{username ?? "user"}</p>
                <p className="mt-2 inline-flex max-w-full rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] font-medium text-white/65 ring-1 ring-white/[0.08]">
                  {activeLabel}
                </p>
              </div>
            </div>

            {bio?.trim() ? (
              <p className="mt-4 text-[14px] leading-[1.45] text-white/72">{bio.trim()}</p>
            ) : (
              <p className="mt-4 text-[14px] text-white/38">Add a line so people know your vibe.</p>
            )}

            <div className="mt-5 flex justify-between border-y border-white/[0.08] py-3.5 text-center">
              <button type="button" onClick={() => router.push("/profile/friends")} className="min-w-0 flex-1 px-1">
                <p className="text-xl font-semibold tabular-nums text-white">{friendCount}</p>
                <p className="mt-0.5 text-[12px] text-white/48">Friends</p>
              </button>
              <div className="w-px shrink-0 self-stretch bg-white/[0.08]" aria-hidden />
              <div className="min-w-0 flex-1 px-1">
                <p className="text-xl font-semibold tabular-nums text-white">{places.length}</p>
                <p className="mt-0.5 text-[12px] text-white/48">Places</p>
              </div>
              <div className="w-px shrink-0 self-stretch bg-white/[0.08]" aria-hidden />
              <div className="min-w-0 flex-1 px-1">
                <p className="text-xl font-semibold tabular-nums text-white">{momentsCount}</p>
                <p className="mt-0.5 text-[12px] text-white/48">Moments</p>
              </div>
              <div className="w-px shrink-0 self-stretch bg-white/[0.08]" aria-hidden />
              <div className="min-w-0 flex-1 px-1">
                <p className="truncate text-xl font-semibold text-white">{statusValue}</p>
                <p className="mt-0.5 text-[12px] text-white/48">Status</p>
              </div>
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
                    await navigator.share({ title: `${nameToShow} on AfterHours`, url: shareUrl });
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

          <div className="mt-6 border-b border-white/[0.08]">
            <nav className="-mb-px flex gap-6">
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
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-accent-violet shadow-[0_0_12px_rgba(168,85,247,0.35)]" />
                  ) : null}
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-3">
            {activeTab === "moments" ? (
              <ProfileStoriesGrid
                userId={userId}
                emptyLabel="No moments yet"
                emptySubtitle="When you post, they’ll show up here."
              />
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
                          <p className="truncate text-[12px] text-white/42">{place.category ?? "Venue"}</p>
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
                    Places you post from will appear here.
                  </p>
                )}
              </div>
            ) : null}

            {activeTab === "saved" ? (
              <p className="py-8 text-center text-[13px] leading-relaxed text-white/42">
                Saved places and moments will appear here.
              </p>
            ) : null}
          </div>

          <div className="min-h-6 flex-1 shrink-0" aria-hidden />
        </div>
      </div>
    </ProtectedRoute>
  );
}
