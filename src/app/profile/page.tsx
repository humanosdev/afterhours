"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import ProfileStoriesGrid from "@/components/ProfileStoriesGrid";

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

  const loadFriendCount = async () => {
    const { data } = await supabase
      .from("friend_requests")
      .select("id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    setFriendCount(data?.length || 0);
  };

  loadFriendCount();
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

  const nameToShow = displayName || username;

 return (
  <div className="min-h-screen bg-black text-white p-6 relative">
    
    {/* HEADER */}
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-xl"
        >
          ☰
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => router.push("/settings")}
              className="w-full text-left px-4 py-3 text-sm hover:bg-white/10"
            >
              Settings
            </button>
            
            <button
              onClick={() => router.push("/profile/edit")}
              className="w-full text-left px-4 py-3 text-sm hover:bg-white/10"
            >
              Edit profile
            </button>

            <button
              onClick={signOut}
              className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/20"
            >
              Sign out
            </button>

          </div>
        )}
      </div>
    </div>

    {/* PROFILE ROW */}
    <div className="flex items-center gap-4 mb-4">
      <div className="flex flex-col items-center gap-2">
        <Avatar
          src={avatarUrl}
          fallbackText={nameToShow || username}
          size="lg"
          className="border border-white/10"
        />
      </div>

      <div>
        <div className="text-xl font-semibold leading-tight">
          {nameToShow}
        </div>

        <div className="text-white/60 text-sm">@{username}</div>

        <button
          onClick={() => router.push("/profile/friends")}
          className="text-white/80 text-sm mt-1 hover:underline"
        >
          {friendCount} friends
        </button>

        <div className="text-white/60 text-sm mt-1">
          {venueText}
        </div>
      </div>
    </div>
    {/* BIO */}
    {bio ? (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm leading-relaxed">
        {bio}
      </div>
    ) : (
      <div className="text-white/40 text-sm">
        You haven’t added a bio yet.
      </div>
    )}
{/* MY STORIES GRID */}
<div className="mt-6">
  <ProfileStoriesGrid userId={userId} />
</div>
  </div>
);
}