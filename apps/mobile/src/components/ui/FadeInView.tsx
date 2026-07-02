import { useEffect, useRef, type ReactNode } from "react";
import { Animated, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { motion } from "../../theme/motion";

type FadeInViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  /** Re-run fade when this key changes (e.g. section loaded). */
  contentKey?: string | number;
  pointerEvents?: ViewProps["pointerEvents"];
};

/**
 * Subtle opacity entrance — first paint is fully visible; only fades when `contentKey` changes.
 * (Avoids StableSlot swap leaving content stuck at opacity 0.)
 */
export function FadeInView({
  children,
  style,
  duration = motion.fade.content,
  contentKey,
  pointerEvents,
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const seenKeyRef = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    if (seenKeyRef.current === contentKey) return;

    const isFirstReveal = seenKeyRef.current === undefined;
    seenKeyRef.current = contentKey;

    if (isFirstReveal) {
      opacity.setValue(1);
      return;
    }

    opacity.setValue(0);
    const anim = Animated.timing(opacity, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [opacity, duration, contentKey]);

  return (
    <Animated.View style={[style, { opacity }]} pointerEvents={pointerEvents}>
      {children}
    </Animated.View>
  );
}
