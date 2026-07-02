import { type ImageContentFit, type ImageStyle } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { type MediaLayoutClass, venueCardFrameStyle, venueHeroFrameStyle } from "../../theme/mediaLayout";
import { IntencityRemoteImage } from "./IntencityRemoteImage";

type RemoteImageProps = {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  accessibilityLabel?: string;
  layoutClass?: Extract<MediaLayoutClass, "VENUE_CARD" | "VENUE_HERO">;
  venueCardWidth?: number;
  frameStyle?: StyleProp<ViewStyle>;
};

function frameForClass(
  layoutClass: RemoteImageProps["layoutClass"],
  venueCardWidth?: number
): ViewStyle | undefined {
  if (layoutClass === "VENUE_HERO") return venueHeroFrameStyle();
  if (layoutClass === "VENUE_CARD" && venueCardWidth) return venueCardFrameStyle(venueCardWidth);
  return undefined;
}

/** Remote HTTP(S) image — venues, banners (unified media engine). */
export function RemoteImage({
  uri,
  style,
  contentFit = "cover",
  accessibilityLabel,
  layoutClass,
  venueCardWidth,
  frameStyle,
}: RemoteImageProps) {
  const frame = frameStyle ?? frameForClass(layoutClass, venueCardWidth);
  const imageStyle = frame ? [style, styles.frameFill] : style;

  const image = (
    <IntencityRemoteImage
      uri={uri}
      style={imageStyle}
      contentFit={contentFit}
      accessibilityLabel={accessibilityLabel}
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
