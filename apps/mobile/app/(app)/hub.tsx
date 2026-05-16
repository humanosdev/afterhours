import { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { HubSharePreviewCard } from "../../src/components/HubSharePreviewCard";
import { HubTopChrome } from "../../src/components/HubTopChrome";
import { GlassSurface } from "../../src/components/GlassSurface";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";
import { SearchFieldPlaceholder } from "../../src/components/SearchFieldPlaceholder";
import { ShellListRow } from "../../src/components/ShellListRow";
import { StoryRingPlaceholder } from "../../src/components/StoryRingPlaceholder";
import { VenueChipPlaceholder } from "../../src/components/VenueChipPlaceholder";
import { FriendHubRing } from "../../src/components/FriendHubRing";
import { useAcceptedFriends } from "../../src/hooks/useAcceptedFriends";
import { useHubFeedPreview } from "../../src/hooks/useHubFeedPreview";
import { useLocalSearchQuery } from "../../src/hooks/useLocalSearchQuery";
import { useVenuesPreview } from "../../src/hooks/useVenuesPreview";
import { matchesLocalSearch, normalizeLocalSearchQuery } from "../../src/lib/localSearch";
import { getSharedSmokeSummary } from "../../src/lib/sharedSmoke";
import { formatVenueCategoryLabel, venueChipMeta } from "../../src/lib/venueDisplay";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";
import { layout } from "../../src/theme/layout";

function friendRingLabel(f: { display_name: string | null; username: string | null }) {
  const d = f.display_name?.trim();
  if (d) return d;
  const u = f.username?.trim();
  if (u) return `@${u}`;
  return "Friend";
}

export default function HubTabScreen() {
  const { user } = useAuth();
  const { query, setQuery, debouncedQuery, intentActive } = useLocalSearchQuery();
  const { friends, loading: friendsLoading, error: friendsError } = useAcceptedFriends(user?.id);
  const { venues, loading: venuesLoading, error: venuesError } = useVenuesPreview(Boolean(user?.id));
  const { shares, loading: sharesLoading, error: sharesError } = useHubFeedPreview(user?.id, friends, friendsLoading);
  const sharedSmoke = getSharedSmokeSummary();

  const friendMatches = useMemo(() => {
    if (!normalizeLocalSearchQuery(debouncedQuery)) return [];
    return friends.filter((f) =>
      matchesLocalSearch(debouncedQuery, friendRingLabel(f), f.username, f.display_name)
    );
  }, [friends, debouncedQuery]);

  const venueMatches = useMemo(() => {
    if (!normalizeLocalSearchQuery(debouncedQuery)) return [];
    return venues.filter((v) =>
      matchesLocalSearch(debouncedQuery, v.name, v.category, formatVenueCategoryLabel(v.category))
    );
  }, [venues, debouncedQuery]);

  const shareMatches = useMemo(() => {
    if (!normalizeLocalSearchQuery(debouncedQuery)) return [];
    return shares.filter((s) => matchesLocalSearch(debouncedQuery, s.username));
  }, [shares, debouncedQuery]);

  const searchPendingDebounce = intentActive && normalizeLocalSearchQuery(debouncedQuery).length === 0;

  const searchHasNoHits =
    intentActive &&
    normalizeLocalSearchQuery(debouncedQuery).length > 0 &&
    friendMatches.length === 0 &&
    venueMatches.length === 0 &&
    shareMatches.length === 0;

  const momentsAction =
    !friendsLoading && friends.length > 0 ? `${friends.length} friends` : undefined;

  const livePlacesAction =
    venuesLoading ? undefined : venuesError ? undefined : venues.length > 0 ? `${venues.length} places` : undefined;

  const sharesAction =
    sharesLoading ? undefined : sharesError ? undefined : shares.length > 0 ? `${shares.length}` : undefined;

  return (
    <Screen scroll edges={["top", "left", "right"]} tabBarInset>
      <HubTopChrome />
      <SearchFieldPlaceholder value={query} onChangeText={setQuery} />

      {intentActive ? (
        <View style={styles.hubSearchWrap}>
          <GlassSurface style={styles.hubSearchSurface} muted>
            {searchPendingDebounce ? (
              <Text style={styles.hubSearchPending}>Applying filter…</Text>
            ) : null}
            {searchHasNoHits ? (
              <Text style={styles.hubSearchEmpty}>No matches in loaded Hub data.</Text>
            ) : null}
            {!searchPendingDebounce && !searchHasNoHits && friendMatches.length > 0 ? (
              <>
                <Text style={styles.hubSearchHeading}>Friends</Text>
                {friendMatches.map((f, i) => (
                  <ShellListRow
                    key={f.id}
                    title={friendRingLabel(f)}
                    subtitle={f.username ? `@${f.username.replace(/^@/, "")}` : undefined}
                    isLast={i === friendMatches.length - 1 && venueMatches.length === 0 && shareMatches.length === 0}
                  />
                ))}
                {venueMatches.length + shareMatches.length > 0 ? <View style={styles.hubSearchRule} /> : null}
              </>
            ) : null}
            {!searchPendingDebounce && !searchHasNoHits && venueMatches.length > 0 ? (
              <>
                <Text style={styles.hubSearchHeading}>Places</Text>
                {venueMatches.map((v, i) => (
                  <ShellListRow
                    key={v.id}
                    title={v.name}
                    subtitle={formatVenueCategoryLabel(v.category)}
                    isLast={i === venueMatches.length - 1 && shareMatches.length === 0}
                  />
                ))}
                {shareMatches.length > 0 ? <View style={styles.hubSearchRule} /> : null}
              </>
            ) : null}
            {!searchPendingDebounce && !searchHasNoHits && shareMatches.length > 0 ? (
              <>
                <Text style={styles.hubSearchHeading}>Shares</Text>
                {shareMatches.map((s, i) => (
                  <ShellListRow
                    key={s.id}
                    title={s.username}
                    subtitle="Share"
                    isLast={i === shareMatches.length - 1}
                  />
                ))}
              </>
            ) : null}
          </GlassSurface>
          <Text style={styles.hubSearchHint}>Searching loaded friends, venues, and shares only — debounced locally.</Text>
        </View>
      ) : null}

      {!intentActive ? (
        <>
          <SectionHeader title="Moments" actionLabel={momentsAction} prominence="hub" />
          {friendsError ? <Text style={styles.inlineError}>{friendsError}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        style={[styles.railScroll, styles.momentsRail]}
      >
        <StoryRingPlaceholder label="Your moment" accent />
        {friendsLoading ? (
          <View style={styles.friendsLoading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}
        {!friendsLoading &&
          friends.map((f) => (
            <FriendHubRing key={f.id} avatarUrl={f.avatar_url} label={friendRingLabel(f)} />
          ))}
      </ScrollView>
      {!friendsLoading && !friendsError && friends.length === 0 ? (
        <Text style={styles.friendsHint}>Friends you connect with on web/PWA show here.</Text>
      ) : null}

      <View style={styles.sectionSpacer} />
      <SectionHeader title="Active friends" prominence="hub" />

      <View style={styles.activeFriendsCard}>
        <Text style={styles.activeFriendsTitle}>No friends live right now</Text>
        <Text style={styles.activeFriendsBody}>
          When people step out, they surface here first. Live presence stays on web/PWA — native Hub is read-only
          for presence in this phase.
        </Text>
      </View>

      <View style={styles.divider} />

      <SectionHeader title="Live places" actionLabel={livePlacesAction ?? "Map tab"} prominence="hub" />
      {venuesError ? <Text style={styles.inlineError}>{venuesError}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        style={styles.railScroll}
      >
        {venuesLoading ? (
          <View style={styles.venuesLoading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.venuesLoadingCaption}>Loading venues…</Text>
          </View>
        ) : null}
        {!venuesLoading &&
          venues.map((v) => (
            <VenueChipPlaceholder key={v.id} name={v.name} meta={venueChipMeta(v)} />
          ))}
      </ScrollView>
      {!venuesLoading && !venuesError && venues.length === 0 ? (
        <Text style={styles.friendsHint}>No venues returned yet — check Supabase or try again later.</Text>
      ) : null}
      {!venuesLoading && !venuesError && venues.length > 0 ? (
        <Text style={styles.venuesHint}>
          Names and categories sync from Supabase. Live heat and friends near a venue stay on web/PWA.
        </Text>
      ) : null}

      <View style={styles.divider} />

      <SectionHeader title="Shares" actionLabel={sharesAction} prominence="hub" />
      {sharesError ? <Text style={styles.inlineError}>{sharesError}</Text> : null}
      {sharesLoading ? (
        <View style={styles.sharesLoading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.sharesLoadingCaption}>Loading shares…</Text>
        </View>
      ) : null}
      {!sharesLoading && !sharesError && shares.length === 0 ? (
        <Text style={styles.sharesEmpty}>Be the first to share.</Text>
      ) : null}
      {!sharesLoading && shares.length > 0 ? (
        <View style={styles.sharesStack}>
          {shares.map((s) => (
            <HubSharePreviewCard key={s.id} item={s} />
          ))}
        </View>
      ) : null}
        </>
      ) : null}

      <Text style={styles.smoke}>
        shared · {sharedSmoke.mapActivityWindowMs} activity window
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  railScroll: {
    marginHorizontal: -layout.screenPaddingX,
    marginBottom: layout.sectionGap,
  },
  momentsRail: {
    marginBottom: 4,
  },
  rail: {
    gap: layout.hubRailGap,
    paddingHorizontal: layout.screenPaddingX,
    paddingVertical: 6,
    paddingBottom: 8,
    alignItems: "flex-start",
  },
  sectionSpacer: {
    height: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: layout.sectionGap,
  },
  activeFriendsCard: {
    paddingVertical: 18,
    paddingHorizontal: 2,
    gap: 8,
    alignItems: "center",
  },
  activeFriendsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textWhite85,
    textAlign: "center",
  },
  activeFriendsBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textWhite42,
    textAlign: "center",
    maxWidth: 320,
  },
  friendsLoading: {
    width: 84,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  venuesLoading: {
    minWidth: 140,
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  venuesLoadingCaption: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sharesLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sharesLoadingCaption: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sharesEmpty: {
    fontSize: 13,
    color: colors.textWhite42,
    textAlign: "center",
    paddingVertical: 18,
  },
  sharesStack: {
    gap: 14,
    marginBottom: 4,
  },
  friendsHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: layout.sectionGap,
    paddingHorizontal: layout.screenPaddingX,
  },
  venuesHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -6,
    marginBottom: layout.sectionGap,
    paddingHorizontal: layout.screenPaddingX,
    lineHeight: 15,
  },
  inlineError: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  smoke: {
    marginTop: 8,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
    opacity: 0.7,
  },
  hubSearchWrap: {
    marginBottom: layout.sectionGap,
    gap: 8,
  },
  hubSearchSurface: {
    borderRadius: layout.cardRadius,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  hubSearchHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  hubSearchRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },
  hubSearchPending: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  hubSearchEmpty: {
    fontSize: 13,
    color: colors.textWhite42,
    textAlign: "center",
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  hubSearchHint: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
