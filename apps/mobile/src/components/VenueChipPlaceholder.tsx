import { StyleSheet, Text, View } from "react-native";
import { GlassSurface } from "./GlassSurface";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type VenueChipPlaceholderProps = {
  name: string;
  meta: string;
};

/**
 * Venue strip cell — taller rounded card closer to web Live Places (no imagery in 2L).
 */
export function VenueChipPlaceholder({ name, meta }: VenueChipPlaceholderProps) {
  return (
    <GlassSurface style={styles.chip} muted>
      <View style={styles.cover}>
        <Text style={styles.coverInitial} numberOfLines={1}>
          {name.trim().slice(0, 2).toUpperCase() || "·"}
        </Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.activityPill}>
          <Text style={styles.activityLbl}>ACTIVITY</Text>
          <Text style={styles.dot} accessibilityLabel="">
            ●
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          {meta}
        </Text>
      </View>
    </GlassSurface>
  );
}

const CARD_W = 168;

const styles = StyleSheet.create({
  chip: {
    width: CARD_W,
    borderRadius: layout.cardRadius,
    padding: 0,
    overflow: "hidden",
  },
  cover: {
    aspectRatio: 5 / 6,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  coverInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textMuted,
    opacity: 0.65,
    letterSpacing: 1,
  },
  footer: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
  },
  activityPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.accentBrandMuted,
    marginBottom: 2,
  },
  activityLbl: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.textWhite85,
    letterSpacing: 0.14,
  },
  dot: {
    fontSize: 8,
    color: colors.accentMint,
    opacity: 0.95,
    marginTop: -1,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 17,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 14,
  },
});
