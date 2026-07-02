import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { resolveAvatarUri } from "../lib/avatar";
import { ringTokens } from "../theme/ring";
import { colors } from "../theme/colors";

const AVATAR_STROKE = 2;
/** Slight overscan so cover-fill reaches the circular clip (no grey crescents). */
const AVATAR_OVERSCAN = 1.08;

type ProfileAvatarProps = {
  avatarUrl: string | null;
  label: string;
  size?: number;
  bordered?: boolean;
  showActiveRing?: boolean;
};

/**
 * Circular avatar — stroke drawn outside the photo clip so the image stays a true circle.
 */
export function ProfileAvatar({
  avatarUrl,
  label,
  size = 72,
  bordered = true,
  showActiveRing = false,
}: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const uri = resolveAvatarUri(avatarUrl);
  const showImage = Boolean(uri) && !imageFailed;

  const stroke = showActiveRing || bordered ? AVATAR_STROKE : 0;
  const strokeColor = showActiveRing ? colors.accentActive : "rgba(255, 255, 255, 0.12)";
  const inner = size - stroke * 2;
  const innerRadius = inner / 2;
  const overscan = Math.ceil(inner * AVATAR_OVERSCAN);
  const overscanOffset = (inner - overscan) / 2;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl, uri]);

  return (
    <View
      style={[styles.root, { width: size, height: size }]}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.clip,
          {
            width: inner,
            height: inner,
            borderRadius: innerRadius,
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
          <Ionicons name="person" size={Math.round(inner * 0.42)} color="rgba(255,255,255,0.95)" />
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
            onError={() => setImageFailed(true)}
            accessibilityLabel={label}
          />
        ) : null}
      </View>
      {stroke > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.strokeRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: stroke,
              borderColor: strokeColor,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
    flexShrink: 0,
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
