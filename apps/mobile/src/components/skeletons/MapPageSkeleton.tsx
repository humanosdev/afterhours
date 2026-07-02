import { Dimensions, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";
import { mapCheckpointBarBottom, mapTopOverlayPaddingTop } from "../../theme/mapChrome";
import { mediaLayout } from "../../theme/mediaLayout";

const OVERLAY_W = Math.min(Dimensions.get("window").width * 0.94, 420);
const CHECKPOINT_W = Math.min(Dimensions.get("window").width * 0.92, 460);
const PLACEHOLDER = mediaLayout.placeholderColor;

/**
 * PWA `MapPageSkeleton` — full-screen map init shell while Mapbox style loads.
 * Static placeholders only (no pulse) so chrome does not feel shaky.
 */
export function MapPageSkeleton() {
  const insets = useSafeAreaInsets();
  const top = mapTopOverlayPaddingTop(insets);
  const bottom = mapCheckpointBarBottom(insets);

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={[styles.top, { paddingTop: top, width: OVERLAY_W }]}>
        <View style={styles.filterTray}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.chip} />
          ))}
        </View>
      </View>

      <View style={[styles.checkpointWrap, { bottom, width: CHECKPOINT_W }]}>
        <View style={styles.checkpointCard}>
          <View style={styles.checkpointLabel} />
          <View style={styles.checkpointBar} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgPrimary,
    zIndex: 25,
  },
  top: {
    position: "absolute",
    left: 0,
    right: 0,
    alignSelf: "center",
    alignItems: "stretch",
    paddingHorizontal: 12,
  },
  filterTray: {
    flexDirection: "row",
    gap: 6,
    padding: 8,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    backgroundColor: "rgba(12, 13, 18, 0.8)",
  },
  chip: {
    width: 52,
    height: 28,
    borderRadius: 999,
    backgroundColor: PLACEHOLDER,
  },
  checkpointWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  checkpointCard: {
    width: "100%",
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(12, 13, 18, 0.75)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  checkpointLabel: {
    width: "42%",
    height: 14,
    borderRadius: 6,
    backgroundColor: PLACEHOLDER,
  },
  checkpointBar: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    backgroundColor: PLACEHOLDER,
  },
});
