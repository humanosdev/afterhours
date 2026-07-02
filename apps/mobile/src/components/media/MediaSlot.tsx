import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  type MediaLayoutClass,
  defaultContentFitForClass,
} from "../../theme/mediaLayout";
import { StoryMediaImage } from "./StoryMediaImage";

type MediaSlotProps = {
  uri: string | null | undefined;
  layoutClass?: MediaLayoutClass;
  frameStyle?: StyleProp<ViewStyle>;
  contentFit?: "cover" | "contain";
  debugLabel?: string;
  /** Slot stays at frame size; image fades in after URI resolve + decode. */
  style?: StyleProp<ViewStyle>;
  /** Story viewer — hide previous slide while the next URI resolves. */
  holdoverWhileLoading?: boolean;
  recyclingKey?: string;
  onMediaReady?: (storyKey?: string) => void;
};

/**
 * VP-2X — one media contract: fixed frame, no layout jump on signed URL or decode.
 */
export function MediaSlot({
  uri,
  layoutClass,
  frameStyle,
  contentFit,
  debugLabel,
  style,
  holdoverWhileLoading = true,
  recyclingKey,
  onMediaReady,
}: MediaSlotProps) {
  const [ready, setReady] = useState(false);
  const fit = contentFit ?? (layoutClass ? defaultContentFitForClass(layoutClass) : "cover");

  useEffect(() => {
    setReady(false);
  }, [uri, recyclingKey]);

  const markReady = useCallback(() => {
    setReady(true);
    onMediaReady?.(recyclingKey);
  }, [onMediaReady, recyclingKey]);

  const onUriResolved = useCallback(() => {
    markReady();
  }, [markReady]);

  const onImageLoad = useCallback(() => {
    markReady();
  }, [markReady]);

  return (
    <View style={[styles.slot, style]}>
      <StoryMediaImage
        uri={uri}
        layoutClass={layoutClass}
        frameStyle={frameStyle}
        contentFit={fit}
        debugLabel={debugLabel}
        holdoverWhileLoading={holdoverWhileLoading}
        recyclingKey={recyclingKey}
        onUriResolved={onUriResolved}
        onImageLoad={onImageLoad}
        imageOpacity={ready ? 1 : 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: "100%",
  },
});
