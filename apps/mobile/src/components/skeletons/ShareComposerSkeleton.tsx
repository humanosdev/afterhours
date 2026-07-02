import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Skeleton } from "../ui/Skeleton";

const COLS = 4;
const GAP = 1;

/** 4-column Recents grid placeholder — matches ShareLibraryMediaGrid geometry. */
export function ShareLibraryGridSkeleton({ rows = 10 }: { rows?: number }) {
  const { width } = useWindowDimensions();
  const cellSize = (width - GAP * (COLS - 1)) / COLS;

  return (
    <View style={styles.root}>
      {Array.from({ length: rows }).map((_, row) => (
        <View key={row} style={[styles.row, { gap: GAP }]}>
          {Array.from({ length: COLS }).map((__, col) => (
            <Skeleton key={col} style={{ width: cellSize, height: cellSize }} borderRadius={0} />
          ))}
        </View>
      ))}
    </View>
  );
}

type ShareCropBandSkeletonProps = {
  width: number;
  height: number;
  circular?: boolean;
};

/** Crop preview band — portrait/square rect or profile circle. */
export function ShareCropBandSkeleton({ width, height, circular = false }: ShareCropBandSkeletonProps) {
  return (
    <Skeleton
      style={{
        width,
        height,
        borderRadius: circular ? width / 2 : 0,
      }}
      borderRadius={circular ? width / 2 : 0}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    gap: GAP,
    backgroundColor: "#000",
    minHeight: 420,
  },
  row: {
    flexDirection: "row",
    width: "100%",
  },
});
