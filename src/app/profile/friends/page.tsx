"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import { createNotification } from "@/lib/notifications";
import { getPresenceFreshness, isPresenceLive, isValidCoordinatePair } from "@/lib/presence";

type ProfileLite = {
  id: string;
  username: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  is_private?: boolean | null;
  ghost_mode?: boolean | null;
};
type FriendRequestRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "canceled";
  created_at: string;
};
type PresenceRow = { user_id: string; venue_id: string | null; updated_at: string; lat: number; lng: number };
type VenueRow = { id: string; name: string };

function normalizeUsername(v: string) {
  return v.trim().replace(/^@/, "").toLowerCase();
}

function FriendsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewUsername = (searchParams.get("view") || "").trim().toLowerCase();
  const goBackSafe = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/profile");
  };

  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [discoverResult, setDiscoverResult] = useState<ProfileLite | null>(null);
  const [searching, setSearching] = useState(false);
  const [incoming, setIncoming] = useState<FriendRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestRow[]>([]);
  const [friends, setFriends] = useState<ProfileLite[]>([]);
  const [nameById, setNameById] = useState<Record<string, ProfileLite>>({});
  const [presenceById, setPresenceById] = useState<Record<string, PresenceRow>>({});
  const [venueById, setVenueById] = useState<Record<string, string>>({});
  const [viewerTarget, setViewerTarget] = useState<ProfileLite | null>(null);
  const [viewerCanSeeFriends, setViewerCanSeeFriends] = useState(true);
  const [viewerRelationship, setViewerRelationship] = useState<"none" | "incoming" | "outgoing" | "accepted">("none");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }
      setMeId(auth.user.id);
      if (viewUsername) {
        await refreshViewer(auth.user.id, viewUsername);
      } else {
        await refreshAll(auth.user.id);
      }
      setLoading(false);
    })();
  }, [router, viewUsername]);

  async function refreshViewer(viewerId: string, usernameToView: string) {
    setMsg(null);
    const { data: target } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_private, ghost_mode")
      .eq("username", usernameToView)
      .maybeSingle();
    if (!target?.id) {
      setMsg("Could not find that profile.");
      setViewerTarget(null);
      setFriends([]);
      return;
    }

    const typedTarget = target as ProfileLite;
    setViewerTarget(typedTarget);

    const { data: relRows } = await supabase
      .from("friend_requests")
      .select("requester_id, addressee_id, status")
      .or(`and(requester_id.eq.${viewerId},addressee_id.eq.${typedTarget.id}),and(requester_id.eq.${typedTarget.id},addressee_id.eq.${viewerId})`);

    const relationRows = (relRows ?? []) as FriendRequestRow[];
    const accepted = relationRows.some((r) => r.status === "accepted");
    const incoming = relationRows.some((r) => r.status === "pending" && r.requester_id === typedTarget.id && r.addressee_id === viewerId);
    const outgoing = relationRows.some((r) => r.status === "pending" && r.requester_id === viewerId && r.addressee_id === typedTarget.id);
    setViewerRelationship(accepted ? "accepted" : incoming ? "incoming" : outgoing ? "outgoing" : "none");

    const canSee = !typedTarget.is_private || typedTarget.id === viewerId || accepted;
    setViewerCanSeeFriends(canSee);
    if (!canSee) {
      setFriends([]);
      setPresenceById({});
      setVenueById({});
      return;
    }

    const { data: reqs } = await supabase
      .from("friend_requests")
      .select("requester_id, addressee_id, status")
      .eq("status", "accepted")
      .or(`requester_id.eq.${typedTarget.id},addressee_id.eq.${typedTarget.id}`);
    const acceptedRows = (reqs ?? []) as FriendRequestRow[];
    const friendIds = Array.from(
      new Set(acceptedRows.map((r) => (r.requester_id === typedTarget.id ? r.addressee_id : r.requester_id)))
    );
    if (!friendIds.length) {
      setFriends([]);
      setPresenceById({});
      setVenueById({});
      return;
    }
    const { data: friendRows } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_private, ghost_mode")
      .in("id", friendIds);
    setFriends((friendRows ?? []) as ProfileLite[]);
  }

  async function refreshAll(uid: string) {
    setMsg(null);
    const { data: reqs, error } = await supabase
      .from("friend_requests")
      .select("id, requester_id, addressee_id, status, created_at")
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .order("created_at", { ascending: false });
    if (error) {
      setMsg("Could not load friend requests.");
      return;
    }

    const all = (reqs ?? []) as FriendRequestRow[];
    const inc = all.filter((r) => r.addressee_id === uid && r.status === "pending");
    const out = all.filter((r) => r.requester_id === uid && r.status === "pending");
    setIncoming(inc);
    setOutgoing(out);

    const accepted = all.filter((r) => r.status === "accepted");
    const friendIds = Array.from(
      new Set(accepted.map((r) => (r.requester_id === uid ? r.addressee_id : r.requester_id)))
    );

    const idsToResolve = Array.from(
      new Set([...inc.map((r) => r.requester_id), ...out.map((r) => r.addressee_id), ...friendIds])
    );
    if (idsToResolve.length > 0) {
      const { data: resolved } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_private, ghost_mode")
        .in("id", idsToResolve);
      const map: Record<string, ProfileLite> = {};
      for (const row of (resolved ?? []) as any[]) {
        map[row.id] = {
          id: row.id,
          username: row.username ?? null,
          display_name: row.display_name ?? null,
          avatar_url: row.avatar_url ?? null,
          is_private: row.is_private ?? false,
        };
      }
      setNameById(map);
    } else {
      setNameById({});
    }

    if (!friendIds.length) {
      setFriends([]);
      setPresenceById({});
      setVenueById({});
      return;
    }

    const { data: friendRows } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_private, ghost_mode")
      .in("id", friendIds);
    const friendProfiles = (friendRows ?? []) as ProfileLite[];
    setFriends(friendProfiles);

    const { data: presenceRows } = await supabase
      .from("user_presence")
      .select("user_id, venue_id, updated_at, lat, lng")
      .in("user_id", friendIds);
    const pMap: Record<string, PresenceRow> = {};
    for (const p of (presenceRows ?? []) as PresenceRow[]) {
      const existing = pMap[p.user_id];
      if (!existing || new Date(p.updated_at).getTime() > new Date(existing.updated_at).getTime()) {
        pMap[p.user_id] = p;
      }
    }
    setPresenceById(pMap);

    const venueIds = Array.from(
      new Set(((presenceRows ?? []) as PresenceRow[]).map((p) => p.venue_id).filter(Boolean))
    ) as string[];
    if (venueIds.length) {
      const { data: venues } = await supabase.from("venues").select("id, name").in("id", venueIds);
      const vm: Record<string, string> = {};
      (venues ?? []).forEach((v: VenueRow) => {
        vm[v.id] = v.name;
      });
      setVenueById(vm);
    } else {
      setVenueById({});
    }
  }

  useEffect(() => {
    if (viewUsername) {
      setDiscoverResult(null);
      return;
    }
    const uid = meId;
    if (!uid) return;
    const q = normalizeUsername(search);
    if (q.length < 2 || friends.some((f) => f.username?.toLowerCase() === q)) {
      setDiscoverResult(null);
      return;
    }

    let alive = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_private, ghost_mode")
        .ilike("username", q)
        .limit(1);
      if (!alive) return;
      setSearching(false);
      const target = ((data ?? []) as ProfileLite[])[0];
      if (!target || target.id === uid) {
        setDiscoverResult(null);
        return;
      }
      setDiscoverResult(target);
    }, 220);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [friends, meId, search]);

  async function sendRequest(targetId: string) {
    if (!meId) return;
    const { error } = await supabase.from("friend_requests").insert({
      requester_id: meId,
      addressee_id: targetId,
      status: "pending",
    });
    if (error) {
      setMsg("Could not send request.");
      return;
    }
    await createNotification({
      recipientId: targetId,
      actorId: meId,
      type: "friend_request_received",
    });
    setDiscoverResult(null);
    await refreshAll(meId);
  }

  async function sendRequestToViewerTarget() {
    if (!meId || !viewerTarget?.id || viewerRelationship !== "none") return;
    const { error } = await supabase.from("friend_requests").insert({
      requester_id: meId,
      addressee_id: viewerTarget.id,
      status: "pending",
    });
    if (error) {
      setMsg("Could not send request.");
      return;
    }
    await createNotification({
      recipientId: viewerTarget.id,
      actorId: meId,
      type: "friend_request_received",
    });
    setViewerRelationship("outgoing");
  }

  async function acceptRequest(requestId: string) {
    if (!meId) return;
    const req = incoming.find((r) => r.id === requestId);
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
    if (req?.requester_id) {
      await createNotification({
        recipientId: req.requester_id,
        actorId: meId,
        type: "friend_request_accepted",
      });
    }
    await refreshAll(meId);
  }

  async function declineRequest(requestId: string) {
    if (!meId) return;
    await supabase.from("friend_requests").update({ status: "declined" }).eq("id", requestId);
    await refreshAll(meId);
  }

  async function cancelRequest(requestId: string) {
    if (!meId) return;
    await supabase.from("friend_requests").update({ status: "canceled" }).eq("id", requestId);
    await refreshAll(meId);
  }

  const filteredFriends = useMemo(() => {
    const q = normalizeUsername(search);
    if (!q) return friends;
    return friends.filter((f) => {
      const d = (f.display_name ?? "").toLowerCase();
      const u = (f.username ?? "").toLowerCase();
      return d.includes(q) || u.includes(q);
    });
  }, [friends, search]);

  const activeFriends = useMemo(
    () =>
      filteredFriends.filter((f) => {
        const p = presenceById[f.id];
        if (!p) return false;
        if (f.ghost_mode) return false;
        if (!isValidCoordinatePair(p.lat, p.lng)) return false;
        return isPresenceLive(p.updated_at);
      }),
    [filteredFriends, presenceById]
  );

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black px-6 pb-6 pt-[calc(env(safe-area-inset-top,0px)+12px)] text-white">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)] backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={goBackSafe} className="text-lg text-white/70" aria-label="Back">
            ←
          </button>
          <h1 className="text-xl font-semibold">
            {viewerTarget ? `${viewerTarget.display_name || viewerTarget.username}'s Friends` : "Friends"}
          </h1>
          {!viewerTarget ? (
            <Link href="/profile/blocks" className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80">
              Blocked
            </Link>
          ) : (
            <div className="w-[72px]" />
          )}
        </div>
        {!viewerTarget ? (
        <div className="mt-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username"
            className="w-full rounded-xl border border-white/10 bg-[#101015] px-3 py-2.5 text-sm outline-none focus:border-white/20"
          />
        </div>
        ) : null}
        {!viewerTarget && searching ? <div className="mt-2 text-xs text-white/45">Searching...</div> : null}
        {!viewerTarget && discoverResult ? (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-2 py-2">
            <button
              onClick={() => discoverResult.username && router.push(`/u/${discoverResult.username}`)}
              className="flex min-w-0 items-center gap-2 text-left"
            >
              <Avatar src={discoverResult.avatar_url?.trim() || null} fallbackText={discoverResult.display_name || discoverResult.username} size="sm" className="shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{discoverResult.display_name || discoverResult.username}</div>
                <div className="truncate text-xs text-white/45">
                  @{discoverResult.username}
                  {discoverResult.is_private ? " · Private" : ""}
                </div>
              </div>
            </button>
            <button onClick={() => sendRequest(discoverResult.id)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black">
              Add
            </button>
          </div>
        ) : null}
        {viewerTarget && !viewerCanSeeFriends ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-semibold">This account is private</p>
            <p className="mt-1 text-xs text-white/60">You need to be friends to view their friends list.</p>
            {viewerRelationship === "none" ? (
              <button
                type="button"
                onClick={sendRequestToViewerTarget}
                className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black"
              >
                Add friend
              </button>
            ) : viewerRelationship === "outgoing" ? (
              <p className="mt-3 text-xs text-white/70">Request sent</p>
            ) : viewerRelationship === "incoming" ? (
              <button
                type="button"
                onClick={() => router.push("/profile/friends")}
                className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black"
              >
                Respond to request
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {viewerTarget && !viewerCanSeeFriends ? null : (
      <div className="space-y-5 px-2 pb-24 pt-2">
        {!viewerTarget && activeFriends.length > 0 ? (
          <section>
            <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-white/50">Active friends</div>
            {activeFriends.map((f) => {
              const p = presenceById[f.id];
              const status = p?.venue_id && venueById[p.venue_id] ? `At ${venueById[p.venue_id]}` : "Active now";
              return (
                <div key={`active-${f.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Avatar src={f.avatar_url?.trim() || null} fallbackText={f.display_name || f.username} size="md" className="shrink-0" />
                  <button onClick={() => f.username && router.push(`/u/${f.username}`)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-semibold">{f.display_name || f.username}</div>
                    <div className="truncate text-xs text-emerald-300/90">{status}</div>
                  </button>
                </div>
              );
            })}
          </section>
        ) : null}

        {!viewerTarget && (incoming.length > 0 || outgoing.length > 0) ? (
          <section>
            <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-white/50">Friend requests</div>
            {incoming.map((r) => {
              const person = nameById[r.requester_id];
              const label = person?.display_name || person?.username || "Unknown";
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Avatar src={person?.avatar_url?.trim() || null} fallbackText={label} size="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="truncate text-xs text-white/45">@{person?.username || "unknown"}</div>
                  </div>
                  <button onClick={() => acceptRequest(r.id)} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-black">Accept</button>
                  <button onClick={() => declineRequest(r.id)} className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white/80">Decline</button>
                </div>
              );
            })}
            {outgoing.map((r) => {
              const person = nameById[r.addressee_id];
              const label = person?.display_name || person?.username || "Unknown";
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Avatar src={person?.avatar_url?.trim() || null} fallbackText={label} size="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="truncate text-xs text-white/45">Request sent</div>
                  </div>
                  <button onClick={() => cancelRequest(r.id)} className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white/80">Cancel</button>
                </div>
              );
            })}
          </section>
        ) : null}

        <section>
          <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-white/50">Friends</div>
          {filteredFriends.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <div className="text-base font-medium text-white/85">No friends yet</div>
              <div className="mt-1 text-sm text-white/50">Add people by username to start connecting</div>
            </div>
          ) : (
            filteredFriends.map((f) => {
              const p = presenceById[f.id];
              const freshness = p ? getPresenceFreshness(p.updated_at) : "stale";
              const status = f.ghost_mode
                ? "Offline"
                : freshness === "live"
                  ? (p?.venue_id && venueById[p.venue_id] ? `At ${venueById[p.venue_id]}` : "Active now")
                  : freshness === "recent"
                    ? (p?.venue_id && venueById[p.venue_id] ? `Recently at ${venueById[p.venue_id]}` : "Recently active")
                    : "Offline";
              const subtitle = viewerTarget
                ? (f.is_private ? `@${f.username} · Private` : `@${f.username}`)
                : `@${f.username} · ${status}`;
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Avatar src={f.avatar_url?.trim() || null} fallbackText={f.display_name || f.username} size="md" className="shrink-0" />
                  <button onClick={() => f.username && router.push(`/u/${f.username}`)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-semibold">{f.display_name || f.username}</div>
                    <div className="truncate text-xs text-white/45">{subtitle}</div>
                  </button>
                </div>
              );
            })
          )}
        </section>

        {msg ? <div className="px-3 text-sm text-red-400">{msg}</div> : null}
      </div>
      )}
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-black p-6 pt-[calc(env(safe-area-inset-top,0px)+12px)] text-sm text-white/60">
          Loading friends...
        </div>
      }
    >
      <FriendsPageContent />
    </Suspense>
  );
}
