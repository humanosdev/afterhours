import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { resolveAvatarUri } from "../lib/avatar";
import { colors } from "../theme/colors";
import { ringTokens } from "../theme/ring";
import { tabBarMetrics } from "../shell/tabBarMetrics";

type TabBarProfileAvatarProps = {
  avatarUrl: string | null;
  label: string;
  active: boolean;
};

const IMAGE = tabBarMetrics.profileAvatarSize;
const RING = tabBarMetrics.profileRingWidth;
const OVERSCAN = 1.08;

/**
 * PWA profile tab — gradient + person fallback when no custom avatar (matches ProfileAvatar).
 */
export function TabBarProfileAvatar({ avatarUrl, label, active }: TabBarProfileAvatarProps) {
  const [failed, setFailed] = useState(false);
  const lastUriRef = useRef<string | null>(null);
  const resolved = resolveAvatarUri(avatarUrl);
  if (resolved) lastUriRef.current = resolved;
  const uri = resolved ?? lastUriRef.current;
  const showImage = Boolean(uri) && !failed;

  const stroke = active ? RING : 1;
  const inner = IMAGE - stroke * 2;
  const overscan = Math.ceil(inner * OVERSCAN);
  const overscanOffset = (inner - overscan) / 2;

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl, uri]);

  return (
    <View style={styles.well} accessibilityLabel={label} accessibilityState={{ selected: active }}>
      <View style={[styles.stack, { width: IMAGE, height: IMAGE }]}>
        <View
          style={[
            styles.clip,
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
              margin: stroke,
            },
          ]}
        >
          <LinearGradient
            colors={[...ringTokens.avatarFallback]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.fallbackFill]}
          >
            <Ionicons name="person" size={12} color="rgba(255,255,255,0.95)" />
          </LinearGradient>
          {showImage ? (
            <Image
              source={{ uri: uri! }}
              style={{
                position: "absolute",
                width: overscan,
                height: overscan,
                left: overscanOffset,
                top: overscanOffset,
              }}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="memory-disk"
              transition={0}
              onError={() => setFailed(true)}
              accessibilityLabel={label}
            />
          ) : null}
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.strokeRing,
            {
              width: IMAGE,
              height: IMAGE,
              borderRadius: IMAGE / 2,
              borderWidth: stroke,
              borderColor: active ? colors.accentActive : "rgba(255, 255, 255, 0.12)",
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    width: tabBarMetrics.iconWellSize,
    height: tabBarMetrics.iconWellSize,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  stack: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  clip: {
    overflow: "hidden",
    backgroundColor: colors.bgSecondary,
  },
  fallbackFill: {
    alignItems: "center",
    justifyContent: "center",
  },
  strokeRing: {
    ...StyleSheet.absoluteFillObject,
  },
});
