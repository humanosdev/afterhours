import { Heart } from "lucide-react-native";
import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

type ShareLikeBurstProps = {
  /** Increment to replay the burst animation. */
  trigger: number;
};

/** Instagram-style center heart on double-tap like. */
export const ShareLikeBurst = memo(function ShareLikeBurst({ trigger }: ShareLikeBurstProps) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger <= 0) return;
    scale.setValue(0.35);
    opacity.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.15,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.delay(350),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
    ]).start();
  }, [trigger, opacity, scale]);

  if (trigger <= 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Heart size={76} strokeWidth={0} color="#ef4444" fill="#ef4444" />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
});
