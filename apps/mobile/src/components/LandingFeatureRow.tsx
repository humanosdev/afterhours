import type { ReactNode } from "react";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type LandingFeatureRowProps = {
  icon: ReactNode;
  title: string;
  body: string;
  index?: number;
  compact?: boolean;
};

/** Mirrors web `HomeLanding` `FeatureRow` with staggered reveal. */
export function LandingFeatureRow({ icon, title, body, index = 0, compact = false }: LandingFeatureRowProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    const delay = 120 + index * 90;
    opacity.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [index, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.row, compact && styles.rowCompact, animStyle]}>
      <View style={[styles.iconTile, compact && styles.iconTileCompact]}>{icon}</View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.body, compact && styles.bodyCompact]}>{body}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowCompact: {
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: layout.inputRadius,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(10, 12, 24, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconTileCompact: {
    width: 36,
    height: 36,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  bodyCompact: {
    lineHeight: 17,
  },
});
