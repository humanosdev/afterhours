import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ListRowSkeleton } from "../components/skeletons/ListRowSkeleton";
import { AsyncSection } from "../components/ui/AsyncSection";
import { AppSubpageScreen } from "../components/AppSubpageScreen";
import { StoryMediaImage } from "../components/media/StoryMediaImage";
import {
  adminResolveModeration,
  fetchReportsForTarget,
  type ContentReportRow,
  type ReportReason,
} from "../lib/contentReports";
import {
  fetchAdminModerationQueue,
  moderationTargetType,
  type ModerationQueueItem,
} from "../lib/fetchAdminModerationQueue";
import { fetchIsAdmin } from "../lib/fetchMyAdminFlag";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../theme/colors";
import { mediaLexicon } from "../content/mediaLexicon";

const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate: "Hate",
  nudity: "Nudity",
  violence: "Violence",
  impersonation: "Impersonation",
  other: "Other",
};

export function AdminModerationScreen() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [reportsByKey, setReportsByKey] = useState<Record<string, ContentReportRow[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    const isAdmin = await fetchIsAdmin(user.id);
    setAllowed(isAdmin);
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { items: queue, error } = await fetchAdminModerationQueue();
    if (error) {
      Alert.alert("Moderation", error);
    }
    setItems(queue);
    const reportMap: Record<string, ContentReportRow[]> = {};
    await Promise.all(
      queue.map(async (item) => {
        const type = moderationTargetType(item);
        const rows = await fetchReportsForTarget(type, item.id);
        reportMap[`${type}:${item.id}`] = rows;
      })
    );
    setReportsByKey(reportMap);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (item: ModerationQueueItem, decision: "approve" | "remove") => {
    const type = moderationTargetType(item);
    setBusyId(item.id);
    const result = await adminResolveModeration({
      targetType: type,
      targetId: item.id,
      decision,
    });
    setBusyId(null);
    if (!result.ok) {
      Alert.alert("Moderation", result.error ?? "Could not update.");
      return;
    }
    void load();
  };

  if (allowed === false) {
    return (
      <AppSubpageScreen title="Moderation" subtitle="Admin">
        <Text style={styles.denied}>You don&apos;t have access to this area.</Text>
      </AppSubpageScreen>
    );
  }

  return (
    <AppSubpageScreen title="Moderation queue" subtitle="Review reported content">
      <AsyncSection loading={loading || allowed === null} skeleton={<ListRowSkeleton rows={5} />}>
        {items.length === 0 ? (
          <Text style={styles.empty}>Nothing pending review.</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {items.map((item) => {
            const key = `${moderationTargetType(item)}:${item.id}`;
            const reports = reportsByKey[key] ?? [];
            const busy = busyId === item.id;
            const label =
              item.kind === "story"
                ? item.is_share
                  ? mediaLexicon.share.label
                  : mediaLexicon.moment.label
                : "Comment";

            return (
              <View key={key} style={styles.card}>
                <Text style={styles.cardType}>
                  {label} · {reports.length} report{reports.length === 1 ? "" : "s"}
                </Text>
                {item.kind === "story" ? (
                  <View style={styles.previewFrame}>
                    <StoryMediaImage uri={item.image_url} style={styles.previewImage} contentFit="cover" />
                  </View>
                ) : (
                  <Text style={styles.commentPreview} numberOfLines={4}>
                    {item.content}
                  </Text>
                )}
                <View style={styles.reportList}>
                  {reports.slice(0, 5).map((r) => (
                    <Text key={r.id} style={styles.reportLine}>
                      · {REASON_LABELS[r.reason] ?? r.reason}
                      {r.details ? ` — ${r.details}` : ""}
                    </Text>
                  ))}
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.approveBtn, busy && styles.btnDisabled]}
                    disabled={busy}
                    onPress={() => void resolve(item, "approve")}
                  >
                    <Text style={styles.approveLabel}>Approve (show)</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.removeBtn, busy && styles.btnDisabled]}
                    disabled={busy}
                    onPress={() => {
                      Alert.alert(
                        "Remove content",
                        "This hides the content for users. Continue?",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Remove", style: "destructive", onPress: () => void resolve(item, "remove") },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.removeLabel}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
        )}
      </AsyncSection>
      <Pressable style={styles.refresh} onPress={() => void load()}>
        <Text style={styles.refreshLabel}>Refresh queue</Text>
      </Pressable>
    </AppSubpageScreen>
  );
}

const styles = StyleSheet.create({
  denied: {
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: 24,
  },
  loader: { marginTop: 32 },
  empty: {
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: 24,
  },
  list: { gap: 16, paddingBottom: 32 },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    gap: 10,
  },
  cardType: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  previewFrame: {
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#141820",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  commentPreview: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  reportList: { gap: 4 },
  reportLine: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  approveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
  },
  removeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.25)",
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  approveLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  removeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fca5a5",
  },
  refresh: {
    marginTop: 16,
    alignItems: "center",
  },
  refreshLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
