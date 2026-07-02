import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { memo, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { resolveAvatarUri } from "../../lib/avatar";
import { markerSizeForZoom } from "../../lib/mapMarkerZoom";
import { ringTokens } from "../../theme/ring";

type MapPresenceAvatarMarkerProps = {
  label: string;
  avatarUrl: string | null;
  mapZoom: number;
  isMe?: boolean;
  /** Green ring when friend is live on the map. */
  isLive?: boolean;
  /** PWA pulse when friend is online now (~4 min). */
  isOnlineNow?: boolean;
  /** PWA last-seen tag under avatar when idle and not in a venue. */
  lastSeenLabel?: string;
  onPress?: () => void;
};

/** PWA ring colors — green for live friends, blue for you, slate when idle. */
function ringBorderColor(isMe: boolean, isLive: boolean): string {
  if (isMe) return "rgba(59, 102, 255, 0.55)";
  if (isLive) return "rgba(34, 197, 94, 0.65)";
  return "rgba(148, 163, 184, 0.52)";
}

export const MapPresenceAvatarMarker = memo(function MapPresenceAvatarMarker({
  label,
  avatarUrl,
  mapZoom,
  isMe = false,
  isLive = false,
  isOnlineNow = false,
  lastSeenLabel,
  onPress,
}: MapPresenceAvatarMarkerProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const uri = resolveAvatarUri(avatarUrl);
  const showImage = Boolean(uri) && !imageFailed;
  const meInitial = isMe ? label.trim().charAt(0).toUpperCase() || "Y" : null;
  const size = markerSizeForZoom(mapZoom);
  const ringWidth = Math.max(2, Math.round(size * 0.14));
  const showLivePulse = !isMe && isOnlineNow;
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.8);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl, uri]);

  useEffect(() => {
    if (!showLivePulse) {
      pulseScale.value = 1;
      pulseOpacity.value = 0;
      return;
    }
    pulseScale.value = 1;
    pulseOpacity.value = 0.8;
    pulseScale.value = withRepeat(
      withTiming(1.22, { duration: 1300, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withTiming(0, { duration: 1300, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [showLivePulse, pulseOpacity, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${label} profile`}
      style={styles.hit}
    >
      <View
        style={{ width: size, height: size, alignItems: "center" }}
      >
      <View
        style={[
          styles.shell,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringWidth,
            borderColor: ringBorderColor(isMe, isLive),
          },
        ]}
      >
        <View style={[styles.photoClip, { borderRadius: Math.max(0, size / 2 - ringWidth) }]}>
          <View
            style={[
              styles.fallback,
              { backgroundColor: isMe ? "rgba(59, 102, 255, 0.28)" : ringTokens.avatarFallback[1] },
            ]}
          >
            {isMe && meInitial && !showImage ? (
              <Text style={[styles.meInitial, { fontSize: Math.round(size * 0.38) }]}>{meInitial}</Text>
            ) : (
              <Ionicons name="person" size={Math.round(size * 0.42)} color="rgba(255,255,255,0.95)" />
            )}
          </View>
          {showImage ? (
            <Image
              source={{ uri: uri! }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="memory-disk"
              onError={() => setImageFailed(true)}
              accessibilityLabel={label}
            />
          ) : null}
        </View>
        {showLivePulse ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRing,
              pulseStyle,
              {
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: "rgba(34, 197, 94, 0.65)",
              },
            ]}
          />
        ) : null}
      </View>
      {lastSeenLabel ? (
        <Text pointerEvents="none" style={[styles.lastSeen, { marginTop: 2 }]}>
          {lastSeenLabel}
        </Text>
      ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hit: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  lastSeen: {
    color: "rgba(236, 229, 255, 0.96)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0,
    minWidth: 22,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shell: {
    overflow: "hidden",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
  },
  photoClip: {
    flex: 1,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  meInitial: {
    color: "#fff",
    fontWeight: "800",
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
  },
});
