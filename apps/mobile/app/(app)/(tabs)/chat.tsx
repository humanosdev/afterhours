import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollView as ScrollViewType,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatThreadRow } from "../../../src/components/ChatThreadRow";
import { TabScreenHeader } from "../../../src/components/TabScreenHeader";
import { TextAction } from "../../../src/components/TextAction";
import { ProfileAvatar } from "../../../src/components/ProfileAvatar";
import { Screen } from "../../../src/components/Screen";
import { SearchFieldPlaceholder } from "../../../src/components/SearchFieldPlaceholder";
import { ChatListSkeleton, chatListSkeletonRowsForMinHeight } from "../../../src/components/skeletons/ChatListSkeleton";
import { chatTabChromeAboveListPx } from "../../../src/theme/skeletonLayout";
import { StableSlot } from "../../../src/components/ui/StableSlot";
import { FadeInView } from "../../../src/components/ui/FadeInView";
import { useAcceptedFriends } from "../../../src/hooks/useAcceptedFriends";
import { useChatInboxPrefs } from "../../../src/hooks/useChatInboxPrefs";
import { useChatPreviews } from "../../../src/hooks/useChatPreviews";
import { splitChatPreviews } from "../../../src/lib/splitChatPreviews";
import { useLocalSearchQuery } from "../../../src/hooks/useLocalSearchQuery";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { useTabScrollToTop } from "../../../src/hooks/useTabScrollToTop";
import { getOrCreateChat } from "../../../src/lib/getOrCreateChat";
import { matchesLocalSearch, normalizeLocalSearchQuery } from "../../../src/lib/localSearch";
import { profileUsernameLabel } from "../../../src/lib/profileDisplay";
import { useAuth } from "../../../src/providers/AuthProvider";
import { colors } from "../../../src/theme/colors";
import { tabBodyLockedHeight } from "../../../src/theme/tabShellLayout";

type InboxTab = "chats" | "requests";

export default function ChatTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { user } = useAuth();
  const { previews, loading, error, reload } = useChatPreviews(user?.id);
  const { friends, loading: friendsLoading } = useAcceptedFriends(user?.id);
  const { prefs: inboxPrefs, ready: inboxPrefsReady } = useChatInboxPrefs(user?.id);
  const friendsReady = !friendsLoading;
  const [inboxTab, setInboxTab] = useState<InboxTab>("chats");
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollViewType>(null);
  useTabScrollToTop("chat", scrollRef);

  useFocusEffect(
    useCallback(() => {
      reload({ quiet: true });
    }, [reload])
  );
  const { query, setQuery, debouncedQuery } = useLocalSearchQuery();

  const showFriendPicker =
    friendPickerOpen || normalizeLocalSearchQuery(debouncedQuery).length > 0;

  const friendMatches = useMemo(() => {
    if (!showFriendPicker) return [];
    const q = normalizeLocalSearchQuery(debouncedQuery);
    if (!q) return friends;
    return friends.filter((f) =>
      matchesLocalSearch(q, f.username, f.display_name, profileUsernameLabel(f, ""))
    );
  }, [friends, debouncedQuery, showFriendPicker]);

  const friendIdSet = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  const inboxGateReady = friendsReady && inboxPrefsReady;

  const filteredPreviews = useMemo(() => {
    if (!normalizeLocalSearchQuery(debouncedQuery)) return previews;
    return previews.filter((p) =>
      matchesLocalSearch(debouncedQuery, p.peerUsername, p.peerDisplayName, p.title, p.preview)
    );
  }, [previews, debouncedQuery]);

  const { chatPreviews, requestPreviews } = useMemo(() => {
    if (!inboxGateReady || !inboxPrefs) {
      return { chatPreviews: filteredPreviews, requestPreviews: [] as typeof filteredPreviews };
    }
    return splitChatPreviews(filteredPreviews, friendIdSet, inboxPrefs);
  }, [filteredPreviews, friendIdSet, inboxGateReady, inboxPrefs]);

  const activePreviews = inboxTab === "chats" ? chatPreviews : requestPreviews;
  const requestUnreadCount = useMemo(
    () => requestPreviews.filter((p) => p.unread).length,
    [requestPreviews]
  );

  const listBusy = loading || !inboxGateReady;
  const pageMinHeight = tabBodyLockedHeight(windowHeight, insets, 0);

  const searchNoMatches =
    !listBusy &&
    !error &&
    previews.length > 0 &&
    normalizeLocalSearchQuery(debouncedQuery).length > 0 &&
    activePreviews.length === 0;

  const { refreshing, onRefresh } = usePullToRefresh(() => reload());

  const onStartChat = useCallback(
    async (friendId: string) => {
      if (!user?.id || startingChatId) return;
      setStartError(null);
      setStartingChatId(friendId);
      const result = await getOrCreateChat(user.id, friendId);
      setStartingChatId(null);
      if ("error" in result) {
        setStartError("Could not start chat. Try again.");
        return;
      }
      setFriendPickerOpen(false);
      setQuery("");
      router.push(`/chat/${result.chatId}`);
    },
    [user?.id, startingChatId, router, setQuery]
  );

  return (
    <Screen
      scroll
      scrollRef={scrollRef}
      edges={["top", "left", "right"]}
      tabBarInset
      refreshing={refreshing}
      onRefresh={onRefresh}
      refreshVariant="chat"
    >
      <TabScreenHeader
        title="Messages"
        rightSlot={
          <TextAction
            label="New"
            tone="accent"
            onPress={() => {
              setFriendPickerOpen((v) => !v);
              setStartError(null);
            }}
          />
        }
      />

      <SearchFieldPlaceholder
        variant="field"
        placeholder="Search by username, name, or message"
        value={query}
        onChangeText={setQuery}
      />

      <View style={styles.inboxTabs}>
        <Pressable
          onPress={() => setInboxTab("chats")}
          style={[styles.inboxTab, inboxTab === "chats" && styles.inboxTabActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: inboxTab === "chats" }}
        >
          <Text style={[styles.inboxTabLabel, inboxTab === "chats" && styles.inboxTabLabelActive]}>
            Chats
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setInboxTab("requests")}
          style={[styles.inboxTab, inboxTab === "requests" && styles.inboxTabActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: inboxTab === "requests" }}
        >
          <Text style={[styles.inboxTabLabel, inboxTab === "requests" && styles.inboxTabLabelActive]}>
            Requests
          </Text>
          <View style={styles.inboxTabBadgeSlot}>
            {inboxGateReady && requestUnreadCount > 0 ? (
              <View style={styles.inboxTabBadge}>
                <Text style={styles.inboxTabBadgeLabel}>
                  {requestUnreadCount > 9 ? "9+" : String(requestUnreadCount)}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>

      <StableSlot
        loading={listBusy}
        skeleton={
          <ChatListSkeleton
            rows={chatListSkeletonRowsForMinHeight(
              Math.max(120, pageMinHeight - chatTabChromeAboveListPx()),
              6
            )}
          />
        }
        style={{ minHeight: Math.max(120, pageMinHeight - chatTabChromeAboveListPx()), flexGrow: 1 }}
        variant="section"
        appSessionBoot
        tabBootKey="chat"
      >
        {showFriendPicker ? (
          <FadeInView contentKey="friend-picker" style={styles.friendPicker}>
            {friendMatches.length === 0 ? (
              <Text style={styles.friendPickerEmpty}>
                {normalizeLocalSearchQuery(debouncedQuery)
                  ? "No users found"
                  : "Add friends to start a conversation"}
              </Text>
            ) : (
              <ScrollView
                style={styles.friendPickerScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {friendMatches.map((f) => {
                  const label = profileUsernameLabel(f, "Friend");
                  const busy = startingChatId === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => void onStartChat(f.id)}
                      disabled={!!startingChatId}
                      style={({ pressed }) => [styles.friendRow, pressed && styles.friendRowPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Message ${label}`}
                    >
                      <ProfileAvatar avatarUrl={f.avatar_url} label={label} size={40} />
                      <View style={styles.friendText}>
                        <Text style={styles.friendName} numberOfLines={1}>
                          {f.display_name?.trim() || f.username || label}
                        </Text>
                        {f.username ? (
                          <Text style={styles.friendHandle} numberOfLines={1}>
                            @{f.username.replace(/^@/, "")}
                          </Text>
                        ) : null}
                      </View>
                      {busy ? <ActivityIndicator size="small" color={colors.accentActive} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </FadeInView>
        ) : null}

        {startError ? <Text style={styles.startError}>{startError}</Text> : null}

        {error ? (
          <View style={styles.feedbackBlock}>
            <Text style={styles.inlineError}>{error}</Text>
            <Text style={styles.feedbackMuted}>Check your connection and try reopening Messages.</Text>
          </View>
        ) : previews.length === 0 ? (
          <View style={styles.feedbackBlock}>
            <Text style={styles.feedbackTitle}>Your night starts in the DMs</Text>
            <Text style={styles.feedbackMuted}>
              Tap New above or start a conversation from a friend&apos;s profile.
            </Text>
          </View>
        ) : searchNoMatches ? (
          <View style={styles.feedbackBlock}>
            <Text style={styles.feedbackTitle}>No matches</Text>
            <Text style={styles.feedbackMuted}>Try another search term or clear the filter.</Text>
          </View>
        ) : activePreviews.length === 0 ? (
          <View style={styles.feedbackBlock}>
            <Text style={styles.feedbackTitle}>
              {inboxTab === "requests" ? "No message requests" : "No chats yet"}
            </Text>
            <Text style={styles.feedbackMuted}>
              {inboxTab === "requests"
                ? "Messages from people you aren't friends with show up here."
                : "Start a conversation from a friend's profile or tap New above."}
            </Text>
          </View>
        ) : (
          activePreviews.map((thread, index) => (
            <ChatThreadRow
              key={thread.chatId}
              name={thread.title}
              preview={thread.preview}
              time={thread.timeLabel}
              unread={thread.unread}
              isLast={index === activePreviews.length - 1}
              avatarUrl={thread.avatarUrl}
              onPress={() => router.push(`/chat/${thread.chatId}`)}
            />
          ))
        )}
      </StableSlot>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inboxTabs: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  inboxTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  inboxTabActive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  inboxTabLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textWhite45,
  },
  inboxTabLabelActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  inboxTabBadgeSlot: {
    minWidth: 18,
    minHeight: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  inboxTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentActive,
  },
  inboxTabBadgeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#000",
  },
  friendPickerScroll: {
    maxHeight: 208,
  },
  friendPicker: {
    marginTop: 10,
    marginBottom: 8,
    maxHeight: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 2,
  },
  friendPickerEmpty: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 13,
    color: colors.textWhite45,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  friendRowPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  friendText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  friendName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  friendHandle: {
    fontSize: 12,
    color: colors.textWhite45,
  },
  startError: {
    fontSize: 13,
    color: colors.danger,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  feedbackBlock: {
    paddingVertical: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 10,
  },
  feedbackTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  feedbackMuted: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textWhite42,
    textAlign: "center",
    maxWidth: 300,
  },
  inlineError: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.danger,
    textAlign: "center",
  },
});
