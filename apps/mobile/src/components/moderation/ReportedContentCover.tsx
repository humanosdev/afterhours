import { Flag } from "lucide-react-native";
import { type ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useReportedContent } from "../../providers/ReportedContentProvider";
import { colors } from "../../theme/colors";

type ReportedContentCoverProps = {
  storyId: string;
  children: ReactNode;
  style?: ViewStyle;
  /** Match parent media corner radius when set. */
  borderRadius?: number;
};

/** Personal hide overlay — reporters keep content covered even after admin approval. */
export function ReportedContentCover({
  storyId,
  children,
  style,
  borderRadius,
}: ReportedContentCoverProps) {
  const { isStoryReported } = useReportedContent();
  const reported = isStoryReported(storyId);

  if (!reported) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.wrap, style, borderRadius != null ? { borderRadius, overflow: "hidden" } : null]}>
      <View style={styles.hiddenMedia} pointerEvents="none">
        {children}
      </View>
      <View
        style={[styles.cover, borderRadius != null ? { borderRadius } : null]}
        accessibilityRole="text"
        accessibilityLabel="You reported this post. It stays hidden for you."
      >
        <View style={styles.iconRing}>
          <Flag size={22} color="#fff" strokeWidth={2} />
        </View>
        <Text style={styles.title}>You reported this post</Text>
        <Text style={styles.body}>
          Hidden on your device while we review. It stays hidden for you even if we allow it to stay up for others.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
  },
  hiddenMedia: {
    opacity: 0,
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 10,
    backgroundColor: "rgba(12, 14, 20, 0.94)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 280,
  },
});
