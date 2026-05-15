import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { TabScreenHeader } from "../../src/components/TabScreenHeader";
import { getSharedSmokeSummary } from "../../src/lib/sharedSmoke";
import { colors } from "../../src/theme/colors";

const PLACEHOLDER_ROWS = [
  { title: "Venue energy", subtitle: "Live heat & check-ins — web/PWA today", meta: "Soon" },
  { title: "Friends nearby", subtitle: "Who’s out tonight — read-only data later", meta: "Soon" },
  { title: "Your feed", subtitle: "Hub shell — no Supabase reads in Phase 2H", meta: "2H" },
];

export default function HubTabScreen() {
  const sharedSmoke = getSharedSmokeSummary();

  return (
    <Screen scroll edges={["top", "left", "right"]}>
      <TabScreenHeader
        title="Hub"
        phaseLabel="Phase 2H · Nav shell"
        subtitle="Placeholder for the web/PWA home feed. Search on web is integrated into surfaces, not a bottom tab."
      />

      <ShellCard
        title="Tonight’s pulse"
        description="Read-only hub shell. Production feed, stories, and venue data remain on web/PWA."
        style={styles.cardSpacing}
      >
        {PLACEHOLDER_ROWS.map((row, index) => (
          <ShellListRow
            key={row.title}
            title={row.title}
            subtitle={row.subtitle}
            meta={row.meta}
            isLast={index === PLACEHOLDER_ROWS.length - 1}
          />
        ))}
      </ShellCard>

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
