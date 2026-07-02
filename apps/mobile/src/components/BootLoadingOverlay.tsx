import { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { motion } from "../theme/motion";
import { colors } from "../theme/colors";
import { AppLoadingScreen } from "./AppLoadingScreen";

const FADE_EASING = Easing.bezier(0.4, 0, 0.2, 1);

type BootLoadingOverlayProps = {
  /** When false, fades out then unmounts. */
  visible: boolean;
};

/** Full-screen hub logo boot veil — fades out instead of snapping away. */
export const BootLoadingOverlay = memo(function BootLoadingOverlay({
  visible,
}: BootLoadingOverlayProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      opacity.setValue(1);
      setMounted(true);
      return;
    }
    if (!mounted) return;

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
  }, [visible, mounted, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[styles.overlay, { opacity }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <AppLoadingScreen />
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
