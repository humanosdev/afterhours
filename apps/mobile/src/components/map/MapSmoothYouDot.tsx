import { memo, useSyncExternalStore, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import {
  getPresenceMarkerSnapshot,
  subscribePresenceMarkerMotion,
} from "../../lib/presenceMarkerMotion";

export const MAP_YOU_GPS_MARKER_ID = "you-gps";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkerViewComponent = ComponentType<any>;

type MapSmoothYouDotProps = {
  lng: number;
  lat: number;
  MarkerView: MarkerViewComponent;
};

/** PWA you-marker fallback — blue dot at smoothed GPS when avatar row is absent. */
export const MapSmoothYouDot = memo(function MapSmoothYouDot({
  lng,
  lat,
  MarkerView,
}: MapSmoothYouDotProps) {
  const coordinate = useSyncExternalStore(
    subscribePresenceMarkerMotion,
    () => getPresenceMarkerSnapshot(MAP_YOU_GPS_MARKER_ID, lng, lat),
    () => getPresenceMarkerSnapshot(MAP_YOU_GPS_MARKER_ID, lng, lat)
  );

  return (
    <MarkerView coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
      <View style={styles.youDotOuter}>
        <View style={styles.youDotInner} />
      </View>
    </MarkerView>
  );
});

const styles = StyleSheet.create({
  youDotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 102, 255, 0.22)",
  },
  youDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3B66FF",
  },
});
