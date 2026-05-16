import { Image, StyleSheet, Text, View } from "react-native";
import type { HubShareFeedItem } from "../types/hubFeed";
import { formatSocialAgo } from "../lib/socialTime";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { GlassSurface } from "./GlassSurface";
import { ProfileAvatar } from "./ProfileAvatar";

/** Read-only share card — mirrors web `HubShareFeedCard` header + media (no actions). */
export function HubSharePreviewCard({ item }: { item: HubShareFeedItem }) {
  return (
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
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: layout.cardRadius,
    padding: 10,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
    borderRadius: 12,
    overflow: "hidden",
    aspectRatio: 5 / 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
});
