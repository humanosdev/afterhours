import { useCallback, useEffect, useState } from "react";
import { bumpChatListRefresh, subscribeChatListRefresh } from "../lib/chatListRefresh";
import {
  getCachedChatInboxPrefs,
  loadChatInboxPrefs,
  type ChatInboxPrefs,
} from "../lib/chatInboxPrefs";
import { acceptMessageRequest, denyMessageRequest } from "../lib/respondMessageRequest";

export function useChatInboxPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<ChatInboxPrefs | null>(() =>
    userId ? getCachedChatInboxPrefs(userId) : null
  );
  const [ready, setReady] = useState(() =>
    Boolean(userId && getCachedChatInboxPrefs(userId ?? ""))
  );
  const [busyChatId, setBusyChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPrefs(null);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(Boolean(getCachedChatInboxPrefs(userId)));
    void loadChatInboxPrefs(userId).then((next) => {
      if (cancelled) return;
      setPrefs(next);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeChatListRefresh(() => {
      void loadChatInboxPrefs(userId).then(setPrefs);
    });
  }, [userId]);

  const acceptRequest = useCallback(
    async (chatId: string, peerId: string) => {
      if (!userId || busyChatId) return { ok: false as const, error: "busy" };
      setBusyChatId(chatId);
      const result = await acceptMessageRequest({ meId: userId, chatId, peerId });
      if (result.ok) setPrefs(result.prefs);
      setBusyChatId(null);
      return result;
    },
    [userId, busyChatId]
  );

  const denyRequest = useCallback(
    async (chatId: string, peerId: string) => {
      if (!userId || busyChatId) return { ok: false as const, error: "busy" };
      setBusyChatId(chatId);
      const result = await denyMessageRequest({ meId: userId, chatId, peerId });
      if (result.ok) setPrefs(result.prefs);
      setBusyChatId(null);
      return result;
    },
    [userId, busyChatId]
  );

  const reloadPrefs = useCallback(async () => {
    if (!userId) return;
    const next = await loadChatInboxPrefs(userId);
    setPrefs(next);
    bumpChatListRefresh();
  }, [userId]);

  return {
    prefs,
    ready,
    busyChatId,
    acceptRequest,
    denyRequest,
    reloadPrefs,
  };
}
