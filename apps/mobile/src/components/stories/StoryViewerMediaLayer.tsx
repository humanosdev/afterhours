import { memo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { normalizeShareAspect, type ShareAspectFormat } from "../../lib/shareAspect";
import { momentViewerStageMetrics } from "../../theme/momentStageLayout";
import { shareViewerFeedFrameMetrics, mediaLayout } from "../../theme/mediaLayout";
import { ViewerSlideImage } from "./ViewerSlideImage";

type StoryViewerMediaLayerProps = {
  storyId: string;
  mediaUrl: string;
  isShare?: boolean;
  shareAspect?: ShareAspectFormat | null;
};

/** Fullscreen slide — IG moment cutout (WYSIWYG with composer); share card on dim backdrop. */
export const StoryViewerMediaLayer = memo(function StoryViewerMediaLayer({
  storyId,
  mediaUrl,
  isShare = false,
  shareAspect,
}: StoryViewerMediaLayerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const format = normalizeShareAspect(shareAspect);

  if (!isShare) {
    const stage = momentViewerStageMetrics(width, height, insets);
    return (
      <View style={styles.host} pointerEvents="none">
        <View
          style={[
            styles.momentCutout,
            {
              left: stage.left,
              top: stage.top,
              width: stage.width,
              height: stage.height,
              borderRadius: stage.borderRadius,
            },
          ]}
        >
          <ViewerSlideImage storedUrl={mediaUrl} recyclingKey={storyId} contentFit="cover" />
        </View>
      </View>
    );
  }

  const metrics = shareViewerFeedFrameMetrics(width, height, format);

  return (
    <View style={styles.host} pointerEvents="none">
      <View
        style={[
          styles.shareFeedFrame,
          {
            left: metrics.left,
            top: metrics.top,
            width: metrics.width,
            height: metrics.height,
          },
        ]}
      >
        <ViewerSlideImage storedUrl={mediaUrl} recyclingKey={storyId} contentFit="cover" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: "#000",
  },
  momentCutout: {
    position: "absolute",
    overflow: "hidden",
    backgroundColor: mediaLayout.placeholderColor,
  },
  shareFeedFrame: {
    position: "absolute",
    overflow: "hidden",
    backgroundColor: mediaLayout.placeholderColor,
    borderRadius: mediaLayout.feedMediaRadius,
  },
});
