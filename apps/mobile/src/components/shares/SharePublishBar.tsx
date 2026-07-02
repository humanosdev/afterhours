import { ArrowRight } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { mediaLexicon } from "../../content/mediaLexicon";
import { ProfileAvatar } from "../ProfileAvatar";

type SharePublishBarProps = {
  avatarUrl: string | null;
  avatarLabel: string;
  count: number;
  publishing?: boolean;
  onPublish: () => void;
};

/** IG-style publish strip after selecting shares from the library. */
export function SharePublishBar({
  avatarUrl,
  avatarLabel,
  count,
  publishing = false,
  onPublish,
}: SharePublishBarProps) {
  return (
    <View style={styles.row}>
      <View style={styles.storyPill}>
        <ProfileAvatar avatarUrl={avatarUrl} label={avatarLabel} size={28} bordered={false} />
        <Text style={styles.storyLabel} numberOfLines={1}>
          {count > 1 ? `${count} ${mediaLexicon.share.labelPlural.toLowerCase()}` : mediaLexicon.share.your}
        </Text>
      </View>
      <Pressable
        onPress={onPublish}
        disabled={publishing}
        style={[styles.sendBtn, publishing && styles.sendBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel={mediaLexicon.share.add}
      >
        {publishing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <ArrowRight size={22} color="#fff" strokeWidth={2.5} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    minHeight: 56,
    gap: 12,
  },
  storyPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    backgroundColor: "rgba(38, 38, 38, 0.92)",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  storyLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0095f6",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.55,
  },
});
