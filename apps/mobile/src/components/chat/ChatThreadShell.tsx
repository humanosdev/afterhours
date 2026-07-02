import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardDismissPan } from "../../hooks/useKeyboardDismissPan";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { keyboardComposerInsets } from "../../lib/keyboardComposerInsets";
import { formatMessageTimestamp } from "../../lib/formatMessageTimestamp";
import { peerDisplayTitle } from "../../lib/fetchChatThread";
import type { PairBlockStatus } from "../../lib/pairBlockStatus";
import type { ChatThreadMessage, ChatThreadPeer } from "../../types/chatThread";
import { ProfileAvatar } from "../ProfileAvatar";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { ChatStoryReplyPreview } from "./ChatStoryReplyPreview";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";

type ChatThreadShellProps = {
  meId: string;
  peer: ChatThreadPeer | null;
  messages: ChatThreadMessage[];
  pairBlock: PairBlockStatus;
  messagesError?: string | null;
  sending?: boolean;
  sendError?: string | null;
  retryingId?: string | null;
  onSend: (text: string) => Promise<boolean>;
  onDeleteForMe?: (messageId: string) => void;
  onUnsend?: (messageId: string) => void;
  onRetrySend?: (optimisticId: string) => void;
  isIncomingRequest?: boolean;
  requestBusy?: boolean;
  onAcceptRequest?: () => void;
  onDenyRequest?: () => void;
};

/** PWA `ChatConversationPage` — CHAT-1 send + REALTIME-1 + delete-for-me / unsend. */
export function ChatThreadShell({
  meId,
  peer,
  messages,
  pairBlock,
  messagesError,
  sending = false,
  sendError,
  retryingId = null,
  onSend,
  onDeleteForMe,
  onUnsend,
  onRetrySend,
  isIncomingRequest = false,
  requestBusy = false,
  onAcceptRequest,
  onDenyRequest,
}: ChatThreadShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { inset: keyboardInset, visible: keyboardVisible, dismiss: dismissKeyboard } = useKeyboardInset();
  const composerDismissPan = useKeyboardDismissPan(dismissKeyboard, keyboardVisible);
  const composerInsets = keyboardComposerInsets({
    keyboardInset,
    safeBottom: insets.bottom,
    restingPad: 8,
  });
  const composerMarginBottom = useSharedValue(composerInsets.marginBottom);
  const composerPaddingBottom = useSharedValue(composerInsets.paddingBottom);
  const composerAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: composerMarginBottom.value,
    paddingBottom: composerPaddingBottom.value,
  }));
  const scrollRef = useRef<ScrollView>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [text, setText] = useState("");

  const peerName = peerDisplayTitle(peer);
  const peerUsername = peer?.username?.trim() ?? null;

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  useEffect(() => {
    if (!keyboardVisible) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [keyboardVisible]);

  useEffect(() => {
    const spring = { damping: 22, stiffness: 320, mass: 0.85 };
    composerMarginBottom.value = withSpring(composerInsets.marginBottom, spring);
    composerPaddingBottom.value = withSpring(composerInsets.paddingBottom, spring);
  }, [composerInsets.marginBottom, composerInsets.paddingBottom, composerMarginBottom, composerPaddingBottom]);

  function openPartnerProfile() {
    if (!peerUsername) return;
    router.push(`/u/${encodeURIComponent(peerUsername)}`);
  }

  const blockBanner =
    pairBlock === "they_blocked_you"
      ? "This user has blocked you. Messaging is disabled."
      : pairBlock === "you_blocked_them"
        ? "You blocked this user. Unblock them from their profile to send messages again."
        : null;

  const canSend = Boolean(text.trim()) && !sending && pairBlock === "none";
  const hasQueuedOutbound = messages.some(
    (m) => m.sender_id === meId && m.sendState === "queued"
  );
  const composerSendError = sendError && !hasQueuedOutbound ? sendError : null;

  function isPersistedMessage(message: ChatThreadMessage): boolean {
    return !message.optimistic && !message.id.startsWith("temp-");
  }

  function openMessageActions(message: ChatThreadMessage) {
    const isOwn = message.sender_id === meId;
    const isQueued = message.sendState === "queued";
    const canUnsend = isOwn && isPersistedMessage(message) && !isQueued;

    const buttons: Array<{
      text: string;
      style?: "default" | "cancel" | "destructive";
      onPress?: () => void;
    }> = [];

    if (isQueued && isOwn) {
      buttons.push({
        text: retryingId === message.id ? "Retrying…" : "Retry send",
        onPress: () => {
          setActiveMessageId(null);
          onRetrySend?.(message.id);
        },
      });
    }

    buttons.push({
      text: "Delete for me",
      style: "destructive",
      onPress: () => {
        setActiveMessageId(null);
        onDeleteForMe?.(message.id);
      },
    });

    if (canUnsend) {
      buttons.push({
        text: "Unsend for everyone",
        style: "destructive",
        onPress: () => {
          setActiveMessageId(null);
          Alert.alert(
            "Unsend message?",
            "This removes the message for both of you.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Unsend",
                style: "destructive",
                onPress: () => onUnsend?.(message.id),
              },
            ]
          );
        },
      });
    }

    buttons.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Message", undefined, buttons);
  }

  async function handleSend() {
    const payload = text.trim();
    if (!payload || sending || pairBlock !== "none") return;
    setActiveMessageId(null);
    const ok = await onSend(payload);
    if (ok) setText("");
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textWhite80} />
        </Pressable>

        <Pressable
          onPress={openPartnerProfile}
          disabled={!peerUsername}
          accessibilityRole="button"
          accessibilityLabel={`Open ${peerName} profile`}
          style={({ pressed }) => [styles.headerCenter, pressed && peerUsername && styles.headerPressed]}
        >
          <ProfileAvatar avatarUrl={peer?.avatar_url ?? null} label={peerName} size={40} />
          <View style={styles.headerText}>
            <Text style={styles.peerName} numberOfLines={1}>
              {peerName}
            </Text>
            {peerUsername ? (
              <Text style={styles.peerHandle} numberOfLines={1}>
                @{peerUsername}
              </Text>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.headerSpacer} />
      </View>

      {messagesError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Could not load messages. Pull back and reopen the chat.</Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {isIncomingRequest ? (
          <View style={styles.requestIntro}>
            <Text style={styles.requestIntroTitle}>Message request</Text>
            <Text style={styles.requestIntroBody}>
              Accept to move this conversation to your chats and reply. Decline to remove it.
            </Text>
          </View>
        ) : null}
        {messages.map((m) => {
          const isOwn = m.sender_id === meId;
          const showMeta = activeMessageId === m.id;
          const hasStoryReply = Boolean(m.story_id || m.story_attachment);
          const isPending = isOwn && (m.sendState === "sending" || m.sendState === "queued");
          const pendingLabel =
            m.sendState === "queued" ? "Not sent · waiting for connection" : "Sending…";
          return (
            <View
              key={m.id}
              style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowPeer]}
            >
              <View style={styles.messageCol}>
                {hasStoryReply ? (
                  <ChatStoryReplyPreview
                    compact
                    align={isOwn ? "right" : "left"}
                    attachment={m.story_attachment}
                    storyId={m.story_id}
                    onPress={
                      m.story_id
                        ? () => router.push(`/moments/${encodeURIComponent(m.story_id!)}`)
                        : undefined
                    }
                  />
                ) : null}
                {m.content ? (
                  <Pressable
                    onPress={() =>
                      setActiveMessageId((prev) => (prev === m.id ? null : m.id))
                    }
                    onLongPress={() => openMessageActions(m)}
                    delayLongPress={320}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPending ? `${m.content}. ${pendingLabel}` : m.content
                    }
                    style={({ pressed }) => [
                      styles.bubble,
                      isOwn ? styles.bubbleOwn : styles.bubblePeer,
                      isPending && isOwn && styles.bubbleOwnPending,
                      isPending && m.sendState === "queued" && styles.bubbleOwnQueued,
                      pressed && styles.bubblePressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        isOwn && styles.bubbleTextOwn,
                        isPending && styles.bubbleTextPending,
                      ]}
                    >
                      {m.content}
                    </Text>
                  </Pressable>
                ) : null}
                {isPending ? (
                  <View style={[styles.sendStateRow, isOwn && styles.sendStateRowOwn]}>
                    <Text style={[styles.sendStateLabel, isOwn && styles.sendStateLabelOwn]}>
                      {pendingLabel}
                    </Text>
                    {m.sendState === "queued" && isOwn ? (
                      <Pressable
                        onPress={() => onRetrySend?.(m.id)}
                        disabled={retryingId === m.id}
                        accessibilityRole="button"
                        accessibilityLabel="Retry send"
                        style={({ pressed }) => [
                          styles.retryBtn,
                          pressed && styles.retryBtnPressed,
                          retryingId === m.id && styles.retryBtnDisabled,
                        ]}
                      >
                        <Text style={styles.retryBtnText}>
                          {retryingId === m.id ? "Retrying…" : "Retry"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {showMeta && !isPending ? (
                  <Text style={[styles.timestamp, isOwn && styles.timestampOwn]}>
                    {formatMessageTimestamp(m.created_at)}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Animated.View style={[styles.composer, composerAnimatedStyle]} {...composerDismissPan}>
        {isIncomingRequest ? (
          <View style={styles.requestActions}>
            <PrimaryButton
              label="Accept"
              variant="auth"
              loading={requestBusy}
              disabled={requestBusy}
              onPress={() => onAcceptRequest?.()}
            />
            <SecondaryButton
              label="Decline"
              disabled={requestBusy}
              onPress={() => onDenyRequest?.()}
            />
          </View>
        ) : blockBanner ? (
          <Text style={styles.blockBanner}>{blockBanner}</Text>
        ) : (
          <>
            {composerSendError ? (
              <Text style={styles.sendError} accessibilityRole="alert">
                {composerSendError}
              </Text>
            ) : null}
            <View style={styles.composerRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Message…"
                placeholderTextColor={colors.textMuted}
                style={styles.composerInput}
                multiline
                maxLength={4000}
                editable={!sending}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  void handleSend();
                }}
              />
              <Pressable
                onPress={() => void handleSend()}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                style={({ pressed }) => [
                  styles.sendBtn,
                  !canSend && styles.sendBtnDisabled,
                  pressed && canSend && styles.sendBtnPressed,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.bgPrimary} />
                ) : (
                  <Text style={styles.sendLabel}>Send</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    maxWidth: layout.contentMaxWidth + layout.screenPaddingX * 2,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    gap: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerSpacer: {
    width: 40,
  },
  peerName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  peerHandle: {
    fontSize: 12,
    color: colors.textWhite45,
  },
  errorBanner: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.errorMuted,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.25)",
  },
  errorBannerText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.errorText,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 16,
    flexGrow: 1,
  },
  requestIntro: {
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  requestIntroTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  requestIntroBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite65,
  },
  requestActions: {
    gap: 10,
  },
  messageRow: {
    marginBottom: 10,
    flexDirection: "row",
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageRowPeer: {
    justifyContent: "flex-start",
  },
  messageCol: {
    maxWidth: "78%",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOwn: {
    borderBottomRightRadius: 6,
    backgroundColor: "rgba(14, 165, 233, 0.85)",
  },
  bubbleOwnPending: {
    backgroundColor: "rgba(14, 165, 233, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  bubbleOwnQueued: {
    backgroundColor: "rgba(14, 165, 233, 0.28)",
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  bubblePeer: {
    borderBottomLeftRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bubblePressed: {
    opacity: 0.92,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.95)",
  },
  bubbleTextOwn: {
    color: "#fff",
  },
  bubbleTextPending: {
    color: "rgba(255, 255, 255, 0.78)",
  },
  sendStateLabel: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textWhite45,
  },
  sendStateLabelOwn: {
    color: "rgba(251, 191, 36, 0.85)",
  },
  sendStateRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sendStateRowOwn: {
    justifyContent: "flex-end",
  },
  retryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.45)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryBtnPressed: {
    opacity: 0.85,
  },
  retryBtnDisabled: {
    opacity: 0.5,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(251, 191, 36, 0.95)",
  },
  timestamp: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textWhite45,
    textAlign: "left",
  },
  timestampOwn: {
    textAlign: "right",
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(10, 12, 24, 0.92)",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 6,
  },
  blockBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite65,
    textAlign: "center",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "#101015",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sendBtn: {
    borderRadius: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnPressed: {
    opacity: 0.88,
  },
  sendLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.bgPrimary,
  },
  sendError: {
    fontSize: 12,
    color: colors.errorText,
    textAlign: "center",
  },
});
