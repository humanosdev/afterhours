import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ListRowSkeleton } from "../../src/components/skeletons/ListRowSkeleton";
import { AsyncSection } from "../../src/components/ui/AsyncSection";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Surface } from "../../src/components/Surface";
import { TextAction } from "../../src/components/TextAction";
import { GlassSearchField } from "../../src/components/ui/GlassSearchField";
import { ProfileAvatar } from "../../src/components/ProfileAvatar";
import { IntencityPanel } from "../../src/components/ui/IntencityPanel";
import { Screen } from "../../src/components/Screen";
import { usePullToRefresh } from "../../src/hooks/usePullToRefresh";
import { StackScreenHeader } from "../../src/components/StackScreenHeader";
import { filterFriendsLocal } from "../../src/lib/filterFriendsLocal";
import {
  fetchFriendsListForViewer,
  type ViewerRelationship,
} from "../../src/lib/fetchFriendsListForViewer";
import { useOpenChatWithUser } from "../../src/hooks/useOpenChatWithUser";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";
import { chrome } from "../../src/theme/chrome";
import { layout } from "../../src/theme/layout";
import { profileLayout } from "../../src/theme/profileLayout";
import { surfaces } from "../../src/theme/surfaces";
import type { AcceptedFriendPublic } from "../../src/types/friend";

function friendTitleLine(friend: AcceptedFriendPublic) {
  const d = friend.display_name?.trim();
  if (d) return d;
  const u = friend.username?.trim();
  if (u) return `@${u}`;
  return "Friend";
}

function friendSubtitleLine(friend: AcceptedFriendPublic, extra?: string) {
  const u = friend.username?.trim();
  const handle = u ? `@${u}` : "";
  if (extra) return handle ? `${handle} · ${extra}` : extra;
  if (friend.display_name?.trim() && u) return `@${u}`;
  return handle || "Friend";
}

/** PWA `/profile/friends` — own list or `?view=username` for another user. */
export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ view?: string }>();
  const viewUsername = typeof params.view === "string" ? params.view.trim().toLowerCase() : "";

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<AcceptedFriendPublic[]>([]);
  const [canView, setCanView] = useState(true);
  const [isOwnList, setIsOwnList] = useState(true);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);
  const [viewerMyFriendIds, setViewerMyFriendIds] = useState<Set<string>>(new Set());
  const [viewerRelationship, setViewerRelationship] = useState<ViewerRelationship>("none");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchFriendsListForViewer(user.id, viewUsername || null);
    setFriends(result.friends);
    setCanView(result.canView);
    setIsOwnList(result.isOwnList);
    setViewerMyFriendIds(result.viewerMyFriendIds);
    setViewerRelationship(result.viewerRelationship);
    setTargetLabel(
      result.target
        ? result.target.display_name?.trim() || `@${result.target.username}`
        : null
    );
    setError(result.error);
    setLoading(false);
  }, [user?.id, viewUsername]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredFriends = useMemo(() => filterFriendsLocal(friends, search), [friends, search]);

  const mutualFriends = useMemo(() => {
    if (isOwnList || !user?.id) return [];
    return filteredFriends.filter(
      (f) => f.id !== user.id && viewerMyFriendIds.has(f.id)
    );
  }, [filteredFriends, isOwnList, user?.id, viewerMyFriendIds]);

  const otherFriends = useMemo(() => {
    if (isOwnList || !user?.id) return [];
    return filteredFriends.filter(
      (f) => f.id !== user.id && !viewerMyFriendIds.has(f.id)
    );
  }, [filteredFriends, isOwnList, user?.id, viewerMyFriendIds]);

  const title = viewUsername && targetLabel ? `${targetLabel}'s friends` : "Friends";
  const showSearch = isOwnList || canView;

  const { refreshing, onRefresh } = usePullToRefresh(load);
  const { openChatWithUser, openingUserId } = useOpenChatWithUser();

  return (
    <Screen
      scroll
      edges={["top", "left", "right"]}
      refreshing={refreshing}
      onRefresh={onRefresh}
      refreshVariant="social"
    >
      <StackScreenHeader
        variant="centered"
        title={title}
        rightSlot={
          isOwnList ? (
            <TextAction label="Blocked" onPress={() => router.push("/blocks")} />
          ) : undefined
        }
        onBack={() => router.back()}
      />

      {showSearch ? (
        <Surface variant="field" style={styles.searchGlass}>
          <GlassSearchField
            value={search}
            onChangeText={setSearch}
            placeholder={isOwnList ? "Search your friends" : "Search their friends"}
          />
        </Surface>
      ) : null}

      {isOwnList ? (
        <PressableFindFriends onPress={() => router.push("/search-discovery")} />
      ) : null}

      {!isOwnList && !canView ? (
        <View style={styles.privatePanel}>
          <Text style={styles.privateTitle}>This account is private</Text>
          <Text style={styles.muted}>
            You need to be friends to view their friends list.
          </Text>
          {viewerRelationship === "none" ? (
            <Text style={styles.privateHint}>Send a friend request from their profile.</Text>
          ) : viewerRelationship === "outgoing" ? (
            <Text style={styles.privateHint}>Request sent</Text>
          ) : viewerRelationship === "incoming" ? (
            <Pressable onPress={() => router.push("/friends")} style={styles.respondBtn}>
              <Text style={styles.respondBtnText}>Respond to request</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <AsyncSection loading={loading} skeleton={<ListRowSkeleton rows={8} />} style={styles.listSlot}>
      {error ? (
        <View style={styles.centerBlock}>
          <Text style={styles.err}>{error}</Text>
        </View>
      ) : !canView ? null : friends.length === 0 ? (
        <View style={styles.centerBlock}>
          <Text style={styles.emptyTitle}>
            {isOwnList ? "No friends yet" : "No friends to show yet"}
          </Text>
          <Text style={styles.muted}>
            {isOwnList
              ? "Add people by username to start connecting."
              : "They haven't added friends yet."}
          </Text>
        </View>
      ) : isOwnList ? (
        <FriendsSection
          kicker="Friends"
          rows={filteredFriends}
          emptyTitle={search.trim() ? "No matching friends" : "No friends yet"}
          emptyBody={
            search.trim()
              ? "Try a different search term."
              : "Add people by username to start connecting."
          }
          showFilterEmpty={search.trim().length > 0 && friends.length > 0}
          onMessage={(friendId) => void openChatWithUser(friendId)}
          messagingUserId={openingUserId}
        />
      ) : (
        <View style={styles.viewerSections}>
          <FriendsSection
            kicker="Mutual friends"
            kickerAccent
            rows={mutualFriends}
            emptyTitle="No mutual friends"
            emptyInline
            showMutualLine
          />
          <FriendsSection
            kicker="Not in your friends"
            rows={otherFriends}
            emptyTitle={
              mutualFriends.length > 0
                ? "You're friends with everyone on this list."
                : "No one else on this list."
            }
            emptyInline
          />
        </View>
      )}
      </AsyncSection>
    </Screen>
  );
}

function FriendsSection({
  kicker,
  kickerAccent,
  rows,
  emptyTitle,
  emptyBody,
  emptyInline,
  showFilterEmpty,
  showMutualLine,
  onMessage,
  messagingUserId,
}: {
  kicker: string;
  kickerAccent?: boolean;
  rows: AcceptedFriendPublic[];
  emptyTitle: string;
  emptyBody?: string;
  emptyInline?: boolean;
  showFilterEmpty?: boolean;
  showMutualLine?: boolean;
  onMessage?: (friendId: string) => void;
  messagingUserId?: string | null;
}) {
  return (
    <View style={styles.listSection}>
      <Text style={[styles.listKicker, kickerAccent && styles.listKickerAccent]}>{kicker}</Text>
      {rows.length === 0 ? (
        emptyInline ? (
          <Text style={styles.inlineEmpty}>{emptyTitle}</Text>
        ) : (
          <View style={styles.centerBlock}>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            {emptyBody ? <Text style={styles.muted}>{emptyBody}</Text> : null}
            {showFilterEmpty ? (
              <Text style={styles.muted}>Try a different search term.</Text>
            ) : null}
          </View>
        )
      ) : (
        <IntencityPanel style={styles.friendsPanel}>
          {rows.map((friend, index) => (
            <FriendRow
              key={friend.id}
              friend={friend}
              isLast={index === rows.length - 1}
              mutualLine={showMutualLine ? viewerMutualLine(friend) : undefined}
              onMessage={onMessage}
              messaging={messagingUserId === friend.id}
            />
          ))}
        </IntencityPanel>
      )}
    </View>
  );
}

function viewerMutualLine(friend: AcceptedFriendPublic) {
  const u = friend.username?.trim();
  return u ? `@${u}` : undefined;
}

function PressableFindFriends({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={styles.findRow}>
      <Text style={styles.findLabel}>Find new friends</Text>
    </Pressable>
  );
}

function FriendRow({
  friend,
  isLast,
  mutualLine,
  onMessage,
  messaging,
}: {
  friend: AcceptedFriendPublic;
  isLast: boolean;
  mutualLine?: string;
  onMessage?: (friendId: string) => void;
  messaging?: boolean;
}) {
  const router = useRouter();
  const title = friendTitleLine(friend);
  const uname = friend.username?.replace(/^@/, "");
  const subtitle = mutualLine
    ? `Friends with you · ${mutualLine}`
    : friendSubtitleLine(friend);

  return (
    <View style={[styles.friendRow, !isLast && styles.friendRowBorder]}>
      <Pressable
        style={styles.friendRowMain}
        onPress={() => {
          if (uname) router.push(`/u/${encodeURIComponent(uname)}`);
        }}
        accessibilityRole="button"
        disabled={!uname}
      >
        <ProfileAvatar avatarUrl={friend.avatar_url ?? null} label={title} size={44} bordered />
        <View style={styles.friendText}>
          <Text style={styles.friendTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text
            style={[styles.friendSubtitle, mutualLine && styles.friendSubtitleMutual]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </Pressable>
      {onMessage ? (
        <Pressable
          onPress={() => onMessage(friend.id)}
          disabled={messaging}
          style={({ pressed }) => [styles.messageBtn, pressed && styles.messageBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Message ${title}`}
        >
          {messaging ? (
            <ActivityIndicator size="small" color={colors.accentActive} />
          ) : (
            <Text style={styles.messageBtnLabel}>Message</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listSlot: {
    minHeight: 432,
  },
  searchGlass: {
    borderRadius: layout.cardRadius,
    overflow: "hidden",
    marginBottom: 8,
  },
  findRow: {
    alignItems: "flex-end",
    marginTop: 4,
    marginBottom: layout.sectionGap,
  },
  findLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentActive,
  },
  privatePanel: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: profileLayout.actionRadius,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 14,
    gap: 6,
  },
  privateTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  privateHint: {
    fontSize: 12,
    color: colors.textWhite65,
    marginTop: 6,
  },
  respondBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: profileLayout.actionRadius,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  respondBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.bgPrimary,
  },
  centerBlock: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  inlineEmpty: {
    fontSize: 14,
    color: colors.textWhite45,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  err: {
    fontSize: 14,
    color: colors.danger,
    textAlign: "center",
    lineHeight: 20,
  },
  viewerSections: {
    gap: 20,
  },
  listSection: {
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  friendsPanel: {
    borderRadius: profileLayout.actionRadius,
  },
  listKicker: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textWhite50,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  listKickerAccent: {
    color: "rgba(110, 231, 183, 0.85)",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  friendRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  messageBtn: {
    borderRadius: profileLayout.actionRadius,
    borderWidth: 1,
    borderColor: surfaces.border,
    backgroundColor: surfaces.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBtnPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  messageBtnLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  friendRowBorder: {
    borderBottomWidth: chrome.hairlineWidth,
    borderBottomColor: chrome.listDivider,
  },
  friendText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  friendTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  friendSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  friendSubtitleMutual: {
    color: "rgba(167, 243, 208, 0.55)",
  },
});
