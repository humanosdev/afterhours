import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ProfileAvatar } from "../ProfileAvatar";
import { colors } from "../../theme/colors";
import { profileLayout } from "../../theme/profileLayout";
import type { AcceptedFriendPublic } from "../../types/friend";

const AVATAR_SIZE = 36;
const AVATAR_OVERLAP = 10;

type MutualFriendsPreviewProps = {
  preview: AcceptedFriendPublic[];
  total: number;
};

/** PWA `/u/[username]` mutual friends row — avatar stack + "Friends with …" copy. */
export function MutualFriendsPreview({ preview, total }: MutualFriendsPreviewProps) {
  const router = useRouter();

  if (total === 0) {
    return <Text style={styles.empty}>No mutual friends</Text>;
  }

  const names = preview
    .map((m) => m.display_name?.trim() || m.username || "someone")
    .join(", ");
  const extra = total > 2 ? total - 2 : 0;

  return (
    <View style={styles.row}>
      <View style={styles.stack}>
        {preview.map((m, i) => {
          const uname = m.username?.replace(/^@/, "");
          const avatar = (
            <ProfileAvatar
              avatarUrl={m.avatar_url ?? null}
              label={m.display_name || m.username || "Mutual friend"}
              size={AVATAR_SIZE}
            />
          );
          const stackStyle = [
            styles.stackItem,
            { marginLeft: i === 0 ? 0 : -AVATAR_OVERLAP, zIndex: i },
          ];

          return uname ? (
            <Pressable
              key={m.id}
              onPress={() => router.push(`/u/${encodeURIComponent(uname)}`)}
              accessibilityRole="button"
              accessibilityLabel={`${m.display_name || m.username || "Mutual friend"} profile`}
              style={stackStyle}
            >
              {avatar}
            </Pressable>
          ) : (
            <View key={m.id} style={stackStyle}>
              {avatar}
            </View>
          );
        })}
        {extra > 0 ? (
          <View
            accessibilityLabel={`${extra} more mutual friends`}
            style={[styles.extraPill, { marginLeft: -AVATAR_OVERLAP, zIndex: preview.length }]}
          >
            <Text style={styles.extraText}>+{extra}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.copy} numberOfLines={2}>
        Friends with {names}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginTop: profileLayout.bioTop,
  },
  stack: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  stackItem: {
    borderWidth: 2,
    borderColor: colors.bgPrimary,
    borderRadius: AVATAR_SIZE / 2 + 2,
  },
  extraPill: {
    minWidth: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.bgPrimary,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  extraText: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: colors.textWhite85,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: colors.textWhite75,
  },
  empty: {
    marginTop: profileLayout.bioTop,
    fontSize: 13,
    color: colors.textWhite42,
  },
});
