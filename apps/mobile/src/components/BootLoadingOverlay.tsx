import { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { motion } from "../theme/motion";
import { colors } from "../theme/colors";
import { AppLoadingScreen } from "./AppLoadingScreen";

const FADE_EASING = Easing.bezier(0.4, 0, 0.2, 1);

type BootLoadingOverlayProps = {
  visible: boolean;
  progress?: number;
  finalize?: boolean;
  onProgressComplete?: () => void;
};

/** Full-screen hub logo boot veil — fades out after the bar finishes. */
export const BootLoadingOverlay = memo(function BootLoadingOverlay({
  visible,
  progress = 0,
  finalize = false,
  onProgressComplete,
}: BootLoadingOverlayProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (visible) {
      opacity.setValue(1);
      setMounted(true);
      return;
    }

    const anim = Animated.timing(opacity, {
      toValue: 0,
      duration: motion.boot.loadingFadeOutMs,
      easing: FADE_EASING,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return () => anim.stop();
  }, [visible, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[styles.overlay, { opacity }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <AppLoadingScreen
        progress={progress}
        finalize={finalize}
        onProgressComplete={onProgressComplete}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    backgroundColor: colors.bgPrimary,
  },
});
