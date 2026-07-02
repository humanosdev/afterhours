import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileAvatar } from "../ProfileAvatar";
import {
  loadSuggestedPeople,
  suggestedPersonDisplayName,
  suggestedPersonSubtitle,
  type SuggestedPersonRow,
} from "../../lib/loadSuggestedPeople";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";

type HubSuggestedFriendsCoachProps = {
  visible: boolean;
  userId: string;
  onDismiss: () => void;
};

export function HubSuggestedFriendsCoach({ visible, userId, onDismiss }: HubSuggestedFriendsCoachProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SuggestedPersonRow[]>([]);

  useEffect(() => {
    if (!visible || !userId) return;
    let cancelled = false;
    setLoading(true);
    void loadSuggestedPeople(userId, 12).then((next) => {
      if (cancelled) return;
      setRows(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  const openProfile = (row: SuggestedPersonRow) => {
    const uname = row.username?.trim().replace(/^@/, "");
    if (!uname) return;
    onDismiss();
    router.push(`/u/${encodeURIComponent(uname)}`);
  };

  const openSearch = () => {
    onDismiss();
    router.push("/search-discovery");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Dismiss suggestions" />
        <View style={styles.card} accessibilityViewIsModal>
          <LinearGradient
            colors={["rgba(22, 27, 46, 0.98)", "rgba(11, 14, 23, 0.98)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardInner}>
            <Text style={styles.kicker}>People to know</Text>
            <Text style={styles.title}>Suggested friends</Text>
            <Text style={styles.body}>
              Friends of your friends show first. When you&apos;re new, we also surface people already on Intencity.
            </Text>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.textPrimary} />
              </View>
            ) : rows.length === 0 ? (
              <Text style={styles.empty}>No suggestions right now — try search to find people by name.</Text>
            ) : (
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {rows.map((row) => {
                  const handle = row.username ? `@${row.username.replace(/^@/, "")}` : "";
                  return (
                    <Pressable
                      key={row.id}
                      onPress={() => openProfile(row)}
                      style={({ pressed }) => [styles.personRow, pressed && styles.personRowPressed]}
                      accessibilityRole="button"
                    >
                      <ProfileAvatar
                        avatarUrl={row.avatar_url}
                        label={suggestedPersonDisplayName(row)}
                        size={44}
                        bordered={false}
                      />
                      <View style={styles.personText}>
                        <Text style={styles.personName} numberOfLines={1}>
                          {suggestedPersonDisplayName(row)}
                        </Text>
                        <Text style={styles.personMeta} numberOfLines={1}>
                          {[handle, suggestedPersonSubtitle(row)].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                      <View style={[styles.sourcePill, row.source === "mutual" && styles.sourcePillMutual]}>
                        <Text style={styles.sourcePillText}>
                          {row.source === "mutual" ? "Mutual" : "New"}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.actions}>
              <Pressable onPress={openSearch} style={styles.secondaryBtn} accessibilityRole="button">
                <Text style={styles.secondaryLabel}>Search people</Text>
              </Pressable>
              <Pressable onPress={onDismiss} style={styles.primaryBtn} accessibilityRole="button">
                <Text style={styles.primaryLabel}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
    justifyContent: "center",
    paddingHorizontal: layout.screenPaddingX,
  },
  card: {
    maxHeight: "78%",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardInner: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 10,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  loadingWrap: {
    paddingVertical: 28,
    alignItems: "center",
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    paddingVertical: 12,
  },
  listScroll: {
    maxHeight: 320,
  },
  listContent: {
    gap: 8,
    paddingVertical: 4,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  personRowPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  personText: {
    flex: 1,
    gap: 2,
  },
  personName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  personMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sourcePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  sourcePillMutual: {
    borderColor: "rgba(59, 102, 255, 0.35)",
    backgroundColor: "rgba(59, 102, 255, 0.12)",
  },
  sourcePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textWhite75,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textWhite80,
  },
  primaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
});
