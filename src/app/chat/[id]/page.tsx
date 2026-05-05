"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import ChatConversationSkeleton from "@/components/skeletons/ChatConversationSkeleton";
import { createNotification } from "@/lib/notifications";

type ChatRow = {
  id: string;
  user1_id: string;
  user2_id: string;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  optimistic?: boolean;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function makeOptimisticId() {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `temp-${globalThis.crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `temp-${Date.now().toString(36)}-${rand}`;
}

export default function ChatConversationPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [partner, setPartner] = useState<Profile | null>(null);
  const [sending, setSending] = useState(false);
  const [deletedForMeIds, setDeletedForMeIds] = useState<Set<string>>(new Set());
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [composerBottomInset, setComposerBottomInset] = useState(8);
  const [threadGateReady, setThreadGateReady] = useState(false);

  useEffect(() => {
    setThreadGateReady(false);
  }, [conversationId]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  function formatMessageTimestamp(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const deletedStorageKey = `chat:hidden:${conversationId ?? "unknown"}:${meId ?? "anon"}`;

  function emitChatSeen(chatId: string) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("chat-seen-updated", {
        detail: { chatId },
      })
    );
  }

  /* ---------- Auth ---------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else setMeId(data.user.id);
    });
  }, [router]);

  /* ---------- Load Partner ---------- */
  useEffect(() => {
    if (!conversationId) {
      setThreadGateReady(true);
      return;
    }
    if (!meId) return;

    let cancelled = false;
    const finishGate = () => {
      if (!cancelled) setThreadGateReady(true);
    };

    (async () => {
      const { data: chat, error: chatErr } = await supabase
        .from("chats")
        .select("id, user1_id, user2_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (cancelled) return;
      if (chatErr || !chat) {
        console.error("chat load error:", chatErr);
        router.replace("/chat");
        finishGate();
        return;
      }
      const typedChat = chat as ChatRow;
      if (typedChat.user1_id !== meId && typedChat.user2_id !== meId) {
        router.replace("/chat");
        finishGate();
        return;
      }
      const otherId =
        typedChat.user1_id === meId ? typedChat.user2_id : typedChat.user1_id;
      if (!otherId) {
        finishGate();
        return;
      }

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", otherId)
        .maybeSingle();

      if (cancelled) return;
      if (profErr) {
        console.error("partner profile load error:", profErr);
        finishGate();
        return;
      }
      if (prof) setPartner(prof as Profile);
      finishGate();
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, meId, router]);

  /* ---------- Load + Subscribe Messages ---------- */
  useEffect(() => {
    if (!conversationId) return;

    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at")
        .eq("chat_id", conversationId)
        .order("created_at", { ascending: true });

      if (alive) {
        const rows = (data ?? []) as Message[];
        setMessages(rows);
      }
    };

    load();

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${conversationId}`,
        },
        (payload) => {
          const next = payload.new as Message;
          if (meId && next.receiver_id === meId) {
            supabase
              .from("messages")
              .update({ seen: true })
              .eq("id", next.id)
              .then(({ error }) => {
                if (error) console.error("message seen update error:", error);
                else emitChatSeen(conversationId);
              });
          }
          setMessages((curr) => {
            if (curr.some((m) => m.id === next.id)) return curr;
            const optimisticIdx = curr.findIndex(
              (m) =>
                m.optimistic &&
                m.sender_id === next.sender_id &&
                m.content === next.content &&
                Math.abs(
                  new Date(m.created_at).getTime() -
                    new Date(next.created_at).getTime()
                ) < 30_000
            );
            if (optimisticIdx >= 0) {
              const copy = [...curr];
              copy[optimisticIdx] = next;
              return copy;
            }
            return [...curr, next];
          });
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, meId]);

  useEffect(() => {
    if (!conversationId || !meId) return;
    supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_user_id", meId)
      .eq("type", "message")
      .eq("chat_id", conversationId)
      .eq("read", false)
      .then(() => {});

    supabase
      .from("messages")
      .update({ seen: true })
      .eq("chat_id", conversationId)
      .eq("receiver_id", meId)
      .eq("seen", false)
      .then(({ error }) => {
        if (error) console.error("bulk seen update error:", error);
        else emitChatSeen(conversationId);
      });
  }, [conversationId, meId]);

  /* ---------- Auto-scroll ---------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateInset = () => {
      const keyboardOverlap = Math.max(
        0,
        window.innerHeight - (viewport.height + viewport.offsetTop)
      );
      setComposerBottomInset(Math.max(8, keyboardOverlap + 8));
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      });
    };

    updateInset();
    viewport.addEventListener("resize", updateInset);
    viewport.addEventListener("scroll", updateInset);
    return () => {
      viewport.removeEventListener("resize", updateInset);
      viewport.removeEventListener("scroll", updateInset);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(deletedStorageKey);
      if (!raw) {
        setDeletedForMeIds(new Set());
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      setDeletedForMeIds(new Set(parsed));
    } catch {
      setDeletedForMeIds(new Set());
    }
  }, [deletedStorageKey]);

  function persistHiddenIds(next: Set<string>) {
    setDeletedForMeIds(next);
    localStorage.setItem(deletedStorageKey, JSON.stringify(Array.from(next)));
  }

  function deleteForMe(messageId: string) {
    const next = new Set(deletedForMeIds);
    next.add(messageId);
    persistHiddenIds(next);
    setActiveMessageMenuId(null);
  }

  /* ---------- Send ---------- */
  async function send() {
    if (!text.trim() || !meId || sending || !partner?.id) return;

    setSending(true);
    const payload = text.trim();
    setText("");

    const optimisticId = makeOptimisticId();
    const optimisticMessage: Message = {
      id: optimisticId,
      sender_id: meId,
      receiver_id: partner.id,
      content: payload,
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((curr) => [...curr, optimisticMessage]);
    setActiveMessageMenuId(null);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: conversationId,
        sender_id: meId,
        receiver_id: partner.id,
        content: payload,
      })
      .select("id, sender_id, receiver_id, content, created_at")
      .single();

    if (error) {
      console.error("send message insert error:", error);
      setMessages((curr) => curr.filter((m) => m.id !== optimisticId));
      setText(payload);
    } else if (data) {
      const inserted = data as Message;
      setMessages((curr) => {
        const replaced = curr.map((m) => (m.id === optimisticId ? inserted : m));
        if (replaced.some((m) => m.id === inserted.id)) return replaced;
        return [...replaced, inserted];
      });

      const { error: updateChatErr } = await supabase
        .from("chats")
        .update({
          last_message: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
      if (updateChatErr) {
        console.error("chat update error:", updateChatErr);
      }
      await createNotification({
        recipientId: partner.id,
        actorId: meId,
        type: "message",
        chatId: conversationId,
        messagePreview: payload.slice(0, 140),
        dedupeKey: `message:${inserted.id}`,
        pushTitle: "New message",
        pushBody: payload.slice(0, 120),
        route: `/chat/${conversationId}`,
      });
    }
    setSending(false);
  }

  function openPartnerProfile() {
    if (!partner?.id) return;
    router.push(`/profile/${partner.id}`);
  }

  function goBackSafe() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/chat");
  }

  const visibleMessages = messages.filter((m) => !deletedForMeIds.has(m.id));

  const showConversationSkeleton = !meId || !threadGateReady;

  if (showConversationSkeleton) {
    return <ChatConversationSkeleton />;
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[min(100%,28rem)] flex-col overflow-hidden sm:max-w-[30rem] lg:max-w-[32rem]">
      <div className="sticky top-0 z-20 border-b border-white/[0.08] bg-black/92 px-3 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+8px)] backdrop-blur-xl sm:px-4">
        <div className="flex min-h-[44px] items-center gap-2">
          <button
            type="button"
            onClick={goBackSafe}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[17px] text-white/80"
            aria-label="Back"
          >
            ←
          </button>

          <button
            type="button"
            onClick={openPartnerProfile}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 text-left hover:bg-white/[0.04]"
          >
            <Avatar
              src={partner?.avatar_url ?? null}
              fallbackText={partner?.display_name || partner?.username || "Chat"}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-tight">
                {partner?.display_name || partner?.username || "Chat"}
              </div>
              {partner?.username && (
                <div className="truncate text-xs text-white/45">@{partner.username}</div>
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 pb-4 ah-content-reveal">
        {visibleMessages.map((m) => (
          <div
            key={m.id}
            className={`mb-2.5 flex ${
              m.sender_id === meId ? "justify-end" : "justify-start"
            }`}
          >
            <div className="max-w-[78%]">
              <button
                type="button"
                onClick={() =>
                  setActiveMessageMenuId((prev) => (prev === m.id ? null : m.id))
                }
                className={`w-full rounded-2xl px-3 py-2 text-left text-sm leading-relaxed ${
                  m.sender_id === meId
                    ? "rounded-br-md bg-sky-500/85 text-white"
                    : "rounded-bl-md bg-white/10 text-white/95"
                }`}
              >
                {m.content}
              </button>
              {activeMessageMenuId === m.id ? (
                <div
                  className={`mt-1 ${
                    m.sender_id === meId ? "text-right" : "text-left"
                  }`}
                >
                  <div className="mb-1 text-[11px] text-white/45">
                    {formatMessageTimestamp(m.created_at)}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteForMe(m.id)}
                    className="rounded-lg border border-white/15 bg-black/60 px-2 py-1 text-xs text-white/80"
                  >
                    Delete for me
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div
        className="border-t border-white/10 bg-black/90 px-3 py-2 backdrop-blur"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${composerBottomInset}px)` }}
      >
        <div className="flex items-end gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message..."
            className="max-h-28 min-h-10 flex-1 rounded-2xl border border-white/15 bg-[#101015] px-3 py-2.5 text-base outline-none focus:border-white/25 md:text-sm"
            enterKeyHint="send"
            onFocus={() =>
              requestAnimationFrame(() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
