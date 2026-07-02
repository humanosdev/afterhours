import { useCallback } from "react";
import { Dimensions, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { normalizeShareAspect, type ShareAspectFormat } from "../../lib/shareAspect";
import {
  momentStoryFrameStyle,
  shareFeedDisplayFrameStyle,
} from "../../theme/mediaLayout";
import { MediaSlot } from "./MediaSlot";

export type PostMediaVariant = "moment" | "share";

type PostMediaFrameProps = {
  uri: string | null | undefined;
  variant: PostMediaVariant;
  shareAspect?: ShareAspectFormat | null;
  onMediaReady?: () => void;
  debugLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function postMediaFrameStyle(
  variant: PostMediaVariant,
  shareAspect?: ShareAspectFormat | null,
  windowWidth = Dimensions.get("window").width
): ViewStyle {
  if (variant === "share") {
    return shareFeedDisplayFrameStyle(windowWidth, normalizeShareAspect(shareAspect));
  }
  return momentStoryFrameStyle(windowWidth);
}

/**
 * Canonical post media box — moment 9:16 or share 4:5/1:1; fires `onMediaReady` when frame can reveal with bitmap.
 */
export function PostMediaFrame({
  uri,
  variant,
  shareAspect,
  onMediaReady,
  debugLabel,
  style,
}: PostMediaFrameProps) {
  const windowWidth = Dimensions.get("window").width;
  const frameStyle = postMediaFrameStyle(variant, shareAspect, windowWidth);
  const handleReady = useCallback(() => {
    onMediaReady?.();
  }, [onMediaReady]);

  return (
    <View style={[frameStyle, style]}>
      <MediaSlot
        uri={uri}
        frameStyle={styles.fill}
        debugLabel={debugLabel}
        onMediaReady={handleReady}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
});
