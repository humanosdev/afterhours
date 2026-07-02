import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { canUseNativeBlur } from "../lib/canUseNativeBlur";
import { glass } from "../theme/glass";
import { glassPresets } from "../theme/glassPresets";

type GlassPreset = keyof typeof glassPresets;

type GlassSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  muted?: boolean;
  intense?: boolean;
  sheen?: boolean;
  flat?: boolean;
  /** Shared opacity/blur recipe (`control` | `bar` | `panel` | `flat`). */
  preset?: GlassPreset;
};

/**
 * Mirrors web `.ah-glass-control` — blur + light tint + optional sheen.
 */
export function GlassSurface({
  children,
  style,
  muted = false,
  intense = false,
  sheen = true,
  flat = false,
  preset,
}: GlassSurfaceProps) {
  const recipe = preset ? glassPresets[preset] : null;
  const useIntense = recipe?.intense ?? intense;
  const useBlur = !flat && !(preset === "flat") && canUseNativeBlur();
  const intensity = recipe?.blurIntensity ?? (useIntense ? 40 : recipe?.blur ?? 24);
  const usePremiumControl = preset === "control" || preset === "bar";
  const tintAlpha = flat || preset === "flat"
    ? 0.72
    : useBlur
      ? recipe?.tint ?? (useIntense ? 0.42 : muted ? 0.36 : 0.4)
      : muted
        ? 0.58
        : 0.72;

  return (
    <View
      style={[
        styles.frame,
        flat || preset === "flat"
          ? glass.flat
          : usePremiumControl
            ? glass.tabBar
            : muted
              ? glass.surfaceMuted
              : glass.surface,
        style,
      ]}
    >
      {useBlur ? (
        <BlurView
          intensity={intensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(10, 12, 24, ${tintAlpha})` }]}
      />
      {sheen ? (
        usePremiumControl ? (
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255, 255, 255, 0.06)", "transparent"]}
            style={styles.sheenGradient}
          />
        ) : (
          <View pointerEvents="none" style={styles.sheen} />
        )
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 48,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  sheenGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    position: "relative",
    zIndex: 1,
  },
});
