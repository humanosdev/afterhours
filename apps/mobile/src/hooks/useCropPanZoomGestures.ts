import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS, runOnUI, useAnimatedStyle, useSharedValue, withDecay } from "react-native-reanimated";
import {
  clampCropZoom,
  cropPanZoomMinZoom,
  MAX_CROP_ZOOM,
  type ShareCropTransform,
} from "../lib/shareCropExport";

const DEFAULT_TRANSFORM: ShareCropTransform = { zoom: 1, offsetX: 0, offsetY: 0 };

type UseCropPanZoomGesturesOptions = {
  enabled?: boolean;
  panAtMinZoom?: boolean;
  coverFill?: boolean;
  imageSize: { w: number; h: number } | null;
  windowSize: { width: number; height: number };
};

export function useCropPanZoomGestures({
  enabled = true,
  panAtMinZoom = true,
  coverFill = true,
  imageSize,
  windowSize,
}: UseCropPanZoomGesturesOptions) {
  const minZoom = cropPanZoomMinZoom(
    imageSize?.w ?? 0,
    imageSize?.h ?? 0,
    windowSize.width,
    windowSize.height,
    coverFill
  );

  const zoomSv = useSharedValue(1);
  const offXSv = useSharedValue(0);
  const offYSv = useSharedValue(0);
  const pinchBaseSv = useSharedValue(1);
  const panBaseXSv = useSharedValue(0);
  const panBaseYSv = useSharedValue(0);
  const imageWSv = useSharedValue(imageSize?.w ?? 0);
  const imageHSv = useSharedValue(imageSize?.h ?? 0);
  const windowWSv = useSharedValue(windowSize.width);
  const windowHSv = useSharedValue(windowSize.height);
  const coverFillSv = useSharedValue(coverFill ? 1 : 0);
  const minZoomSv = useSharedValue(minZoom);

  useLayoutEffect(() => {
    if (!imageSize) return;
    imageWSv.value = imageSize.w;
    imageHSv.value = imageSize.h;
  }, [imageSize?.w, imageSize?.h, imageWSv, imageHSv]);

  useLayoutEffect(() => {
    windowWSv.value = windowSize.width;
    windowHSv.value = windowSize.height;
  }, [windowSize.width, windowSize.height, windowWSv, windowHSv]);

  useLayoutEffect(() => {
    minZoomSv.value = minZoom;
  }, [minZoom, minZoomSv]);

  useLayoutEffect(() => {
    coverFillSv.value = coverFill ? 1 : 0;
  }, [coverFill, coverFillSv]);

  const layoutRef = useRef({ imageSize, windowSize, coverFill });
  layoutRef.current = { imageSize, windowSize, coverFill };

  const readTransform = useCallback((): ShareCropTransform => {
    const { imageSize: img, windowSize: win, coverFill: fill } = layoutRef.current;
    return {
      zoom: clampCropZoom(
        zoomSv.value,
        img?.w ?? 0,
        img?.h ?? 0,
        win.width,
        win.height,
        fill
      ),
      offsetX: offXSv.value,
      offsetY: offYSv.value,
    };
  }, [offXSv, offYSv, zoomSv]);

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .enabled(enabled)
      .onBegin(() => {
        pinchBaseSv.value = zoomSv.value;
      })
      .onUpdate((e) => {
        zoomSv.value = Math.min(
          MAX_CROP_ZOOM,
          Math.max(minZoomSv.value, pinchBaseSv.value * e.scale)
        );
      });

    const pan = Gesture.Pan()
      .enabled(enabled)
      .minPointers(1)
      .maxPointers(1)
      .minDistance(0)
      .onBegin(() => {
        panBaseXSv.value = offXSv.value;
        panBaseYSv.value = offYSv.value;
      })
      .onUpdate((e) => {
        if (!panAtMinZoom && zoomSv.value <= minZoomSv.value + 0.02) return;
        offXSv.value = panBaseXSv.value + e.translationX;
        offYSv.value = panBaseYSv.value + e.translationY;
      })
      .onEnd((e) => {
        if (coverFillSv.value > 0) return;
        offXSv.value = withDecay({ velocity: e.velocityX, deceleration: 0.997 });
        offYSv.value = withDecay({ velocity: e.velocityY, deceleration: 0.997 });
      });

    return Gesture.Simultaneous(pinch, pan);
  }, [
    enabled,
    panAtMinZoom,
    pinchBaseSv,
    panBaseXSv,
    panBaseYSv,
    zoomSv,
    offXSv,
    offYSv,
    minZoomSv,
    coverFillSv,
  ]);

  const animatedImageStyle = useAnimatedStyle(() => {
    "worklet";
    const imageW = imageWSv.value;
    const imageH = imageHSv.value;
    const windowW = windowWSv.value;
    const windowH = windowHSv.value;
    if (imageW <= 0 || imageH <= 0 || windowW <= 0 || windowH <= 0) {
      return { opacity: 0 };
    }

    const isCover = coverFillSv.value > 0;
    const baseScale = isCover
      ? Math.max(windowW / imageW, windowH / imageH)
      : Math.min(windowW / imageW, windowH / imageH);
    const zoom = Math.min(MAX_CROP_ZOOM, Math.max(minZoomSv.value, zoomSv.value));
    const scale = baseScale * zoom;
    const displayW = imageW * scale;
    const displayH = imageH * scale;

    return {
      position: "absolute" as const,
      width: displayW,
      height: displayH,
      left: (windowW - displayW) / 2 + offXSv.value,
      top: (windowH - displayH) / 2 + offYSv.value,
    };
  });

  const resetTransform = useCallback(() => {
    zoomSv.value = DEFAULT_TRANSFORM.zoom;
    offXSv.value = 0;
    offYSv.value = 0;
  }, [zoomSv, offXSv, offYSv]);

  const getTransform = useCallback((): ShareCropTransform => readTransform(), [readTransform]);

  const getTransformAsync = useCallback((): Promise<ShareCropTransform> => {
    return new Promise((resolve) => {
      runOnUI(() => {
        "worklet";
        const zoom = Math.min(MAX_CROP_ZOOM, Math.max(minZoomSv.value, zoomSv.value));
        runOnJS(resolve)({
          zoom,
          offsetX: offXSv.value,
          offsetY: offYSv.value,
        });
      })();
    });
  }, [minZoomSv, offXSv, offYSv, zoomSv]);

  return {
    gesture,
    animatedImageStyle,
    resetTransform,
    getTransform,
    getTransformAsync,
  };
}
