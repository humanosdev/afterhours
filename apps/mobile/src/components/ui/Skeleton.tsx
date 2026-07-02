import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { profileGridCellSize } from "../../theme/mediaLayout";
import { mediaPlaceholderColor, motion } from "../../theme/motion";

const SHIMMER_COLORS = [mediaPlaceholderColor, "#1a2029", "#252d38"] as const;

type SkeletonProps = {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
};

/** PWA `ah-skeleton-shimmer` — dark grey blocks with subtle pulse (no accent). */
export function Skeleton({ style, borderRadius = 8 }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: motion.skeleton.pulse, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: motion.skeleton.pulse, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[styles.base, { borderRadius, opacity }, style]}
    />
  );
}

export function SkeletonCircle({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <Skeleton style={[{ width: size, height: size, borderRadius: size / 2 }, style]} borderRadius={size / 2} />;
}

export function SkeletonLine({
  width,
  height = 12,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <Skeleton style={[{ height, width: width ?? "100%" }, style]} borderRadius={6} />;
}

export function SkeletonGrid({
  columns = 3,
  count = 9,
  gap = 2,
}: {
  columns?: number;
  count?: number;
  gap?: number;
}) {
  const rows = Math.ceil(count / columns);
  const cellSize = profileGridCellSize();
  const cellStyle = { width: cellSize, height: cellSize };

  return (
    <View style={{ gap }}>
      {Array.from({ length: rows }).map((_, row) => (
        <View key={row} style={[styles.gridRow, { gap }]}>
          {Array.from({ length: columns }).map((__, col) => {
            const idx = row * columns + col;
            if (idx >= count) return <View key={col} style={cellStyle} />;
            return (
              <View key={col} style={[cellStyle, styles.gridCell]}>
                <Skeleton style={StyleSheet.absoluteFill} borderRadius={0} />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: SHIMMER_COLORS[1],
    overflow: "hidden",
  },
  gridRow: {
    flexDirection: "row",
    width: "100%",
  },
  gridCell: {
    backgroundColor: SHIMMER_COLORS[0],
    overflow: "hidden",
  },
});
