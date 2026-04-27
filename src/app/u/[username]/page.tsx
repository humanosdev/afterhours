"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { Avatar, StoryRing } from "@/components/ui";
import ProfileStoriesGrid from "@/components/ProfileStoriesGrid";
import { createNotification } from "@/lib/notifications";

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
  is_private: boolean | null;
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
  const [activeMomentsCount, setActiveMomentsCount] = useState(0);
  const [momentsCount, setMomentsCount] = useState(0);
  const [placesCount, setPlacesCount] = useState(0);
  const [friendCount, setFriendCount] = useState(0);
  const [latestActiveMomentId, setLatestActiveMomentId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"none" | "incoming" | "outgoing">("none");
  const [requesting, setRequesting] = useState(false);
  const [latestMomentOwnerId, setLatestMomentOwnerId] = useState<string | null>(null);

  const isActive = (ts: string) =>
    Date.now() - new Date(ts).getTime() < 5 * 60_000;

  useEffect(() => {
    if (!username) return;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, is_private")
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

  useEffect(() => {
    if (!profile?.id || !me) return;
    const isOwn = me === profile.id;
    const isPrivateAndLocked = !!profile.is_private && !isOwn && !isFriend;
    if (isPrivateAndLocked) {
      setActiveMomentsCount(0);
      setMomentsCount(0);
      setLatestActiveMomentId(null);
      return;
    }
    const loadActiveMoments = async () => {
      const { data: rows } = await supabase
        .from("stories")
        .select("id, image_url, created_at, expires_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(150);

      const now = Date.now();
      const activeMoments = (rows ?? []).filter((m: any) => {
        const createdMs = new Date(m.created_at).getTime();
        if (!Number.isFinite(createdMs)) return false;
        const fallbackExpiresMs = createdMs + 24 * 60 * 60 * 1000;
        const expiresMs = m.expires_at ? new Date(m.expires_at).getTime() : fallbackExpiresMs;
        return Number.isFinite(expiresMs) && expiresMs > now;
      });

      setActiveMomentsCount(activeMoments.length);
      setMomentsCount((rows ?? []).length);
      setLatestActiveMomentId((activeMoments[0] as any)?.id ?? null);
      setLatestMomentOwnerId(profile.id);
    };

    loadActiveMoments();
    const onStoryPosted = () => loadActiveMoments();
    window.addEventListener("story-posted", onStoryPosted);
    const interval = window.setInterval(loadActiveMoments, 15000);
    return () => {
      window.removeEventListener("story-posted", onStoryPosted);
      window.clearInterval(interval);
    };
  }, [profile?.id, profile?.is_private, me, isFriend]);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const [{ data: fr }, { data: storyRows }] = await Promise.all([
        supabase
          .from("friend_requests")
          .select("id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`),
        supabase.from("stories").select("venue_id").eq("user_id", profile.id).not("venue_id", "is", null).limit(400),
      ]);
      setFriendCount(fr?.length ?? 0);
      const venues = new Set<string>();
      (storyRows ?? []).forEach((r: any) => {
        if (r?.venue_id) venues.add(r.venue_id);
      });
      setPlacesCount(venues.size);
    })();
  }, [profile?.id]);

  useEffect(() => {
    const onDocClick = () => setMenuOpen(false);
    if (menuOpen) {
      document.addEventListener("click", onDocClick);
    }
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  // Friends-only venue visibility
  useEffect(() => {
    if (!me || !profile) return;

    (async () => {
      const them = profile.id;

      // Determine friendship + pending request from friend_requests
      const { data: relRows } = await supabase
        .from("friend_requests")
        .select("requester_id, addressee_id, status")
        .or(
          `and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me})`
        );

      const friend =
        (relRows ?? []).some(
          (r: any) =>
            r.status === "accepted" &&
            ((r.requester_id === me && r.addressee_id === them) ||
              (r.requester_id === them && r.addressee_id === me))
        );

      setIsFriend(friend);
      const pendingOutgoing = (relRows ?? []).some(
        (r: any) => r.status === "pending" && r.requester_id === me && r.addressee_id === them
      );
      const pendingIncoming = (relRows ?? []).some(
        (r: any) => r.status === "pending" && r.requester_id === them && r.addressee_id === me
      );
      if (pendingIncoming) setRequestStatus("incoming");
      else if (pendingOutgoing) setRequestStatus("outgoing");
      else setRequestStatus("none");

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
  const profileName = profile.display_name || `@${profile.username}`;
  const profileAvatar = profile.avatar_url?.trim() ? profile.avatar_url : null;
  const isOwnProfile = !!me && me === them;
  const isPrivate = !!profile.is_private;
  const canViewPrivateProfile = isOwnProfile || isFriend;
  const shouldHidePrivateProfile = isPrivate && !canViewPrivateProfile;
  const hasLiveMoment = activeMomentsCount > 0 && latestMomentOwnerId === profile.id;
  const openFriendsViewer = () => {
    if (!profile?.username) return;
    if (shouldHidePrivateProfile) return;
    router.push(`/profile/friends?view=${encodeURIComponent(profile.username)}`);
  };

  async function sendFriendRequestFromProfile() {
    if (!me || !them || requesting || isFriend || requestStatus !== "none") return;
    setRequesting(true);
    const { error } = await supabase.from("friend_requests").insert({
      requester_id: me,
      addressee_id: them,
      status: "pending",
    });
    setRequesting(false);
    if (error) {
      console.error("Could not send request:", error);
      alert("Could not send friend request");
      return;
    }
    await createNotification({
      recipientId: them,
      actorId: me,
      type: "friend_request_received",
    });
    setRequestStatus("outgoing");
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-[calc(env(safe-area-inset-bottom,0px)+112px)] pt-[calc(env(safe-area-inset-top,0px)+14px)] text-white">
      <div className="mx-auto w-full max-w-md space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={goBackSafe} className="text-sm text-white/60">
          ←
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-sm"
            aria-label="Profile actions"
          >
            ☰
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-zinc-900"
              onClick={(e) => e.stopPropagation()}
            >
              {isBlocked ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!me || !them) return;
                    const ok = window.confirm("Unblock this user?");
                    if (!ok) return;
                    await unblockUser(me, them);
                    setIsBlocked(false);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-white/10"
                >
                  Unblock
                </button>
              ) : (
                <>
                  {isFriend ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!me || !them) return;
                        const ok = window.confirm("Are you sure you want to unfriend this user?");
                        if (!ok) return;
                        await unfriendUser(me, them);
                        setIsFriend(false);
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-white/10"
                    >
                      Unfriend
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!me || !them) return;
                      const ok = window.confirm("Are you sure you want to block this user?");
                      if (!ok) return;
                      await blockUser(me, them);
                      setIsBlocked(true);
                      setIsFriend(false);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/20"
                  >
                    Block
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <section className="rounded-2xl border border-white/10 bg-[#0b0f18cc] p-4 backdrop-blur">
      <div className="mb-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            if (!latestActiveMomentId) return;
            router.push(`/moments/${encodeURIComponent(latestActiveMomentId)}`);
          }}
          className="shrink-0"
          aria-label="Open latest moment"
        >
          <StoryRing
            src={profileAvatar}
            alt={`${profile.username} avatar`}
            fallbackText={profileName}
            size="lg"
            active={hasLiveMoment}
          />
        </button>

        <div>
          <div className="text-2xl font-semibold">
            {profileName}
          </div>
          <div className="text-sm text-white/60">
            @{profile.username}
          </div>
          <div className="mt-1 text-sm text-white/60">
            {venueText}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <button
          type="button"
          onClick={openFriendsViewer}
          disabled={shouldHidePrivateProfile}
          className={`rounded-xl border border-white/12 px-3 py-2 text-left transition ${
            shouldHidePrivateProfile
              ? "cursor-not-allowed bg-white/[0.01] opacity-60"
              : "bg-white/[0.03] hover:bg-white/[0.06]"
          }`}
        >
          <p className="text-[11px] text-white/55">Friends</p>
          <p className="text-base font-semibold">{friendCount}</p>
        </button>
        <div className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2">
          <p className="text-[11px] text-white/55">Moments</p>
          <p className="text-base font-semibold">{momentsCount}</p>
        </div>
        <div className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2">
          <p className="text-[11px] text-white/55">Places</p>
          <p className="text-base font-semibold">{placesCount}</p>
        </div>
        <div className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2">
          <p className="text-[11px] text-white/55">Live status</p>
          <p className="truncate text-base font-semibold">{hasLiveMoment ? "Active now" : "Recently active"}</p>
        </div>
      </div>
      {!shouldHidePrivateProfile ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {isFriend ? (
            <button
              type="button"
              onClick={() => router.push(`/chat`)}
              className="rounded-xl border border-violet-300/30 bg-violet-500/20 px-3 py-2 text-sm font-semibold text-violet-100"
            >
              Message
            </button>
          ) : (
            <button
              type="button"
              onClick={sendFriendRequestFromProfile}
              disabled={requesting || requestStatus !== "none"}
              className="rounded-xl border border-violet-300/30 bg-violet-500/20 px-3 py-2 text-sm font-semibold text-violet-100 disabled:opacity-60"
            >
              {requestStatus === "outgoing"
                ? "Request sent"
                : requestStatus === "incoming"
                  ? "Respond in Friends"
                  : requesting
                    ? "Sending..."
                    : "Add friend"}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(`/u/${profile.username}`)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold"
          >
            View profile
          </button>
        </div>
      ) : null}
      </section>

      {shouldHidePrivateProfile ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-base font-semibold">This account is private</div>
          <div className="mt-1 text-sm text-white/65">
            You need to be friends to view this profile.
          </div>
          {requestStatus === "outgoing" ? (
            <div className="mt-3 inline-flex rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80">
              Request sent
            </div>
          ) : requestStatus === "incoming" ? (
            <button
              type="button"
              onClick={() => router.push("/profile/friends")}
              className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black"
            >
              Respond to request
            </button>
          ) : (
            !isOwnProfile && (
              <button
                type="button"
                onClick={sendFriendRequestFromProfile}
                disabled={requesting}
                className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-60"
              >
                {requesting ? "Sending..." : "Add friend"}
              </button>
            )
          )}
        </div>
      ) : profile.bio ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm">
          {profile.bio}
        </div>
      ) : (
        <div className="text-white/40 text-sm">No bio yet.</div>
      )}

      {!shouldHidePrivateProfile ? (
        <div className="mt-6">
          <div className="text-sm text-white/60">Moments</div>
          <ProfileStoriesGrid userId={profile.id} emptyLabel="No Moments from this user yet." />
        </div>
      ) : null}
      </div>
    </div>
  );
}