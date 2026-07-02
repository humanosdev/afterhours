import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { ProfileAvatar } from "../ProfileAvatar";
import { ringTokens } from "../../theme/ring";

type ViewerStoryRingAvatarProps = {
  avatarUrl: string | null;
  label: string;
  /** Unseen = live gradient; seen = muted ring. */
  ringActive?: boolean;
};

/** IG-style story ring on viewer identity — PWA `Avatar` storyRing in story chrome. */
export function ViewerStoryRingAvatar({
  avatarUrl,
  label,
  ringActive = true,
}: ViewerStoryRingAvatarProps) {
  const outer = 42;
  const pad = 2.5;
  const gutter = 1.5;
  const photoSize = outer - pad * 2 - gutter * 2 - 2;
  const gradient = ringActive ? ringTokens.activeGradient : ringTokens.mutedGradient;
  const glow = ringActive ? ringTokens.activeGlow : ringTokens.mutedGlow;

  return (
    <View
      style={[styles.outer, { width: outer, height: outer, borderRadius: outer / 2 }, glow]}
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { width: outer, height: outer, borderRadius: outer / 2, padding: pad }]}
      >
        <View style={[styles.gutter, { borderRadius: (outer - pad * 2) / 2, padding: gutter }]}>
          <View style={[styles.photoFrame, { borderRadius: photoSize / 2 }]}>
            <ProfileAvatar avatarUrl={avatarUrl} label={label} size={photoSize} bordered={false} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: "visible",
  },
  gradient: {
    overflow: "hidden",
  },
  gutter: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoFrame: {
    borderWidth: 2.5,
    borderColor: "#0a0b10",
    overflow: "hidden",
  },
});
