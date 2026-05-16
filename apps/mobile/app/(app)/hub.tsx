import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { HubSharePreviewCard } from "../../src/components/HubSharePreviewCard";
import { Screen } from "../../src/components/Screen";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { SectionHeader } from "../../src/components/SectionHeader";
import { SearchFieldPlaceholder } from "../../src/components/SearchFieldPlaceholder";
import { StoryRingPlaceholder } from "../../src/components/StoryRingPlaceholder";
import { VenueChipPlaceholder } from "../../src/components/VenueChipPlaceholder";
import { FriendHubRing } from "../../src/components/FriendHubRing";
import { useAcceptedFriends } from "../../src/hooks/useAcceptedFriends";
import { useHubFeedPreview } from "../../src/hooks/useHubFeedPreview";
import { useVenuesPreview } from "../../src/hooks/useVenuesPreview";
import { getSharedSmokeSummary } from "../../src/lib/sharedSmoke";
import { venueChipMeta } from "../../src/lib/venueDisplay";
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
  const { friends, loading: friendsLoading, error: friendsError } = useAcceptedFriends(user?.id);
  const { venues, loading: venuesLoading, error: venuesError } = useVenuesPreview(Boolean(user?.id));
  const { shares, loading: sharesLoading, error: sharesError } = useHubFeedPreview(user?.id, friends, friendsLoading);
  const sharedSmoke = getSharedSmokeSummary();

  const momentsAction =
    !friendsLoading && friends.length > 0 ? `${friends.length} friends` : undefined;

  const livePlacesAction =
    venuesLoading ? undefined : venuesError ? undefined : venues.length > 0 ? `${venues.length} places` : undefined;

  const sharesAction =
    sharesLoading ? undefined : sharesError ? undefined : shares.length > 0 ? `${shares.length}` : undefined;

  return (
    <Screen scroll edges={["top", "left", "right"]} tabBarInset>
      <ScreenHeader title="Hub" subtitle="Live the city, feel the intencity." />
      <SearchFieldPlaceholder />

      <SectionHeader title="Moments" actionLabel={momentsAction} />
      {friendsError ? <Text style={styles.inlineError}>{friendsError}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        style={styles.railScroll}
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
      <SectionHeader title="Active friends" />
      <View style={styles.activeFriendsCard}>
        <Text style={styles.activeFriendsTitle}>No friends live right now</Text>
        <Text style={styles.activeFriendsBody}>
          When people step out, they surface here first. Live presence stays on web/PWA — native Hub is read-only
          for presence in this phase.
        </Text>
      </View>

      <View style={styles.divider} />

      <SectionHeader title="Live places" actionLabel={livePlacesAction ?? "Map tab"} />
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

      <SectionHeader title="Shares" actionLabel={sharesAction} />
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
  rail: {
    gap: 12,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: 2,
    alignItems: "flex-start",
  },
  sectionSpacer: {
    height: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginVertical: layout.sectionGap,
    opacity: 0.9,
  },
  activeFriendsCard: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 6,
  },
  activeFriendsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  activeFriendsBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  friendsLoading: {
    width: 64,
    height: 88,
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
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 16,
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
});
