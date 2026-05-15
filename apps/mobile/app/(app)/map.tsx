import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { TabScreenHeader } from "../../src/components/TabScreenHeader";
import { colors } from "../../src/theme/colors";

export default function MapTabScreen() {
  return (
    <Screen scroll edges={["top", "left", "right"]}>
      <TabScreenHeader
        title="Map"
        phaseLabel="Phase 2H · Placeholder"
        subtitle="Web/PWA map is the production surface. No Mapbox, GPS, or location permissions on native yet."
      />

      <ShellCard
        title="Map shell"
        description="This tab reserves the primary map-centered experience from web. Venue layers, live friends, and presence still run on web/PWA."
        style={styles.cardSpacing}
      >
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderTitle}>Map preview</Text>
          <Text style={styles.mapPlaceholderBody}>
            Placeholder only — no map engine, no expo-location, no user_presence reads.
          </Text>
        </View>
      </ShellCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardSpacing: {
    marginBottom: 14,
  },
  mapPlaceholder: {
    minHeight: 200,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  mapPlaceholderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  mapPlaceholderBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
  },
});
