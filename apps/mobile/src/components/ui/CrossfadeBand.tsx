import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  SKELETON_FITTED_MIN_DISPLAY_MS,
  SKELETON_MIN_DISPLAY_MS,
  SKELETON_SECTION_MIN_DISPLAY_MS,
  useMinimumSkeleton,
  useFittedPageShell,
} from "../../hooks/useMinimumSkeleton";

type CrossfadeBandProps = {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "fitted" | "section" | "micro";
  minDisplayMs?: number;
  sessionKey?: string;
  fillHeight?: boolean;
};

/** Inline async band — skeleton while loading (sections, grids). Main tabs use `TabBootBody`. */
export function CrossfadeBand({
  loading,
  skeleton,
  children,
  style,
  variant = "section",
  minDisplayMs,
  sessionKey,
  fillHeight = false,
}: CrossfadeBandProps) {
  const fittedMinMs = minDisplayMs ?? SKELETON_FITTED_MIN_DISPLAY_MS;
  const sectionMinMs = minDisplayMs ?? SKELETON_SECTION_MIN_DISPLAY_MS;
  const microMinMs = minDisplayMs ?? SKELETON_MIN_DISPLAY_MS;
  const fittedShow = useFittedPageShell(loading, fittedMinMs, sessionKey);
  const sectionShow = useMinimumSkeleton(loading, sectionMinMs);
  const microShow = useMinimumSkeleton(loading, microMinMs);
  const showSkeleton =
    variant === "fitted" ? fittedShow : variant === "micro" ? microShow : sectionShow;

  if (showSkeleton) {
    return (
      <View style={[styles.root, fillHeight ? styles.rootFill : null, style]}>
        {skeleton}
      </View>
    );
  }

  return (
    <View style={[styles.root, fillHeight ? styles.rootFill : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    alignSelf: "stretch",
  },
  rootFill: {
    flex: 1,
  },
});
