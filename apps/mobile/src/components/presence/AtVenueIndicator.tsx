import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Pressable } from "react-native";
import { GlassSurface } from "../GlassSurface";
import { colors } from "../../theme/colors";

type AtVenueIndicatorProps = {
  venueName: string;
  /** Live inside the pin vs softer away/recent copy. */
  live?: boolean;
  /** EVOLVE-3 — `inner_pending` dwell before `inner_confirmed`. */
  settling?: boolean;
  variant?: "map" | "sheet";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function LiveDot({ live }: { live: boolean }) {
  return (
    <View style={[styles.dotWrap, live && styles.dotWrapLive]}>
      <View style={[styles.dot, live ? styles.dotLive : styles.dotSoft]} />
    </View>
  );
}

/** Minimal glass chip — map float or venue sheet hero badge. */
export function AtVenueIndicator({
  venueName,
  live = true,
  settling = false,
  variant = "map",
  onPress,
  style,
}: AtVenueIndicatorProps) {
  const label =
    variant === "sheet"
      ? settling
        ? "Arriving"
        : "You're here"
      : settling
        ? "Arriving"
        : live
          ? "Here"
          : "Nearby";
  const detail = variant === "sheet" ? venueName : venueName;

  const body = (
    <GlassSurface
      preset="control"
      sheen
      style={[styles.pill, variant === "sheet" && styles.pillSheet, (!live || settling) && styles.pillSoft, style]}
    >
      <View style={styles.row}>
        <LiveDot live={live && !settling} />
        <Text style={[styles.prefix, !live && styles.prefixSoft]} numberOfLines={1}>
          {label}
        </Text>
        {variant === "map" ? (
          <>
            <Text style={styles.sep} accessibilityElementsHidden>
              ·
            </Text>
            <Text style={[styles.name, !live && styles.nameSoft]} numberOfLines={1}>
              {detail}
            </Text>
          </>
        ) : null}
      </View>
    </GlassSurface>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${venueName}`}
      hitSlop={8}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    overflow: "hidden",
    maxWidth: 280,
    borderColor: "rgba(52, 211, 153, 0.22)",
  },
  pillSheet: {
    maxWidth: 160,
    borderColor: "rgba(52, 211, 153, 0.28)",
  },
  pillSoft: {
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dotWrap: {
    width: 8,
    height: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dotWrapLive: {
    shadowColor: "#34d399",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  dotLive: {
    backgroundColor: "#34d399",
  },
  dotSoft: {
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  prefix: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
    color: colors.textWhite85,
    flexShrink: 0,
  },
  prefixSoft: {
    color: colors.textWhite75,
  },
  sep: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.35)",
    flexShrink: 0,
  },
  name: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textWhite85,
    flexShrink: 1,
  },
  nameSoft: {
    color: colors.textWhite65,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.92,
  },
});
