import { Image } from "expo-image";
import { memo, useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { momentFontById, type MomentOverlay } from "../../lib/momentEditor";
import { MomentStickerBadgeView } from "./MomentStickerBadgeView";

type MomentDraggableOverlayProps = {
  overlay: MomentOverlay;
  frameWidth: number;
  frameHeight: number;
  isActive: boolean;
  onActivate: () => void;
  onChange: (patch: Partial<Pick<MomentOverlay, "x" | "y" | "scale">>) => void;
};

function overlaySize(frameWidth: number, scale: number, kind: MomentOverlay["kind"]) {
  "worklet";
  const base = frameWidth * 0.34 * scale;
  if (kind === "text") return Math.max(72, base * 0.85);
  if (kind === "emoji") return Math.max(56, base * 0.9);
  return base;
}

export const MomentDraggableOverlay = memo(function MomentDraggableOverlay({
  overlay,
  frameWidth,
  frameHeight,
  isActive,
  onActivate,
  onChange,
}: MomentDraggableOverlayProps) {
  const overlayKind = overlay.kind;
  const textLineCount =
    overlay.kind === "text" ? Math.max(1, overlay.text.split("\n").length) : 1;
  const size = overlaySize(frameWidth, overlay.scale, overlayKind);
  const xSv = useSharedValue(overlay.x * frameWidth - size / 2);
  const ySv = useSharedValue(overlay.y * frameHeight - size / 2);
  const scaleSv = useSharedValue(overlay.scale);
  const pinchBaseSv = useSharedValue(overlay.scale);
  const panBaseXSv = useSharedValue(overlay.x * frameWidth - size / 2);
  const panBaseYSv = useSharedValue(overlay.y * frameHeight - size / 2);

  useEffect(() => {
    const nextSize = overlaySize(frameWidth, overlay.scale, overlayKind);
    xSv.value = overlay.x * frameWidth - nextSize / 2;
    ySv.value = overlay.y * frameHeight - nextSize / 2;
    scaleSv.value = overlay.scale;
    panBaseXSv.value = xSv.value;
    panBaseYSv.value = ySv.value;
    pinchBaseSv.value = overlay.scale;
  }, [
    frameHeight,
    frameWidth,
    overlay.scale,
    overlay.x,
    overlay.y,
    overlayKind,
    panBaseXSv,
    panBaseYSv,
    pinchBaseSv,
    scaleSv,
    xSv,
    ySv,
  ]);

  const commit = (x: number, y: number, scale: number) => {
    const w = overlaySize(frameWidth, scale, overlayKind);
    const h =
      overlayKind === "text"
        ? Math.max(w * 0.38, w * 0.22 * textLineCount)
        : w;
    const clampedX = Math.min(frameWidth - w / 2, Math.max(w / 2, x + w / 2));
    const clampedY = Math.min(frameHeight - h / 2, Math.max(h / 2, y + h / 2));
    onChange({
      x: clampedX / frameWidth,
      y: clampedY / frameHeight,
      scale,
    });
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      runOnJS(onActivate)();
      panBaseXSv.value = xSv.value;
      panBaseYSv.value = ySv.value;
    })
    .onUpdate((e) => {
      xSv.value = panBaseXSv.value + e.translationX;
      ySv.value = panBaseYSv.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(commit)(xSv.value, ySv.value, scaleSv.value);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      runOnJS(onActivate)();
      pinchBaseSv.value = scaleSv.value;
    })
    .onUpdate((e) => {
      scaleSv.value = Math.min(2.8, Math.max(0.35, pinchBaseSv.value * e.scale));
    })
    .onEnd(() => {
      runOnJS(commit)(xSv.value, ySv.value, scaleSv.value);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onActivate)();
  });

  const gesture = Gesture.Simultaneous(tap, Gesture.Simultaneous(pan, pinch));

  const font = overlay.kind === "text" ? momentFontById(overlay.fontId) : null;

  const animatedStyle = useAnimatedStyle(() => {
    const w = overlaySize(frameWidth, scaleSv.value, overlayKind);
    const h =
      overlayKind === "text"
        ? Math.max(w * 0.38, w * 0.22 * textLineCount)
        : w;
    return {
      position: "absolute",
      left: xSv.value,
      top: ySv.value,
      width: w,
      height: h,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[animatedStyle, isActive && styles.active]}
        collapsable={false}
      >
        {overlay.kind === "sticker" ? (
          overlay.badge ? (
            <MomentStickerBadgeView badge={overlay.badge} />
          ) : overlay.emojiGlyph ? (
            <Text style={styles.emojiCombo} adjustsFontSizeToFit numberOfLines={1}>
              {overlay.emojiGlyph}
            </Text>
          ) : overlay.uri ? (
            <Image
              source={{ uri: overlay.uri }}
              style={styles.sticker}
              contentFit="contain"
              transition={0}
            />
          ) : null
        ) : overlay.kind === "emoji" ? (
          <Text style={styles.emoji} adjustsFontSizeToFit numberOfLines={1}>
            {overlay.emoji}
          </Text>
        ) : (
          <Text
            style={[
              styles.text,
              {
                color: font?.color ?? "#fff",
                fontFamily: font?.fontFamily === "System" ? undefined : font?.fontFamily,
                fontWeight: font?.fontWeight ?? "700",
              },
            ]}
          >
            {overlay.text}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  active: {
    borderWidth: 1.5,
    borderColor: "rgba(0,149,246,0.85)",
    borderRadius: 8,
  },
  sticker: {
    width: "100%",
    height: "100%",
  },
  text: {
    width: "100%",
    textAlign: "center",
    fontSize: 28,
    lineHeight: 32,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  emoji: {
    width: "100%",
    height: "100%",
    textAlign: "center",
    fontSize: 52,
    lineHeight: 56,
  },
  emojiCombo: {
    width: "100%",
    height: "100%",
    textAlign: "center",
    fontSize: 40,
    lineHeight: 44,
  },
});
