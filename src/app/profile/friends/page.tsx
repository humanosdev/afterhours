"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui";

type ProfileLite = {
  id: string;
  username: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};
type FriendRequestRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined" | "canceled";
  created_at: string;
};
type PresenceRow = { user_id: string; venue_id: string | null; updated_at: string };
type VenueRow = { id: string; name: string };

function isActive(ts: string) {
  return Date.now() - new Date(ts).getTime() < 5 * 60_000;
}

function normalizeUsername(v: string) {
  return v.trim().replace(/^@/, "").toLowerCase();
}

export default function FriendsPage() {
  const router = useRouter();
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

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }
      setMeId(auth.user.id);
      await refreshAll(auth.user.id);
      setLoading(false);
    })();
  }, [router]);

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
      const { data: resolved } = await supabase.rpc("get_public_profiles_by_ids", { ids: idsToResolve });
      const map: Record<string, ProfileLite> = {};
      for (const row of (resolved ?? []) as any[]) {
        map[row.id] = {
          id: row.id,
          username: row.username ?? null,
          display_name: row.display_name ?? null,
          avatar_url: row.avatar_url ?? null,
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

    const { data: friendRows } = await supabase.rpc("get_public_profiles_by_ids", { ids: friendIds });
    const friendProfiles = (friendRows ?? []) as ProfileLite[];
    setFriends(friendProfiles);

    const { data: presenceRows } = await supabase
      .from("user_presence")
      .select("user_id, venue_id, updated_at")
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
      const { data } = await supabase.rpc("get_public_profile_by_username", { uname: q });
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
    setDiscoverResult(null);
    await refreshAll(meId);
  }

  async function startChatWithFriend(friendId: string) {
    if (!meId) return;
    const { data: myMemberships, error: mmErr } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", meId);
    if (mmErr) return;
    const convoIds = (myMemberships ?? []).map((m: { conversation_id: string }) => m.conversation_id);
    if (convoIds.length) {
      const { data: shared } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", friendId)
        .in("conversation_id", convoIds);
      if (shared?.length) {
        router.push(`/chat/${shared[0].conversation_id}`);
        return;
      }
    }
    const { data: convoId } = await supabase.rpc("create_conversation_with_member", {
      other_user: friendId,
    });
    if (convoId) router.push(`/chat/${convoId}`);
  }

  async function acceptRequest(requestId: string) {
    if (!meId) return;
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
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
    () => filteredFriends.filter((f) => presenceById[f.id] && isActive(presenceById[f.id].updated_at)),
    [filteredFriends, presenceById]
  );

  if (loading) return <div className="min-h-screen bg-black text-white p-6">Loading…</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/90 px-4 pt-4 pb-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={goBackSafe} className="text-lg text-white/70" aria-label="Back">
            ←
          </button>
          <h1 className="text-xl font-semibold">Friends</h1>
          <Link href="/profile/blocks" className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80">
            Blocked
          </Link>
        </div>
        <div className="mt-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username"
            className="w-full rounded-xl border border-white/10 bg-[#101015] px-3 py-2.5 text-sm outline-none focus:border-white/20"
          />
        </div>
        {searching ? <div className="mt-2 text-xs text-white/45">Searching...</div> : null}
        {discoverResult ? (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-2 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar src={discoverResult.avatar_url ?? null} fallbackText={discoverResult.display_name || discoverResult.username} size="sm" className="shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{discoverResult.display_name || discoverResult.username}</div>
                <div className="truncate text-xs text-white/45">@{discoverResult.username}</div>
              </div>
            </div>
            <button onClick={() => sendRequest(discoverResult.id)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black">
              Add
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-5 px-2 pb-24 pt-2">
        {activeFriends.length > 0 ? (
          <section>
            <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-white/50">Active friends</div>
            {activeFriends.map((f) => {
              const p = presenceById[f.id];
              const status = p?.venue_id && venueById[p.venue_id] ? `At ${venueById[p.venue_id]}` : "Active now";
              return (
                <div key={`active-${f.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Avatar src={f.avatar_url ?? null} fallbackText={f.display_name || f.username} size="md" className="shrink-0" />
                  <button onClick={() => f.username && router.push(`/u/${f.username}`)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-semibold">{f.display_name || f.username}</div>
                    <div className="truncate text-xs text-emerald-300/90">{status}</div>
                  </button>
                  <button onClick={() => startChatWithFriend(f.id)} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs" aria-label="Message">
                    ✉
                  </button>
                </div>
              );
            })}
          </section>
        ) : null}

        {(incoming.length > 0 || outgoing.length > 0) ? (
          <section>
            <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-white/50">Friend requests</div>
            {incoming.map((r) => {
              const person = nameById[r.requester_id];
              const label = person?.display_name || person?.username || "Unknown";
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Avatar src={person?.avatar_url ?? null} fallbackText={label} size="sm" className="shrink-0" />
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
                  <Avatar src={person?.avatar_url ?? null} fallbackText={label} size="sm" className="shrink-0" />
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
              const status = p && isActive(p.updated_at)
                ? (p.venue_id && venueById[p.venue_id] ? `At ${venueById[p.venue_id]}` : "Active now")
                : "Offline";
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Avatar src={f.avatar_url ?? null} fallbackText={f.display_name || f.username} size="md" className="shrink-0" />
                  <button onClick={() => f.username && router.push(`/u/${f.username}`)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-semibold">{f.display_name || f.username}</div>
                    <div className="truncate text-xs text-white/45">@{f.username} · {status}</div>
                  </button>
                  <button onClick={() => startChatWithFriend(f.id)} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs" aria-label="Message">
                    ✉
                  </button>
                </div>
              );
            })
          )}
        </section>

        {msg ? <div className="px-3 text-sm text-red-400">{msg}</div> : null}
      </div>
    </div>
  );
}
