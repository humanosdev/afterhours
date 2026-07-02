import { Image } from "expo-image";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from "react";
import {
  Dimensions,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useCropPanZoomGestures } from "../../hooks/useCropPanZoomGestures";
import { useImageBackdropColor } from "../../hooks/useImageBackdropColor";
import { useLocalImageSize } from "../../hooks/useLocalImageSize";
import { exportShareCrop } from "../../lib/shareCropExport";
import { type ShareAspectFormat } from "../../lib/shareAspect";
import { ShareAspectCornerToggle } from "../shares/ShareAspectCornerToggle";
import { avatarCropWindowSize, shareCropWindowSize } from "../../theme/mediaLayout";

export type ShareCropViewportHandle = {
  exportCrop: () => Promise<string | null>;
  resetTransform: () => void;
};

export type CropViewportVariant = "share" | "avatar";

type ShareCropViewportProps = {
  sourceUri: string;
  aspectFormat: ShareAspectFormat;
  onAspectFormatChange: (format: ShareAspectFormat) => void;
  variant?: CropViewportVariant;
  showAspectToggle?: boolean;
  style?: ViewStyle;
  knownImageSize?: { width: number; height: number } | null;
};

export const ShareCropViewport = forwardRef<ShareCropViewportHandle, ShareCropViewportProps>(
  function ShareCropViewport(
    {
      sourceUri,
      aspectFormat,
      onAspectFormatChange,
      variant = "share",
      showAspectToggle = true,
      style,
      knownImageSize = null,
    },
    ref
  ) {
    const windowWidth = Dimensions.get("window").width;
    const { imageSize, onImageLoad } = useLocalImageSize(sourceUri, knownImageSize);
    const backdropColor = useImageBackdropColor(sourceUri);

    const isAvatar = variant === "avatar";

    const cropWindow = useMemo(() => {
      if (isAvatar) return avatarCropWindowSize(windowWidth);
      return shareCropWindowSize(windowWidth, aspectFormat);
    }, [isAvatar, windowWidth, aspectFormat]);

    const windowSize = useMemo(
      () => ({ width: cropWindow.width, height: cropWindow.height }),
      [cropWindow.width, cropWindow.height]
    );

    const layoutReady = Boolean(imageSize);

    const { gesture, animatedImageStyle, resetTransform, getTransformAsync } = useCropPanZoomGestures({
      enabled: layoutReady,
      panAtMinZoom: true,
      coverFill: true,
      imageSize,
      windowSize,
    });

    useEffect(() => {
      resetTransform();
    }, [sourceUri, aspectFormat, variant, resetTransform]);

    const exportCrop = useCallback(async () => {
      const t = await getTransformAsync();
      return exportShareCrop(
        sourceUri,
        isAvatar ? "square" : aspectFormat,
        cropWindow.width,
        cropWindow.height,
        t
      );
    }, [sourceUri, isAvatar, aspectFormat, cropWindow, getTransformAsync]);

    useImperativeHandle(ref, () => ({ exportCrop, resetTransform }), [exportCrop, resetTransform]);

    function toggleAspect() {
      onAspectFormatChange(aspectFormat === "portrait" ? "square" : "portrait");
    }

    const circleRadius = cropWindow.width / 2;

    return (
      <View style={[styles.wrap, { backgroundColor: backdropColor }, style]}>
        <GestureDetector gesture={gesture}>
          <View
            style={[
              styles.cropWindow,
              {
                width: cropWindow.width,
                height: cropWindow.height,
                borderRadius: isAvatar ? circleRadius : 0,
                backgroundColor: backdropColor,
              },
            ]}
            collapsable={false}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
          >
            {layoutReady ? (
              <Animated.View style={animatedImageStyle} pointerEvents="none">
                <Image
                  source={{ uri: sourceUri }}
                  recyclingKey={sourceUri}
                  transition={0}
                  style={StyleSheet.absoluteFill}
                  contentFit="fill"
                />
              </Animated.View>
            ) : (
              <Image
                source={{ uri: sourceUri }}
                recyclingKey={sourceUri}
                transition={0}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                onLoad={onImageLoad}
                pointerEvents="none"
              />
            )}
            {!isAvatar ? (
              <View style={styles.gridOverlay} pointerEvents="none">
                {[1, 2].map((i) => (
                  <View
                    key={`v${i}`}
                    style={[styles.gridLineV, { left: `${(i / 3) * 100}%` }]}
                  />
                ))}
                {[1, 2].map((i) => (
                  <View
                    key={`h${i}`}
                    style={[styles.gridLineH, { top: `${(i / 3) * 100}%` }]}
                  />
                ))}
              </View>
            ) : null}
            {showAspectToggle && !isAvatar ? (
              <ShareAspectCornerToggle aspectFormat={aspectFormat} onPress={toggleAspect} />
            ) : null}
            {isAvatar ? (
              <View style={[styles.avatarRing, { borderRadius: circleRadius }]} pointerEvents="none" />
            ) : null}
          </View>
        </GestureDetector>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  cropWindow: {
    overflow: "hidden",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  avatarRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
