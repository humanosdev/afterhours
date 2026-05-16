import { Image, StyleSheet, Text, View } from "react-native";
import type { HubShareFeedItem } from "../types/hubFeed";
import { formatSocialAgo } from "../lib/socialTime";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { GlassSurface } from "./GlassSurface";
import { ProfileAvatar } from "./ProfileAvatar";

/** Read-only share card — web `HubShareFeedCard` silhouette (header + media; no actions). */
export function HubSharePreviewCard({ item }: { item: HubShareFeedItem }) {
  return (
    <View style={styles.article}>
      <GlassSurface style={styles.card} muted>
        <View style={styles.header}>
          <ProfileAvatar avatarUrl={item.avatar_url} label={item.username} size={32} />
          <View style={styles.headerText}>
            <Text style={styles.username} numberOfLines={1}>
              {item.username}
            </Text>
            <Text style={styles.time}>{formatSocialAgo(item.created_at)}</Text>
          </View>
        </View>
        <View style={styles.mediaWrap}>
          <Image
            source={{ uri: item.image_url }}
            style={styles.media}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        </View>
        <Text style={styles.hint}>View on web/PWA for likes and comments.</Text>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  article: {
    width: "100%",
    paddingBottom: 20,
  },
  card: {
    borderRadius: layout.cardRadius,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
  },
  mediaWrap: {
    borderRadius: layout.cardRadius - 2,
    overflow: "hidden",
    aspectRatio: 5 / 6,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  hint: {
    fontSize: 11,
    color: colors.textWhite42,
    lineHeight: 15,
    paddingHorizontal: 4,
  },
});
