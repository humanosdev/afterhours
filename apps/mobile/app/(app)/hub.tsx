import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { SectionHeader } from "../../src/components/SectionHeader";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { SearchFieldPlaceholder } from "../../src/components/SearchFieldPlaceholder";
import { StoryRingPlaceholder } from "../../src/components/StoryRingPlaceholder";
import { VenueChipPlaceholder } from "../../src/components/VenueChipPlaceholder";
import { FriendHubRing } from "../../src/components/FriendHubRing";
import { useAcceptedFriends } from "../../src/hooks/useAcceptedFriends";
import { getSharedSmokeSummary } from "../../src/lib/sharedSmoke";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";
import { layout } from "../../src/theme/layout";

const FEED_ROWS = [
  { title: "Rittenhouse pulse", subtitle: "Venue heat · friends checked in" },
  { title: "Tonight near you", subtitle: "Live places preview" },
];

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
  const sharedSmoke = getSharedSmokeSummary();

  const momentsAction =
    !friendsLoading && friends.length > 0 ? `${friends.length} friends` : undefined;

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

      <SectionHeader title="Live places" actionLabel="See map" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        style={styles.railScroll}
      >
        <VenueChipPlaceholder name="The Franklin" meta="Warm · 12 nearby" />
        <VenueChipPlaceholder name="Bob & Barbara's" meta="Buzzing" />
        <VenueChipPlaceholder name="Vinyl" meta="Chill" />
      </ScrollView>

      <SectionHeader title="Feed" />
      <ShellCard>
        {FEED_ROWS.map((row, index) => (
          <ShellListRow
            key={row.title}
            title={row.title}
            subtitle={row.subtitle}
            isLast={index === FEED_ROWS.length - 1}
          />
        ))}
      </ShellCard>

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
  friendsLoading: {
    width: 64,
    height: 88,
    justifyContent: "center",
    alignItems: "center",
  },
  friendsHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: layout.sectionGap,
    paddingHorizontal: layout.screenPaddingX,
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
