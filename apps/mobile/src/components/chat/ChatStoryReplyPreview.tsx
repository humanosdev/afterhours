import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { IntencityRemoteImage } from "../media/IntencityRemoteImage";
import { mediaLexicon } from "../../content/mediaLexicon";
import type { ChatStoryReplyAttachment } from "../../types/chatThread";
import { colors } from "../../theme/colors";

type ChatStoryReplyPreviewProps = {
  attachment: ChatStoryReplyAttachment | null | undefined;
  storyId?: string | null;
  onPress?: () => void;
  /** Compact portrait card for DM thread — no border, sits above the text bubble. */
  compact?: boolean;
  align?: "left" | "right";
  style?: StyleProp<ViewStyle>;
};

/** IG-style story reply preview above the reply text in DM threads. */
export function ChatStoryReplyPreview({
  attachment,
  storyId,
  onPress,
  compact = false,
  align = "left",
  style,
}: ChatStoryReplyPreviewProps) {
  if (!storyId && !attachment) return null;

  const label = attachment?.is_share ? mediaLexicon.share.label : mediaLexicon.moment.label;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `Open ${label}` : undefined}
      style={({ pressed }) => [
        compact ? styles.compactCard : styles.card,
        align === "right" ? styles.alignRight : styles.alignLeft,
        pressed && onPress && styles.cardPressed,
        style,
      ]}
    >
      {attachment?.media_url ? (
        <IntencityRemoteImage
          uri={attachment.media_url}
          style={compact ? styles.compactThumb : styles.thumb}
          contentFit="cover"
          recyclingKey={`chat-story-${attachment.id}`}
        />
      ) : (
        <View style={[compact ? styles.compactThumb : styles.thumb, styles.thumbPlaceholder]} />
      )}
      <Text style={compact ? styles.compactLabel : styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  compactCard: {
    width: 108,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 6,
    backgroundColor: "transparent",
  },
  alignLeft: {
    alignSelf: "flex-start",
  },
  alignRight: {
    alignSelf: "flex-end",
  },
  cardPressed: {
    opacity: 0.88,
  },
  thumb: {
    width: "100%",
    aspectRatio: 9 / 16,
    maxHeight: 160,
    backgroundColor: "#141820",
  },
  compactThumb: {
    width: "100%",
    aspectRatio: 9 / 16,
    maxHeight: 108,
    borderRadius: 10,
    backgroundColor: "#141820",
    overflow: "hidden",
  },
  thumbPlaceholder: {
    minHeight: 96,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textWhite55,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  compactLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textWhite45,
    paddingTop: 4,
    paddingHorizontal: 2,
  },
});
