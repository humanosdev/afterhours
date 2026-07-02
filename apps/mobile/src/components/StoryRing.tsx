import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import type { StoryRingVisualState } from "../theme/paritySemantics";
import { ringTokens } from "../theme/ring";
import { colors } from "../theme/colors";
import { ProfileAvatar } from "./ProfileAvatar";

export type StoryRingSize = "storyLg" | "xl" | "viewer";

type RingMetrics = {
  outer: number;
  pad: number;
  photoSize: number;
  columnWidth: number;
};

function ringMetrics(size: StoryRingSize): RingMetrics {
  if (size === "viewer") {
    const outer = 48;
    const pad = 3;
    const inner = outer - pad * 2;
    const photoSize = inner - ringTokens.gutter * 2;
    return { outer, pad, photoSize, columnWidth: outer };
  }
  if (size === "xl") {
    const outer = 90;
    const pad = 5;
    const inner = outer - pad * 2;
    const photoSize = inner - ringTokens.gutter * 2;
    return { outer, pad, photoSize, columnWidth: 84 };
  }
  const outer = 78;
  const pad = ringTokens.outerPadStoryLg;
  const inner = outer - pad * 2;
  const photoSize = inner - ringTokens.gutter * 2;
  return { outer, pad, photoSize, columnWidth: outer };
}

type StoryRingProps = {
  label: string;
  variant?: "avatar" | "add";
  avatarUrl?: string | null;
  ringState?: StoryRingVisualState;
  showCaption?: boolean;
  size?: StoryRingSize;
};

function ringActiveFromState(state: StoryRingVisualState): boolean {
  return state === "unseen" || state === "add-own";
}

/** Plain avatar sizes when no active story (`ringState === "none"`). */
function plainAvatarSize(size: StoryRingSize): number {
  if (size === "viewer") return 36;
  return size === "xl" ? 80 : 72;
}

/** PWA `StoryRing` + `Avatar` story ring (`storyLg` hub, `xl` profile). */
export function StoryRing({
  label,
  variant = "avatar",
  avatarUrl = null,
  ringState = "none",
  showCaption = true,
  size = "storyLg",
}: StoryRingProps) {
  const m = ringMetrics(size);

  if (variant === "add") {
    return (
      <View style={[styles.column, { width: m.columnWidth }]} accessibilityLabel={label}>
        <View style={[styles.ringOuter, { width: m.outer, height: m.outer, borderRadius: m.outer / 2 }, ringTokens.activeGlow]}>
          <LinearGradient
            colors={[...ringTokens.activeGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientPad, { width: m.outer, height: m.outer, borderRadius: m.outer / 2, padding: m.pad }]}
          >
            <View style={[styles.gutter, { borderRadius: (m.outer - m.pad * 2) / 2 }]}>
              <View style={[styles.addInner, { borderRadius: (m.outer - m.pad * 2) / 2 }]} />
            </View>
          </LinearGradient>
          <View style={styles.plusBadge}>
            <Text style={styles.plus}>+</Text>
          </View>
        </View>
        {showCaption ? (
          <Text style={styles.caption} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
      </View>
    );
  }

  if (ringState === "none") {
    const plainSize = plainAvatarSize(size);
    return (
      <View style={[styles.column, { width: m.columnWidth }]} accessibilityLabel={label}>
        <ProfileAvatar avatarUrl={avatarUrl} label={label} size={plainSize} bordered />
        {showCaption ? (
          <Text style={styles.caption} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
      </View>
    );
  }

  const active = ringActiveFromState(ringState);
  const gradient = active ? ringTokens.activeGradient : ringTokens.mutedGradient;
  const glow = active ? ringTokens.activeGlow : ringTokens.mutedGlow;

  return (
    <View style={[styles.column, { width: m.columnWidth }]} accessibilityLabel={label}>
      <View style={[styles.ringOuter, { width: m.outer, height: m.outer, borderRadius: m.outer / 2 }, glow]}>
        <LinearGradient
          colors={[...gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientPad, { width: m.outer, height: m.outer, borderRadius: m.outer / 2, padding: m.pad }]}
        >
          <View
            style={[
              styles.gutter,
              {
                width: m.outer - m.pad * 2,
                height: m.outer - m.pad * 2,
                borderRadius: (m.outer - m.pad * 2) / 2,
              },
            ]}
          >
            <ProfileAvatar avatarUrl={avatarUrl} label={label} size={m.photoSize} bordered={false} />
          </View>
        </LinearGradient>
      </View>
      {showCaption ? (
        <Text style={styles.caption} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: "center",
    gap: 8,
  },
  ringOuter: {
    overflow: "visible",
  },
  gradientPad: {
    overflow: "hidden",
  },
  gutter: {
    padding: ringTokens.gutter,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  addInner: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.045)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  plusBadge: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.58,
    shadowRadius: 7,
    elevation: 4,
  },
  plus: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: -1,
  },
  caption: {
    width: "100%",
    fontSize: 12,
    lineHeight: 15,
    color: colors.textWhite55,
    textAlign: "center",
  },
});
