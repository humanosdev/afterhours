import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileAvatar } from "../ProfileAvatar";
import { SectionHeader } from "../SectionHeader";
import { Surface } from "../Surface";
import { GlassSearchField } from "../ui/GlassSearchField";
import { Skeleton, SkeletonCircle, SkeletonLine } from "../ui/Skeleton";
import { DiscoveryPeopleTrailing } from "./DiscoveryPeopleTrailing";
import { DiscoverySearchRow } from "./DiscoverySearchRow";
import { VenueDiscoveryThumb } from "./VenueDiscoveryThumb";
import { IntencityRefreshControl } from "../ui/IntencityRefreshControl";
import { useAcceptedFriends } from "../../hooks/useAcceptedFriends";
import { useLocalSearchQuery } from "../../hooks/useLocalSearchQuery";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import { useVenuesPreview } from "../../hooks/useVenuesPreview";
import { LIVE_PLACES_PRESENCE_POLL_MS } from "../../lib/backgroundReadPolicy";
import { buildLivePlacesVenueRows } from "../../lib/livePlaces";
import {
  fetchDiscoverySocialGraph,
  type DiscoverySocialGraph,
} from "../../lib/fetchDiscoverySocialGraph";
import {
  loadSuggestedPeople,
  suggestedPersonSubtitle,
  type SuggestedPersonRow,
} from "../../lib/loadSuggestedPeople";
import { getRecentDiscoverySearches, pushRecentDiscoverySearch, type RecentSearchItem } from "../../lib/recentDiscoverySearches";
import { runDiscoveryPeopleSearch } from "../../lib/runDiscoveryPeopleSearch";
import type { ProfileDiscoveryHit } from "../../lib/searchProfilesDiscovery";
import { formatVenueCategoryLabel } from "../../lib/venueDisplay";
import { supabase } from "../../lib/supabase/client";
import { useFittedPageShell } from "../../hooks/useMinimumSkeleton";
import { useAuth } from "../../providers/AuthProvider";
import { usePresence } from "../../providers/PresenceProvider";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";
import type { VenuePublic } from "../../types/venue";

function displayName(p: { display_name: string | null; username: string | null }): string {
  return p.display_name?.trim() || p.username?.trim() || "User";
}

export function DiscoverySearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);
  const { query, setQuery, debouncedQuery } = useLocalSearchQuery(240);
  const { friends, loading: friendsLoading, reloadFriends } = useAcceptedFriends(user?.id);
  const { venues, loading: venuesLoading, reload: reloadVenues } = useVenuesPreview(Boolean(user?.id));
  const { presence, ghostByUserId, friendIdSet, presenceClock, reloadPresence } = usePresence();

  const [recent, setRecent] = useState<RecentSearchItem[]>([]);
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [exploreReady, setExploreReady] = useState(false);
  const [peopleHits, setPeopleHits] = useState<ProfileDiscoveryHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [friendSet, setFriendSet] = useState<Set<string>>(new Set());
  const [suggestedPeople, setSuggestedPeople] = useState<SuggestedPersonRow[]>([]);
  const [socialGraph, setSocialGraph] = useState<DiscoverySocialGraph | null>(null);

  const showExplore = debouncedQuery.trim().length === 0;
  const exploreBusy = showExplore && (!exploreReady || venuesLoading || friendsLoading);
  const showExploreSkeleton = useFittedPageShell(exploreBusy);
  const showSearchSkeleton = useFittedPageShell(!showExplore && searchLoading);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const reloadExplore = useCallback(async () => {
    if (!user?.id) {
      setExploreReady(false);
      setSocialGraph(null);
      setSuggestedPeople([]);
      return;
    }
    setExploreReady(false);
    const [rows, graph, suggestedRows] = await Promise.all([
      getRecentDiscoverySearches(user.id),
      fetchDiscoverySocialGraph(user.id),
      loadSuggestedPeople(user.id),
    ]);
    setRecent(rows);
    setSocialGraph(graph);
    const blockedEither = new Set([...graph.theyBlockedMe, ...graph.iBlockedThem]);
    setSuggestedPeople(suggestedRows.filter((row) => !blockedEither.has(row.id)));
    setExploreReady(true);
  }, [user?.id]);

  useEffect(() => {
    void reloadExplore();
  }, [reloadExplore]);

  useEffect(() => {
    if (!user?.id || !showExplore) return;
    const id = setInterval(() => {
      void reloadPresence();
    }, LIVE_PLACES_PRESENCE_POLL_MS);
    return () => clearInterval(id);
  }, [user?.id, showExplore, reloadPresence]);

  const onDiscoveryRefresh = useCallback(async () => {
    await Promise.all([
      reloadFriends({ quiet: true }),
      reloadVenues({ quiet: true }),
      reloadExplore(),
    ]);
    if (!showExplore && user?.id && exploreReady) {
      const friendProfiles: ProfileDiscoveryHit[] = friends.map((f) => ({
        id: f.id,
        username: f.username,
        display_name: f.display_name,
        avatar_url: f.avatar_url,
      }));
      setSearchLoading(true);
      const hits = await runDiscoveryPeopleSearch(supabase, user.id, debouncedQuery, friendProfiles);
      setPeopleHits(hits);
      setSearchLoading(false);
    }
  }, [
    reloadFriends,
    reloadVenues,
    reloadExplore,
    showExplore,
    user?.id,
    exploreReady,
    friends,
    debouncedQuery,
  ]);

  const { refreshing, onRefresh } = usePullToRefresh(onDiscoveryRefresh);

  useEffect(() => {
    setFriendSet(new Set(friends.map((f) => f.id)));
  }, [friends]);

  useEffect(() => {
    if (!user?.id || showExplore) {
      setPeopleHits([]);
      setSearchLoading(false);
      return;
    }
    if (!exploreReady) {
      setSearchLoading(true);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const friendProfiles: ProfileDiscoveryHit[] = friends.map((f) => ({
      id: f.id,
      username: f.username,
      display_name: f.display_name,
      avatar_url: f.avatar_url,
    }));
    void runDiscoveryPeopleSearch(supabase, user.id, debouncedQuery, friendProfiles).then(
      (hits) => {
        if (!cancelled) {
          setPeopleHits(hits);
          setSearchLoading(false);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [user?.id, debouncedQuery, showExplore, exploreReady, friends]);

  const venueHits = useMemo(() => {
    const n = debouncedQuery.trim().toLowerCase();
    if (!n) return [];
    return venues.filter((v) => {
      const cat = formatVenueCategoryLabel(v.category).toLowerCase();
      return v.name.toLowerCase().includes(n) || (v.category ?? "").toLowerCase().includes(n) || cat.includes(n);
    });
  }, [venues, debouncedQuery]);

  const friendPeople = useMemo(() => peopleHits.filter((p) => friendSet.has(p.id)), [peopleHits, friendSet]);
  const otherPeople = useMemo(() => peopleHits.filter((p) => !friendSet.has(p.id)), [peopleHits, friendSet]);

  const trending = useMemo(() => {
    return buildLivePlacesVenueRows(
      venues,
      presence,
      friendIdSet,
      user?.id ?? null,
      ghostByUserId,
      Date.now()
    ).slice(0, 16);
  }, [venues, presence, friendIdSet, user?.id, ghostByUserId, presenceClock]);

  const rankedVenueHits = useMemo(() => {
    if (venueHits.length === 0) return [];
    const ranked = buildLivePlacesVenueRows(
      venueHits,
      presence,
      friendIdSet,
      user?.id ?? null,
      ghostByUserId,
      Date.now()
    );
    return ranked;
  }, [venueHits, presence, friendIdSet, user?.id, ghostByUserId, presenceClock]);

  const openUser = useCallback(
    async (p: ProfileDiscoveryHit) => {
      if (!user?.id) return;
      const rows = await pushRecentDiscoverySearch(user.id, {
        kind: "user",
        id: p.id,
        label: displayName(p),
        subtitle: p.username ? `@${p.username.replace(/^@/, "")}` : undefined,
      });
      setRecent(rows);
      const uname = p.username?.replace(/^@/, "");
      if (uname) router.push(`/u/${encodeURIComponent(uname)}`);
    },
    [router, user?.id]
  );

  const openVenue = useCallback(
    async (v: VenuePublic) => {
      if (!user?.id) return;
      const rows = await pushRecentDiscoverySearch(user.id, {
        kind: "venue",
        id: v.id,
        label: v.name,
      });
      setRecent(rows);
      router.push({ pathname: "/(app)/(tabs)/map", params: { venueId: v.id } });
    },
    [router, user?.id]
  );

  const onCancel = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/(tabs)/map");
  };

  const onRespondIncoming = () => {
    router.push("/friends");
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  const graphForTrailing =
    socialGraph ??
    ({
      pendingOut: new Set(),
      pendingIn: new Set(),
      theyBlockedMe: new Set(),
      iBlockedThem: new Set(),
    } satisfies DiscoverySocialGraph);

  function renderPersonRow(p: ProfileDiscoveryHit, keyPrefix: string, mutualLabel?: string) {
    const blockedRow =
      graphForTrailing.iBlockedThem.has(p.id) || graphForTrailing.theyBlockedMe.has(p.id);
    const handle = p.username ? `@${p.username.replace(/^@/, "")}` : "";
    const subtitle = mutualLabel
      ? [handle, mutualLabel].filter(Boolean).join(" · ")
      : handle || undefined;
    return (
      <DiscoverySearchRow
        key={`${keyPrefix}-${p.id}`}
        onPress={() => void openUser(p)}
        leading={
          <ProfileAvatar
            avatarUrl={p.avatar_url}
            label={displayName(p)}
            size={44}
            bordered={false}
          />
        }
        title={displayName(p)}
        subtitle={subtitle}
        trailing={
          <DiscoveryPeopleTrailing
            userId={p.id}
            friendSet={friendSet}
            graph={graphForTrailing}
            onRespondIncoming={onRespondIncoming}
          />
        }
        style={[styles.rowMb, blockedRow && styles.rowBlocked]}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.searchRow}>
          <Surface variant="field" style={styles.searchGlass}>
            <GlassSearchField
              inputRef={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search friends, people, venues..."
              leading={<Search size={17} color="rgba(255,255,255,0.4)" strokeWidth={2} />}
            />
          </Surface>
          <Pressable onPress={onCancel} accessibilityRole="button" style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        nestedScrollEnabled
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={dismissKeyboard}
        refreshControl={
          <IntencityRefreshControl refreshing={refreshing} onRefresh={onRefresh} variant="search" />
        }
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
          <View>
        {!showExplore ? (
          <View style={styles.block}>
            {showSearchSkeleton ? (
              <View style={styles.skelBlock}>
                <SkeletonLine width={120} height={14} />
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={i} style={styles.skelRow}>
                    <SkeletonCircle size={44} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <SkeletonLine width="72%" height={13} />
                      <SkeletonLine width="40%" height={11} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>People</Text>
                {friendPeople.length === 0 && otherPeople.length === 0 ? (
                  <Text style={styles.empty}>No people found.</Text>
                ) : (
                  <View style={styles.listGap}>
                    {friendPeople.length > 0 ? (
                      <View>
                        <Text style={styles.subsection}>Friends</Text>
                        {friendPeople.map((p) => renderPersonRow(p, "f"))}
                      </View>
                    ) : null}
                    {otherPeople.length > 0 ? (
                      <View>
                        {friendPeople.length > 0 ? <Text style={styles.subsection}>People</Text> : null}
                        {otherPeople.map((p) => renderPersonRow(p, "p"))}
                      </View>
                    ) : null}
                  </View>
                )}

                <Text style={[styles.sectionTitle, styles.sectionTop]}>Venues</Text>
                {rankedVenueHits.length === 0 ? (
                  <Text style={styles.empty}>No venues found.</Text>
                ) : (
                  <View style={styles.listGap}>
                    {rankedVenueHits.map((v) => (
                      <DiscoverySearchRow
                        key={v.id}
                        onPress={() => void openVenue(v)}
                        leading={<VenueDiscoveryThumb venue={v} size={44} />}
                        title={v.name}
                        subtitle={
                          v.friendsTotal > 0
                            ? `${v.vibe} · ${v.friendsTotal} friend${v.friendsTotal === 1 ? "" : "s"} live`
                            : `${v.vibe} · ${v.total} here now`
                        }
                        style={styles.rowMb}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        ) : showExploreSkeleton ? (
          <ExploreSkeleton />
        ) : (
          <View style={styles.explore}>
            <SectionHeader
              title="Recent searches"
              actionLabel="See all"
              onActionPress={() => setRecentExpanded((v) => !v)}
            />
            {recent.length === 0 ? (
              <Text style={styles.emptyExplore}>Your recent searches will appear here.</Text>
            ) : recentExpanded ? (
              <View style={styles.listGap}>
                {recent.map((r) => (
                  <Pressable
                    key={`${r.kind}:${r.id}:${r.at}`}
                    onPress={() => {
                      if (r.kind === "user") {
                        const uname = r.subtitle?.replace(/^@/, "");
                        if (uname) router.push(`/u/${encodeURIComponent(uname)}`);
                      } else {
                        const v = venues.find((x) => x.id === r.id);
                        if (v) void openVenue(v);
                        else router.push({ pathname: "/(app)/(tabs)/map", params: { venueId: r.id } });
                      }
                    }}
                    style={styles.recentExpanded}
                  >
                    <Text style={styles.recentExpandedText} numberOfLines={1}>
                      {r.kind === "user" ? r.subtitle || r.label : r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                nestedScrollEnabled
                contentContainerStyle={styles.recentRail}
              >
                {recent.map((r) => (
                  <Surface key={`${r.kind}:${r.id}:${r.at}`} variant="control" style={styles.recentChip}>
                    <Pressable
                      onPress={() => {
                        if (r.kind === "user") {
                          const uname = r.subtitle?.replace(/^@/, "");
                          if (uname) router.push(`/u/${encodeURIComponent(uname)}`);
                        } else {
                          const v = venues.find((x) => x.id === r.id);
                          if (v) void openVenue(v);
                        }
                      }}
                    >
                      <Text style={styles.recentChipText} numberOfLines={1}>
                        {r.kind === "user" ? r.subtitle || r.label : r.label}
                      </Text>
                    </Pressable>
                  </Surface>
                ))}
              </ScrollView>
            )}

            <View style={styles.exploreSection}>
              <SectionHeader title="Suggested friends" />
              {suggestedPeople.length === 0 ? (
                <Text style={styles.emptyExplore}>No suggestions yet — try searching by name.</Text>
              ) : (
                <View style={styles.listGap}>
                  {suggestedPeople.map((row) =>
                    renderPersonRow(
                      {
                        id: row.id,
                        username: row.username,
                        display_name: row.display_name,
                        avatar_url: row.avatar_url,
                      },
                      row.source === "mutual" ? "fof" : "discover",
                      suggestedPersonSubtitle(row)
                    )
                  )}
                </View>
              )}
            </View>

            <View style={styles.exploreSection}>
              <SectionHeader title="Trending venues" />
              <Text style={styles.exploreHint}>
                Ranked by live heat and friend activity — refreshes every 20 seconds.
              </Text>
              {trending.length === 0 ? (
                <Text style={styles.emptyExplore}>No venues in catalog yet.</Text>
              ) : (
                <View style={styles.listGap}>
                  {trending.map((v) => (
                    <DiscoverySearchRow
                      key={v.id}
                      onPress={() => void openVenue(v)}
                      leading={<VenueDiscoveryThumb venue={v} size={48} />}
                      title={v.name}
                      subtitle={
                        v.friendsTotal > 0
                          ? `${v.vibe} · ${v.friendsTotal} friend${v.friendsTotal === 1 ? "" : "s"} live`
                          : `${v.vibe} · ${v.total} here now`
                      }
                      style={styles.rowMb}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
}

function ExploreSkeleton() {
  return (
    <View style={styles.explore}>
      <SkeletonLine width={128} height={15} />
      <View style={styles.recentRail}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ width: 72 + i * 16, height: 36, borderRadius: 999 }} />
        ))}
      </View>
      <SkeletonLine width={140} height={15} style={{ marginTop: 24 }} />
      <SkeletonLine width={200} height={13} style={{ marginTop: 12 }} />
      <SkeletonLine width={120} height={15} style={{ marginTop: 28 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.skelRow}>
          <Skeleton style={{ width: 48, height: 48, borderRadius: 12 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonLine width="62%" height={14} />
            <SkeletonLine width="36%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(10, 12, 24, 0.88)",
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
  },
  searchGlass: {
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
    minHeight: 48,
  },
  cancel: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textWhite78,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: 16,
  },
  block: {
    gap: 8,
  },
  explore: {
    gap: 8,
  },
  exploreSection: {
    marginTop: 24,
  },
  exploreHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite45,
    marginBottom: 10,
    marginTop: -4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionTop: {
    marginTop: 20,
  },
  subsection: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textWhite42,
    marginBottom: 8,
  },
  listGap: {
    gap: 4,
  },
  rowMb: {
    marginBottom: 4,
  },
  rowBlocked: {
    opacity: 0.72,
  },
  empty: {
    fontSize: 13,
    color: colors.textWhite45,
    paddingVertical: 8,
  },
  emptyExplore: {
    fontSize: 13,
    color: colors.textWhite45,
    marginTop: 8,
  },
  recentRail: {
    gap: 8,
    paddingVertical: 4,
    paddingBottom: 4,
  },
  recentChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textWhite85,
    maxWidth: 160,
  },
  recentExpanded: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recentExpandedText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  skelBlock: {
    gap: 12,
  },
  skelRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 8,
  },
});
