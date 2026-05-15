import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { TabScreenHeader } from "../../src/components/TabScreenHeader";
import { getSharedSmokeSummary } from "../../src/lib/sharedSmoke";
import { colors } from "../../src/theme/colors";

const PLACEHOLDER_VENUES = [
  { title: "Venue preview", subtitle: "Live heat & check-ins — web only today", meta: "Soon" },
  { title: "Friends nearby", subtitle: "Who’s out tonight — read from web data later", meta: "Soon" },
  { title: "Your block", subtitle: "Home feed shell — no GPS on mobile yet", meta: "2E" },
];

export default function HomeTabScreen() {
  const sharedSmoke = getSharedSmokeSummary();

  return (
    <Screen scroll edges={["top", "left", "right"]}>
      <TabScreenHeader
        title="Live city"
        subtitle="Read-only shell for venues and friends. Production map and presence still run on web/PWA."
      />

      <ShellCard
        title="Tonight’s pulse"
        description="Placeholder for hub-style venue energy and friend activity. No live data in Phase 2E."
        style={styles.cardSpacing}
      >
        {PLACEHOLDER_VENUES.map((row, index) => (
          <ShellListRow
            key={row.title}
            title={row.title}
            subtitle={row.subtitle}
            meta={row.meta}
            isLast={index === PLACEHOLDER_VENUES.length - 1}
          />
        ))}
      </ShellCard>

      <ShellCard
        title="Map & presence"
        description="Native map and physical presence authority are future phases. Web continues to write user_presence."
        style={styles.cardSpacing}
      />

      <View style={styles.smoke}>
        <Text style={styles.smokeText}>
          @intencity/shared · MAP_ACTIVITY_WINDOW_MS {sharedSmoke.mapActivityWindowMs}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardSpacing: {
    marginBottom: 14,
  },
  smoke: {
    marginTop: 4,
    paddingVertical: 8,
  },
  smokeText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
});
