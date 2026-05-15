import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { SectionHeader } from "../../src/components/SectionHeader";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { SearchFieldPlaceholder } from "../../src/components/SearchFieldPlaceholder";
import { StoryRingPlaceholder } from "../../src/components/StoryRingPlaceholder";
import { VenueChipPlaceholder } from "../../src/components/VenueChipPlaceholder";
import { getSharedSmokeSummary } from "../../src/lib/sharedSmoke";
import { colors } from "../../src/theme/colors";
import { layout } from "../../src/theme/layout";

const FEED_ROWS = [
  { title: "Rittenhouse pulse", subtitle: "Venue heat · friends checked in" },
  { title: "Tonight near you", subtitle: "Live places preview" },
];

export default function HubTabScreen() {
  const sharedSmoke = getSharedSmokeSummary();

  return (
    <Screen scroll edges={["top", "left", "right"]} tabBarInset>
      <ScreenHeader
        title="Hub"
        subtitle="Live the city, feel the intencity."
      />
      <SearchFieldPlaceholder />

      <SectionHeader title="Moments" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        style={styles.railScroll}
      >
        <StoryRingPlaceholder label="Your moment" accent />
        <StoryRingPlaceholder label="Maya" />
        <StoryRingPlaceholder label="Jordan" />
        <StoryRingPlaceholder label="Alex" />
        <StoryRingPlaceholder label="Sam" />
      </ScrollView>

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
  },
  smoke: {
    marginTop: 8,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
    opacity: 0.7,
  },
});
