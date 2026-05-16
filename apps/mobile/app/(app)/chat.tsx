import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ChatThreadRow } from "../../src/components/ChatThreadRow";
import { GlassSurface } from "../../src/components/GlassSurface";
import { Screen } from "../../src/components/Screen";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { SearchFieldPlaceholder } from "../../src/components/SearchFieldPlaceholder";
import { useChatPreviews } from "../../src/hooks/useChatPreviews";
import { useLocalSearchQuery } from "../../src/hooks/useLocalSearchQuery";
import { matchesLocalSearch, normalizeLocalSearchQuery } from "../../src/lib/localSearch";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";
import { glass } from "../../src/theme/glass";
import { layout } from "../../src/theme/layout";

export default function ChatTabScreen() {
  const { user } = useAuth();
  const { previews, loading, error } = useChatPreviews(user?.id);
  const { query, setQuery, debouncedQuery } = useLocalSearchQuery();

  const filteredPreviews = useMemo(() => {
    if (!normalizeLocalSearchQuery(debouncedQuery)) return previews;
    return previews.filter((p) =>
      matchesLocalSearch(debouncedQuery, p.peerUsername, p.peerDisplayName, p.title, p.preview)
    );
  }, [previews, debouncedQuery]);

  const searchNoMatches =
    !loading &&
    !error &&
    previews.length > 0 &&
    normalizeLocalSearchQuery(debouncedQuery).length > 0 &&
    filteredPreviews.length === 0;

  return (
    <Screen scroll edges={["top", "left", "right"]} tabBarInset>
      <ScreenHeader
        title="Messages"
        subtitle="Chats sync on web/PWA — preview only here"
        trailing={
          <Pressable
            style={styles.newButton}
            accessibilityRole="button"
            accessibilityLabel="New message"
            accessibilityState={{ disabled: true }}
            disabled
          >
            <Text style={styles.newLabel}>New</Text>
          </Pressable>
        }
      />

      <SearchFieldPlaceholder
        placeholder="Search by username, name, or message"
        value={query}
        onChangeText={setQuery}
      />

      <GlassSurface style={styles.listWrap} muted>
        {loading ? (
          <View style={styles.feedbackBlock}>
            <ActivityIndicator accessibilityLabel="Loading chats" />
            <Text style={styles.feedbackText}>Loading conversations…</Text>
          </View>
        ) : error ? (
          <View style={styles.feedbackBlock}>
            <Text style={styles.inlineError}>{error}</Text>
            <Text style={styles.feedbackMuted}>Signed-in reads only — check connection and retry by reopening Messages.</Text>
          </View>
        ) : previews.length === 0 ? (
          <View style={styles.feedbackBlock}>
            <Text style={styles.feedbackText}>No conversations yet</Text>
            <Text style={styles.feedbackMuted}>Open Intencity on web/PWA to start a chat.</Text>
          </View>
        ) : searchNoMatches ? (
          <View style={styles.feedbackBlock}>
            <Text style={styles.feedbackText}>No matches</Text>
            <Text style={styles.feedbackMuted}>
              Nothing in loaded previews matches — try another term or clear the search.
            </Text>
          </View>
        ) : (
          filteredPreviews.map((thread, index) => (
            <ChatThreadRow
              key={thread.chatId}
              name={thread.title}
              preview={thread.preview}
              time={thread.timeLabel}
              unread={thread.unread}
              isLast={index === filteredPreviews.length - 1}
              avatarUrl={thread.avatarUrl}
            />
          ))
        )}
      </GlassSurface>

      <Text style={styles.footnote}>Previews from Supabase — realtime and composing live on web/PWA.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  newButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    ...glass.iconWell,
    opacity: 0.92,
  },
  newLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textWhite78,
  },
  listWrap: {
    borderRadius: layout.cardRadius,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 2,
  },
  feedbackBlock: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  feedbackText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  feedbackMuted: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
    textAlign: "center",
  },
  inlineError: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.danger,
    textAlign: "center",
  },
  footnote: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite42,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
