import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { profileInitials } from "../lib/profileDisplay";
import { colors } from "../theme/colors";

type ProfileAvatarProps = {
  avatarUrl: string | null;
  label: string;
  size?: number;
};

export function ProfileAvatar({ avatarUrl, label, size = 72 }: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatarUrl?.trim()) && !imageFailed;
  const initials = profileInitials(label);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {showImage ? (
        <Image
          source={{ uri: avatarUrl!.trim() }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setImageFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  fallback: {
    backgroundColor: colors.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
});
