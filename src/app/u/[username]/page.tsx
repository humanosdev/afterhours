"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { StoryRing } from "@/components/ui";
import ProfileStoriesGrid from "@/components/ProfileStoriesGrid";
import ProfilePageSkeleton from "@/components/skeletons/ProfilePageSkeleton";
import { createNotification } from "@/lib/notifications";
import { getPresenceFreshness } from "@/lib/presence";

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
  ghost_mode: boolean | null;
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
  const [presenceUpdatedAt, setPresenceUpdatedAt] = useState<string | null>(null);
  const [activeMomentsCount, setActiveMomentsCount] = useState(0);
  const [momentsCount, setMomentsCount] = useState(0);
  const [friendCount, setFriendCount] = useState(0);
  const [latestActiveMomentId, setLatestActiveMomentId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"none" | "incoming" | "outgoing">("none");
  const [requesting, setRequesting] = useState(false);
  const [latestMomentOwnerId, setLatestMomentOwnerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"shares" | "archive" | "places">("shares");
  const [places, setPlaces] = useState<Array<{ id: string; name: string; category?: string | null }>>([]);

  useEffect(() => {
    if (!username) return;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, is_private, ghost_mode")
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
        .select("id, image_url, created_at, expires_at, is_share")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(150);

      const now = Date.now();
      const activeMoments = (rows ?? []).filter((m: any) => {
        if (m?.is_share) return false;
        const createdMs = new Date(m.created_at).getTime();
        if (!Number.isFinite(createdMs)) return false;
        const fallbackExpiresMs = createdMs + 24 * 60 * 60 * 1000;
        const expiresMs = m.expires_at ? new Date(m.expires_at).getTime() : fallbackExpiresMs;
        return Number.isFinite(expiresMs) && expiresMs > now;
      });

      setActiveMomentsCount(activeMoments.length);
      setMomentsCount((rows ?? []).filter((m: any) => !!m?.is_share).length);
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
      const { data: fr } = await supabase
        .from("friend_requests")
        .select("id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);
      setFriendCount(fr?.length ?? 0);
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

      if (profile.ghost_mode) {
        setVenueText("Not at a venue");
        return;
      }

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
      setPresenceUpdatedAt(pres?.updated_at ?? null);

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
      const freshness = getPresenceFreshness(pres.updated_at);
      if (freshness === "live") setVenueText(`At ${v.name}`);
      else if (freshness === "recent") setVenueText(`Recently at ${v.name}`);
      else setVenueText("Not at a venue");
    })();
  }, [me, profile]);

  useEffect(() => {
    if (!profile?.id) return;
    const isOwn = me === profile.id;
    const locked = !!profile.is_private && !isOwn && !isFriend;
    if (locked) {
      setPlaces([]);
      return;
    }
    (async () => {
      const { data: storyRows } = await supabase
        .from("stories")
        .select("venue_id, created_at")
        .eq("user_id", profile.id)
        .limit(1000);

      const historyByVenue = new Map<string, number>();
      for (const row of storyRows ?? []) {
        const venueId = (row as any)?.venue_id as string | null | undefined;
        if (!venueId) continue;
        const ts = new Date((row as any)?.created_at).getTime();
        const prev = historyByVenue.get(venueId) ?? 0;
        if (Number.isFinite(ts) && ts > prev) historyByVenue.set(venueId, ts);
      }

      if (!historyByVenue.size) {
        setPlaces([]);
        return;
      }

      const ids = Array.from(historyByVenue.keys());
      const { data: venueRows } = await supabase
        .from("venues")
        .select("id, name, category")
        .in("id", ids);

      const sorted = (venueRows ?? [])
        .slice()
        .sort((a: any, b: any) => (historyByVenue.get(b.id) ?? 0) - (historyByVenue.get(a.id) ?? 0));
      setPlaces(sorted as any);
    })();
  }, [profile?.id, profile?.is_private, me, isFriend]);

  if (loading) {
    return <ProfilePageSkeleton />;
  }

  if (!profile) return null;

  const them = profile.id;
  const profileName = profile.display_name || `@${profile.username}`;
  const nameUnderAvatar = profile.display_name?.trim() || profile.username;
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

  const activeLabel = venueText.startsWith("At ")
    ? venueText
    : venueText.startsWith("Recently at ")
      ? `Last at ${venueText.replace("Recently at ", "")}`
      : venueText === "Not at a venue"
        ? "Not at a venue"
        : "Last active recently";
  const statusValue = getPresenceFreshness(presenceUpdatedAt) === "live" ? "Online" : "Away";
  const profileTabs = [
    { key: "shares" as const, label: "Shares" },
    ...(isOwnProfile ? [{ key: "archive" as const, label: "Archive" }] : []),
    { key: "places" as const, label: "Places" },
  ];
  const openMomentsTab = () => {
    if (latestActiveMomentId) {
      router.push(`/moments/${encodeURIComponent(latestActiveMomentId)}`);
      return;
    }
    setActiveTab(isOwnProfile ? "archive" : "shares");
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
    <div className="flex min-h-[100dvh] w-full max-w-none flex-col bg-black px-4 pb-[calc(env(safe-area-inset-bottom,0px)+96px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] text-white sm:px-5">
      <div className="mx-auto flex w-full flex-1 flex-col">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-start gap-x-1 border-b border-white/[0.08] pb-3 pt-0.5">
          <button
            type="button"
            onClick={goBackSafe}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[17px] text-white/85 justify-self-start"
            aria-label="Go back"
          >
            ←
          </button>
          <div className="flex min-w-0 items-center justify-center gap-2 px-1">
            <h1 className="shrink-0 text-[17px] font-bold tracking-tight">Profile</h1>
            <span className="truncate text-[14px] font-semibold text-white/45">@{profile.username}</span>
          </div>
          <div className="relative flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[15px] text-white/85"
              aria-label="Profile actions"
            >
              ☰
            </button>
            {menuOpen ? (
              <div
                className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-[12px] border border-white/[0.1] bg-zinc-900/95 backdrop-blur"
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
                    className="w-full px-4 py-2.5 text-left text-[14px] hover:bg-white/[0.06]"
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
                        className="w-full px-4 py-2.5 text-left text-[14px] hover:bg-white/[0.06]"
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
                      className="w-full px-4 py-2.5 text-left text-[14px] text-red-400 hover:bg-red-500/15"
                    >
                      Block
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="pt-5">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="flex w-[5.25rem] shrink-0 flex-col items-center sm:w-24">
              <button type="button" onClick={openMomentsTab} className="shrink-0" aria-label="Open active Moment or Moments tab">
                <StoryRing
                  src={profileAvatar}
                  alt={`${profile.username} avatar`}
                  fallbackText={profileName}
                  size="xl"
                  active={hasLiveMoment}
                />
              </button>
              <p className="mt-2.5 w-full max-w-[11rem] text-center text-[0.9375rem] font-semibold leading-snug tracking-tight text-white line-clamp-2">
                {nameUnderAvatar}
              </p>
            </div>
            <div className="flex min-h-[5.5rem] min-w-0 flex-1 flex-col justify-center gap-3 sm:min-h-[6rem]">
              <div
                className={`grid w-full gap-x-1 text-center sm:gap-x-2 ${
                  isOwnProfile ? "grid-cols-3" : "grid-cols-4"
                }`}
              >
                <button
                  type="button"
                  onClick={openFriendsViewer}
                  disabled={shouldHidePrivateProfile}
                  className="min-w-0 px-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <p className="text-lg font-semibold tabular-nums text-white sm:text-xl">
                    {shouldHidePrivateProfile ? "—" : friendCount}
                  </p>
                  <p className="mt-1 text-[11px] text-white/48">Friends</p>
                </button>
                <div className="min-w-0 px-0.5">
                  <p className="text-lg font-semibold tabular-nums text-white sm:text-xl">
                    {shouldHidePrivateProfile ? "—" : places.length}
                  </p>
                  <p className="mt-1 text-[11px] text-white/48">Places</p>
                </div>
                <div className="min-w-0 px-0.5">
                  <p className="text-lg font-semibold tabular-nums text-white sm:text-xl">
                    {shouldHidePrivateProfile ? "—" : momentsCount}
                  </p>
                  <p className="mt-1 text-[11px] text-white/48">Shares</p>
                </div>
                {!isOwnProfile ? (
                  <div className="min-w-0 px-0.5">
                    <p className="truncate text-lg font-semibold text-white sm:text-xl">
                      {shouldHidePrivateProfile ? "—" : statusValue}
                    </p>
                    <p className="mt-1 text-[11px] text-white/48">Status</p>
                  </div>
                ) : null}
              </div>
              {!shouldHidePrivateProfile ? (
                <p className="w-full max-w-full rounded-full bg-white/[0.06] px-2.5 py-1 text-center text-[11px] font-medium leading-snug text-white/65 ring-1 ring-white/[0.08] sm:text-[12px]">
                  {activeLabel}
                </p>
              ) : (
                <p className="w-full rounded-full bg-white/[0.06] px-2.5 py-1 text-center text-[11px] font-medium text-white/45 ring-1 ring-white/[0.08] sm:text-[12px]">
                  Private account
                </p>
              )}
            </div>
          </div>

          {!shouldHidePrivateProfile ? (
            profile.bio?.trim() ? (
              <p className="mt-4 text-[14px] leading-[1.45] text-white/72">{profile.bio.trim()}</p>
            ) : (
              <p className="mt-4 text-[14px] text-white/38">No bio yet.</p>
            )
          ) : null}

          {!shouldHidePrivateProfile ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {isFriend ? (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/chat`)}
                    className="h-11 rounded-[10px] bg-white text-[15px] font-semibold text-black transition active:opacity-90"
                  >
                    Message
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const shareUrl =
                        typeof window !== "undefined"
                          ? `${window.location.origin}/u/${encodeURIComponent(profile.username)}`
                          : "";
                      if (navigator.share) {
                        await navigator.share({ title: `${profileName} on Intencity`, url: shareUrl });
                        return;
                      }
                      if (shareUrl) await navigator.clipboard.writeText(shareUrl);
                    }}
                    className="h-11 rounded-[10px] border border-white/[0.12] bg-white/[0.05] text-[15px] font-semibold text-white/92 transition hover:bg-white/[0.08]"
                  >
                    Share profile
                  </button>
                </>
              ) : requestStatus === "incoming" ? (
                <button
                  type="button"
                  onClick={() => router.push("/profile/friends")}
                  className="col-span-2 h-11 rounded-[10px] bg-white text-[15px] font-semibold text-black transition active:opacity-90"
                >
                  Respond in Friends
                </button>
              ) : (
                <button
                  type="button"
                  onClick={sendFriendRequestFromProfile}
                  disabled={requesting || requestStatus === "outgoing"}
                  className="col-span-2 h-11 rounded-[10px] bg-white text-[15px] font-semibold text-black transition active:opacity-90 disabled:opacity-60"
                >
                  {requestStatus === "outgoing" ? "Request sent" : requesting ? "Sending..." : "Add friend"}
                </button>
              )}
            </div>
          ) : null}
        </div>

        {shouldHidePrivateProfile ? (
          <div className="mt-6 border-y border-white/[0.08] py-8 text-center">
            <p className="text-[15px] font-semibold text-white">This account is private</p>
            <p className="mt-1.5 px-4 text-[13px] leading-relaxed text-white/48">You need to be friends to view photos, moments, and more.</p>
            {requestStatus === "outgoing" ? (
              <p className="mt-4 text-[13px] text-white/42">Request sent</p>
            ) : requestStatus === "incoming" ? (
              <button
                type="button"
                onClick={() => router.push("/profile/friends")}
                className="mt-5 h-11 rounded-[10px] bg-white px-6 text-[15px] font-semibold text-black transition active:opacity-90"
              >
                Respond to request
              </button>
            ) : !isOwnProfile ? (
              <button
                type="button"
                onClick={sendFriendRequestFromProfile}
                disabled={requesting}
                className="mt-5 h-11 rounded-[10px] bg-white px-6 text-[15px] font-semibold text-black transition active:opacity-90 disabled:opacity-60"
              >
                {requesting ? "Sending..." : "Add friend"}
              </button>
            ) : null}
          </div>
        ) : null}

        {!shouldHidePrivateProfile ? (
          <>
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
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-accent-violet shadow-[0_0_12px_rgba(122,60,255,0.42)]" />
                    ) : null}
                  </button>
                ))}
              </nav>
            </div>

            <div className="pt-3">
              {activeTab === "shares" ? (
                <ProfileStoriesGrid
                  userId={profile.id}
                  viewerId={me}
                  mode="shares"
                  emptyLabel="No shares yet"
                  emptySubtitle="Shares appear here when they choose to show them."
                />
              ) : null}

              {activeTab === "archive" ? (
                <ProfileStoriesGrid
                  userId={profile.id}
                  viewerId={me}
                  mode="archive"
                  emptyLabel="No archived moments available"
                  emptySubtitle="Archive is only available to the account owner."
                />
              ) : null}

              {activeTab === "places" ? (
                <div>
                  {places.length ? (
                    <ul className="divide-y divide-white/[0.08]">
                      {places.map((place) => (
                        <li key={place.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
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
                    <p className="py-8 text-center text-[13px] text-white/42">Places they have visited will appear here.</p>
                  )}
                </div>
              ) : null}

            </div>
          </>
        ) : null}

        <div className="min-h-6 flex-1 shrink-0" aria-hidden />
      </div>
    </div>
  );
}