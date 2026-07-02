import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { GlassBottomSheet } from "../ui/GlassBottomSheet";
import {
  REPORT_REASON_OPTIONS,
  submitContentReport,
  type ReportReason,
  type ReportTargetType,
} from "../../lib/contentReports";
import { blockUser } from "../../lib/blockActions";
import {
  fetchFriendRequestStatus,
  unfriendUser,
  type FriendRequestStatus,
} from "../../lib/fetchPublicProfile";
import { getPairBlockStatus, type PairBlockStatus } from "../../lib/pairBlockStatus";
import { profileUsernameLabel } from "../../lib/profileDisplay";
import { useAuth } from "../../providers/AuthProvider";
import { useCreateComposer } from "../../providers/CreateComposerProvider";
import { useReportedContent } from "../../providers/ReportedContentProvider";
import { colors } from "../../theme/colors";

type ReportContentSheetProps = {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  contentLabel: string;
  /** Content owner — enables optional block / unfriend during report. */
  targetUserId?: string;
  targetUsername?: string | null;
};

export function ReportContentSheet({
  visible,
  onClose,
  targetType,
  targetId,
  contentLabel,
  targetUserId,
  targetUsername,
}: ReportContentSheetProps) {
  const { user } = useAuth();
  const { markStoryReported, markCommentReported } = useReportedContent();
  const { bumpStoryEpoch } = useCreateComposer();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [blockAlso, setBlockAlso] = useState(false);
  const [unfriendAlso, setUnfriendAlso] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [didBlock, setDidBlock] = useState(false);
  const [didUnfriend, setDidUnfriend] = useState(false);
  const [blockStatus, setBlockStatus] = useState<PairBlockStatus>("none");
  const [friendStatus, setFriendStatus] = useState<FriendRequestStatus>("none");

  const blockLabel = profileUsernameLabel({ username: targetUsername ?? null }, "this user");
  const canOfferSocialActions =
    !!targetUserId && targetUserId !== user?.id && blockStatus !== "they_blocked_you";
  const canOfferBlock = canOfferSocialActions && blockStatus !== "you_blocked_them";
  const canOfferUnfriend = canOfferSocialActions && friendStatus === "friends";

  useEffect(() => {
    if (!visible || !user?.id || !targetUserId || targetUserId === user.id) {
      setBlockStatus("none");
      setFriendStatus("none");
      return;
    }

    let cancelled = false;
    void (async () => {
      const [nextBlockStatus, nextFriendStatus] = await Promise.all([
        getPairBlockStatus(user.id, targetUserId),
        fetchFriendRequestStatus(user.id, targetUserId),
      ]);
      if (cancelled) return;
      setBlockStatus(nextBlockStatus);
      setFriendStatus(nextFriendStatus);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, user?.id, targetUserId]);

  const reset = () => {
    setReason(null);
    setDetails("");
    setBlockAlso(false);
    setUnfriendAlso(false);
    setSending(false);
    setMessage(null);
    setDone(false);
    setDidBlock(false);
    setDidUnfriend(false);
    setBlockStatus("none");
    setFriendStatus("none");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const hideCopy =
    targetType === "comment"
      ? "This comment stays hidden for you, even if we decide it doesn't break our rules."
      : "This post stays hidden for you, even if we decide it doesn't break our rules.";

  const finishReport = async (alreadyReported: boolean) => {
    if (targetType === "story") {
      markStoryReported(targetId);
    } else {
      markCommentReported(targetId);
    }

    let blocked = false;
    if (blockAlso && canOfferBlock && user?.id && targetUserId) {
      const blockResult = await blockUser(user.id, targetUserId);
      if (blockResult.ok) {
        blocked = true;
        setDidBlock(true);
        bumpStoryEpoch();
      }
    }

    let unfriended = false;
    if (unfriendAlso && canOfferUnfriend && user?.id && targetUserId) {
      const ok = await unfriendUser(user.id, targetUserId);
      if (ok) {
        unfriended = true;
        setDidUnfriend(true);
        bumpStoryEpoch();
      }
    }

    setDone(true);

    const socialBits: string[] = [];
    if (blocked) socialBits.push(`${blockLabel} is blocked`);
    if (unfriended) socialBits.push(`you're no longer friends with ${blockLabel}`);
    const socialSuffix = socialBits.length ? `${socialBits.join(" and ")}.` : "";

    if (alreadyReported) {
      setMessage(
        socialSuffix
          ? `You already reported this. ${socialSuffix} ${hideCopy}`
          : `You already reported this. ${hideCopy}`
      );
      return;
    }

    setMessage(
      socialSuffix
        ? `Thanks — we'll review this. ${socialSuffix} ${hideCopy}`
        : `Thanks — we'll review this. ${hideCopy}`
    );
  };

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setMessage(null);
    const result = await submitContentReport({
      targetType,
      targetId,
      reason,
      details: reason === "other" || details.trim() ? details : undefined,
    });

    if (result.ok) {
      await finishReport(false);
      setSending(false);
      return;
    }

    if (result.code === "already_reported") {
      await finishReport(true);
      setSending(false);
      return;
    }

    setSending(false);
    setMessage(result.error);
  };

  const doneTitle = didBlock && didUnfriend
    ? "Reported, blocked, and unfriended"
    : didBlock
      ? "Reported and blocked"
      : didUnfriend
        ? "Reported and unfriended"
        : "Report submitted";

  const footer = !done ? (
    <View style={styles.footer}>
      <Pressable
        style={[styles.primaryBtn, (!reason || sending) && styles.primaryBtnDisabled]}
        onPress={() => void submit()}
        disabled={!reason || sending}
      >
        {sending ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.primaryBtnLabel}>Submit report</Text>
        )}
      </Pressable>
    </View>
  ) : undefined;

  return (
    <GlassBottomSheet
      visible={visible}
      onClose={handleClose}
      title={`Report ${contentLabel}`}
      heightFraction={0.78}
      keyboardAware
      footer={footer}
    >
      {done ? (
        <View style={styles.doneWrap}>
          <Text style={styles.doneTitle}>{doneTitle}</Text>
          <Text style={styles.doneBody}>{message}</Text>
          <Pressable style={styles.primaryBtn} onPress={handleClose}>
            <Text style={styles.primaryBtnLabel}>Done</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <Text style={styles.lead}>
            Why are you reporting this? It will be hidden for you right away while we review. After several reports
            from different people, it may be hidden for everyone.
          </Text>
          {REPORT_REASON_OPTIONS.map((opt) => {
            const active = reason === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setReason(opt.id)}
                style={[styles.reasonRow, active && styles.reasonRowActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.reasonLabel, active && styles.reasonLabelActive]}>{opt.label}</Text>
                <Text style={styles.reasonHint}>{opt.hint}</Text>
              </Pressable>
            );
          })}
          {canOfferBlock ? (
            <Pressable
              onPress={() => setBlockAlso((v) => !v)}
              style={[styles.optionRow, blockAlso && styles.optionRowActive]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: blockAlso }}
            >
              <View style={[styles.checkbox, blockAlso && styles.checkboxActive]}>
                {blockAlso ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionLabel}>Also block {blockLabel}</Text>
                <Text style={styles.optionHint}>Hide their posts, moments, and messages going forward</Text>
              </View>
            </Pressable>
          ) : null}
          {canOfferUnfriend ? (
            <Pressable
              onPress={() => setUnfriendAlso((v) => !v)}
              style={[styles.optionRow, unfriendAlso && styles.optionRowActive]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: unfriendAlso }}
            >
              <View style={[styles.checkbox, unfriendAlso && styles.checkboxActive]}>
                {unfriendAlso ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionLabel}>Also unfriend {blockLabel}</Text>
                <Text style={styles.optionHint}>Remove them from your friends list</Text>
              </View>
            </Pressable>
          ) : null}
          <Text style={styles.detailsLabel}>Additional details (optional)</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="What should we know?"
            placeholderTextColor={colors.textMuted}
            style={styles.detailsInput}
            multiline
            maxLength={2000}
          />
          {message ? <Text style={styles.err}>{message}</Text> : null}
        </ScrollView>
      )}
    </GlassBottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16, gap: 8 },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginBottom: 8,
  },
  reasonRow: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  reasonRowActive: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  reasonLabelActive: {
    color: "#fff",
  },
  reasonHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionRowActive: {
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  checkmark: {
    fontSize: 13,
    fontWeight: "800",
    color: "#000",
    lineHeight: 14,
  },
  optionTextCol: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  optionHint: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  detailsLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  detailsInput: {
    minHeight: 72,
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: colors.textPrimary,
    fontSize: 15,
    textAlignVertical: "top",
  },
  err: {
    marginTop: 8,
    fontSize: 13,
    color: "#f87171",
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  primaryBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  doneWrap: {
    flex: 1,
    paddingVertical: 24,
    gap: 12,
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  doneBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
