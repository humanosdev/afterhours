import { memo, useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { motion } from "../../theme/motion";

type StoryViewerProgressBarsProps = {
  storyIds: string[];
  activeIndex: number;
  paused?: boolean;
  durationMs?: number;
  onSegmentComplete?: () => void;
  onSegmentPress?: (index: number) => void;
};

type ProgressSegmentProps = {
  id: string;
  index: number;
  activeIndex: number;
  progress: SharedValue<number>;
  onSegmentPress?: (index: number) => void;
  total: number;
};

const ProgressSegment = memo(function ProgressSegment({
  id,
  index,
  activeIndex,
  progress,
  onSegmentPress,
  total,
}: ProgressSegmentProps) {
  const isPast = index < activeIndex;
  const isActive = index === activeIndex;

  const fillStyle = useAnimatedStyle(() => {
    if (!isActive) return {};
    return { transform: [{ scaleX: progress.value }] };
  }, [isActive]);

  return (
    <Pressable
      key={id}
      style={styles.progressHit}
      onPress={() => onSegmentPress?.(index)}
      disabled={!onSegmentPress}
      accessibilityRole="button"
      accessibilityLabel={`Slide ${index + 1} of ${total}`}
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.progressTrack}>
        {isPast ? <View style={styles.progressFill} /> : null}
        {isActive ? <Animated.View style={[styles.progressFill, fillStyle]} /> : null}
      </View>
    </Pressable>
  );
});

/** IG-white progress segments — Reanimated linear fill; completion fires once per segment. */
export const StoryViewerProgressBars = memo(function StoryViewerProgressBars({
  storyIds,
  activeIndex,
  paused = false,
  durationMs = motion.viewer.momentDurationMs,
  onSegmentComplete,
  onSegmentPress,
}: StoryViewerProgressBarsProps) {
  const progress = useSharedValue(0);
  const completeRef = useRef(onSegmentComplete);
  const completedRef = useRef(false);
  completeRef.current = onSegmentComplete;

  const fireComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    completeRef.current?.();
  }, []);

  useEffect(() => {
    completedRef.current = false;
    cancelAnimation(progress);
    progress.value = 0;
  }, [activeIndex, progress, storyIds.join(",")]);

  useEffect(() => {
    if (paused || !storyIds.length) {
      cancelAnimation(progress);
      return;
    }

    const totalMs = Math.max(durationMs, 500);
    const remainingMs = (1 - progress.value) * totalMs;

    progress.value = withTiming(
      1,
      { duration: remainingMs, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(fireComplete)();
      },
    );

    return () => cancelAnimation(progress);
  }, [paused, activeIndex, durationMs, fireComplete, progress, storyIds.length]);

  return (
    <View style={styles.progressRow}>
      {storyIds.map((id, i) => (
        <ProgressSegment
          key={id}
          id={id}
          index={i}
          activeIndex={activeIndex}
          progress={progress}
          onSegmentPress={onSegmentPress}
          total={storyIds.length}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: "row",
    gap: 4,
  },
  progressHit: {
    flex: 1,
    paddingVertical: 6,
    marginVertical: -6,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "100%",
    backgroundColor: "#fff",
    transformOrigin: "left center",
  },
});
