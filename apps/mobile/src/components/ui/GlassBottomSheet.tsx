import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ModalGestureRoot } from "../ModalGestureRoot";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { colors } from "../../theme/colors";
import { motion } from "../../theme/motion";

const SCREEN_H = Dimensions.get("window").height;
const SHEET_DISMISS_VELOCITY = 480;
const SHEET_DISMISS_COMMIT_RATIO = 0.18;
const SHEET_EASE = Easing.out(Easing.cubic);
const SHEET_SPRING = { damping: 30, stiffness: 360, mass: 0.9, overshootClamping: true };
const KEYBOARD_MS = Platform.OS === "ios" ? 260 : 200;

type SheetDragController = {
  scrollOffset: SharedValue<number>;
  scrollGesture: ReturnType<typeof Gesture.Native>;
};

const GlassSheetScrollDismissContext = createContext<SheetDragController | null>(null);

const noopShared = { value: 0 } as SharedValue<number>;
const noopScrollGesture = Gesture.Native();

export function useGlassSheetScrollDismiss(): SheetDragController {
  return (
    useContext(GlassSheetScrollDismissContext) ?? {
      scrollOffset: noopShared,
      scrollGesture: noopScrollGesture,
    }
  );
}

type GlassSheetDismissScrollViewProps = ScrollViewProps & {
  children: ReactNode;
};

type AnimatedSheetScrollRef = ComponentRef<typeof Animated.ScrollView>;

export const GlassSheetDismissScrollView = forwardRef<AnimatedSheetScrollRef, GlassSheetDismissScrollViewProps>(
  function GlassSheetDismissScrollView({ children, style, contentContainerStyle, ...rest }, ref) {
    const { scrollOffset, scrollGesture } = useGlassSheetScrollDismiss();

    const onScroll = useAnimatedScrollHandler({
      onScroll: (event) => {
        scrollOffset.value = event.contentOffset.y;
      },
    });

    return (
      <GestureDetector gesture={scrollGesture}>
        <Animated.ScrollView
          ref={ref}
          style={style}
          contentContainerStyle={contentContainerStyle}
          bounces
          alwaysBounceVertical={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onScroll={onScroll}
          {...rest}
        >
          {children}
        </Animated.ScrollView>
      </GestureDetector>
    );
  }
);

type GlassBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  heightFraction?: number;
  sheetStyle?: StyleProp<ViewStyle>;
  keyboardAware?: boolean;
  showCloseButton?: boolean;
  enableBodyDismissPan?: boolean;
};

export function GlassBottomSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  heightFraction = 0.8,
  sheetStyle,
  keyboardAware,
  showCloseButton = true,
  enableBodyDismissPan = false,
}: GlassBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetH = Math.min(SCREEN_H * heightFraction, SCREEN_H * 0.92);
  const dismissDragPx = Math.max(44, Math.round(sheetH * 0.12));
  const [presented, setPresented] = useState(visible);
  const closingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const keyboardAwareResolved = keyboardAware ?? Boolean(footer);
  const { inset: keyboardInset } = useKeyboardInset();

  const translateY = useSharedValue(sheetH);
  const backdropOpacity = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const keyboardInsetSv = useSharedValue(0);
  const keyboardAtDragStart = useSharedValue(false);
  const dragActive = useSharedValue(0);
  const dragSettled = useSharedValue(0);
  const sheetHSv = useSharedValue(sheetH);
  const dismissDragPxSv = useSharedValue(dismissDragPx);
  const enableBodyDismissPanSv = useSharedValue(enableBodyDismissPan);
  const safeBottomSv = useSharedValue(Math.max(insets.bottom, 10));

  sheetHSv.value = sheetH;
  dismissDragPxSv.value = dismissDragPx;
  enableBodyDismissPanSv.value = enableBodyDismissPan;
  safeBottomSv.value = Math.max(insets.bottom, 10);

  useEffect(() => {
    keyboardInsetSv.value = withTiming(keyboardInset, {
      duration: KEYBOARD_MS,
      easing: SHEET_EASE,
    });
  }, [keyboardInset, keyboardInsetSv]);

  const scrollGesture = useMemo(() => Gesture.Native(), []);

  const runOpen = useCallback(() => {
    closingRef.current = false;
    cancelAnimation(translateY);
    cancelAnimation(backdropOpacity);
    translateY.value = sheetH;
    backdropOpacity.value = 0;
    translateY.value = withTiming(0, { duration: motion.sheet.openSheet, easing: SHEET_EASE });
    backdropOpacity.value = withTiming(1, { duration: motion.sheet.openBackdrop, easing: SHEET_EASE });
  }, [backdropOpacity, sheetH, translateY]);

  const finishPresentedFalse = useCallback(() => {
    setPresented(false);
  }, []);

  const runClose = useCallback(
    (after?: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
      translateY.value = withTiming(
        sheetHSv.value,
        { duration: motion.sheet.closeSheet, easing: SHEET_EASE },
        (finished) => {
          if (finished) {
            closingRef.current = false;
            runOnJS(finishPresentedFalse)();
            if (after) runOnJS(after)();
          }
        }
      );
      backdropOpacity.value = withTiming(0, { duration: motion.sheet.closeBackdrop, easing: SHEET_EASE });
    },
    [backdropOpacity, finishPresentedFalse, translateY]
  );

  useEffect(() => {
    if (visible) {
      setPresented(true);
      runOpen();
      return;
    }
    if (presented) {
      runClose();
    }
  }, [visible, sheetH, presented, runClose, runOpen]);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    runClose(onClose);
  }, [onClose, runClose]);

  const dismissKeyboardOnly = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const setDragging = useCallback((active: boolean) => {
    isDraggingRef.current = active;
  }, []);

  const completeDismissFromGesture = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    finishPresentedFalse();
    onClose();
    closingRef.current = false;
  }, [finishPresentedFalse, onClose]);

  const sheetPanGesture = useMemo(() => {
    const snapOpen = () => {
      "worklet";
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
      translateY.value = withSpring(0, SHEET_SPRING);
      backdropOpacity.value = withSpring(1, SHEET_SPRING);
    };

    const snapClosed = () => {
      "worklet";
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
      translateY.value = withTiming(
        sheetHSv.value,
        { duration: motion.sheet.closeSheet, easing: SHEET_EASE },
        (finished) => {
          if (finished) runOnJS(completeDismissFromGesture)();
        }
      );
      backdropOpacity.value = withTiming(0, { duration: motion.sheet.closeBackdrop, easing: SHEET_EASE });
    };

    const settleFromPosition = (velocityY: number) => {
      "worklet";
      const currentY = Math.max(0, translateY.value);
      if (currentY < 1) {
        dragSettled.value = 1;
        return;
      }

      dragSettled.value = 1;

      if (keyboardAtDragStart.value) {
        runOnJS(dismissKeyboardOnly)();
        snapOpen();
        return;
      }

      const commitY = Math.max(dismissDragPxSv.value, sheetHSv.value * SHEET_DISMISS_COMMIT_RATIO);
      const shouldClose = currentY >= commitY || velocityY > SHEET_DISMISS_VELOCITY;
      if (shouldClose) {
        snapClosed();
        return;
      }
      snapOpen();
    };

    return Gesture.Pan()
      .activeOffsetY(10)
      .failOffsetY(-12)
      .failOffsetX([-32, 32])
      .simultaneousWithExternalGesture(scrollGesture)
      .onBegin(() => {
        dragActive.value = 1;
        dragSettled.value = 0;
        runOnJS(setDragging)(true);
        cancelAnimation(translateY);
        cancelAnimation(backdropOpacity);
        keyboardAtDragStart.value = keyboardInsetSv.value > 0;
      })
      .onUpdate((e) => {
        if (enableBodyDismissPanSv.value && scrollOffset.value > 1) return;
        if (e.translationY > 0) {
          translateY.value = e.translationY;
          const progress = Math.min(1, e.translationY / (sheetHSv.value * 0.9));
          backdropOpacity.value = 1 - progress * 0.55;
        }
      })
      .onEnd((e) => {
        settleFromPosition(e.velocityY);
      })
      .onFinalize((e) => {
        dragActive.value = 0;
        runOnJS(setDragging)(false);
        if (dragSettled.value === 1) return;
        const currentY = Math.max(0, translateY.value);
        if (currentY > 1 && currentY < sheetHSv.value - 1) {
          settleFromPosition(e.velocityY);
        }
      });
  }, [
    backdropOpacity,
    completeDismissFromGesture,
    dismissDragPxSv,
    dismissKeyboardOnly,
    dragActive,
    dragSettled,
    enableBodyDismissPanSv,
    keyboardAtDragStart,
    keyboardInsetSv,
    scrollGesture,
    scrollOffset,
    setDragging,
    sheetHSv,
    translateY,
  ]);

  useAnimatedReaction(
    () => keyboardInsetSv.value,
    (current, previous) => {
      if (dragActive.value === 1) return;
      if (previous != null && previous > 0 && current === 0 && translateY.value > 1) {
        cancelAnimation(translateY);
        cancelAnimation(backdropOpacity);
        translateY.value = withSpring(0, SHEET_SPRING);
        backdropOpacity.value = withSpring(1, SHEET_SPRING);
      }
    }
  );

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetWrapperStyle = useAnimatedStyle(() => ({
    marginBottom: keyboardAwareResolved ? keyboardInsetSv.value : 0,
  }));

  const sheetPaddingStyle = useAnimatedStyle(() => {
    const resting = 8;
    const kb = keyboardAwareResolved ? keyboardInsetSv.value : 0;
    return {
      paddingBottom: kb > 0 ? resting : Math.max(safeBottomSv.value, resting) + resting,
    };
  });

  const scrollDismissApi = useMemo<SheetDragController>(
    () => ({
      scrollOffset,
      scrollGesture,
    }),
    [scrollGesture, scrollOffset]
  );

  if (!presented) return null;

  return (
    <ModalGestureRoot transparent visible animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.host}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        >
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
        </Pressable>
        <Animated.View style={sheetWrapperStyle}>
          <Animated.View
            style={[
              styles.sheet,
              { height: sheetH },
              sheetAnimatedStyle,
              sheetPaddingStyle,
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={sheetPanGesture}>
              <View style={styles.dragSurface}>
                <View style={styles.handleZone}>
                  <View style={styles.handle} accessibilityElementsHidden />
                </View>
                {title ? (
                  <View style={[styles.titleRow, !showCloseButton && styles.titleRowCentered]}>
                    {showCloseButton ? <View style={styles.titleSpacer} /> : null}
                    <Text
                      style={[styles.title, !showCloseButton && styles.titleNoClose]}
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                    {showCloseButton ? (
                      <Pressable
                        onPress={dismiss}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        style={styles.closeBtn}
                        hitSlop={8}
                      >
                        <Ionicons name="close" size={22} color={colors.textWhite78} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                <GlassSheetScrollDismissContext.Provider value={scrollDismissApi}>
                  <View style={styles.body}>{children}</View>
                </GlassSheetScrollDismissContext.Provider>
              </View>
            </GestureDetector>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </Animated.View>
      </View>
    </ModalGestureRoot>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#0c0d12",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.75,
    shadowRadius: 40,
    elevation: 24,
  },
  dragSurface: {
    flex: 1,
    minHeight: 0,
  },
  handleZone: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  titleRowCentered: {
    justifyContent: "center",
  },
  titleSpacer: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  titleNoClose: {
    flex: 0,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(12, 13, 18, 0.98)",
  },
});
