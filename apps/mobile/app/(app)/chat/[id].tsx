import { useCallback, useEffect, useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChatThreadShell } from "../../../src/components/chat/ChatThreadShell";
import { ChatConversationSkeleton } from "../../../src/components/skeletons/ChatConversationSkeleton";
import { StableSlot } from "../../../src/components/ui/StableSlot";
import { CHAT_THREAD_BUILD_MARKER, logChatThreadDebug } from "../../../src/lib/chatThreadDebug";
import { useAcceptedFriends } from "../../../src/hooks/useAcceptedFriends";
import { useChatInboxPrefs } from "../../../src/hooks/useChatInboxPrefs";
import { useChatThread } from "../../../src/hooks/useChatThread";
import { isChatRequestApproved } from "../../../src/lib/chatInboxPrefs";
import { markChatMessageNotificationsRead } from "../../../src/lib/notificationMutations";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useNotificationDeliveryOptional } from "../../../src/providers/NotificationDeliveryProvider";
import { colors } from "../../../src/theme/colors";

/** PWA `apps/web/src/app/chat/[id]/page.tsx` — CHAT-1 send + read history. */
export default function ChatThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const chatId = typeof id === "string" && id.trim() ? id.trim() : null;
  const { user } = useAuth();
  const meId = user?.id;
  const delivery = useNotificationDeliveryOptional();

  const {
    threadHydrated,
    gateError,
    peer,
    otherId,
    pairBlock,
    messages,
    messagesError,
    sending,
    sendError,
    retryingId,
    send,
    deleteMessageForMe,
    unsendMessage,
    retryFailedSend,
  } = useChatThread(meId, chatId);
  const { friends } = useAcceptedFriends(meId);
  const { prefs, ready: prefsReady, busyChatId, acceptRequest, denyRequest } =
    useChatInboxPrefs(meId);

  const isFriend = useMemo(
    () => Boolean(otherId && friends.some((f) => f.id === otherId)),
    [friends, otherId]
  );

  const requestApproved = useMemo(() => {
    if (!prefs || !chatId) return false;
    return isChatRequestApproved(prefs, chatId);
  }, [prefs, chatId]);

  const isIncomingRequest = useMemo(() => {
    if (!otherId || isFriend || requestApproved || !prefsReady) return false;
    const first = messages[0];
    return Boolean(first && first.sender_id === otherId);
  }, [otherId, isFriend, requestApproved, prefsReady, messages]);

  const onAcceptRequest = useCallback(async () => {
    if (!chatId || !otherId) return;
    const result = await acceptRequest(chatId, otherId);
    if (!result.ok) {
      Alert.alert("Could not accept", "Try again in a moment.");
    }
  }, [acceptRequest, chatId, otherId]);

  const onDenyRequest = useCallback(async () => {
    if (!chatId || !otherId) return;
    const result = await denyRequest(chatId, otherId);
    if (!result.ok) {
      Alert.alert("Could not decline", "Try again in a moment.");
      return;
    }
    router.replace("/chat");
  }, [denyRequest, chatId, otherId, router]);

  useEffect(() => {
    logChatThreadDebug("route_params", {
      rawId: id,
      chatId,
      buildMarker: CHAT_THREAD_BUILD_MARKER,
    });
  }, [id, chatId]);

  useEffect(() => {
    if (!threadHydrated || !gateError) return;
    router.replace("/chat");
  }, [threadHydrated, gateError, router]);

  useEffect(() => {
    if (!meId || !chatId || !threadHydrated || gateError) return;
    void markChatMessageNotificationsRead(meId, chatId).then(() =>
      delivery?.refreshUnreadCounts()
    );
  }, [meId, chatId, threadHydrated, gateError, delivery]);

  const threadLoading = !meId || !chatId || !threadHydrated || !!gateError;

  return (
    <View style={styles.root}>
      <StableSlot
        loading={threadLoading}
        skeleton={<ChatConversationSkeleton />}
        style={styles.threadSlot}
        contentKey={chatId ?? "thread"}
        fillHeight
      >
        {meId && chatId ? (
          <ChatThreadShell
            meId={meId}
            peer={peer}
            messages={messages}
            pairBlock={pairBlock}
            messagesError={messagesError}
            sending={sending}
            sendError={sendError}
            retryingId={retryingId}
            onSend={send}
            onDeleteForMe={(id) => void deleteMessageForMe(id)}
            onUnsend={(id) => void unsendMessage(id)}
            onRetrySend={(id) => void retryFailedSend(id)}
            isIncomingRequest={isIncomingRequest}
            requestBusy={busyChatId === chatId}
            onAcceptRequest={() => void onAcceptRequest()}
            onDenyRequest={() => void onDenyRequest()}
          />
        ) : null}
      </StableSlot>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  threadSlot: {
    flex: 1,
  },
});
