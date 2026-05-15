import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { GlassSurface } from "../../src/components/GlassSurface";
import { colors } from "../../src/theme/colors";
import { layout } from "../../src/theme/layout";

const MAP_DOTS = [
  { top: "22%", left: "28%" },
  { top: "38%", left: "62%" },
  { top: "55%", left: "44%" },
  { top: "68%", left: "72%" },
];

export default function MapTabScreen() {
  return (
    <Screen edges={["top", "left", "right"]} tabBarInset style={styles.screen}>
      <ScreenHeader title="Map" subtitle="Going-out surface" />

      <View style={styles.canvas}>
        <View style={styles.grid} />
        {MAP_DOTS.map((dot, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === 0 && styles.dotLive,
              { top: dot.top as `${number}%`, left: dot.left as `${number}%` },
            ]}
          />
        ))}
        <GlassSurface style={styles.chipTop} muted>
          <Text style={styles.chipText}>Venues · friends · heat</Text>
        </GlassSurface>
        <GlassSurface style={styles.chipBottom} muted>
          <Text style={styles.chipHint}>Map loads on web today</Text>
        </GlassSurface>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  canvas: {
    flex: 1,
    borderRadius: layout.cardRadius,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#0d1019",
    minHeight: 320,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    backgroundColor: "transparent",
  },
  dot: {
    position: "absolute",
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  dotLive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentActive,
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
    borderRadius: 6,
  },
  chipTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipBottom: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    left: "18%",
    right: "18%",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  chipHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
