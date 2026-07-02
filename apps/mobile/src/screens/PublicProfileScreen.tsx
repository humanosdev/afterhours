import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { ProfileMediaGridCell } from "../components/profile/ProfileMediaGridCell";
import { useRouter } from "expo-router";
import { ProfileIdentityBlock } from "../components/profile/ProfileIdentityBlock";
import { MutualFriendsPreview } from "../components/profile/MutualFriendsPreview";
import { ProfileSectionTabs } from "../components/profile/ProfileSectionTabs";
import { ProfileVenuesPanel } from "../components/profile/ProfileVenuesPanel";
import { AppSubpageScreen } from "../components/AppSubpageScreen";
import { ProfilePageSkeleton } from "../components/skeletons/ProfileSkeleton";
import { StableSlot } from "../components/ui/StableSlot";
import { surfaces } from "../theme/surfaces";
import { ProfileMenuAnchor } from "../components/profile/ProfileMenuAnchor";
import { useAuth } from "../providers/AuthProvider";
import { useCreateComposer } from "../providers/CreateComposerProvider";
import { fetchAcceptedFriends } from "../lib/fetchAcceptedFriends";
import { performShareLike } from "../lib/performShareLike";
import { useStoryRingState } from "../hooks/useStoryRingState";
import { firstUnseenStoryIndex } from "../lib/storyRingState";
import {
  fetchFriendRequestStatus,
  fetchProfileForViewer,
  fetchProfileSharesForUser,
  blockUser,
  unfriendUser,
  unblockUser,
  type FriendRequestStatus,
  type PublicProfileRow,
} from "../lib/fetchPublicProfile";
import { getPairBlockStatus, canViewProfileOwnerContent } from "../lib/pairBlockStatus";
import { sendPendingFriendRequestDefault } from "../lib/sendPendingFriendRequest";
import { fetchProfileVenues } from "../lib/fetchProfileVenues";
import { useFriendProfileVenuePill } from "../hooks/useFriendProfileVenuePill";
import { useVenuesPreview } from "../hooks/useVenuesPreview";

import { resolveAvatarUri } from "../lib/avatar";
import { colors } from "../theme/colors";
import { profileLayout } from "../theme/profileLayout";
import type { ProfileShareRow } from "../lib/fetchProfileShares";
import { setMomentDetailSeedFromProfileShare } from "../lib/momentDetailSeedCache";
import { prefetchStoryMediaUri } from "../lib/prefetchStoryMedia";
import { useOpenChatWithUser } from "../hooks/useOpenChatWithUser";
import { fetchMutualFriendsPreview } from "../lib/fetchMutualFriendsPreview";
import type { AcceptedFriendPublic } from "../types/friend";

const TABS = ["Shares", "Venues"] as const;

type PublicProfileScreenProps = {
  username: string;
};

export function PublicProfileScreen({ username }: PublicProfileScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { openStoryViewer, openCreateComposer, storyEpoch } = useCreateComposer();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendRequestStatus>("none");
  const [pairBlock, setPairBlock] = useState<"none" | "you_blocked_them" | "they_blocked_you">("none");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Shares");
  const [shares, setShares] = useState<ProfileShareRow[]>([]);
  const [sharesCount, setSharesCount] = useState(0);
  const [venuesCount, setVenuesCount] = useState(0);
  const [canViewShares, setCanViewShares] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [mutualPreview, setMutualPreview] = useState<AcceptedFriendPublic[]>([]);
  const [mutualTotal, setMutualTotal] = useState(0);
  const [mutualLoadDone, setMutualLoadDone] = useState(false);
  const { openChatWithUser, openingUserId } = useOpenChatWithUser();

  const meId = user?.id ?? null;
  const { venues } = useVenuesPreview(Boolean(meId));
  const themId = profile?.id ?? null;
  const isOwn = !!meId && !!themId && meId === themId;

  const isPrivate = !!profile?.is_private;
  const isFriend = friendStatus === "friends";
  const blockRestricted = pairBlock !== "none" || profile?.block_relation != null;
  const canViewMoments = canViewProfileOwnerContent({
    isOwn,
    isPrivate,
    isFriend,
    blockRestricted,
    profileInactive: profile?.profile_inactive,
  });
  const shouldHideContent = !isOwn && !canViewMoments;
  const showFriendActions = !isOwn && !blockRestricted && !profile?.profile_inactive;
  const showMutualFriendsRow =
    !isOwn &&
    !!meId &&
    mutualLoadDone &&
    !shouldHideContent &&
    !profile?.profile_inactive;

  const friendVenuePill = useFriendProfileVenuePill({
    themId,
    isFriend,
    ghostMode: Boolean(profile?.ghost_mode),
    profileInactive: Boolean(profile?.profile_inactive),
    venues,
  });

  const { stories: theirMomentStories, ringState: friendRingState, viewedIds } = useStoryRingState(
    themId ?? undefined,
    meId ?? undefined,
    {
      refreshKey: storyEpoch,
      enabled: !!themId && !!meId && !isOwn && canViewMoments && !loading,
    }
  );

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    const { profile: row, error } = await fetchProfileForViewer(username);
    if (error === "not_found" || !row) {
      setNotFound(true);
      setProfile(null);
      setLoading(false);
      return;
    }
    setProfile(row);

    let relationStatus: FriendRequestStatus = "friends";
    let relationBlock: typeof pairBlock = "none";
    if (meId && row.id !== meId) {
      const [status, block] = await Promise.all([
        fetchFriendRequestStatus(meId, row.id),
        getPairBlockStatus(meId, row.id),
      ]);
      relationStatus = status;
      relationBlock = block;
      setFriendStatus(status);
      setPairBlock(block);
    } else {
      setFriendStatus("friends");
      setPairBlock("none");
    }

    const shareRes = await fetchProfileSharesForUser(row.id, meId);
    setShares(shareRes.shares);
    setSharesCount(shareRes.count);

    const venuesRes = await fetchProfileVenues(row.id);
    setVenuesCount(venuesRes.venues.length);
    setCanViewShares(shareRes.canView);

    const canSeeFriends =
      row.id === meId ||
      (relationBlock === "none" &&
        row.block_relation == null &&
        (!row.is_private || relationStatus === "friends"));

    if (canSeeFriends) {
      setFriendsLoading(true);
      const friendsRes = await fetchAcceptedFriends(row.id);
      setFriendCount(friendsRes.friends.length);
      setFriendsLoading(false);
    } else {
      setFriendCount(0);
      setFriendsLoading(false);
    }

    setLoading(false);
  }, [username, meId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!meId || !themId || isOwn || profile?.profile_inactive || blockRestricted) {
      setMutualPreview([]);
      setMutualTotal(0);
      setMutualLoadDone(false);
      return;
    }

    if (shouldHideContent) {
      setMutualPreview([]);
      setMutualTotal(0);
      setMutualLoadDone(true);
      return;
    }

    let cancelled = false;
    setMutualLoadDone(false);
    void (async () => {
      const { preview, total } = await fetchMutualFriendsPreview(meId, themId);
      if (cancelled) return;
      setMutualPreview(preview);
      setMutualTotal(total);
      setMutualLoadDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [meId, themId, isOwn, profile?.profile_inactive, blockRestricted, shouldHideContent]);

  useEffect(() => {
    if (!loading && isOwn) {
      router.replace("/profile");
    }
  }, [loading, isOwn, router]);

  const displayName = profile
    ? profile.display_name?.trim() || profile.username
    : "";
  const avatarUrl = profile?.avatar_url ? resolveAvatarUri(profile.avatar_url) : null;

  async function onAddFriend() {
    if (!meId || !themId || requesting) return;
    if (friendStatus === "incoming") {
      Alert.alert("Friend request", "They already sent you a request — open Friends to respond.");
      return;
    }
    setRequesting(true);
    const result = await sendPendingFriendRequestDefault(themId);
    setRequesting(false);
    if (!result.ok) {
      if (result.message.includes("already_friends")) {
        setFriendStatus("friends");
        void load();
        return;
      }
      Alert.alert("Could not send request", result.message);
      return;
    }
    setFriendStatus("outgoing");
  }

  async function onUnfriend() {
    if (!meId || !themId) return;
    const ok = await unfriendUser(meId, themId);
    if (ok) {
      setFriendStatus("none");
      void load();
    }
  }

  async function onBlock() {
    if (!meId || !themId) return;
    Alert.alert("Block user?", "They won't be able to see your profile or message you.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          const result = await blockUser(meId, themId);
          if (result.ok) {
            setPairBlock("you_blocked_them");
            void load();
          } else if (result.message) {
            Alert.alert("Could not block", result.message);
          }
        },
      },
    ]);
  }

  async function onUnblock() {
    if (!meId || !themId) return;
    const result = await unblockUser(meId, themId);
    if (result.ok) {
      setPairBlock("none");
      void load();
    } else if (result.message) {
      Alert.alert("Could not unblock", result.message);
    }
  }

  async function onAvatarPress() {
    if (!profile || !canViewMoments) return;
    const moments = theirMomentStories;
    if (moments.length === 0) {
      setActiveTab("Shares");
      return;
    }
    openStoryViewer(
      {
        user_id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        stories: moments,
      },
      { storyIndex: firstUnseenStoryIndex(moments, viewedIds) }
    );
  }

  async function onShareProfile() {
    if (!profile) return;
    try {
      await Share.share({
        message: `${displayName || profile.username} on Intencity`,
        title: `@${profile.username}`,
      });
    } catch {
      /* dismissed */
    }
  }

  const menuExtraItems = useMemo(() => {
    if (!profile || isOwn) return undefined;
    return pairBlock === "you_blocked_them"
      ? [{ label: "Unblock", onPress: () => void onUnblock() }]
      : [
          ...(isFriend ? [{ label: "Unfriend", onPress: () => void onUnfriend() }] : []),
          { label: "Block", onPress: () => void onBlock(), destructive: true },
        ];
  }, [profile, isOwn, pairBlock, isFriend, meId, themId]);

  const profileMenu =
    profile && !isOwn ? (
      <ProfileMenuAnchor
        open={menuOpen}
        onOpenChange={setMenuOpen}
        accountLabel={`@${profile.username}`}
        extraItems={menuExtraItems}
      />
    ) : null;

  if (notFound) {
    return (
      <AppSubpageScreen title="Profile" subtitle="Not found">
        <Text style={styles.notFound}>This profile doesn&apos;t exist or isn&apos;t available.</Text>
      </AppSubpageScreen>
    );
  }

  return (
    <AppSubpageScreen
      title="Profile"
      subtitle={profile ? `@${profile.username}` : undefined}
      headerRight={profileMenu}
      contentGap={0}
    >
      <StableSlot
        loading={loading || !profile}
        skeleton={<ProfilePageSkeleton tabCount={TABS.length} />}
        variant="section"
      >
        {profile ? (
          <>
            <ProfileIdentityBlock
            compactTop
            displayName={displayName || profile.username}
            username={profile.username}
            avatarUrl={avatarUrl}
            avatarLabel={displayName || profile.username}
            bio={shouldHideContent ? null : profile.bio}
            friendCount={friendCount}
            friendsLoading={friendsLoading}
            venuesCount={venuesCount}
            sharesCount={shouldHideContent ? 0 : sharesCount}
            venueLabel={friendVenuePill.pillLabel}
            venueLive={friendVenuePill.venueLive}
            ringState={canViewMoments ? friendRingState : "none"}
            onAvatarPress={() => void onAvatarPress()}
            onFriendsPress={
              !shouldHideContent && profile.username
                ? () =>
                    router.push({
                      pathname: "/friends",
                      params: { view: profile.username },
                    })
                : undefined
            }
          />

          {showMutualFriendsRow ? (
            <MutualFriendsPreview preview={mutualPreview} total={mutualTotal} />
          ) : null}

          {!showFriendActions ? null : (
            <View style={styles.actionRow}>
              {isFriend ? (
                <>
                  <Pressable
                    style={[styles.primaryBtn, openingUserId === themId && styles.primaryDisabled]}
                    onPress={() => themId && void openChatWithUser(themId)}
                    disabled={!themId || openingUserId === themId}
                    accessibilityRole="button"
                  >
                    {openingUserId === themId ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.primaryBtnLabel}>Message</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => void onShareProfile()}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.shareBtn, pressed && styles.shareBtnPressed]}
                  >
                    <Text style={styles.shareBtnLabel}>Share profile</Text>
                  </Pressable>
                </>
              ) : friendStatus === "outgoing" ? (
                <View style={styles.pendingBtn}>
                  <Text style={styles.pendingLabel}>Request sent</Text>
                </View>
              ) : friendStatus === "incoming" ? (
                <Pressable style={styles.primaryBtn} onPress={() => router.push("/friends")}>
                  <Text style={styles.primaryBtnLabel}>Respond in Friends</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.primaryBtn, requesting && styles.primaryDisabled]}
                  onPress={() => void onAddFriend()}
                  disabled={requesting}
                >
                  {requesting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.primaryBtnLabel}>Add friend</Text>
                  )}
                </Pressable>
              )}
            </View>
          )}

          {shouldHideContent ? (
            <View style={styles.restricted}>
              <Text style={styles.restrictedTitle}>
                {blockRestricted ? "Profile unavailable" : "This account is private"}
              </Text>
              <Text style={styles.restrictedBody}>
                {blockRestricted
                  ? "You can't view this profile right now."
                  : "Add them as a friend to see their shares and moments."}
              </Text>
            </View>
          ) : (
            <>
              <ProfileSectionTabs tabs={TABS} activeTab={activeTab} onTabPress={setActiveTab} />
              {activeTab === "Shares" ? (
                <PublicSharesGrid
                  shares={shares}
                  canView={canViewShares}
                  owner={
                    profile
                      ? {
                          id: profile.id,
                          username: profile.username,
                          avatar_url: profile.avatar_url,
                        }
                      : null
                  }
                  viewerId={user?.id ?? null}
                  onOpenShare={(id) => router.push(`/moments/${id}`)}
                  onNewShare={isOwn ? () => openCreateComposer({ mode: "shares_only", tab: "shares" }) : undefined}
                />
              ) : (
                <ProfileVenuesPanel userId={profile?.id} onCount={setVenuesCount} />
              )}
            </>
          )}
        </>
        ) : null}
      </StableSlot>
    </AppSubpageScreen>
  );
}

function PublicSharesGrid({
  shares,
  canView,
  owner,
  onOpenShare,
  onNewShare,
  viewerId,
}: {
  shares: ProfileShareRow[];
  canView: boolean;
  owner: { id: string; username: string | null; avatar_url: string | null } | null;
  onOpenShare: (id: string) => void;
  onNewShare?: () => void;
  viewerId: string | null;
}) {
  if (!canView) {
    return (
      <View style={styles.restricted}>
        <Text style={styles.restrictedBody}>Shares are only visible to friends.</Text>
      </View>
    );
  }

  return (
    <View style={styles.sharesPanel}>
      <View style={styles.sharesHead}>
        <Text style={styles.sharesTitle}>Shares</Text>
        {onNewShare ? (
          <Pressable onPress={onNewShare} style={styles.newBtn}>
            <Text style={styles.newBtnLabel}>+ New</Text>
          </Pressable>
        ) : null}
      </View>
      {shares.length === 0 ? (
        <Text style={styles.emptyShares}>No shares yet.</Text>
      ) : (
        <View style={styles.grid}>
          {shares.map((s) => (
            <ProfileMediaGridCell
              key={s.id}
              storyId={s.id}
              imageUrl={s.image_url}
              onPressIn={() => {
                if (s.image_url) void prefetchStoryMediaUri(s.image_url);
              }}
              onPress={() => {
                if (owner) {
                  setMomentDetailSeedFromProfileShare(s, owner);
                }
                onOpenShare(s.id);
              }}
              onDoublePress={() => {
                if (!viewerId || !owner) return;
                void performShareLike({
                  storyId: s.id,
                  meId: viewerId,
                  ownerUserId: owner.id,
                  currentlyLiked: false,
                  onOptimistic: () => {},
                });
              }}
              debugLabel={`public-share-${s.id}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: {
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: 24,
  },
  actionRow: {
    flexDirection: "row",
    gap: profileLayout.actionsGap,
    marginTop: profileLayout.actionsTop,
    marginBottom: profileLayout.tabsTop,
  },
  primaryBtn: {
    flex: 1,
    height: profileLayout.actionHeight,
    borderRadius: profileLayout.actionRadius,
    backgroundColor: surfaces.primaryCtaBg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryBtnLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: surfaces.primaryCtaText,
  },
  shareBtn: {
    flex: 1,
    height: profileLayout.actionHeight,
    borderRadius: profileLayout.actionRadius,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: surfaces.border,
  },
  shareBtnPressed: {
    opacity: 0.9,
  },
  shareBtnLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  pendingBtn: {
    flex: 1,
    height: profileLayout.actionHeight,
    borderRadius: profileLayout.actionRadius,
    borderWidth: 1,
    borderColor: surfaces.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: surfaces.surface,
  },
  pendingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textWhite55,
  },
  restricted: {
    paddingVertical: 32,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
  },
  restrictedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  restrictedBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
    textAlign: "center",
    maxWidth: 300,
  },
  sharesPanel: {
    paddingTop: profileLayout.tabContentTop,
  },
  sharesHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sharesTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  newBtn: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newBtnLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  emptyShares: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  cell: {
    width: "32.5%",
    aspectRatio: 1,
    backgroundColor: "#141820",
  },
  cellImage: {
    width: "100%",
    height: "100%",
  },
});
