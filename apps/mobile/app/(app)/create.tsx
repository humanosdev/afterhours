import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { TabScreenHeader } from "../../src/components/TabScreenHeader";
import { colors } from "../../src/theme/colors";

const CREATE_ROWS = [
  { title: "Share a moment", subtitle: "Stories pipeline — web/PWA production today", meta: "Shell" },
  { title: "Camera & upload", subtitle: "Not wired on native in Phase 2H", meta: "—" },
  { title: "Venue check-in share", subtitle: "Requires stories migration phase", meta: "Soon" },
];

export default function CreateTabScreen() {
  return (
    <Screen scroll edges={["top", "left", "right"]}>
      <TabScreenHeader
        title="Create"
        phaseLabel="Phase 2H · Placeholder"
        subtitle="Center action aligned with web/PWA. No camera, upload, or stories API on native yet."
      />

      <ShellCard
        title="Share & capture"
        description="Placeholder for the web create/share flow. Capture and publish remain on web/PWA."
      >
        {CREATE_ROWS.map((row, index) => (
          <ShellListRow
            key={row.title}
            title={row.title}
            subtitle={row.subtitle}
            meta={row.meta}
            isLast={index === CREATE_ROWS.length - 1}
          />
        ))}
      </ShellCard>

      <View style={styles.hint}>
        <Text style={styles.hintText}>Use web/PWA to create and share until a later migration phase.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: "center",
  },
});
