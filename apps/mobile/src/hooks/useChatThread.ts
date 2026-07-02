import { useCallback, useEffect, useMemo, useState } from "react";
import { CHAT_POLL_FALLBACK_MS } from "../lib/backgroundReadPolicy";
import { subscribeChatThreadMessageEvents } from "../lib/chatMessagesRealtime";
import {
  loadHiddenMessageIds,
  persistHiddenMessageIds,
} from "../lib/chatHiddenMessages";
import { logChatThreadDebug } from "../lib/chatThreadDebug";
import { fetchChatThreadGate, fetchChatThreadMessages } from "../lib/fetchChatThread";
import { flushChatSendQueue } from "../lib/flushChatSendQueue";
import { hydrateChatStoryReplies } from "../lib/hydrateChatStoryReplies";
import { markChatThreadRead, markMessageSeen } from "../lib/markChatThreadRead";
import { mergeIncomingChatMessage } from "../lib/mergeIncomingChatMessage";
import {
  enqueueChatSend,
  makeChatSendQueueId,
  removeQueuedChatSend,
} from "../lib/chatSendQueue";
import {
  findQueuedChatSendByOptimisticId,
  retryQueuedChatSendByOptimisticId,
} from "../lib/retryQueuedChatSend";
import { makeOptimisticMessageId, sendChatMessage } from "../lib/sendChatMessage";
import { unsendChatMessage } from "../lib/unsendChatMessage";
import { supabase } from "../lib/supabase/client";
import type { PairBlockStatus } from "../lib/pairBlockStatus";
import type { ChatThreadGateError, ChatThreadMessage, ChatThreadPeer } from "../types/chatThread";

function isPersistedMessageId(id: string): boolean {
  return !id.startsWith("temp-") && !id.startsWith("q-");
}

function mergePolledThreadMessages(
  curr: ChatThreadMessage[],
  serverRows: ChatThreadMessage[]
): ChatThreadMessage[] {
  const inflight = curr.filter(
    (m) => m.optimistic || m.sendState === "queued" || m.sendState === "sending"
  );
  const serverIds = new Set(serverRows.map((m) => m.id));
  const pending = inflight.filter((m) => {
    if (serverIds.has(m.id)) return false;
    return !serverRows.some(
      (r) =>
        r.sender_id === m.sender_id &&
        r.content === m.content &&
        Math.abs(new Date(r.created_at).getTime() - new Date(m.created_at).getTime()) < 30_000
    );
  });
  return [...serverRows, ...pending].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/** PWA thread — CHAT-1 send + REALTIME-1 live events + delete-for-me / unsend. */
export function useChatThread(meId: string | undefined, chatId: string | null) {
  const [threadGateReady, setThreadGateReady] = useState(false);
  const [gateError, setGateError] = useState<ChatThreadGateError>(null);
  const [peer, setPeer] = useState<ChatThreadPeer | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [pairBlock, setPairBlock] = useState<PairBlockStatus>("none");
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    setThreadGateReady(false);
    setGateError(null);
    setPeer(null);
    setOtherId(null);
    setPairBlock("none");
    setMessages([]);
    setHiddenIds(new Set());
    setMessagesError(null);
    setSendError(null);
    setRetryingId(null);
  }, [chatId]);

  useEffect(() => {
    if (!meId || !chatId) return;
    void loadHiddenMessageIds(chatId, meId).then(setHiddenIds);
  }, [meId, chatId]);

  useEffect(() => {
    if (!meId || !chatId) {
      setThreadGateReady(!chatId ? true : false);
      return;
    }

    let cancelled = false;

    void (async () => {
      logChatThreadDebug("route_open", { chatId, meId });
      setThreadGateReady(false);
      setMessagesLoading(true);

      const gate = await fetchChatThreadGate(meId, chatId);
      if (cancelled) return;

      setGateError(gate.gateError);
      setPeer(gate.peer);
      setOtherId(gate.otherId);
      setPairBlock(gate.pairBlock);

      if (gate.gateError) {
        setMessages([]);
        setMessagesError(null);
        setMessagesLoading(false);
        setThreadGateReady(true);
        logChatThreadDebug("hydrate_abort", { chatId, gateError: gate.gateError });
        return;
      }

      const { messages: rows, messagesError: msgErr } = await fetchChatThreadMessages(chatId);
      if (cancelled) return;
      setMessages(rows);
      setMessagesError(msgErr);
      setMessagesLoading(false);
      setThreadGateReady(true);

      logChatThreadDebug("hydrate_complete", {
        chatId,
        messageCount: rows.length,
        messagesError: msgErr,
        peerUsername: gate.peer?.username ?? null,
        emptyTranscript: rows.length === 0 && !msgErr,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [meId, chatId]);

  useEffect(() => {
    if (!meId || !chatId || gateError) return;
    void markChatThreadRead(meId, chatId);
  }, [meId, chatId, gateError]);

  useEffect(() => {
    if (!meId || !chatId || gateError || !threadGateReady) return;

    return subscribeChatThreadMessageEvents(supabase, {
      chatId,
      onInsert: (row) => {
        if (row.receiver_id === meId) {
          void markMessageSeen(row.id, chatId);
        }
        void hydrateChatStoryReplies([row]).then(([hydrated]) => {
          setMessages((curr) => mergeIncomingChatMessage(curr, hydrated));
        });
      },
      onDelete: (messageId) => {
        setMessages((curr) => curr.filter((m) => m.id !== messageId));
        setHiddenIds((prev) => {
          if (!prev.has(messageId)) return prev;
          const next = new Set(prev);
          next.delete(messageId);
          void persistHiddenMessageIds(chatId, meId, next);
          return next;
        });
      },
    });
  }, [meId, chatId, gateError, threadGateReady]);

  useEffect(() => {
    if (!meId || !chatId || gateError || !threadGateReady) return;
    void flushChatSendQueue(meId).then(({ sent }) => {
      if (sent.some((item) => item.chatId === chatId)) {
        setSendError(null);
      }
    });
  }, [meId, chatId, gateError, threadGateReady]);

  useEffect(() => {
    if (!meId || !chatId || gateError || !threadGateReady) return;

    const poll = () => {
      void fetchChatThreadMessages(chatId).then(({ messages: rows, messagesError: msgErr }) => {
        if (msgErr) return;
        setMessages((curr) => mergePolledThreadMessages(curr, rows));
      });
    };

    const id = setInterval(poll, CHAT_POLL_FALLBACK_MS);
    return () => clearInterval(id);
  }, [meId, chatId, gateError, threadGateReady]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !hiddenIds.has(m.id)),
    [messages, hiddenIds]
  );

  const threadHydrated = threadGateReady && !messagesLoading;

  const send = useCallback(
    async (rawText: string) => {
      const payload = rawText.trim();
      if (!payload || !meId || !chatId || !otherId || sending) return false;
      if (pairBlock !== "none") return false;

      setSending(true);
      setSendError(null);

      const optimisticId = makeOptimisticMessageId();
      const optimistic: ChatThreadMessage = {
        id: optimisticId,
        sender_id: meId,
        receiver_id: otherId,
        content: payload,
        created_at: new Date().toISOString(),
        optimistic: true,
        sendState: "sending",
      };
      setMessages((curr) => [...curr, optimistic]);

      const result = await sendChatMessage({
        chatId,
        meId,
        receiverId: otherId,
        content: payload,
      });

      if (!result.ok) {
        if (result.error === "network_failed") {
          await enqueueChatSend({
            id: makeChatSendQueueId(),
            chatId,
            meId,
            receiverId: otherId,
            content: payload,
            optimisticId,
          });
          setMessages((curr) =>
            curr.map((m) =>
              m.id === optimisticId ? { ...m, sendState: "queued" as const } : m
            )
          );
          setSendError(null);
          setSending(false);
          return true;
        }
        setMessages((curr) => curr.filter((m) => m.id !== optimisticId));
        setSendError(
          result.error === "empty" ? "Message cannot be empty." : "Could not send. Try again."
        );
        setSending(false);
        return false;
      }

      setMessages((curr) => {
        const replaced = curr.map((m) => (m.id === optimisticId ? result.message : m));
        if (replaced.some((m) => m.id === result.message.id)) return replaced;
        return [...replaced, result.message];
      });
      setSending(false);
      return true;
    },
    [meId, chatId, otherId, pairBlock, sending]
  );

  const deleteMessageForMe = useCallback(
    async (messageId: string) => {
      if (!meId || !chatId) return;
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.add(messageId);
        void persistHiddenMessageIds(chatId, meId, next);
        return next;
      });

      const queued = await findQueuedChatSendByOptimisticId(meId, messageId);
      if (queued) {
        await removeQueuedChatSend(meId, queued.id);
      }
    },
    [chatId, meId]
  );

  const unsendMessage = useCallback(
    async (messageId: string) => {
      if (!meId || !chatId || !isPersistedMessageId(messageId)) return false;

      let removed: ChatThreadMessage | null = null;
      setMessages((curr) => {
        removed = curr.find((m) => m.id === messageId) ?? null;
        return curr.filter((m) => m.id !== messageId);
      });
      setSendError(null);

      const result = await unsendChatMessage({ chatId, meId, messageId });
      if (!result.ok) {
        if (removed != null) {
          const rollback = removed;
          setMessages((curr) => mergeIncomingChatMessage(curr, rollback));
        }
        setSendError("Could not unsend. Try again.");
        return false;
      }
      return true;
    },
    [chatId, meId]
  );

  const retryFailedSend = useCallback(
    async (optimisticId: string) => {
      if (!meId || retryingId) return false;
      setRetryingId(optimisticId);
      setSendError(null);
      setMessages((curr) =>
        curr.map((m) =>
          m.id === optimisticId ? { ...m, sendState: "sending" as const } : m
        )
      );

      const result = await retryQueuedChatSendByOptimisticId(meId, optimisticId);
      setRetryingId(null);

      if (result.ok) {
        setMessages((curr) => mergeIncomingChatMessage(curr, result.message));
        setSendError(null);
        return true;
      }

      if (result.stillQueued) {
        setMessages((curr) =>
          curr.map((m) =>
            m.id === optimisticId ? { ...m, sendState: "queued" as const } : m
          )
        );
        return false;
      }

      setMessages((curr) => curr.filter((m) => m.id !== optimisticId));
      setSendError("Could not send this message. Try typing it again.");
      return false;
    },
    [meId, retryingId]
  );

  return {
    threadGateReady,
    threadHydrated,
    gateError,
    peer,
    otherId,
    pairBlock,
    messages: visibleMessages,
    messagesError,
    messagesLoading,
    sending,
    sendError,
    retryingId,
    send,
    deleteMessageForMe,
    unsendMessage,
    retryFailedSend,
  };
}
