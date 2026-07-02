import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View, useWindowDimensions, type ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileIdentityBlock } from "../../../src/components/profile/ProfileIdentityBlock";
import { ProfileSectionTabs } from "../../../src/components/profile/ProfileSectionTabs";
import { ProfileVenuesIntroCoach } from "../../../src/components/profile/ProfileVenuesIntroCoach";
import { TabScreenHeader } from "../../../src/components/TabScreenHeader";
import { ProfileMenuAnchor } from "../../../src/components/profile/ProfileMenuAnchor";
import { ProfileTabGrid } from "../../../src/components/profile/ProfileTabGrid";
import { Screen } from "../../../src/components/Screen";
import { ProfilePageSkeleton } from "../../../src/components/skeletons/ProfileSkeleton";
import { tabScreenHeaderChromeHeight } from "../../../src/theme/skeletonLayout";
import { StableSlot } from "../../../src/components/ui/StableSlot";
import { useAcceptedFriends } from "../../../src/hooks/useAcceptedFriends";
import { useMyAvatar } from "../../../src/hooks/useMyAvatar";
import { useMyVenuePresence } from "../../../src/hooks/useMyVenuePresence";
import { useVenuesPreview } from "../../../src/hooks/useVenuesPreview";
import { useMyProfile } from "../../../src/hooks/useMyProfile";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { useTabScrollToTop } from "../../../src/hooks/useTabScrollToTop";
import { fetchMyProfileShares } from "../../../src/lib/fetchProfileShares";
import { fetchProfileVenues } from "../../../src/lib/fetchProfileVenues";
import { profileAvatarLabel, profileDisplayName } from "../../../src/lib/profileDisplay";
import {
  getCachedProfileShares,
  setCachedProfileShares,
} from "../../../src/lib/profileSharesCache";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useCreateComposer } from "../../../src/providers/CreateComposerProvider";
import { useStoryRingState } from "../../../src/hooks/useStoryRingState";
import { firstUnseenStoryIndex } from "../../../src/lib/storyRingState";
import {
  recordProfileVenuesIntroSeen,
  shouldShowProfileVenuesIntro,
} from "../../../src/lib/profileVenuesIntroPreference";
import { colors } from "../../../src/theme/colors";
import { surfaces } from "../../../src/theme/surfaces";
import { profileLayout } from "../../../src/theme/profileLayout";
import { tabBodyLockedHeight } from "../../../src/theme/tabShellLayout";

const TABS = ["Shares", "Archive", "Venues"] as const;

export default function ProfileTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, error: profileError, refresh: refreshProfile } =
    useMyProfile(user?.id);
  const { avatarUrl: myAvatarUrl, label: myAvatarLabel, displayName: myDisplayName } = useMyAvatar();
  const { friends, loading: friendsLoading, reloadFriends } = useAcceptedFriends(user?.id);
  const { venues } = useVenuesPreview(Boolean(user?.id));
  const myVenue = useMyVenuePresence(user?.id, venues);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Shares");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sharesCount, setSharesCount] = useState(0);
  const [venuesCount, setVenuesCount] = useState(0);
  const [venuesReady, setVenuesReady] = useState(() => !user?.id);
  const [venuesIntroVisible, setVenuesIntroVisible] = useState(false);
  const [sharesReady, setSharesReady] = useState(
    () => !user?.id || getCachedProfileShares(user.id) != null
  );
  const scrollRef = useRef<ScrollView>(null);
  const venuesIntroGateDoneRef = useRef(false);
  const venuesIntroPendingRef = useRef(false);
  useTabScrollToTop("profile", scrollRef);
  const { openCreateComposer, openStoryViewer, storyEpoch, bumpStoryEpoch } = useCreateComposer();
  const { stories: ownMomentStories, ringState: profileRingState, viewedIds } = useStoryRingState(
    user?.id,
    user?.id,
    { refreshKey: storyEpoch }
  );

  const displayName = myDisplayName ?? profileDisplayName(profile) ?? "";
  const avatarLabel = myAvatarLabel;
  const username = profile?.username?.trim() ?? null;
  const bio = profile?.bio?.trim() ?? null;
  const handle = username ?? user?.email?.split("@")[0] ?? "user";
  const accountLabel = username ?? handle;

  async function onSignOut() {
    setSignOutError(null);
    try {
      await signOut();
    } catch (e) {
      setSignOutError(e instanceof Error ? e.message : "Sign out failed.");
    }
  }

  const onAvatarPress = useCallback(async () => {
    if (!user?.id) return;
    const stories = ownMomentStories;
    if (stories.length === 0) {
      openCreateComposer({ mode: "both", tab: "moments" });
      return;
    }
    openStoryViewer(
      {
        user_id: user.id,
        username: username ?? handle,
        avatar_url: myAvatarUrl,
        stories,
      },
      { storyIndex: firstUnseenStoryIndex(stories, viewedIds) }
    );
  }, [user?.id, username, handle, myAvatarUrl, ownMomentStories, viewedIds, openCreateComposer, openStoryViewer]);

  async function onShareProfile() {
    const title = `${displayName || handle} on Intencity`;
    try {
      await Share.share({ message: title, title });
    } catch {
      /* user dismissed */
    }
  }

  const onProfileRefresh = useCallback(async () => {
    await Promise.all([refreshProfile(), reloadFriends({ quiet: true })]);
    bumpStoryEpoch();
  }, [refreshProfile, reloadFriends, bumpStoryEpoch]);

  const { refreshing, onRefresh } = usePullToRefresh(onProfileRefresh);

  /** Warm shares cache on mount — keep page shell until grid data is ready (avoids second grid skeleton). */
  useEffect(() => {
    if (!user?.id) {
      setSharesReady(true);
      return;
    }
    const cached = getCachedProfileShares(user.id);
    if (cached) {
      setSharesReady(true);
      setSharesCount(cached.count);
      return;
    }
    setSharesReady(false);
    let cancelled = false;
    void fetchMyProfileShares(user.id, { skipHubFallback: true }).then(({ shares, count, error }) => {
      if (cancelled) return;
      if (!error) {
        setCachedProfileShares(user.id, shares, count);
        setSharesCount(count);
      }
      setSharesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, storyEpoch]);

  useEffect(() => {
    if (!user?.id) {
      setVenuesCount(0);
      setVenuesReady(true);
      return;
    }
    setVenuesReady(false);
    let cancelled = false;
    void fetchProfileVenues(user.id).then(({ venues }) => {
      if (!cancelled) {
        setVenuesCount(venues.length);
        setVenuesReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, storyEpoch]);

  const identityShellBusy = profileLoading || friendsLoading || !sharesReady || !venuesReady;
  const profilePageMinHeightPx = tabBodyLockedHeight(windowHeight, insets, 0);

  const maybeShowVenuesIntro = useCallback(async () => {
    if (!user?.id || venuesIntroGateDoneRef.current || venuesIntroPendingRef.current) return;
    venuesIntroPendingRef.current = true;

    try {
      const show = await shouldShowProfileVenuesIntro(user.id);
      if (!show) {
        venuesIntroGateDoneRef.current = true;
        return;
      }

      await recordProfileVenuesIntroSeen(user.id);
      venuesIntroGateDoneRef.current = true;
      setVenuesIntroVisible(true);
    } finally {
      venuesIntroPendingRef.current = false;
    }
  }, [user?.id]);

  const onVenuesStatPress = useCallback(() => {
    setActiveTab("Venues");
    void maybeShowVenuesIntro();
  }, [maybeShowVenuesIntro]);

  const onProfileTabPress = useCallback(
    (tab: (typeof TABS)[number]) => {
      setActiveTab(tab);
      if (tab === "Venues") void maybeShowVenuesIntro();
    },
    [maybeShowVenuesIntro]
  );

  const dismissVenuesIntro = useCallback(() => {
    setVenuesIntroVisible(false);
  }, []);

  return (
    <Screen
      scroll
      scrollRef={scrollRef}
      edges={["top", "left", "right"]}
      tabBarInset
      refreshing={refreshing}
      onRefresh={onRefresh}
      refreshVariant="profile"
    >
      <TabScreenHeader
        title="Profile"
        subtitle={`@${handle}`}
        rightSlot={
          <ProfileMenuAnchor
            open={menuOpen}
            onOpenChange={setMenuOpen}
            onSignOut={onSignOut}
            accountLabel={accountLabel}
          />
        }
      />
      <StableSlot
        style={{
          minHeight: Math.max(360, profilePageMinHeightPx - tabScreenHeaderChromeHeight()),
          flexGrow: 1,
        }}
        loading={identityShellBusy}
        skeleton={
          <ProfilePageSkeleton
            tabCount={TABS.length}
            minHeight={Math.max(360, profilePageMinHeightPx - tabScreenHeaderChromeHeight())}
          />
        }
        variant="section"
        appSessionBoot
        tabBootKey="profile"
      >
        {profileError ? (
          <Text style={styles.profileError}>Couldn&apos;t load your profile. Check connection or try again.</Text>
        ) : null}
        {!profileError && user?.id && !username && !displayName ? (
          <Text style={styles.profileHint}>
            No profile row yet — open Edit profile to finish setup.
          </Text>
        ) : null}

        <ProfileIdentityBlock
          displayName={displayName || avatarLabel}
          username={username}
          avatarUrl={myAvatarUrl}
          avatarLabel={avatarLabel}
          bio={bio}
          friendCount={friends.length}
          friendsLoading={friendsLoading}
          venuesCount={venuesCount}
          sharesCount={sharesCount}
          venueLabel={myVenue.pillLabel}
          venueLive={myVenue.isLiveHere}
          ringState={profileRingState}
          onAvatarPress={() => void onAvatarPress()}
          onFriendsPress={() => router.push("/friends")}
          onVenuesPress={onVenuesStatPress}
        />

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
            onPress={() => router.push("/profile-edit")}
            accessibilityRole="button"
          >
            <Text style={styles.editBtnLabel}>Edit profile</Text>
          </Pressable>
          <Pressable
            onPress={() => void onShareProfile()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.shareBtn, pressed && styles.sharePressed]}
          >
            <Text style={styles.shareBtnLabel}>Share profile</Text>
          </Pressable>
        </View>

        <ProfileSectionTabs tabs={TABS} activeTab={activeTab} onTabPress={onProfileTabPress} />

        <ProfileTabGrid
          tab={activeTab}
          onSharesCount={setSharesCount}
          onVenuesCount={setVenuesCount}
          suppressShellSkeleton
        />
      </StableSlot>

      {signOutError ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{signOutError}</Text>
        </View>
      ) : null}

      <ProfileVenuesIntroCoach visible={venuesIntroVisible} onDismiss={dismissVenuesIntro} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileError: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(253, 230, 138, 0.9)",
  },
  profileHint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite50,
  },
  actionRow: {
    flexDirection: "row",
    gap: profileLayout.actionsGap,
    marginTop: profileLayout.actionsTop,
    marginBottom: profileLayout.tabsTop,
  },
  editBtn: {
    flex: 1,
    height: profileLayout.actionHeight,
    borderRadius: profileLayout.actionRadius,
    backgroundColor: surfaces.primaryCtaBg,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnPressed: {
    opacity: 0.9,
  },
  editBtnLabel: {
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
  sharePressed: {
    opacity: 0.9,
  },
  shareBtnLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  errorBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.dangerMuted,
    marginTop: 16,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});