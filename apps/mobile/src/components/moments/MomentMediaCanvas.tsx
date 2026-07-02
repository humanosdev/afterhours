import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useCropPanZoomGestures } from "../../hooks/useCropPanZoomGestures";
import { useImageBackdropColor } from "../../hooks/useImageBackdropColor";
import { useLocalImageSize } from "../../hooks/useLocalImageSize";
import type { ShareCropTransform } from "../../lib/shareCropExport";

export type MomentMediaTransform = ShareCropTransform;

export type MomentMediaCanvasHandle = {
  getTransform: () => MomentMediaTransform;
  getTransformAsync: () => Promise<MomentMediaTransform>;
};

type MomentMediaCanvasProps = {
  uri: string;
  fillCutout?: boolean;
  enableGestures?: boolean;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  frameSize?: { width: number; height: number } | null;
  knownImageSize?: { width: number; height: number } | null;
  onLayoutSize?: (size: { width: number; height: number }) => void;
  onImageSize?: (size: { width: number; height: number }) => void;
};

export const MomentMediaCanvas = forwardRef<MomentMediaCanvasHandle, MomentMediaCanvasProps>(
  function MomentMediaCanvas(
    {
      uri,
      fillCutout = false,
      enableGestures = false,
      style,
      borderRadius = 0,
      frameSize = null,
      knownImageSize = null,
      onLayoutSize,
      onImageSize,
    },
    ref
  ) {
    const [layoutSize, setLayoutSize] = useState(() => ({
      width: frameSize?.width ?? 0,
      height: frameSize?.height ?? 0,
    }));
    const { imageSize, onImageLoad } = useLocalImageSize(uri, knownImageSize);
    const backdropColor = useImageBackdropColor(uri);

    useEffect(() => {
      if (frameSize && frameSize.width > 0 && frameSize.height > 0) {
        setLayoutSize({ width: frameSize.width, height: frameSize.height });
        onLayoutSize?.({ width: frameSize.width, height: frameSize.height });
      }
    }, [frameSize?.width, frameSize?.height, onLayoutSize]);

    useEffect(() => {
      if (imageSize) {
        onImageSize?.({ width: imageSize.w, height: imageSize.h });
      }
    }, [imageSize, onImageSize]);

    const windowSize = layoutSize;
    const layoutReady =
      Boolean(imageSize) && windowSize.width > 0 && windowSize.height > 0;

    const { gesture, animatedImageStyle, getTransform, getTransformAsync } = useCropPanZoomGestures({
      enabled: enableGestures && layoutReady,
      panAtMinZoom: true,
      coverFill: fillCutout,
      imageSize,
      windowSize,
    });

    useImperativeHandle(ref, () => ({ getTransform, getTransformAsync }), [
      getTransform,
      getTransformAsync,
    ]);

    const previewFit = fillCutout ? "cover" : "contain";

    const clipContent =
      enableGestures && layoutReady ? (
        <Animated.View style={animatedImageStyle} pointerEvents="none">
          <Image
            source={{ uri }}
            recyclingKey={uri}
            transition={0}
            cachePolicy="memory-disk"
            priority="high"
            style={StyleSheet.absoluteFill}
            contentFit="fill"
            onLoad={onImageLoad}
          />
        </Animated.View>
      ) : (
        <Image
          source={{ uri }}
          recyclingKey={uri}
          transition={0}
          cachePolicy="memory-disk"
          priority="high"
          style={StyleSheet.absoluteFill}
          contentFit={previewFit}
          onLoad={onImageLoad}
          pointerEvents="none"
        />
      );

    return (
      <View
        style={[styles.host, { borderRadius, backgroundColor: backdropColor }, style]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setLayoutSize({ width, height });
            onLayoutSize?.({ width, height });
          }
        }}
      >
        {enableGestures ? (
          <GestureDetector gesture={gesture}>
            <View
              style={[styles.clip, { backgroundColor: backdropColor }]}
              collapsable={false}
            >
              {clipContent}
            </View>
          </GestureDetector>
        ) : (
          <View style={[styles.clip, { backgroundColor: backdropColor }]}>{clipContent}</View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  host: {
    flex: 1,
    overflow: "hidden",
  },
  clip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
