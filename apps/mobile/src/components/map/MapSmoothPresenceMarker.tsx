import { memo, useSyncExternalStore, type ComponentType } from "react";
import { View } from "react-native";
import type { MapFriendPresenceMarker } from "../../lib/mapPresenceMarkers";
import {
  getPresenceMarkerSnapshot,
  subscribePresenceMarkerMotion,
} from "../../lib/presenceMarkerMotion";
import { MapPresenceAvatarMarker } from "./MapPresenceAvatarMarker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkerViewComponent = ComponentType<any>;

type MapSmoothPresenceMarkerProps = {
  marker: MapFriendPresenceMarker;
  mapZoom: number;
  lastSeenLabel?: string;
  onPress?: () => void;
  MarkerView: MarkerViewComponent;
};

export const MapSmoothPresenceMarker = memo(function MapSmoothPresenceMarker({
  marker,
  mapZoom,
  lastSeenLabel,
  onPress,
  MarkerView,
}: MapSmoothPresenceMarkerProps) {
  const coordinate = useSyncExternalStore(
    subscribePresenceMarkerMotion,
    () => getPresenceMarkerSnapshot(marker.userId, marker.lng, marker.lat),
    () => getPresenceMarkerSnapshot(marker.userId, marker.lng, marker.lat)
  );

  return (
    <MarkerView coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
      <View pointerEvents="box-none">
        <MapPresenceAvatarMarker
        label={marker.label}
        avatarUrl={marker.avatarUrl}
        mapZoom={mapZoom}
        isMe={marker.isMe}
        isLive={marker.isLive}
        isOnlineNow={marker.isOnlineNow}
        lastSeenLabel={lastSeenLabel}
        onPress={onPress}
      />
      </View>
    </MarkerView>
  );
});
