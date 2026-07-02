import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  SKELETON_FITTED_MIN_DISPLAY_MS,
  SKELETON_MIN_DISPLAY_MS,
  SKELETON_SECTION_MIN_DISPLAY_MS,
  useMinimumSkeleton,
  useFittedPageShell,
} from "../../hooks/useMinimumSkeleton";
import { useTabBootShell } from "../../hooks/useTabBootShell";
import { motion } from "../../theme/motion";
import { colors } from "../../theme/colors";
import { Skeleton } from "./Skeleton";

const REVEAL_EASING = Easing.bezier(0.4, 0, 0.2, 1);

type CrossfadeBandProps = {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "fitted" | "section" | "micro";
  minDisplayMs?: number;
  sessionKey?: string;
  /** One fitted boot hold per cold app start (main tabs) — not on tab revisits. */
  appSessionBoot?: boolean;
  /** Tab route id — triggers one boot skeleton on first focus per cold launch. */
  tabBootKey?: string;
  /** Pin layout height while the skeleton is visible (prevents scroll jump). */
  lockHeightWhileLoading?: boolean;
  /** Fill parent flex column (chat thread full screen). */
  fillHeight?: boolean;
};

function readMinHeight(style: StyleProp<ViewStyle>): number {
  const flat = StyleSheet.flatten(style);
  return typeof flat?.minHeight === "number" ? flat.minHeight : 0;
}

/**
 * Async band — real content stays mounted; skeleton overlays and fades out (no layout jump).
 */
export function CrossfadeBand({
  loading,
  skeleton,
  children,
  style,
  variant = "fitted",
  minDisplayMs,
  sessionKey,
  appSessionBoot = false,
  tabBootKey,
  lockHeightWhileLoading = false,
  fillHeight = false,
}: CrossfadeBandProps) {
  const fittedMinMs = minDisplayMs ?? SKELETON_FITTED_MIN_DISPLAY_MS;
  const sectionMinMs = minDisplayMs ?? SKELETON_SECTION_MIN_DISPLAY_MS;
  const microMinMs = minDisplayMs ?? SKELETON_MIN_DISPLAY_MS;
  const appBootShow = useTabBootShell(loading, fittedMinMs, appSessionBoot, tabBootKey);
  const fittedPageShow = useFittedPageShell(loading, fittedMinMs, sessionKey);
  const fittedShow = appSessionBoot ? appBootShow : fittedPageShow;
  const sectionShow = useMinimumSkeleton(loading, sectionMinMs);
  const microShow = useMinimumSkeleton(loading, microMinMs);
  const showSkeleton =
    variant === "fitted" ? fittedShow : variant === "section" ? sectionShow : microShow;

  const [skeletonHeight, setSkeletonHeight] = useState(0);
  const [skeletonMounted, setSkeletonMounted] = useState(showSkeleton);
  const contentOpacity = useRef(new Animated.Value(showSkeleton ? 0 : 1)).current;
  const skeletonOpacity = useRef(new Animated.Value(showSkeleton ? 1 : 0)).current;

  const styledMin = readMinHeight(style);
  const shellFloorHeight = Math.max(styledMin, skeletonHeight);
  const loadingPinHeight =
    lockHeightWhileLoading && styledMin > 0 ? styledMin : shellFloorHeight;
  const floorHeight =
    showSkeleton && lockHeightWhileLoading ? loadingPinHeight : shellFloorHeight;
  const pinLoadFrame = showSkeleton && lockHeightWhileLoading && loadingPinHeight > 0;

  const onSkeletonLayout = (event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.height);
    if (next > skeletonHeight) setSkeletonHeight(next);
  };

  useEffect(() => {
    if (showSkeleton) {
      setSkeletonMounted(true);
      skeletonOpacity.setValue(1);
      contentOpacity.setValue(0);
      return;
    }

    if (!skeletonMounted) {
      contentOpacity.setValue(1);
      return;
    }

    Animated.parallel([
      Animated.timing(skeletonOpacity, {
        toValue: 0,
        duration: motion.fade.skeletonReveal,
        easing: REVEAL_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: motion.fade.skeletonReveal,
        easing: REVEAL_EASING,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setSkeletonMounted(false);
    });
  }, [showSkeleton, skeletonMounted, skeletonOpacity, contentOpacity]);

  const showTailFill =
    !lockHeightWhileLoading &&
    !fillHeight &&
    styledMin > 0 &&
    (skeletonHeight === 0 || styledMin > skeletonHeight + 8);

  const lockedHeight =
    pinLoadFrame
      ? loadingPinHeight
      : lockHeightWhileLoading && floorHeight > 0
        ? floorHeight
        : styledMin > 0
          ? styledMin
          : 0;

  const skeletonWrapStyle: StyleProp<ViewStyle> = fillHeight
    ? { flex: 1, width: "100%", alignSelf: "stretch" }
    : lockedHeight > 0
      ? { width: "100%", height: lockedHeight, minHeight: lockedHeight }
      : { width: "100%" };

  const contentLayoutStyle: StyleProp<ViewStyle> =
    pinLoadFrame ? styles.contentLoadPinned : null;

  const rootStyle: StyleProp<ViewStyle> = [
    styles.root,
    fillHeight ? styles.rootFill : null,
    style,
    floorHeight > 0 ? { minHeight: floorHeight } : null,
    pinLoadFrame ? { height: loadingPinHeight, overflow: "hidden" as const } : null,
  ];

  return (
    <View style={rootStyle}>
      <Animated.View
        style={[styles.content, contentLayoutStyle, { opacity: contentOpacity }]}
        pointerEvents={showSkeleton ? "none" : "auto"}
      >
        {children}
      </Animated.View>
      {skeletonMounted ? (
        <View
          style={[
            styles.overlay,
            fillHeight ? styles.overlayFill : null,
            pinLoadFrame ? { height: loadingPinHeight } : null,
          ]}
          pointerEvents="none"
        >
          <Animated.View style={[styles.skeletonFade, { opacity: skeletonOpacity }]}>
            <View
              style={[
                styles.skeletonFrame,
                fillHeight ? styles.skeletonFrameFill : null,
                lockedHeight > 0 ? { height: lockedHeight, minHeight: lockedHeight } : null,
              ]}
            >
              <View style={skeletonWrapStyle} onLayout={onSkeletonLayout}>
                {skeleton}
              </View>
              {showTailFill ? <Skeleton style={styles.skeletonTailFill} borderRadius={14} /> : null}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    position: "relative",
    flexGrow: 1,
    alignSelf: "stretch",
  },
  rootFill: {
    flex: 1,
  },
  content: {
    width: "100%",
    flexGrow: 1,
    alignSelf: "stretch",
  },
  contentLoadPinned: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgPrimary,
  },
  overlayFill: {
    flex: 1,
  },
  skeletonFade: {
    flex: 1,
    width: "100%",
  },
  skeletonFrame: {
    width: "100%",
    flexDirection: "column",
  },
  skeletonFrameFill: {
    flex: 1,
  },
  skeletonTailFill: {
    flex: 1,
    minHeight: 48,
    marginTop: 8,
    opacity: 0.45,
  },
});
