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
        if (!m?.image_url) return false;
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
  // Show my current venue (uses existing presence data)
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
      <div className="min-h-screen bg-black text-white p-6">
        Loading…
      </div>
    );
  }

  const nameToShow = displayName || username || "You";
  const hasLiveMoment = activeMomentsCount > 0;
  const activeLabel = venueText.startsWith("At ")
    ? venueText
    : venueText.startsWith("Recently at ")
      ? `Last active ${venueText.replace("Recently at ", "")}`
      : "Last active recently";
  const openMomentsTab = () => {
    if (latestActiveMomentId) {
      router.push(`/moments/${encodeURIComponent(latestActiveMomentId)}`);
      return;
    }
    setActiveTab("moments");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black px-4 pb-[calc(env(safe-area-inset-bottom,0px)+112px)] pt-[calc(env(safe-area-inset-top,0px)+14px)] text-white">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm backdrop-blur"
              >
                ☰
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                  <button
                    onClick={() => router.push("/settings")}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/10"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => router.push("/profile/edit")}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/10"
                  >
                    Edit profile
                  </button>
                  <button
                    onClick={signOut}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/20"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <section className="rounded-2xl border border-white/10 bg-[#0b0f18cc] p-4 backdrop-blur">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={openMomentsTab}
                className="shrink-0"
                aria-label="Open Moments tab"
              >
                <StoryRing
                  src={avatarUrl}
                  alt="profile avatar"
                  fallbackText={nameToShow}
                  size="lg"
                  active={hasLiveMoment}
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-semibold leading-tight">{nameToShow}</p>
                <p className="truncate text-sm text-white/60">@{username ?? "user"}</p>
                <button
                  onClick={() => router.push("/profile/friends")}
                  className="mt-1 block text-sm text-violet-200/90 hover:underline"
                >
                  {friendCount} friends
                </button>
                <p className="mt-1 text-sm text-white/70">{activeLabel}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2">
                <p className="text-[11px] text-white/55">Friends</p>
                <p className="text-base font-semibold">{friendCount}</p>
              </div>
              <div className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2">
                <p className="text-[11px] text-white/55">Moments</p>
                <p className="text-base font-semibold">{momentsCount}</p>
              </div>
              <div className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2">
                <p className="text-[11px] text-white/55">Places</p>
                <p className="text-base font-semibold">{places.length}</p>
              </div>
              <div className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2">
                <p className="text-[11px] text-white/55">Live status</p>
                <p className="truncate text-base font-semibold">{hasLiveMoment ? "Active now" : "Recently active"}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/75">
              {bio?.trim() ? bio : "Add a bio so people know your vibe."}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => router.push("/profile/edit")}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold"
              >
                Edit Profile
              </button>
              <button
                onClick={async () => {
                  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
                  if (navigator.share) {
                    await navigator.share({ title: `${nameToShow} on AfterHours`, url: shareUrl });
                    return;
                  }
                  if (shareUrl) await navigator.clipboard.writeText(shareUrl);
                }}
                className="rounded-xl border border-violet-300/30 bg-violet-500/20 px-3 py-2 text-sm font-semibold text-violet-100"
              >
                Share Profile
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0b0f18cc] p-3 backdrop-blur">
            <div className="flex gap-1">
              {[
                { key: "moments", label: "Moments" },
                { key: "places", label: "Places" },
                { key: "saved", label: "Saved" },
              ].map((tab: { key: "moments" | "places" | "saved"; label: string }) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-violet-500/25 text-violet-100"
                      : "bg-white/5 text-white/70"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "moments" ? (
              <div className="mt-3">
                <ProfileStoriesGrid
                  userId={userId}
                  emptyLabel="No Moments Yet. Go out and post your first Moment."
                />
              </div>
            ) : null}

            {activeTab === "places" ? (
              <div className="mt-3 space-y-2">
                {places.length ? (
                  places.map((place) => (
                    <div
                      key={place.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{place.name}</p>
                        <p className="truncate text-xs text-white/60">{place.category ?? "Venue"}</p>
                      </div>
                      <button
                        onClick={() => router.push(`/map?venueId=${encodeURIComponent(place.id)}`)}
                        className="rounded-lg border border-sky-300/30 bg-sky-500/15 px-2 py-1 text-xs font-semibold text-sky-100"
                      >
                        Open on Map
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-sm text-white/55">
                    Places you post from will appear here.
                  </p>
                )}
              </div>
            ) : null}

            {activeTab === "saved" ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                Saved places and moments will appear here.
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}