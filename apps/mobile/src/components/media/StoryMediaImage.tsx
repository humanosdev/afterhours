import { type ImageContentFit, type ImageStyle } from "expo-image";
import { useMemo } from "react";
import { Dimensions, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { resolveStoryDisplayUri } from "../../lib/storyMediaUri";
import {
  type MediaLayoutClass,
  shareDetailMediaFrameStyle,
  shareFeedDisplayFrameStyle,
  squareGridCellStyle,
  verticalStoryPreviewFrameStyle,
  fullscreenMediaStyle,
} from "../../theme/mediaLayout";
import { IntencityRemoteImage } from "./IntencityRemoteImage";

type StoryMediaImageProps = {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  layoutClass?: MediaLayoutClass;
  /** When layoutClass set, wraps image in canonical frame (WYSIWYG / skeleton parity). */
  frameStyle?: StyleProp<ViewStyle>;
  debugLabel?: string;
  holdoverWhileLoading?: boolean;
  recyclingKey?: string;
  onUriResolved?: () => void;
  onImageLoad?: () => void;
  imageOpacity?: number;
};

function frameForClass(layoutClass: MediaLayoutClass | undefined): ViewStyle | undefined {
  if (!layoutClass) return undefined;
  const w = Dimensions.get("window").width;
  switch (layoutClass) {
    case "SHARE_FEED_DISPLAY":
      return shareFeedDisplayFrameStyle(w);
    case "SHARE_DETAIL":
      return shareDetailMediaFrameStyle();
    case "VERTICAL_STORY":
      return verticalStoryPreviewFrameStyle();
    case "SQUARE_GRID":
      return squareGridCellStyle();
    case "FULLSCREEN_IMMERSIVE":
      return fullscreenMediaStyle();
    default:
      return undefined;
  }
}

/**
 * Remote story/share image — signed URL + unified media engine.
 */
export function StoryMediaImage({
  uri,
  style,
  contentFit = "cover",
  layoutClass,
  frameStyle,
  debugLabel,
  holdoverWhileLoading,
  recyclingKey,
  onUriResolved,
  onImageLoad,
  imageOpacity = 1,
}: StoryMediaImageProps) {
  const resolveUri = useMemo(() => resolveStoryDisplayUri, []);
  const frame = frameStyle ?? frameForClass(layoutClass);
  const imageStyle = frame ? [style, styles.frameFill, { opacity: imageOpacity }] : [style, { opacity: imageOpacity }];

  const image = (
    <IntencityRemoteImage
      uri={uri}
      style={imageStyle}
      contentFit={contentFit}
      debugLabel={debugLabel}
      resolveUri={resolveUri}
      holdoverWhileLoading={holdoverWhileLoading}
      recyclingKey={recyclingKey}
      onUriResolved={onUriResolved}
      onImageLoad={onImageLoad}
    />
  );

  if (frame) {
    return <View style={frame}>{image}</View>;
  }

  return image;
}

const styles = StyleSheet.create({
  frameFill: StyleSheet.absoluteFillObject,
});
