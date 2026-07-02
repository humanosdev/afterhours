import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { memo, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { resolveAvatarUri } from "../../lib/avatar";
import { markerSizeForZoom } from "../../lib/mapMarkerZoom";
import type { MapPresenceMarkerMember } from "../../lib/mapPresenceMarkers";
import { ringTokens } from "../../theme/ring";

type MapVenuePresenceClusterProps = {
  members: MapPresenceMarkerMember[];
  mapZoom: number;
  onPress?: () => void;
};

function ClusterAvatar({ member, size }: { member: MapPresenceMarkerMember; size: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const uri = resolveAvatarUri(member.avatarUrl);
  const showImage = Boolean(uri) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [member.avatarUrl, uri]);

  return (
    <View
      style={[
        styles.avatarShell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.8)",
        },
      ]}
    >
      <View style={[styles.photoClip, { borderRadius: size / 2 }]}>
        <View style={[styles.fallback, { backgroundColor: ringTokens.avatarFallback[1] }]}>
          <Ionicons name="person" size={Math.round(size * 0.4)} color="rgba(255,255,255,0.95)" />
        </View>
        {showImage ? (
          <Image
            source={{ uri: uri! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="center"
            cachePolicy="memory-disk"
            onError={() => setImageFailed(true)}
          />
        ) : null}
      </View>
    </View>
  );
}

/** PWA venue stack — up to 3 overlapping avatars at venue pin. */
export const MapVenuePresenceCluster = memo(function MapVenuePresenceCluster({
  members,
  mapZoom,
  onPress,
}: MapVenuePresenceClusterProps) {
  const size = Math.min(24, markerSizeForZoom(mapZoom));

  return (
    <View style={styles.row} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Open venue"
        style={styles.avatarStack}
      >
        {members.map((m, index) => (
          <View key={m.userId} style={[styles.avatarWrap, index > 0 && styles.avatarOverlap]}>
            <ClusterAvatar member={m} size={size} />
          </View>
        ))}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
  },
  avatarWrap: {
    borderRadius: 999,
  },
  avatarOverlap: {
    marginLeft: -7,
  },
  avatarShell: {
    overflow: "hidden",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
  },
  photoClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
