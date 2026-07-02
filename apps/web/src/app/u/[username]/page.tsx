"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Avatar, StoryRing } from "@/components/ui";
import ProfileStoriesGrid from "@/components/ProfileStoriesGrid";
import ProfilePageSkeleton from "@/components/skeletons/ProfilePageSkeleton";
import StoryViewerModal, { type StoryViewerGroup, type StoryViewerStory } from "@/components/StoryViewerModal";
import { getFriendProfileStatusLabel, getFriendProfileVenueHeadline } from "@/lib/presence";
import { subscribeUserPresenceChanges } from "@/lib/userPresenceRealtime";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";
import { getPairBlockStatus, type PairBlockStatus } from "@/lib/pairBlockStatus";
import { BLOCK_OR_PRIVATE_COPY } from "@/lib/blockAndPrivateCopy";
import { formatVenueCategoryLabel } from "@/lib/venueCategoryLabel";
import { fetchViewedStoryIds, STORY_VIEWED_EVENT } from "@/lib/storyViews";
import { isStoryRowShareFlag } from "@/lib/storyRowShare";
import { isMomentStillActive } from "@/lib/momentWindow";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TAIL_PADDING_CLASS,
  APP_PAGE_TOP_PADDING_CLASS,
  APP_TAB_PAGE_ROOT_CLASS,
  emitPrimarySurfaceReady,
} from "@/lib/appShellLayout";
import { Plus } from "lucide-react";
import { confirmAndBlockUser } from "@/lib/blockUserAction";
import { sendPendingFriendRequest } from "@/lib/sendPendingFriendRequest";
import { fetchProfileVenuesForUser } from "@/lib/profileVenues";

async function unfriendUser(me: string, them: string) {
  const { error, count } = await supabase
    .from("friend_requests")
    .delete({ count: "exact" })
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me})`
    );

  if (error) {
    console.error("Unfriend failed:", error);
    return;
  }

  if (!count) {
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
  /** Set when signed-in viewer has a block relationship with this profile (see get_profile_for_viewer). */
  block_relation?: "they_blocked_you" | "you_blocked_them" | null;
  /** True when the account is paused or pending deletion — others see a generic empty shell. */
  profile_inactive?: boolean;
  account_lifecycle_state?: string | null;
  account_purge_at?: string | null;
};

type ProfileLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

async function acceptedFriendIdsForUser(userId: string): Promise<string[]> {
  const { data: reqs } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  const out = new Set<string>();
  for (const r of (reqs ?? []) as { requester_id: string; addressee_id: string }[]) {
    const other = r.requester_id === userId ? r.addressee_id : r.requester_id;
    if (other && other !== userId) out.add(other);
  }
  return Array.from(out);
}

function profileFromRpc(data: unknown): Profile | null {
  if (data === null || data === undefined || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  return {
    ...(data as Profile),
    profile_inactive: raw.profile_inactive === true,
    block_relation:
      raw.block_relation === "they_blocked_you" || raw.block_relation === "you_blocked_them"
        ? raw.block_relation
        : raw.blockRelation === "they_blocked_you" || raw.blockRelation === "you_blocked_them"
          ? raw.blockRelation
          : null,
  } as Profile;
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const goBackSafe = () => navigateBack(router, "/hub");

  const [me, setMe] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pairBlock, setPairBlock] = useState<PairBlockStatus>("none");
  const [isFriend, setIsFriend] = useState(false);
  const [presenceUpdatedAt, setPresenceUpdatedAt] = useState<string | null>(null);
  const [theirVenueName, setTheirVenueName] = useState<string | null>(null);
  const [presenceClock, setPresenceClock] = useState(0);
  const [activeMomentsCount, setActiveMomentsCount] = useState(0);
  const [momentsCount, setMomentsCount] = useState(0);
  const [friendCount, setFriendCount] = useState(0);
  const [latestActiveMomentId, setLatestActiveMomentId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unfriendConfirmOpen, setUnfriendConfirmOpen] = useState(false);
  const [unfriendWorking, setUnfriendWorking] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"none" | "incoming" | "outgoing">("none");
  const [requesting, setRequesting] = useState(false);
  const [latestMomentOwnerId, setLatestMomentOwnerId] = useState<string | null>(null);
  const [theirMomentViewerStories, setTheirMomentViewerStories] = useState<StoryViewerStory[]>([]);
  const [activeStoryViewerGroup, setActiveStoryViewerGroup] = useState<StoryViewerGroup | null>(null);
  const [viewedMomentIds, setViewedMomentIds] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"shares" | "archive" | "venues">("shares");
  const [venues, setVenues] = useState<Array<{ id: string; name: string; category?: string | null }>>([]);
  const [mutualPreview, setMutualPreview] = useState<ProfileLite[]>([]);
  const [mutualTotal, setMutualTotal] = useState(0);
  const [mutualLoadDone, setMutualLoadDone] = useState(false);
  /** Bumps on friend/block graph changes so we re-query `friend_requests` without a full navigation. */
  const [relationshipEpoch, setRelationshipEpoch] = useState(0);

  useEffect(() => {
    if (!loading) emitPrimarySurfaceReady();
  }, [loading]);

  useEffect(() => {
    const bump = () => setRelationshipEpoch((n) => n + 1);
    window.addEventListener("friends-updated", bump);
    window.addEventListener("friend-removed", bump);
    return () => {
      window.removeEventListener("friends-updated", bump);
      window.removeEventListener("friend-removed", bump);
    };
  }, []);

  useEffect(() => {
    if (!username) return;

    const un = decodeURIComponent(
      Array.isArray(username) ? (username[0] ?? "") : username
    ).trim();

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.rpc("get_profile_for_viewer", {
        p_username: un,
      });

      if (error || data === null || data === undefined) {
        if (!cancelled) router.replace("/404");
        return;
      }

      const row = profileFromRpc(data);
      if (!row) {
        if (!cancelled) router.replace("/404");
        return;
      }
      if (cancelled) return;
      setProfile(row);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id && row.id !== user.id) {
        const st = await getPairBlockStatus(supabase, user.id, row.id);
        if (!cancelled) setPairBlock(st);
      } else if (!cancelled) {
        setPairBlock("none");
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [username, router]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setMe(user?.id ?? null);
    })();
  }, []);

  /** Avoid stale friendship UI when navigating between profiles before the relationship effect resolves. */
  useEffect(() => {
    if (!profile?.id) return;
    setIsFriend(false);
    setRequestStatus("none");
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || !me) return;
    if (profile.profile_inactive) {
      setActiveMomentsCount(0);
      setMomentsCount(0);
      setLatestActiveMomentId(null);
      setTheirMomentViewerStories([]);
      return;
    }
    const isOwn = me === profile.id;
    const mergedBlock = pairBlock;
    const isBlockRestricted = !isOwn && mergedBlock !== "none";
    if (isBlockRestricted) {
      setActiveMomentsCount(0);
      setMomentsCount(0);
      setLatestActiveMomentId(null);
      setTheirMomentViewerStories([]);
      return;
    }
    const isPrivateAndLocked = !!profile.is_private && !isOwn && !isFriend;
    if (isPrivateAndLocked) {
      setActiveMomentsCount(0);
      setMomentsCount(0);
      setLatestActiveMomentId(null);
      setTheirMomentViewerStories([]);
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
        if (isStoryRowShareFlag(m?.is_share)) return false;
        const media = String(m?.image_url ?? m?.media_url ?? "").trim();
        if (!media) return false;
        return isMomentStillActive(m.created_at, m.expires_at ?? null, now);
      });

      setActiveMomentsCount(activeMoments.length);
      setMomentsCount((rows ?? []).filter((m: any) => isStoryRowShareFlag(m?.is_share)).length);
      setLatestActiveMomentId((activeMoments[0] as any)?.id ?? null);
      setLatestMomentOwnerId(profile.id);
      const viewerStories: StoryViewerStory[] = activeMoments
        .map((m: any) => {
          const media = String(m?.image_url ?? m?.media_url ?? "").trim();
          if (!media) return null;
          return {
            id: m.id as string,
            user_id: profile.id,
            media_url: media,
            created_at: m.created_at as string,
            expires_at: (m.expires_at ?? null) as string | null,
          };
        })
        .filter((s): s is StoryViewerStory => s !== null);
      setTheirMomentViewerStories(viewerStories);
    };

    loadActiveMoments();
    const onStoryPosted = () => loadActiveMoments();
    window.addEventListener("story-posted", onStoryPosted);
    const interval = window.setInterval(loadActiveMoments, 15000);
    return () => {
      window.removeEventListener("story-posted", onStoryPosted);
      window.clearInterval(interval);
    };
  }, [profile?.id, profile?.is_private, profile?.profile_inactive, me, isFriend, pairBlock]);

  const theirMomentIdsKey = useMemo(
    () => theirMomentViewerStories.map((s) => s.id).sort().join(","),
    [theirMomentViewerStories]
  );

  useEffect(() => {
    if (!me || !theirMomentIdsKey) {
      setViewedMomentIds({});
      return;
    }
    const ids = theirMomentIdsKey.split(",").filter(Boolean);
    let cancelled = false;
    (async () => {
      const viewed = await fetchViewedStoryIds(supabase, me, ids);
      if (cancelled) return;
      const next: Record<string, boolean> = {};
      for (const id of ids) {
        if (viewed.has(id)) next[id] = true;
      }
      setViewedMomentIds(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [me, theirMomentIdsKey]);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ storyId?: string }>).detail?.storyId;
      if (!id || typeof id !== "string") return;
      setViewedMomentIds((p) => (p[id] ? p : { ...p, [id]: true }));
    };
    window.addEventListener(STORY_VIEWED_EVENT, handler);
    return () => window.removeEventListener(STORY_VIEWED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    if (profile.profile_inactive) {
      setFriendCount(0);
      return;
    }
    (async () => {
      const { data: fr } = await supabase
        .from("friend_requests")
        .select("id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);
      setFriendCount(fr?.length ?? 0);
    })();
  }, [profile?.id, profile?.profile_inactive]);

  useEffect(() => {
    const onDocClick = () => setMenuOpen(false);
    if (menuOpen) {
      document.addEventListener("click", onDocClick);
    }
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    const id = window.setInterval(() => setPresenceClock((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  // Friends-only venue visibility
  useEffect(() => {
    if (!me || !profile) return;

    let cancelled = false;

    (async () => {
      const them = profile.id;
      if (profile.profile_inactive) {
        setIsFriend(false);
        setRequestStatus("none");
        setTheirVenueName(null);
        setPresenceUpdatedAt(null);
        setPairBlock("none");
        return;
      }
      const pairStatus = await getPairBlockStatus(supabase, me, them);
      if (cancelled) return;

      const merged = pairStatus;

      if (merged !== "none") {
        setPairBlock(merged);
        setTheirVenueName(null);
        setPresenceUpdatedAt(null);
        setIsFriend(false);
        setRequestStatus("none");
        return;
      }

      setPairBlock("none");

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
        setTheirVenueName(null);
        setPresenceUpdatedAt(null);
        return;
      }

      if (!friend) {
        setTheirVenueName(null);
        setPresenceUpdatedAt(null);
        return;
      }

      const { data: pres } = await supabase
        .from("user_presence")
        .select("venue_id, updated_at")
        .eq("user_id", them)
        .maybeSingle();
      setPresenceUpdatedAt(pres?.updated_at ?? null);

      if (!pres?.venue_id || !pres.updated_at) {
        setTheirVenueName(null);
        return;
      }

      const { data: v } = await supabase
        .from("venues")
        .select("name")
        .eq("id", pres.venue_id)
        .maybeSingle();

      if (!v?.name) {
        setTheirVenueName(null);
        return;
      }
      setTheirVenueName(v.name.trim());
    })();

    return () => {
      cancelled = true;
    };
  }, [me, profile?.id, profile?.ghost_mode, profile?.profile_inactive, relationshipEpoch]);

  useEffect(() => {
    if (!me || !profile) return;
    if (profile.ghost_mode) return;
    if (!isFriend) return;
    const them = profile.id;
    return subscribeUserPresenceChanges(supabase, {
      channelName: `u-presence:${me}:${them}`,
      onInsertOrUpdate: async (row) => {
        if (row.user_id !== them) return;
        setPresenceUpdatedAt(typeof row.updated_at === "string" ? row.updated_at : null);
        const vid = row.venue_id as string | null | undefined;
        if (!vid) {
          setTheirVenueName(null);
          return;
        }
        const { data: v } = await supabase.from("venues").select("name").eq("id", vid).maybeSingle();
        setTheirVenueName(v?.name?.trim() ?? null);
      },
      onDelete: (uid) => {
        if (uid !== them) return;
        setPresenceUpdatedAt(null);
        setTheirVenueName(null);
      },
    });
  }, [me, profile?.id, profile?.ghost_mode, isFriend]);

  useEffect(() => {
    if (!me || !profile?.id || me === profile.id) {
      setMutualPreview([]);
      setMutualTotal(0);
      setMutualLoadDone(false);
      return;
    }

    if (profile.profile_inactive) {
      setMutualPreview([]);
      setMutualTotal(0);
      setMutualLoadDone(true);
      return;
    }

    const mergedBlock = pairBlock;
    if (mergedBlock !== "none") {
      setMutualPreview([]);
      setMutualTotal(0);
      setMutualLoadDone(true);
      return;
    }

    let cancelled = false;
    setMutualLoadDone(false);
    (async () => {
      const them = profile.id;
      const [myIds, theirIds] = await Promise.all([
        acceptedFriendIdsForUser(me),
        acceptedFriendIdsForUser(them),
      ]);
      if (cancelled) return;
      const theirSet = new Set(theirIds);
      const mutualIds = myIds.filter((id) => theirSet.has(id) && id !== me && id !== them);
      mutualIds.sort();
      const total = mutualIds.length;
      if (!total) {
        setMutualPreview([]);
        setMutualTotal(0);
        setMutualLoadDone(true);
        return;
      }
      const previewIds = mutualIds.slice(0, 2);
      const { data: rows } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", previewIds);
      if (cancelled) return;
      const byId = new Map((rows ?? []).map((r: any) => [r.id, r as ProfileLite]));
      const ordered = previewIds.map((id) => byId.get(id)).filter(Boolean) as ProfileLite[];
      setMutualPreview(ordered);
      setMutualTotal(total);
      setMutualLoadDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [me, profile?.id, profile?.profile_inactive, pairBlock]);

  useEffect(() => {
    if (!profile?.id) return;
    if (profile.profile_inactive) {
      setVenues([]);
      return;
    }
    const mergedBlock = pairBlock;
    if (mergedBlock !== "none") {
      setVenues([]);
      return;
    }
    const isOwn = me === profile.id;
    const locked = !!profile.is_private && !isOwn && !isFriend;
    if (locked) {
      setVenues([]);
      return;
    }
    void (async () => {
      const { venues: profileVenues } = await fetchProfileVenuesForUser(supabase, profile.id);
      setVenues(
        profileVenues.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
        }))
      );
    })();
  }, [profile?.id, profile?.is_private, profile?.profile_inactive, me, isFriend, pairBlock]);

  const friendVenueLine = useMemo(() => {
    if (!profile) return "Not at a venue";
    if (profile.ghost_mode) return "Not at a venue";
    if (!isFriend) return "Not at a venue";
    return getFriendProfileVenueHeadline(
      { updatedAt: presenceUpdatedAt, venueName: theirVenueName },
      Date.now()
    );
  }, [profile, isFriend, presenceUpdatedAt, theirVenueName, presenceClock]);

  const activeLabel = useMemo(() => {
    if (profile?.profile_inactive && (!me || me !== profile.id)) return "";
    const line = friendVenueLine;
    if (line.startsWith("At ")) return line;
    if (line.startsWith("Away · At ")) return line;
    if (line.startsWith("Recently at ")) return `Last at ${line.replace("Recently at ", "")}`;
    if (line === "Not at a venue") return "Not at a venue";
    return "Last active recently";
  }, [friendVenueLine, profile?.profile_inactive, profile?.id, me]);

  const statusValue = useMemo(() => {
    if (!profile) return "—";
    if (profile.profile_inactive && (!me || me !== profile.id)) return "—";
    return getFriendProfileStatusLabel(
      { ghostMode: !!profile.ghost_mode, isFriend, updatedAt: presenceUpdatedAt },
      Date.now()
    );
  }, [profile, me, isFriend, presenceUpdatedAt, presenceClock]);

  if (loading) {
    return <ProfilePageSkeleton />;
  }

  if (!profile) return null;

  const them = profile.id;
  const isOwnProfile = !!me && me === them;
  const mergedPairBlock = pairBlock;
  const isInactiveShell = !!profile.profile_inactive && !isOwnProfile;
  const profileName = isInactiveShell
    ? "User"
    : profile.display_name || `@${profile.username}`;
  const nameUnderAvatar = isInactiveShell ? "User" : profile.display_name?.trim() || profile.username;
  const profileAvatar = profile.avatar_url?.trim() ? profile.avatar_url : null;
  const isPrivate = !!profile.is_private;
  const effectiveBlockRel: Profile["block_relation"] =
    !isOwnProfile && mergedPairBlock !== "none" ? (mergedPairBlock as Profile["block_relation"]) : null;
  const isBlockRestricted = !isOwnProfile && mergedPairBlock !== "none";
  const canViewPrivateProfile = isOwnProfile || isFriend;
  const shouldHidePrivateProfile =
    !isInactiveShell && (isBlockRestricted || (isPrivate && !canViewPrivateProfile));
  /** Mutual strip when we can see their profile (not locked private stranger or block state). */
  const showMutualFriendsRow =
    !isOwnProfile &&
    !!me &&
    mutualLoadDone &&
    !shouldHidePrivateProfile &&
    !isBlockRestricted &&
    !isInactiveShell;
  const hasLiveMoment = activeMomentsCount > 0 && latestMomentOwnerId === profile.id;
  const profileStoryRingActive = isOwnProfile
    ? hasLiveMoment && theirMomentViewerStories.length > 0
    : hasLiveMoment &&
      theirMomentViewerStories.length > 0 &&
      theirMomentViewerStories.some((s) => !viewedMomentIds[s.id]);
  const openFriendsViewer = () => {
    if (!profile?.username) return;
    if (shouldHidePrivateProfile || isInactiveShell) return;
    router.push(`/profile/friends?view=${encodeURIComponent(profile.username)}`);
  };

  const profileTabs = [
    { key: "shares" as const, label: "Shares" },
    ...(isOwnProfile ? [{ key: "archive" as const, label: "Archive" }] : []),
    { key: "venues" as const, label: "Venues" },
  ];
  const openMomentsTab = () => {
    if (!profile || shouldHidePrivateProfile || isInactiveShell) return;
    if (theirMomentViewerStories.length > 0) {
      setActiveStoryViewerGroup({
        user_id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        stories: theirMomentViewerStories,
      });
      return;
    }
    setActiveTab(isOwnProfile ? "archive" : "shares");
  };

  async function sendFriendRequestFromProfile() {
    if (!me || !them || requesting || isFriend) return;
    if (requestStatus === "incoming") {
      alert("This person already sent you a friend request. Open Friends or Notifications to respond.");
      return;
    }
    const tableStatus = await getPairBlockStatus(supabase, me, them);
    if (tableStatus !== "none") {
      alert(
        tableStatus === "you_blocked_them"
          ? "Unblock this user before sending a friend request."
          : "You can’t send a request while this person has you blocked."
      );
      return;
    }
    setRequesting(true);
    const result = await sendPendingFriendRequest(supabase, them);
    setRequesting(false);
    if (!result.ok) {
      if (result.code === "23505") {
        setRequestStatus("outgoing");
        return;
      }
      if (result.code === "23514" || result.message.includes("friend_request_blocked")) {
        alert("Unblock this user before sending a friend request.");
        return;
      }
      if (result.message.includes("incoming_friend_request_exists")) {
        alert("They already sent you a request — respond from Friends or Notifications.");
        setRequestStatus("incoming");
        window.dispatchEvent(new Event("friends-updated"));
        return;
      }
      if (result.message.includes("already_friends")) {
        setIsFriend(true);
        setRequestStatus("none");
        window.dispatchEvent(new Event("friends-updated"));
        return;
      }
      alert(
        result.message ? `Could not send friend request: ${result.message}` : "Could not send friend request"
      );
      return;
    }
    setRequestStatus("outgoing");
    window.dispatchEvent(new Event("friends-updated"));
  }

  return (
    <div
      className={`${APP_TAB_PAGE_ROOT_CLASS} text-white ${APP_CONTENT_MAX_CLASS} px-4 ${APP_PAGE_TAIL_PADDING_CLASS} ${APP_PAGE_TOP_PADDING_CLASS} sm:px-5`}
    >
      <div className="mx-auto flex w-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-start gap-x-1 border-b border-white/[0.08] pb-3 pt-0.5">
          <SubpageBackButton onBack={goBackSafe} ariaLabel="Go back" />
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1">
            <h1 className="shrink-0 text-[17px] font-bold tracking-tight">Profile</h1>
            {!isInactiveShell ? (
              <span className="max-w-full break-words text-center text-[14px] font-semibold text-white/45">
                @{profile.username}
              </span>
            ) : null}
          </div>
          <div className="relative flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="ah-glass-control ah-glass-control-interactive grid h-10 w-10 place-items-center rounded-full text-[15px] text-white/85"
              aria-label="Profile actions"
            >
              <span className="relative z-[1]">☰</span>
            </button>
            {menuOpen ? (
              <div
                className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-[12px] border border-white/[0.1] bg-zinc-900/95 backdrop-blur"
                onClick={(e) => e.stopPropagation()}
              >
                {mergedPairBlock === "you_blocked_them" ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!me || !them) return;
                      const ok = window.confirm("Unblock this user?");
                      if (!ok) return;
                      await unblockUser(me, them);
                      setPairBlock("none");
                      const un = decodeURIComponent(
                        Array.isArray(username) ? (username[0] ?? "") : (username ?? "")
                      ).trim();
                      if (un) {
                        const { data } = await supabase.rpc("get_profile_for_viewer", {
                          p_username: un,
                        });
                        if (data && typeof data === "object") {
                          const next = profileFromRpc(data);
                          if (next) setProfile(next);
                        }
                      }
                      setMenuOpen(false);
                      window.dispatchEvent(new Event("friends-updated"));
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
                        onClick={() => {
                          setMenuOpen(false);
                          setUnfriendConfirmOpen(true);
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
                        const ok = await confirmAndBlockUser(supabase, me, them);
                        if (!ok) return;
                        setPairBlock("you_blocked_them");
                        setIsFriend(false);
                        setMenuOpen(false);
                        const un = decodeURIComponent(
                          Array.isArray(username) ? (username[0] ?? "") : (username ?? "")
                        ).trim();
                        if (un) {
                          const { data } = await supabase.rpc("get_profile_for_viewer", {
                            p_username: un,
                          });
                          if (data && typeof data === "object") {
                            const next = profileFromRpc(data);
                            if (next) setProfile(next);
                          }
                        }
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
          <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-start gap-x-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-x-5">
            <button
              type="button"
              onClick={openMomentsTab}
              disabled={shouldHidePrivateProfile || isInactiveShell}
              className="col-start-1 row-start-1 justify-self-start disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Open active Moment or Moments tab"
            >
              <StoryRing
                src={profileAvatar}
                alt={`${profile.username} avatar`}
                fallbackText={profileName}
                size="xl"
                active={profileStoryRingActive}
              />
            </button>
            <div className="col-start-2 row-start-1 row-span-2 flex min-h-[5.5rem] min-w-0 flex-col justify-center gap-3 sm:min-h-[6rem]">
              <div
                className={`grid w-full gap-x-1 text-center sm:gap-x-2 ${
                  isOwnProfile ? "grid-cols-3" : "grid-cols-4"
                }`}
              >
                <button
                  type="button"
                  onClick={openFriendsViewer}
                  disabled={shouldHidePrivateProfile || isInactiveShell}
                  className="min-w-0 px-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <p className="text-lg font-semibold tabular-nums text-white sm:text-xl">
                    {shouldHidePrivateProfile ? "—" : isInactiveShell ? 0 : friendCount}
                  </p>
                  <p className="mt-1 text-[11px] text-white/48">Friends</p>
                </button>
                <div className="min-w-0 px-0.5">
                  <p className="text-lg font-semibold tabular-nums text-white sm:text-xl">
                    {shouldHidePrivateProfile ? "—" : isInactiveShell ? 0 : venues.length}
                  </p>
                  <p className="mt-1 text-[11px] text-white/48">Venues</p>
                </div>
                <div className="min-w-0 px-0.5">
                  <p className="text-lg font-semibold tabular-nums text-white sm:text-xl">
                    {shouldHidePrivateProfile ? "—" : isInactiveShell ? 0 : momentsCount}
                  </p>
                  <p className="mt-1 text-[11px] text-white/48">Shares</p>
                </div>
                {!isOwnProfile ? (
                  <div className="min-w-0 px-0.5">
                    <p className="truncate text-lg font-semibold text-white sm:text-xl">
                      {shouldHidePrivateProfile ? "—" : isInactiveShell ? "—" : statusValue}
                    </p>
                    <p className="mt-1 text-[11px] text-white/48">Status</p>
                  </div>
                ) : null}
              </div>
              {!shouldHidePrivateProfile ? (
                activeLabel.trim() ? (
                  <div className="ah-glass-control flex w-full max-w-full items-center justify-center rounded-full px-2.5 py-1 text-center text-[11px] font-medium leading-snug text-white/72 sm:text-[12px]">
                    <span>{activeLabel}</span>
                  </div>
                ) : null
              ) : effectiveBlockRel === "they_blocked_you" ? (
                <p className="w-full rounded-full bg-white/[0.06] px-2.5 py-1 text-center text-[11px] font-medium text-amber-200/85 ring-1 ring-white/[0.08] sm:text-[12px]">
                  {BLOCK_OR_PRIVATE_COPY.theyBlockedYouStrip}
                </p>
              ) : effectiveBlockRel === "you_blocked_them" ? (
                <p className="w-full rounded-full bg-white/[0.06] px-2.5 py-1 text-center text-[11px] font-medium text-white/55 ring-1 ring-white/[0.08] sm:text-[12px]">
                  {BLOCK_OR_PRIVATE_COPY.youBlockedThemStrip}
                </p>
              ) : isPrivate && !canViewPrivateProfile ? (
                <p className="w-full rounded-full bg-white/[0.06] px-2.5 py-1 text-center text-[11px] font-medium text-white/45 ring-1 ring-white/[0.08] sm:text-[12px]">
                  {BLOCK_OR_PRIVATE_COPY.privateStrip}
                </p>
              ) : (
                <p className="w-full rounded-full bg-white/[0.06] px-2.5 py-1 text-center text-[11px] font-medium text-white/45 ring-1 ring-white/[0.08] sm:text-[12px]">
                  Profile restricted
                </p>
              )}
            </div>
            <p className="col-start-1 row-start-2 mt-2.5 min-w-0 w-full text-left text-[0.9375rem] font-semibold leading-snug tracking-tight text-white break-words">
              {nameUnderAvatar}
            </p>
            {!shouldHidePrivateProfile && !isInactiveShell ? (
              profile.bio?.trim() ? (
                <p className="col-span-2 row-start-3 mt-4 min-w-0 text-[14px] leading-[1.45] text-white/72">
                  {profile.bio.trim()}
                </p>
              ) : (
                <p className="col-span-2 row-start-3 mt-4 min-w-0 text-[14px] text-white/38">No bio yet.</p>
              )
            ) : null}
          </div>

          {showMutualFriendsRow ? (
            mutualTotal > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <div className="flex shrink-0 items-center -space-x-2.5">
                  {mutualPreview.map((m) => {
                    const inner = (
                      <Avatar
                        src={m.avatar_url?.trim() || null}
                        fallbackText={m.display_name || m.username || "?"}
                        size="sm"
                        className="border border-white/[0.12]"
                      />
                    );
                    return m.username ? (
                      <Link
                        key={m.id}
                        href={`/u/${encodeURIComponent(m.username)}`}
                        className="relative z-0 ring-2 ring-black transition hover:z-10 hover:opacity-95"
                        aria-label={`${m.display_name || m.username || "Mutual"} profile`}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <span key={m.id} className="relative z-0 ring-2 ring-black">
                        {inner}
                      </span>
                    );
                  })}
                  {mutualTotal > 2 ? (
                    <span
                      className="ah-glass-control relative z-[1] grid h-9 min-w-[2.25rem] place-items-center rounded-full px-2 text-[12px] font-semibold tabular-nums text-white/90 ring-2 ring-black"
                      aria-label={`${mutualTotal - 2} more mutual friends`}
                    >
                      +{mutualTotal - 2}
                    </span>
                  ) : null}
                </div>
                <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/58">
                  <span className="font-medium text-white/72">
                    Friends with{" "}
                    {mutualPreview.map((m) => m.display_name?.trim() || m.username || "someone").join(", ")}
                  </span>
                </p>
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-white/42">No mutual friends</p>
            )
          ) : null}

          {!shouldHidePrivateProfile && !isInactiveShell ? (
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
                    className="ah-glass-control ah-glass-control-interactive h-11 rounded-[10px] text-[15px] font-semibold text-white/92 transition"
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
            {effectiveBlockRel === "they_blocked_you" ? (
              <>
                <p className="text-[15px] font-semibold text-white">{BLOCK_OR_PRIVATE_COPY.theyBlockedYouTitle}</p>
                <p className="mt-1.5 px-4 text-[13px] leading-relaxed text-white/48">
                  {BLOCK_OR_PRIVATE_COPY.theyBlockedYouBody}
                </p>
              </>
            ) : effectiveBlockRel === "you_blocked_them" ? (
              <>
                <p className="text-[15px] font-semibold text-white">{BLOCK_OR_PRIVATE_COPY.youBlockedThemTitle}</p>
                <p className="mt-1.5 px-4 text-[13px] leading-relaxed text-white/48">
                  {BLOCK_OR_PRIVATE_COPY.youBlockedThemBody}
                </p>
                {!isOwnProfile && me ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = window.confirm("Unblock this user?");
                      if (!ok || !me) return;
                      await unblockUser(me, them);
                      setPairBlock("none");
                      const { data } = await supabase.rpc("get_profile_for_viewer", {
                        p_username: profile.username,
                      });
                      if (data && typeof data === "object") {
                        const next = profileFromRpc(data);
                        if (next) setProfile(next);
                      }
                    }}
                    className="mt-5 h-11 rounded-[10px] bg-white px-6 text-[15px] font-semibold text-black transition active:opacity-90"
                  >
                    Unblock
                  </button>
                ) : null}
              </>
            ) : isPrivate && !canViewPrivateProfile ? (
              <>
                <p className="text-[15px] font-semibold text-white">{BLOCK_OR_PRIVATE_COPY.privateTitle}</p>
                <p className="mt-1.5 px-4 text-[13px] leading-relaxed text-white/48">
                  {BLOCK_OR_PRIVATE_COPY.privateBody}
                </p>
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
              </>
            ) : (
              <p className="px-4 text-[13px] leading-relaxed text-white/48">This profile isn&apos;t available to you.</p>
            )}
          </div>
        ) : null}

        {!shouldHidePrivateProfile ? (
          isInactiveShell ? (
            <p className="mt-6 py-10 text-center text-[13px] text-white/38">Nothing here yet.</p>
          ) : (
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
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-accent-violet shadow-[0_0_12px_rgba(59,102,255,0.42)]" />
                      ) : null}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="pt-3">
                {activeTab === "shares" ? (
                  <div>
                    {isOwnProfile ? (
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
                    ) : (
                      <div className="mb-3">
                        <p className="text-[15px] font-semibold text-white">Shares</p>
                      </div>
                    )}
                    <ProfileStoriesGrid
                      userId={profile.id}
                      viewerId={me}
                      mode="shares"
                      fetchEnabled={!shouldHidePrivateProfile}
                      emptyLabel="No shares yet"
                      emptySubtitle="Shares appear here when they choose to show them."
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
                      userId={profile.id}
                      viewerId={me}
                      mode="archive"
                      fetchEnabled={!shouldHidePrivateProfile}
                      emptyLabel="No archived moments available"
                      emptySubtitle="Archive is only available to the account owner."
                    />
                  </div>
                ) : null}

                {activeTab === "venues" ? (
                  <div>
                    {venues.length ? (
                      <ul className="divide-y divide-white/[0.08]">
                        {venues.map((place) => (
                          <li key={place.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
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
                        Venues they&apos;ve stayed at for 15+ minutes appear here.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )
        ) : null}

        <div className="h-3 shrink-0" aria-hidden />
      </div>

      {unfriendConfirmOpen ? (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:pb-4 sm:pt-4">
          <button
            type="button"
            disabled={unfriendWorking}
            className="absolute inset-0 bg-primary/75 backdrop-blur-sm disabled:pointer-events-none"
            aria-label="Close unfriend dialog"
            onClick={() => setUnfriendConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unfriend-dialog-title"
            className="relative z-[1] w-full max-w-sm rounded-2xl border border-white/15 bg-[#1B2028] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.55)]"
          >
            <h2 id="unfriend-dialog-title" className="text-lg font-semibold tracking-tight text-white">
              Unfriend {profileName}?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Are you sure you want to unfriend {profileName}? You can send them a new friend request later if you
              change your mind.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={unfriendWorking}
                onClick={() => setUnfriendConfirmOpen(false)}
                className="flex-1 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-sm font-semibold text-white/90 transition hover:bg-white/[0.1] disabled:opacity-45"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={unfriendWorking}
                onClick={async () => {
                  if (!me) return;
                  setUnfriendWorking(true);
                  try {
                    await unfriendUser(me, them);
                    setIsFriend(false);
                    setUnfriendConfirmOpen(false);
                  } finally {
                    setUnfriendWorking(false);
                  }
                }}
                className="flex-1 rounded-xl bg-red-500/90 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(239,68,68,0.25)] transition hover:bg-red-500 disabled:opacity-60"
              >
                {unfriendWorking ? "Removing…" : "Unfriend"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <StoryViewerModal
        open={!!activeStoryViewerGroup}
        group={activeStoryViewerGroup}
        currentUserId={me}
        onClose={() => setActiveStoryViewerGroup(null)}
        onStoryDeleted={(storyId) => {
          setTheirMomentViewerStories((prev) => prev.filter((s) => s.id !== storyId));
          setActiveStoryViewerGroup((prev) => {
            if (!prev) return null;
            const nextStories = prev.stories.filter((s) => s.id !== storyId);
            if (!nextStories.length) return null;
            return { ...prev, stories: nextStories };
          });
        }}
      />
    </div>
  );
}