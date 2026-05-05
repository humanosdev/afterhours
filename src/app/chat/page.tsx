"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import ChatListSkeleton from "@/components/skeletons/ChatListSkeleton";
import ProtectedRoute from "@/components/ProtectedRoute";

type ChatRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  last_message: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type FriendRequestRow = {
  requester_id: string;
  addressee_id: string;
  status: string;
};

type ChatPreview = {
  chatId: string;
  otherId: string | null;
  title: string;
  subtitle: string;
  time: string;
  sortTime: number;
  unread: boolean;
};

type LatestMessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  seen: boolean;
  created_at: string;
};

function formatListTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatPage() {
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [otherByChat, setOtherByChat] = useState<Record<string, string>>({});
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>(
    {}
  );
  const [latestByChat, setLatestByChat] = useState<Record<string, LatestMessageRow>>(
    {}
  );

  const [friends, setFriends] = useState<ProfileRow[]>([]);
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(
    new Set()
  );
  const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(
    new Set()
  );
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const hiddenStorageKey = `chat:hidden:${meId ?? "anon"}`;

  useEffect(() => {
    (async () => {
      setMsg(null);
      setLoading(true);

      const { data: authData, error: authErr } = await supabase.auth.getUser();

      if (authErr) {
        console.error("auth error:", authErr);
        setMsg("Could not load chats.");
        return;
      }

      const user = authData.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      setMeId(user.id);

      const { data: chatRows, error: chatsErr } = await supabase
        .from("chats")
        .select("id, user1_id, user2_id, created_at, updated_at, last_message")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (chatsErr) {
        console.error("chats load error:", chatsErr);
        setMsg("Could not load chats.");
        setChats([]);
        setOtherByChat({});
        setProfilesById({});
      } else {
        const rows = (chatRows ?? []) as ChatRow[];
        const dedupedByPair = new Map<string, ChatRow>();
        for (const c of rows) {
          const pairKey = [c.user1_id, c.user2_id].sort().join(":");
          const current = dedupedByPair.get(pairKey);
          if (!current) {
            dedupedByPair.set(pairKey, c);
            continue;
          }
          const cTs = new Date(c.updated_at).getTime();
          const curTs = new Date(current.updated_at).getTime();
          if (cTs > curTs) dedupedByPair.set(pairKey, c);
        }
        const deduped = Array.from(dedupedByPair.values()).sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setChats(deduped);

        const otherMap: Record<string, string> = {};
        const otherIdsSet = new Set<string>();
        for (const c of deduped) {
          const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
          if (otherId) {
            otherMap[c.id] = otherId;
            otherIdsSet.add(otherId);
          }
        }
        setOtherByChat(otherMap);

        const otherIds = Array.from(otherIdsSet);
        if (otherIds.length > 0) {
          const { data: profRows, error: pErr } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", otherIds);

          if (pErr) {
            console.error("profiles load error:", pErr);
            setProfilesById({});
          } else {
            const map: Record<string, ProfileRow> = {};
            for (const p of (profRows ?? []) as ProfileRow[]) map[p.id] = p;
            setProfilesById(map);
          }
        } else {
          setProfilesById({});
        }

        const chatIds = deduped.map((c) => c.id);
        if (chatIds.length > 0) {
          const { data: messageRows, error: messageErr } = await supabase
            .from("messages")
            .select("id, chat_id, sender_id, receiver_id, content, seen, created_at")
            .in("chat_id", chatIds)
            .order("created_at", { ascending: false });
          if (messageErr) {
            console.error("messages preview load error:", messageErr);
            setLatestByChat({});
          } else {
            const latestMap: Record<string, LatestMessageRow> = {};
            for (const row of (messageRows ?? []) as LatestMessageRow[]) {
              if (!latestMap[row.chat_id]) latestMap[row.chat_id] = row;
            }
            setLatestByChat(latestMap);
          }
        } else {
          setLatestByChat({});
        }
      }

      // -------- Load friends (accepted requests) --------
      const { data: reqs, error: rErr } = await supabase
        .from("friend_requests")
        .select("requester_id, addressee_id, status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (rErr) {
        console.error("friend requests error:", rErr);
        setFriends([]);
        setLoading(false);
        return;
      }

      const requests = (reqs ?? []) as FriendRequestRow[];

      const friendIds = Array.from(
        new Set(
          requests.map((r) =>
            r.requester_id === user.id ? r.addressee_id : r.requester_id
          )
        )
      );

      if (friendIds.length === 0) {
        setFriends([]);
      } else {
        const { data: friendRows, error: fErr } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", friendIds);

        if (fErr) {
          console.error("friends profiles RPC error:", fErr);
          setFriends([]);
        } else {
          setFriends((friendRows ?? []) as ProfileRow[]);
        }
      }

      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!meId) return;
    supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_user_id", meId)
      .eq("type", "message")
      .eq("read", false)
      .then(() => {});
  }, [meId]);

  useEffect(() => {
    if (!meId) return;
    const channel = supabase
      .channel(`chat-list:${meId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as LatestMessageRow;
          setLatestByChat((prev) => {
            const existing = prev[row.chat_id];
            if (!existing) return { ...prev, [row.chat_id]: row };
            const existingTs = new Date(existing.created_at).getTime();
            const nextTs = new Date(row.created_at).getTime();
            if (nextTs >= existingTs) return { ...prev, [row.chat_id]: row };
            return prev;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as LatestMessageRow;
          setLatestByChat((prev) => {
            const existing = prev[row.chat_id];
            if (!existing) return prev;
            if (existing.id !== row.id) return prev;
            return { ...prev, [row.chat_id]: row };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ chatId?: string }>;
      const chatId = custom.detail?.chatId;
      if (!chatId) return;
      setLatestByChat((prev) => {
        const row = prev[chatId];
        if (!row) return prev;
        return {
          ...prev,
          [chatId]: {
            ...row,
            seen: true,
          },
        };
      });
    };
    window.addEventListener("chat-seen-updated", handler);
    return () => window.removeEventListener("chat-seen-updated", handler);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(hiddenStorageKey);
      if (!raw) {
        setHiddenChatIds(new Set());
        return;
      }
      setHiddenChatIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      setHiddenChatIds(new Set());
    }
  }, [hiddenStorageKey]);

  const persistHiddenChats = (next: Set<string>) => {
    setHiddenChatIds(next);
    localStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(next)));
  };

  const filteredFriends = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return friends.filter((f) => f.username?.toLowerCase().includes(q));
  }, [friends, query]);

  async function startChatWithFriend(friendId: string) {
    if (!meId) return;

    setMsg(null);

    const { data: existing, error: existingErr } = await supabase
      .from("chats")
      .select("id")
      .or(
        `and(user1_id.eq.${meId},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${meId})`
      )
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      console.error("existing chat lookup error:", existingErr);
      setMsg("Could not start chat.");
      return;
    }

    if (existing?.id) {
      router.push(`/chat/${existing.id}`);
      return;
    }

    const { data: created, error: createErr } = await supabase
      .from("chats")
      .insert({
        user1_id: meId,
        user2_id: friendId,
        last_message: null,
      })
      .select("id")
      .single();

    if (createErr || !created?.id) {
      console.error("chat create error:", createErr);
      setMsg("Could not create chat.");
      return;
    }

    router.push(`/chat/${created.id}`);
  }

  const chatTitle = useMemo(() => {
    return (chatId: string) => {
      const otherId = otherByChat[chatId];
      if (!otherId) return "Conversation";

      const p = profilesById[otherId];
      return p?.display_name || p?.username || "Conversation";
    };
  }, [otherByChat, profilesById]);

  const previews = useMemo<ChatPreview[]>(() => {
    if (!meId) return [];

    return chats
      .map((chat) => {
        const otherId = otherByChat[chat.id] ?? null;
        const profile = otherId ? profilesById[otherId] : null;
        const title =
          profile?.display_name || profile?.username || chatTitle(chat.id);
        const latest = latestByChat[chat.id];
        const updatedAt = latest?.created_at || chat.updated_at || chat.created_at;
        const unread = !!latest && latest.receiver_id === meId && latest.seen === false;
        return {
          chatId: chat.id,
          otherId,
          title,
          subtitle:
            latest?.content?.trim() ||
            chat.last_message?.trim() ||
            "No messages yet",
          time: formatListTime(updatedAt),
          sortTime: new Date(updatedAt).getTime(),
          unread,
        };
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }, [chats, chatTitle, latestByChat, meId, otherByChat, profilesById]);

  const filteredPreviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = previews.filter((p) => !hiddenChatIds.has(p.chatId));
    if (!q) return visible;
    return visible.filter((p) => {
      const username = p.otherId ? profilesById[p.otherId]?.username ?? "" : "";
      return (
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        username.toLowerCase().includes(q)
      );
    });
  }, [previews, query, profilesById, hiddenChatIds]);

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const beginLongPress = (chatId: string) => {
    clearLongPressTimer();
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setSelectionMode(true);
      setSelectedChats(new Set([chatId]));
    }, 420);
  };

  const toggleChatSelection = (chatId: string) => {
    setSelectedChats((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedChats(new Set());
  };

  const deleteSelectedChats = () => {
    if (selectedChats.size === 0) return;
    const confirmed = window.confirm(
      selectedChats.size === 1
        ? "Delete this chat for you?"
        : `Delete ${selectedChats.size} chats for you?`
    );
    if (!confirmed) return;
    const next = new Set(hiddenChatIds);
    selectedChats.forEach((id) => next.add(id));
    persistHiddenChats(next);
    exitSelectionMode();
  };

  return (
    <ProtectedRoute>
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[min(100%,28rem)] sm:max-w-[30rem] lg:max-w-[32rem]">
      <div className="sticky top-0 z-20 border-b border-white/[0.08] bg-black/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)] backdrop-blur-xl">
        <div className="flex min-h-[44px] items-center justify-between">
          {selectionMode ? (
            <>
              <button
                onClick={exitSelectionMode}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80"
              >
                Cancel
              </button>
              <div className="text-sm font-semibold">
                {selectedChats.size} selected
              </div>
              <button
                onClick={deleteSelectedChats}
                disabled={selectedChats.size === 0}
                className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 text-sm text-red-300 disabled:opacity-40"
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <h1 className="text-[1.25rem] font-bold tracking-tight">Messages</h1>
              <button
                onClick={() => setFriendPickerOpen((v) => !v)}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[13px] font-semibold text-white/85"
              >
                New
              </button>
            </>
          )}
        </div>

        <div className="mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username"
            disabled={selectionMode}
            className="w-full rounded-xl border border-white/10 bg-[#101015] px-3 py-2.5 text-base outline-none focus:border-white/20 md:text-sm"
          />
        </div>

        {!selectionMode && (friendPickerOpen || query.trim()) && (
          <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-1.5">
            {filteredFriends.length === 0 ? (
              <div className="px-2 py-2 text-xs text-white/45">No users found</div>
            ) : (
              filteredFriends.map((f) => (
                <button
                  key={f.id}
                  onClick={() => startChatWithFriend(f.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/10"
                >
                  <Avatar
                    src={f.avatar_url ?? null}
                    fallbackText={f.display_name || f.username}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {f.display_name || f.username}
                    </div>
                    <div className="truncate text-xs text-white/45">@{f.username}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {msg && <div className="mt-2 text-xs text-red-400">{msg}</div>}
      </div>

      <div className="px-3 pb-[calc(env(safe-area-inset-bottom,0px)+92px)] pt-1 sm:px-4">
        {loading ? (
          <ChatListSkeleton rows={12} />
        ) : filteredPreviews.length === 0 ? (
          <div className="px-3 py-16 text-center">
            <div className="text-[17px] font-semibold text-white/90">Your night starts in the DMs</div>
            <div className="mt-2 max-w-xs mx-auto text-[14px] leading-snug text-white/48">
              When you and friends link up, threads show up here.
            </div>
          </div>
        ) : (
          filteredPreviews.map((c) => (
            <button
              key={c.chatId}
              onTouchStart={() => beginLongPress(c.chatId)}
              onTouchEnd={clearLongPressTimer}
              onTouchCancel={clearLongPressTimer}
              onMouseDown={() => beginLongPress(c.chatId)}
              onMouseUp={clearLongPressTimer}
              onMouseLeave={clearLongPressTimer}
              onClick={() => {
                if (longPressTriggered.current) {
                  longPressTriggered.current = false;
                  return;
                }
                if (selectionMode) {
                  toggleChatSelection(c.chatId);
                  return;
                }
                router.push(`/chat/${c.chatId}`);
              }}
              className="flex w-full items-center gap-3 rounded-[12px] px-2 py-3.5 text-left transition active:bg-white/[0.06] hover:bg-white/[0.04]"
            >
              {selectionMode ? (
                <span
                  className={`h-4 w-4 rounded-full border ${
                    selectedChats.has(c.chatId)
                      ? "border-sky-400 bg-sky-400"
                      : "border-white/30"
                  }`}
                />
              ) : null}
              <Avatar
                src={c.otherId ? profilesById[c.otherId]?.avatar_url ?? null : null}
                fallbackText={c.title}
                size="lg"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white/95">
                  {c.title}
                </div>
                <div
                  className={`truncate text-sm ${
                    c.unread ? "font-medium text-white/85" : "text-white/50"
                  }`}
                >
                  {c.subtitle}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-white/45">{c.time}</span>
                {c.unread ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}