import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchActiveMomentsByUserIds } from "../../../src/lib/fetchActiveMoments";
import { hubFriendStoryRingState, hubOwnStoryRingState, firstUnseenStoryIndex } from "../../../src/lib/storyRingState";
import { buildHubViewerQueue } from "../../../src/lib/storyViewerNavigation";
import { resolveAvatarUri } from "../../../src/lib/avatar";
import { prefetchStoryMediaUri } from "../../../src/lib/prefetchStoryMedia";
import { warmStoryViewerDeckAsync } from "../../../src/lib/warmStoryViewerDeck";
import type { StoryViewerStory } from "../../../src/lib/storyViewerTypes";
import { subscribeStoryViewed } from "../../../src/lib/storyViewEvents";
import {
  getCachedViewedStoryIds,
  mergeCachedViewedStoryId,
  setCachedViewedStoryIds,
} from "../../../src/lib/storyViewedCache";
import { fetchViewedStoryIds } from "../../../src/lib/storyViews";
import { supabase } from "../../../src/lib/supabase/client";
import type { StoryViewerGroup } from "../../../src/lib/storyViewerTypes";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HubShareFeedList } from "../../../src/components/shares/HubShareFeedList";
import { HubTopChrome } from "../../../src/components/HubTopChrome";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { HubActiveFriendChip } from "../../../src/components/hub/HubActiveFriendChip";
import { HubSearchLauncher } from "../../../src/components/hub/HubSearchLauncher";
import { HubSuggestedFriendsCoach } from "../../../src/components/hub/HubSuggestedFriendsCoach";
import { shouldShowHubSuggestionsOnHubVisit, clearHubSuggestionsPending } from "../../../src/lib/appOpenPreference";
import { OwnMomentRing } from "../../../src/components/hub/OwnMomentRing";
import { FriendHubRing } from "../../../src/components/FriendHubRing";
import { HubTabPageSkeleton } from "../../../src/components/skeletons/HubTabPageSkeleton";
import {
  getCachedHubMoments,
  hubMomentsCacheKey,
  setCachedHubMoments,
} from "../../../src/lib/hubMomentsCache";
import { StableSlot } from "../../../src/components/ui/StableSlot";
import { hubSlotLayout } from "../../../src/theme/hubSlotLayout";
import { Image } from "expo-image";
import { useAcceptedFriends } from "../../../src/hooks/useAcceptedFriends";
import { useHubFeedPreview } from "../../../src/hooks/useHubFeedPreview";
import { useHubStoriesRealtime } from "../../../src/hooks/useHubStoriesRealtime";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { useTabScrollToTop } from "../../../src/hooks/useTabScrollToTop";
import { useNotificationDeliveryOptional } from "../../../src/providers/NotificationDeliveryProvider";
import {
  fetchHubShareFeedCardStates,
  patchHubShareLikeOptimistic,
  type HubShareFeedCardState,
} from "../../../src/lib/storyFeedInteractions";
import { subscribeShareLikeUpdated } from "../../../src/lib/shareLikeEvents";
import { pickCachedShareStats, patchShareStatsCache } from "../../../src/lib/shareStatsCache";
import { useVenuesPreview } from "../../../src/hooks/useVenuesPreview";
import { useMyAvatar } from "../../../src/hooks/useMyAvatar";
import { getFriendHubActivitySubtitle } from "../../../src/lib/venuePresenceStats";
import {
  isFriendOnlineNow,
  isValidCoordinatePair,
} from "../../../src/lib/presence";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useCreateComposer } from "../../../src/providers/CreateComposerProvider";
import { usePresence } from "../../../src/providers/PresenceProvider";
import { colors } from "../../../src/theme/colors";
import { profileUsernameLabel } from "../../../src/lib/profileDisplay";
import { hubLayout } from "../../../src/theme/hubLayout";
import { mediaLexicon } from "../../../src/content/mediaLexicon";
import { layout } from "../../../src/theme/layout";
import { tabBodyLockedHeight } from "../../../src/theme/tabShellLayout";

/** OwnMomentRing / FriendHubRing column width + hub rail gap. */
const MOMENT_RING_SLOT = 84 + layout.hubRailGap;

export default function HubTabScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { avatarUrl: myAvatarUrl, username: myUsername, loading: avatarLoading } = useMyAvatar();
  const { friends, loading: friendsLoading, error: friendsError, reloadFriends } =
    useAcceptedFriends(user?.id);
  const { presence, presenceLoading, ghostByUserId, friendIdSet, presenceClock } = usePresence();
  const { venues, reload: reloadVenues } = useVenuesPreview(Boolean(user?.id));
  const delivery = useNotificationDeliveryOptional();
  const { openCreateComposer, openStoryViewer, storyEpoch, bumpStoryEpoch } = useCreateComposer();
  const { shares, loading: sharesLoading, error: sharesError, setShares, reload: reloadHubShares } =
    useHubFeedPreview(user?.id, friends, friendsLoading, storyEpoch);
  const [shareStatsById, setShareStatsById] = useState<Record<string, HubShareFeedCardState>>({});
  const [shareStatsReady, setShareStatsReady] = useState(true);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const patchShareStats = useCallback(
    (storyId: string, updater: (prev: HubShareFeedCardState) => HubShareFeedCardState) => {
      const next = patchShareStatsCache(storyId, updater);
      setShareStatsById((prev) => ({ ...prev, [storyId]: next }));
    },
    []
  );
  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const friendIdsKey = useMemo(() => friendIds.slice().sort().join(","), [friendIds]);
  const momentsKey = user?.id ? hubMomentsCacheKey(user.id, friendIds, storyEpoch) : "";
  const initialMoments = momentsKey ? getCachedHubMoments(momentsKey) : null;
  const [momentsByUser, setMomentsByUser] = useState<Map<string, StoryViewerGroup["stories"]>>(
    () => initialMoments ?? new Map()
  );
  const [momentsLoading, setMomentsLoading] = useState(
    () => Boolean(user?.id) && initialMoments == null
  );
  const momentsEverLoadedRef = useRef((initialMoments?.size ?? 0) > 0);
  const prefetchHubMediaKeyRef = useRef("");
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [viewedIdsReady, setViewedIdsReady] = useState(false);
  const [hubSuggestionsVisible, setHubSuggestionsVisible] = useState(false);
  const hubSuggestionsGateDoneRef = useRef(false);
  const hubSuggestionsPendingRef = useRef(false);

  const onlineFriends = useMemo(() => {
    const now = Date.now();
    return presence.filter(
      (p) =>
        friendIdSet.has(p.user_id) &&
        !ghostByUserId[p.user_id] &&
        isValidCoordinatePair(p.lat, p.lng) &&
        isFriendOnlineNow(p.updated_at, now)
    );
  }, [presence, friendIdSet, ghostByUserId, presenceClock]);

  const momentsRailRef = useRef<ScrollView>(null);
  const scrollRef = useRef<ScrollView>(null);
  useTabScrollToTop("hub", scrollRef);

  const reloadHubMoments = useCallback(
    (opts?: { quiet?: boolean }) => {
      if (!user?.id) return;
      const ids = [user.id, ...friendIds];
      const key = hubMomentsCacheKey(user.id, friendIds, storyEpoch);
      const quiet = opts?.quiet ?? momentsEverLoadedRef.current;
      if (!quiet) setMomentsLoading(true);

      void fetchActiveMomentsByUserIds(ids)
        .then((map) => {
          momentsEverLoadedRef.current = map.size > 0;
          setCachedHubMoments(key, map);
          setMomentsByUser(map);
          const allStoryIds = Array.from(map.values()).flat().map((s) => s.id);
          if (allStoryIds.length > 0) {
            const cached = getCachedViewedStoryIds(user.id, allStoryIds);
            if (cached) {
              setViewedIds(cached);
              setViewedIdsReady(true);
            } else {
              setViewedIdsReady(false);
            }
            void fetchViewedStoryIds(supabase, user.id, allStoryIds).then((set) => {
              setViewedIds(set);
              setCachedViewedStoryIds(user.id, allStoryIds, set);
              setViewedIdsReady(true);
            });
          } else {
            setViewedIds(new Set());
            setViewedIdsReady(true);
          }
        })
        .finally(() => {
          setMomentsLoading(false);
        });
    },
    [user?.id, friendIdsKey, friendIds, storyEpoch]
  );

  const refreshHubFeedQuiet = useCallback(() => {
    reloadHubMoments({ quiet: true });
    reloadHubShares({ quiet: true });
  }, [reloadHubMoments, reloadHubShares]);

  useHubStoriesRealtime(user?.id, friendIds, refreshHubFeedQuiet);

  useEffect(() => {
    if (!user?.id) {
      setMomentsByUser(new Map());
      setMomentsLoading(false);
      setViewedIds(new Set());
      setViewedIdsReady(false);
      return;
    }
    const key = hubMomentsCacheKey(user.id, friendIds, storyEpoch);
    const cached = getCachedHubMoments(key);
    if (cached) {
      setMomentsByUser(cached);
      momentsEverLoadedRef.current = cached.size > 0;
      setMomentsLoading(false);
    } else if (!momentsEverLoadedRef.current) {
      setMomentsLoading(true);
    }

    reloadHubMoments({ quiet: momentsEverLoadedRef.current || cached != null });
  }, [user?.id, friendIdsKey, storyEpoch, reloadHubMoments]);

  useEffect(() => {
    return subscribeStoryViewed((storyId) => {
      if (user?.id) mergeCachedViewedStoryId(user.id, storyId);
      setViewedIds((prev) => {
        if (prev.has(storyId)) return prev;
        const next = new Set(prev);
        next.add(storyId);
        return next;
      });
      setViewedIdsReady(true);
    });
  }, [user?.id]);

  const ownStories = momentsByUser.get(user?.id ?? "") ?? [];

  const friendMomentGroups = useMemo(() => {
    return friends
      .map((f) => ({ friend: f, stories: momentsByUser.get(f.id) ?? [] }))
      .filter((row) => row.stories.length > 0)
      .sort((a, b) => {
        const aLatest = a.stories[a.stories.length - 1]?.created_at ?? "";
        const bLatest = b.stories[b.stories.length - 1]?.created_at ?? "";
        return new Date(bLatest).getTime() - new Date(aLatest).getTime();
      });
  }, [friends, momentsByUser]);

  const hubViewerQueue = useMemo(() => {
    const friendGroups: StoryViewerGroup[] = friendMomentGroups.map(({ friend: f, stories }) => ({
      user_id: f.id,
      username: profileUsernameLabel(f, "user"),
      avatar_url: f.avatar_url,
      stories,
    }));
    const ownGroup: StoryViewerGroup | null =
      user?.id && ownStories.length > 0
        ? {
            user_id: user.id,
            username: myUsername,
            avatar_url: myAvatarUrl,
            stories: ownStories,
          }
        : null;
    return buildHubViewerQueue(ownGroup, friendGroups);
  }, [friendMomentGroups, ownStories, user?.id, myUsername, myAvatarUrl]);

  const scrollMomentsRailToGroup = useCallback((groupUserId: string) => {
    const index = hubViewerQueue.findIndex((g) => g.user_id === groupUserId);
    if (index < 0) return;
    const x = Math.max(0, index * MOMENT_RING_SLOT - layout.screenPaddingX);
    momentsRailRef.current?.scrollTo({ x, animated: true });
  }, [hubViewerQueue]);

  const openHubStoryViewer = useCallback(
    (group: StoryViewerGroup, stories: StoryViewerGroup["stories"]) => {
      scrollMomentsRailToGroup(group.user_id);
      const storyIndex = firstUnseenStoryIndex(stories, viewedIds);
      openStoryViewer(group, { storyIndex, queue: hubViewerQueue });
    },
    [openStoryViewer, hubViewerQueue, viewedIds, scrollMomentsRailToGroup]
  );

  const warmMomentDeckOnPressIn = useCallback((stories: StoryViewerStory[]) => {
    if (stories.length > 0) warmStoryViewerDeckAsync(stories);
  }, []);

  useEffect(() => {
    if (friendsLoading) return;
    for (const f of friends) {
      const uri = resolveAvatarUri(f.avatar_url);
      if (uri) void Image.prefetch(uri);
    }
    const mine = resolveAvatarUri(myAvatarUrl);
    if (mine) void Image.prefetch(mine);
  }, [friends, friendsLoading, myAvatarUrl]);

  useEffect(() => {
    if (momentsLoading || sharesLoading) return;
    const momentUrls = Array.from(momentsByUser.values())
      .map((stories) => stories[stories.length - 1]?.media_url)
      .filter(Boolean) as string[];
    const shareUrls = shares.slice(0, 3).map((s) => s.image_url).filter(Boolean);
    const key = `${momentUrls.join("|")}::${shareUrls.join("|")}`;
    if (!key || key === prefetchHubMediaKeyRef.current) return;
    prefetchHubMediaKeyRef.current = key;
    for (const url of momentUrls) void prefetchStoryMediaUri(url);
    for (const url of shareUrls) void prefetchStoryMediaUri(url);
  }, [momentsLoading, sharesLoading, momentsByUser, shares]);

  const shareIdsKey = useMemo(
    () =>
      shares
        .map((s) => s.id)
        .sort()
        .join(","),
    [shares]
  );

  useEffect(() => {
    if (!user?.id || shares.length === 0) {
      setShareStatsReady(true);
      if (shares.length === 0) setShareStatsById({});
      return;
    }
    const ids = shareIdsKey.split(",").filter(Boolean);
    const cached = pickCachedShareStats(ids);
    if (Object.keys(cached).length > 0) {
      setShareStatsById((prev) => ({ ...cached, ...prev }));
    }
    if (Object.keys(cached).length >= ids.length) {
      setShareStatsReady(true);
      return;
    }
    let cancelled = false;
    setShareStatsReady(false);
    void fetchHubShareFeedCardStates(ids, user.id, friendIds).then((patch) => {
      if (cancelled) return;
      setShareStatsById((prev) => ({ ...prev, ...patch }));
      setShareStatsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, shareIdsKey, friendIdsKey, shares.length]);

  const refreshShareStats = useCallback(
    async (storyIds: string[]) => {
      if (!user?.id || storyIds.length === 0) return;
      const patch = await fetchHubShareFeedCardStates(storyIds, user.id, friendIds);
      setShareStatsById((prev) => ({ ...prev, ...patch }));
    },
    [user?.id, friendIds]
  );

  useEffect(() => {
    return subscribeShareLikeUpdated((detail) => {
      patchShareStats(detail.storyId, (cur) => patchHubShareLikeOptimistic(cur, detail.liked));
    });
  }, [patchShareStats]);

  const onCommentsChanged = useCallback((storyId: string, delta: number) => {
    patchShareStats(storyId, (cur) => ({
      ...cur,
      commentsCount: Math.max(0, cur.commentsCount + delta),
    }));
  }, [patchShareStats]);

  const onShareRemoved = useCallback((storyId: string) => {
    setShares((prev) => prev.filter((row) => row.id !== storyId));
    setShareStatsById((prev) => {
      const out = { ...prev };
      delete out[storyId];
      return out;
    });
  }, [setShares]);

  const showActiveFriendsSection = friends.length > 0 || friendsLoading;

  /** Match skeleton geometry while friends band is still resolving — avoids rail ↔ empty height jump. */
  const activeFriendsBlockMinHeight =
    friends.length > 0 || friendsLoading
      ? hubSlotLayout.activeFriendsBlockWithRailMinHeight
      : hubSlotLayout.activeFriendsBlockEmptyMinHeight;

  const hubFeedBusy = useMemo(() => {
    if (!user?.id) return false;
    const momentsGateReady = momentsByUser.size === 0 || viewedIdsReady;
    return friendsLoading || momentsLoading || sharesLoading || !shareStatsReady || !momentsGateReady;
  }, [
    user?.id,
    friendsLoading,
    momentsLoading,
    sharesLoading,
    shareStatsReady,
    momentsByUser.size,
    viewedIdsReady,
  ]);

  const hubSkeletonShowsActiveFriends = friends.length > 0 || friendsLoading || hubFeedBusy;
  const hubSkeletonActiveFriendsLatch = useRef<boolean | null>(null);
  if (hubSkeletonShowsActiveFriends) {
    hubSkeletonActiveFriendsLatch.current = true;
  }
  const hubSkeletonActiveFriends =
    hubSkeletonActiveFriendsLatch.current ?? hubSkeletonShowsActiveFriends;

  const hubPageMinHeight = tabBodyLockedHeight(windowHeight, insets, 0);

  const onHubRefresh = useCallback(async () => {
    await Promise.all([
      reloadFriends({ quiet: true }),
      reloadVenues({ quiet: true }),
      delivery?.refreshUnreadCounts(),
    ]);
    refreshHubFeedQuiet();
  }, [reloadFriends, reloadVenues, delivery, refreshHubFeedQuiet]);

  const { refreshing, onRefresh } = usePullToRefresh(onHubRefresh);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || hubSuggestionsGateDoneRef.current || hubSuggestionsPendingRef.current) return;
      let cancelled = false;
      hubSuggestionsPendingRef.current = true;

      void (async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 450));
          if (cancelled) return;

          const show = await shouldShowHubSuggestionsOnHubVisit(user.id);
          if (cancelled) return;

          hubSuggestionsGateDoneRef.current = true;
          if (!show) return;

          await clearHubSuggestionsPending(user.id);
          setHubSuggestionsVisible(true);
        } finally {
          if (!cancelled) hubSuggestionsPendingRef.current = false;
        }
      })();

      return () => {
        cancelled = true;
        hubSuggestionsPendingRef.current = false;
      };
    }, [user?.id])
  );

  const dismissHubSuggestions = useCallback(() => {
    setHubSuggestionsVisible(false);
  }, []);

  return (
    <Screen
      scroll
      scrollRef={scrollRef}
      edges={["top", "left", "right"]}
      tabBarInset
      refreshing={refreshing}
      onRefresh={onRefresh}
      refreshVariant="hub"
    >
      <StableSlot
        loading={hubFeedBusy}
        skeleton={
          <HubTabPageSkeleton
            showActiveFriends={hubSkeletonActiveFriends}
            minHeight={hubPageMinHeight}
          />
        }
        style={{ minHeight: hubPageMinHeight, flexGrow: 1 }}
        appSessionBoot
        tabBootKey="hub"
        lockHeightWhileLoading
      >
      <>
          <HubTopChrome />
          <HubSearchLauncher />
          <View style={styles.momentsBlock}>
              <SectionHeader title="Moments" prominence="hub" />
              <ScrollView
                ref={momentsRailRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rail}
                style={[styles.railScroll, styles.momentsRail]}
              >
              <OwnMomentRing
                avatarUrl={myAvatarUrl}
                label="Your moment"
                loading={avatarLoading}
                ringState={hubOwnStoryRingState(ownStories, viewedIds, {
                  viewedReady: viewedIdsReady,
                })}
                hasActiveStory={ownStories.length > 0}
                onPressIn={() => warmMomentDeckOnPressIn(ownStories)}
                onPress={() => {
                  if (!user?.id) return;
                  const stories = ownStories;
                  if (stories.length === 0) {
                    openCreateComposer({ mode: "both", tab: "moments" });
                    return;
                  }
                  openHubStoryViewer(
                    {
                      user_id: user.id,
                      username: myUsername,
                      avatar_url: myAvatarUrl,
                      stories,
                    },
                    stories
                  );
                }}
              />
              {friendMomentGroups.map(({ friend: f, stories }) => (
                  <FriendHubRing
                    key={f.id}
                    avatarUrl={f.avatar_url}
                    label={profileUsernameLabel(f, "user")}
                    ringState={hubFriendStoryRingState(stories, viewedIds, {
                      viewedReady: viewedIdsReady,
                    })}
                    onPressIn={() => warmMomentDeckOnPressIn(stories)}
                    onPress={() => {
                      openHubStoryViewer(
                        {
                          user_id: f.id,
                          username: profileUsernameLabel(f, "user"),
                          avatar_url: f.avatar_url,
                          stories,
                        },
                        stories
                      );
                    }}
                  />
              ))}
              </ScrollView>
            {friendsError ? <Text style={styles.inlineError}>{friendsError}</Text> : null}
            {!friendsLoading && !friendsError && friends.length === 0 ? (
              <Text style={styles.friendsHint}>Add friends to see their moments here.</Text>
            ) : null}
          </View>

          {showActiveFriendsSection ? (
            <>
            <View style={styles.majorDivider} />
            <View
              style={{
                minHeight: activeFriendsBlockMinHeight,
              }}
            >
                <SectionHeader
                  title="Active friends"
                  actionLabel="Open friends"
                  onActionPress={() => router.push("/friends")}
                  prominence="hub"
                />
                {onlineFriends.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.railScroll}
                    contentContainerStyle={styles.activeFriendsRail}
                  >
                    {onlineFriends.map((p) => {
                      const friend = friends.find((f) => f.id === p.user_id);
                      const label = friend ? profileUsernameLabel(friend, "Friend") : "Friend";
                      const subtitle = getFriendHubActivitySubtitle(p, venues, Date.now());
                      return (
                        <HubActiveFriendChip
                          key={p.user_id}
                          label={label}
                          subtitle={subtitle}
                          avatarUrl={friend?.avatar_url ?? null}
                          onPress={() => {
                            const un = friend?.username?.trim();
                            if (un) router.push({ pathname: "/u/[username]", params: { username: un } });
                          }}
                        />
                      );
                    })}
                  </ScrollView>
                ) : !friendsLoading ? (
                  <View style={styles.activeFriendsEmpty}>
                    <Text style={styles.activeFriendsBody}>
                      No friends live on the map right now — when someone&apos;s online nearby, they
                      show up here.
                    </Text>
                  </View>
                ) : null}
            </View>
            </>
          ) : null}

          <View style={styles.majorDivider} />

          <View style={styles.sharesBlock}>
            <SectionHeader title={mediaLexicon.hub.sectionTitle} prominence="hub" />
          <View style={styles.sharesFeed}>
          {sharesError ? <Text style={styles.inlineError}>{sharesError}</Text> : null}
          {shares.length === 0 ? (
            <View style={styles.sharesEmptyCard}>
              <Text style={styles.sharesEmptyTitle}>{mediaLexicon.hub.emptyTitle}</Text>
              <Text style={styles.sharesEmptyBody}>{mediaLexicon.hub.emptyBody}</Text>
            </View>
          ) : (
            <HubShareFeedList
              shares={shares}
              shareStatsById={shareStatsById}
              meId={user?.id ?? null}
              openStoryOnTap={false}
              onPatchShareStats={patchShareStats}
              onRefreshShareStats={refreshShareStats}
              onSharesChanged={setShares}
              onShareRemoved={onShareRemoved}
              onCommentsChanged={onCommentsChanged}
            />
          )}
          </View>
          </View>
      </>
      </StableSlot>

      <HubSuggestedFriendsCoach
        visible={hubSuggestionsVisible}
        userId={user?.id ?? ""}
        onDismiss={dismissHubSuggestions}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  momentsBlock: {
    marginBottom: hubLayout.momentsBlockBottom,
  },
  activeFriendsRail: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: hubLayout.railPaddingY,
    paddingBottom: 4,
  },
  majorDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginTop: hubLayout.majorDividerMarginTop,
    marginBottom: hubLayout.majorDividerMarginBottom,
  },
  activeFriendsEmpty: {
    paddingVertical: hubLayout.activeFriendsEmptyPy,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activeFriendsBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textWhite42,
    textAlign: "center",
    maxWidth: 320,
  },
  sharesBlock: {
    marginTop: hubLayout.sharesSectionTop,
  },
  sharesFeed: {
    marginTop: hubLayout.sharesFeedTop,
  },
  railScroll: {
    marginHorizontal: -layout.screenPaddingX,
  },
  momentsRail: {
    marginBottom: 0,
  },
  rail: {
    gap: layout.hubRailGap,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: hubLayout.railPaddingY,
    paddingBottom: hubLayout.railPaddingBottom,
    alignItems: "flex-start",
  },
  sharesStack: {
    marginTop: 2,
  },
  feedTail: {
    marginTop: hubLayout.feedTailHintMarginTop,
    marginBottom: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
    textAlign: "center",
  },
  sharesEmptyCard: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sharesEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  sharesEmptyBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 300,
  },
  friendsHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -4,
    marginBottom: layout.sectionGap,
    paddingHorizontal: 2,
  },
  inlineError: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
});
