"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import ProfileStoriesGrid from "@/components/ProfileStoriesGrid";

async function unfriendUser(me: string, them: string) {
  console.log("ME:", me);
  console.log("THEM:", them);

  const { data: allRows } = await supabase
    .from("friend_requests")
    .select("*");

  console.log("ALL ROWS:", allRows);

  const { data: match } = await supabase
    .from("friend_requests")
    .select("*")
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me})`
    );

  console.log("MATCHING ROW:", match);

  const { error, count } = await supabase
    .from("friend_requests")
    .delete({ count: "exact" })
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me})`
    );

  console.log("DELETE RESULT:", { error, count });

  if (error) {
    console.error("Unfriend failed:", error);
    return;
  }

  if (!count) {
    console.log("❌ No rows deleted");
    return;
  }

  window.dispatchEvent(
    new CustomEvent("friend-removed", { detail: { userId: them } })
  );
  window.dispatchEvent(new Event("friends-updated"));

  console.log("✅ Unfriended successfully");
}

async function blockUser(me: string, them: string) {
  if (me === them) return;

  const { data: existing } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", me)
    .eq("blocked_id", them)
    .maybeSingle();

  if (existing) return;

  await supabase
    .from("friend_requests")
    .delete()
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me})`
    );

  await supabase
    .from("friend_requests")
    .delete()
    .eq("status", "pending")
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me})`
    );

  const { error } = await supabase.from("blocks").insert({
    blocker_id: me,
    blocked_id: them,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Block failed:", error);
    return;
  }

  window.dispatchEvent(
    new CustomEvent("friend-removed", { detail: { userId: them } })
  );
  window.dispatchEvent(new Event("friends-updated"));
}

async function unblockUser(me: string, them: string) {
  const { error, count } = await supabase
    .from("blocks")
    .delete({ count: "exact" })
    .eq("blocker_id", me)
    .eq("blocked_id", them);

  if (error) {
    console.error("Unblock failed:", error);
    return;
  }
  if (!count) {
    console.log("Nothing to unblock");
    return;
  }

  window.dispatchEvent(new Event("friends-updated"));
}

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const goBackSafe = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/hub");
  };

  const [me, setMe] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [venueText, setVenueText] = useState<string>("Not at a venue");

  const isActive = (ts: string) =>
    Date.now() - new Date(ts).getTime() < 5 * 60_000;

  useEffect(() => {
    if (!username) return;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url")
        .eq("username", username)
        .single();

      if (error || !data) {
        router.replace("/404");
        return;
      }

      setProfile(data);
      setLoading(false);
    })();
  }, [username, router]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setMe(user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!me || !profile) return;

    (async () => {
      const { data } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", me)
        .eq("blocked_id", profile.id)
        .maybeSingle();

      setIsBlocked(!!data);
    })();
  }, [me, profile]);

  // Friends-only venue visibility
  useEffect(() => {
    if (!me || !profile) return;

    (async () => {
      const them = profile.id;

      // Determine friendship from accepted friend_requests
      const { data: relRows } = await supabase
        .from("friend_requests")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${me},addressee_id.eq.${me}`);

      const friend =
        (relRows ?? []).some(
          (r: any) =>
            (r.requester_id === me && r.addressee_id === them) ||
            (r.requester_id === them && r.addressee_id === me)
        );

      setIsFriend(friend);

      if (!friend) {
        setVenueText("Not at a venue");
        return;
      }

      // Load their presence row (existing presence data)
      const { data: pres } = await supabase
        .from("user_presence")
        .select("venue_id, updated_at")
        .eq("user_id", them)
        .maybeSingle();

      if (!pres?.venue_id || !pres.updated_at || !isActive(pres.updated_at)) {
        setVenueText("Not at a venue");
        return;
      }

      const { data: v } = await supabase
        .from("venues")
        .select("name")
        .eq("id", pres.venue_id)
        .maybeSingle();

      if (v?.name) setVenueText(`At ${v.name}`);
      else setVenueText("Not at a venue");
    })();
  }, [me, profile]);

  if (loading) {
    return <div className="min-h-screen bg-black text-white p-6">Loading…</div>;
  }

  if (!profile) return null;

  const them = profile.id;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <button onClick={goBackSafe} className="mb-6 text-sm text-white/60">
        ←
      </button>
      <div className="flex items-center gap-4 mb-4">
        <Avatar
          src={profile.avatar_url}
          fallbackText={profile.display_name || profile.username}
          size="lg"
        />

  <div>
    <div className="text-2xl font-semibold">
      {profile.display_name || `@${profile.username}`}
    </div>
    <div className="text-white/60 text-sm">
      @{profile.username}
    </div>
    <div className="text-white/60 text-sm mt-1">
      {venueText}
    </div>
  </div>
</div>

      {profile.bio ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm">
          {profile.bio}
        </div>
      ) : (
        <div className="text-white/40 text-sm">No bio yet.</div>
      )}

      <div className="mt-6">
        <div className="text-sm text-white/60">Stories</div>
        <ProfileStoriesGrid userId={profile.id} emptyLabel="No stories from this user yet." />
      </div>

      {isBlocked ? (
        <button
          onClick={() => {
            if (!me || !them) return;
            unblockUser(me, them);
            setIsBlocked(false);
          }}
          className="mt-4 bg-gray-800 border border-white/20 text-white px-4 py-2 rounded"
        >
          Unblock
        </button>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              if (!me || !them) return;
              unfriendUser(me, them);
            }}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
          >
            Unfriend
          </button>

          <button
            onClick={() => {
              if (!me || !them) return;
              blockUser(me, them);
              setIsBlocked(true);
            }}
            className="bg-black border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded"
          >
            Block
          </button>
        </div>
      )}
    </div>
  );
}