import { StyleSheet, View } from "react-native";
import { SkeletonCircle, SkeletonLine } from "../ui/Skeleton";

/** Standard list row — friends, notifications, blocks, live places. */
export function ListRowSkeleton({ rows = 6 }: { rows?: number }) {
  const minHeight = rows * 54 + 8;
  return (
    <View style={[styles.wrap, { minHeight }]}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonCircle size={40} />
          <View style={styles.text}>
            <SkeletonLine width="45%" height={12} />
            <SkeletonLine width="70%" height={10} style={styles.gap} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  gap: {
    marginTop: 8,
  },
});
