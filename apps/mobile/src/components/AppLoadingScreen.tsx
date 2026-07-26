import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { colors } from "../theme/colors";
import { motion } from "../theme/motion";
import { HubBootLogo } from "./HubBootLogo";

const TRACK_WIDTH = 200;
const TRACK_HEIGHT = 3;
const PROGRESS_EASING = Easing.bezier(0.22, 1, 0.36, 1);

type AppLoadingScreenProps = {
  progress?: number;
  /** When true, glide the bar to 100% then dismiss. */
  finalize?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  onProgressComplete?: () => void;
};

function progressDuration(from: number, to: number): number {
  const delta = Math.abs(to - from);
  return Math.max(520, Math.min(980, delta * 1600));
}

/** Minimal boot splash — logo fade-in + smooth progress line. */
export function AppLoadingScreen({
  progress = 0,
  finalize = false,
  onLayout,
  onProgressComplete,
}: AppLoadingScreenProps) {
  const fill = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.94)).current;
  const logoLift = useRef(new Animated.Value(16)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;
  const barLift = useRef(new Animated.Value(8)).current;
  const completionRef = useRef(false);
  const fillAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const onProgressCompleteRef = useRef(onProgressComplete);
  onProgressCompleteRef.current = onProgressComplete;

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const entrance = Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: motion.boot.logoEntranceMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: motion.boot.logoEntranceMs + 120,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(logoLift, {
          toValue: 0,
          duration: motion.boot.logoEntranceMs + 120,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(barOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(barLift, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [barLift, barOpacity, logoLift, logoOpacity, logoScale]);

  const finishProgress = useCallback(() => {
    if (completionRef.current) return;
    completionRef.current = true;
    onProgressCompleteRef.current?.();
  }, []);

  const animateFillTo = useCallback(
    (target: number, duration: number, onDone?: () => void) => {
      fillAnimRef.current?.stop();
      fill.stopAnimation((current) => {
        const from = Math.max(0, Math.min(1, current));
        const to = Math.max(from, Math.max(0, Math.min(1, target)));
        if (to - from < 0.001) {
          fill.setValue(to);
          onDone?.();
          return;
        }
        fillAnimRef.current = Animated.timing(fill, {
          toValue: to,
          duration,
          easing: PROGRESS_EASING,
          useNativeDriver: false,
        });
        fillAnimRef.current.start(({ finished }) => {
          if (finished) onDone?.();
        });
      });
    },
    [fill]
  );

  useEffect(() => {
    if (finalize) {
      animateFillTo(1, motion.boot.progressFillCompleteMs, finishProgress);
      return;
    }

    completionRef.current = false;
    const target = Math.max(0, Math.min(0.92, progress));
    fill.stopAnimation((current) => {
      animateFillTo(target, progressDuration(current, target));
    });
  }, [animateFillTo, fill, finalize, finishProgress, progress]);

  useEffect(
    () => () => {
      fillAnimRef.current?.stop();
    },
    []
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    void SplashScreen.hideAsync();
    onLayout?.(event);
  };

  const fillWidth = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.root} onLayout={handleLayout}>
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ translateY: logoLift }, { scale: logoScale }],
        }}
      >
        <HubBootLogo />
      </Animated.View>

      <Animated.View
        style={{
          opacity: barOpacity,
          transform: [{ translateY: barLift }],
        }}
      >
        <View style={styles.progressWrap}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width: fillWidth }]} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  progressWrap: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    justifyContent: "center",
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT,
    backgroundColor: colors.accent,
  },
});
