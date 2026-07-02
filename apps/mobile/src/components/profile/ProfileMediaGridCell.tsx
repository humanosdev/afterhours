import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSharePressGestures } from "../../lib/useSharePressGestures";
import { StoryMediaImage } from "../media/StoryMediaImage";
import { ShareLikeBurst } from "../shares/ShareLikeBurst";
import { ReportedContentCover } from "../moderation/ReportedContentCover";
import { mediaLayout, profileGridCellSize } from "../../theme/mediaLayout";

type ProfileMediaGridCellProps = {
  imageUrl: string;
  storyId?: string;
  onPress: () => void;
  onPressIn?: () => void;
  onDoublePress?: () => void;
  debugLabel?: string;
};

/**
 * Profile/archive grid cell — explicit square dimensions (RN flexWrap + aspectRatio can render 0px tall).
 */
export function ProfileMediaGridCell({
  imageUrl,
  storyId,
  onPress,
  onPressIn,
  onDoublePress,
  debugLabel,
}: ProfileMediaGridCellProps) {
  const size = profileGridCellSize();
  const [likeBurstKey, setLikeBurstKey] = useState(0);

  const onCellPress = useSharePressGestures({
    onSingleTap: onPress,
    onDoubleTap: () => {
      setLikeBurstKey((k) => k + 1);
      onDoublePress?.();
    },
    enableSingleTap: true,
  });

  const image = (
    <StoryMediaImage
      uri={imageUrl}
      style={{ width: size, height: size }}
      contentFit="cover"
      debugLabel={debugLabel}
    />
  );

  const content = storyId ? (
    <ReportedContentCover storyId={storyId} style={{ width: size, height: size }}>
      {image}
    </ReportedContentCover>
  ) : (
    image
  );

  return (
    <Pressable
      onPress={onCellPress}
      onPressIn={onPressIn}
      style={[styles.cell, { width: size, height: size }]}
      accessibilityRole="button"
    >
      <View style={[styles.inner, { width: size, height: size }]}>
        {content}
        <ShareLikeBurst trigger={likeBurstKey} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    overflow: "hidden",
    backgroundColor: mediaLayout.placeholderColor,
  },
  inner: {
    position: "relative",
    overflow: "hidden",
  },
});
