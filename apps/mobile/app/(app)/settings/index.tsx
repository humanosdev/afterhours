import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import {
  readMapAutoVenueTourEnabled,
  writeMapAutoVenueTourEnabled,
} from "../../../src/lib/mapAutoTourPreference";
import {
  AppSubpageScreen,
  SettingsSection,
} from "../../../src/components/AppSubpageScreen";
import { AtmosphericRow } from "../../../src/components/AtmosphericRow";
import { IntencityPanel } from "../../../src/components/ui/IntencityPanel";
import {
  cancelAccountDeletion,
  fetchAccountSettings,
  getCachedAccountSettings,
  updatePrivateAccount,
  type AccountLifecycleState,
} from "../../../src/lib/fetchAccountSettings";
import { appConfig } from "../../../src/lib/appConfig";
import { submitFeedback, type FeedbackCategory } from "../../../src/lib/submitFeedback";
import { fetchIsAdmin } from "../../../src/lib/fetchMyAdminFlag";
import { useAuth } from "../../../src/providers/AuthProvider";
import { colors } from "../../../src/theme/colors";

const FEEDBACK_CATEGORIES: FeedbackCategory[] = ["feature", "bug", "general"];

const LINK_SECTIONS = [
  {
    title: "Account",
    items: [
      {
        label: "Edit profile",
        desc: "Update your name, username, and bio.",
        path: "/profile-edit" as const,
      },
    ],
  },
  {
    title: "Notifications",
    items: [
      {
        label: "Notification center",
        desc: "View recent activity.",
        path: "/notifications" as const,
      },
      {
        label: "Notification preferences",
        desc: "Control push, social alerts, and quiet hours.",
        path: "/settings/notifications" as const,
      },
    ],
  },
  {
    title: "Privacy",
    items: [
      {
        label: "Blocked users",
        desc: "Manage blocked accounts.",
        path: "/blocks" as const,
      },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Terms of Service", desc: "Understand how Intencity works.", path: "/terms" as const },
      { label: "Privacy Policy", desc: "How your data is handled.", path: "/privacy" as const },
      {
        label: "Community Guidelines",
        desc: "Keep Intencity safe and respectful.",
        path: "/guidelines" as const,
      },
    ],
  },
] as const;

function formatPurgeAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** PWA `/settings` — server-backed privacy + account lifecycle. */
export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const cachedAccount = user?.id ? getCachedAccountSettings(user.id) : null;
  const [autoTourEnabled, setAutoTourEnabled] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(cachedAccount?.isPrivate ?? false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [accountLifecycle, setAccountLifecycle] = useState<AccountLifecycleState>(
    cachedAccount?.lifecycle ?? "active"
  );
  const [accountPurgeAt, setAccountPurgeAt] = useState<string | null>(cachedAccount?.accountPurgeAt ?? null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("feature");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshAccount = useCallback(async () => {
    if (!user?.id) return;
    const snap = await fetchAccountSettings(user.id);
    setPrivateAccount(snap.isPrivate);
    setAccountLifecycle(snap.lifecycle);
    setAccountPurgeAt(snap.accountPurgeAt);
  }, [user?.id]);

  useEffect(() => {
    void readMapAutoVenueTourEnabled().then(setAutoTourEnabled);
  }, []);

  useEffect(() => {
    void refreshAccount();
  }, [refreshAccount]);

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      return;
    }
    void fetchIsAdmin(user.id).then(setIsAdmin);
  }, [user?.id]);

  const onAutoTourChange = useCallback((next: boolean) => {
    setAutoTourEnabled(next);
    void writeMapAutoVenueTourEnabled(next);
  }, []);

  const onPrivateAccountChange = useCallback(
    async (next: boolean) => {
      if (!user?.id) return;
      setPrivacyError(null);
      setPrivateAccount(next);
      const result = await updatePrivateAccount(user.id, next);
      if (!result.ok) {
        setPrivateAccount(!next);
        setPrivacyError(result.message ?? "Could not update privacy.");
      }
    },
    [user?.id]
  );

  const onCancelDeletion = useCallback(async () => {
    setAccountBusy(true);
    setAccountMsg(null);
    const result = await cancelAccountDeletion();
    setAccountBusy(false);
    if (!result.ok) {
      setAccountMsg(result.message ?? "Could not cancel deletion.");
      return;
    }
    await refreshAccount();
    setAccountMsg("Deletion canceled. Your account is active again.");
  }, [refreshAccount]);

  const onSubmitFeedback = useCallback(async () => {
    const subject = feedbackSubject.trim();
    const text = feedbackText.trim();
    if (subject.length < 3) {
      setFeedbackMsg("Please add a short subject (at least a few words).");
      return;
    }
    if (subject.length > 140) {
      setFeedbackMsg("Subject is too long. Keep it under 140 characters.");
      return;
    }
    if (text.length < 8) {
      setFeedbackMsg("Please write at least a short description.");
      return;
    }
    setFeedbackSending(true);
    setFeedbackMsg(null);
    const result = await submitFeedback({
      category: feedbackCategory,
      subject,
      message: text,
    });
    setFeedbackSending(false);
    if (!result.ok) {
      setFeedbackMsg(result.message);
      return;
    }
    setFeedbackSubject("");
    setFeedbackText("");
    setFeedbackCategory("feature");
    setFeedbackMsg(
      result.emailSent
        ? "Thanks — feedback sent."
        : "Thanks — we saved your feedback. Email delivery is pending server setup."
    );
  }, [feedbackCategory, feedbackSubject, feedbackText]);

  return (
    <AppSubpageScreen title="Settings" subtitle="Account, alerts, and privacy.">
      <View style={styles.body}>
        {isAdmin ? (
          <SettingsSection title="Admin">
            <Pressable
              style={styles.adminLink}
              onPress={() => router.push("/admin")}
              accessibilityRole="button"
            >
              <Text style={styles.adminLinkTitle}>Moderation queue</Text>
              <Text style={styles.adminLinkDesc}>Review reported moments, shares, and comments.</Text>
            </Pressable>
          </SettingsSection>
        ) : null}

        <SettingsSection title="Feedback">
          <IntencityPanel style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Suggest a feature or report an issue</Text>
            <Text style={styles.feedbackHint}>We route this to {appConfig.supportEmail}.</Text>
            <View style={styles.categoryRow}>
              {FEEDBACK_CATEGORIES.map((opt) => {
                const on = feedbackCategory === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setFeedbackCategory(opt)}
                    style={[styles.categoryPill, on && styles.categoryPillOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.categoryPillLabel, on && styles.categoryPillLabelOn]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="One line summary"
              placeholderTextColor={colors.textWhite42}
              value={feedbackSubject}
              onChangeText={setFeedbackSubject}
              maxLength={140}
              editable={!feedbackSending}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What should we add or improve?"
              placeholderTextColor={colors.textWhite42}
              multiline
              value={feedbackText}
              onChangeText={setFeedbackText}
              editable={!feedbackSending}
            />
            {feedbackMsg ? <Text style={styles.feedbackMsg}>{feedbackMsg}</Text> : null}
            <Pressable
              style={[styles.sendBtn, feedbackSending && styles.sendBtnDisabled]}
              onPress={() => void onSubmitFeedback()}
              disabled={feedbackSending}
              accessibilityRole="button"
            >
              {feedbackSending ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.sendBtnLabel}>Send feedback</Text>
              )}
            </Pressable>
          </IntencityPanel>
        </SettingsSection>

        <SettingsSection title="Map">
          <AtmosphericRow
            title="Auto venue tour"
            description="Automatically cycles venue checkpoints when you are AFK."
            trailing={
              <Switch
                value={autoTourEnabled}
                onValueChange={onAutoTourChange}
                accessibilityLabel="Auto venue tour"
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Privacy">
          {privacyError ? (
            <Text style={styles.inlineError}>{privacyError}</Text>
          ) : null}
          <AtmosphericRow
            title="Private account"
            description="Only friends can view your full profile page."
            trailing={
              <Switch
                value={privateAccount}
                onValueChange={(v) => void onPrivateAccountChange(v)}
                accessibilityLabel="Private account"
              />
            }
          />
        </SettingsSection>

        {LINK_SECTIONS.map((section) => (
          <SettingsSection key={section.title} title={section.title}>
            {section.items.map((item) => (
              <AtmosphericRow
                key={item.path}
                title={item.label}
                description={item.desc}
                onPress={() => router.push(item.path)}
              />
            ))}
          </SettingsSection>
        ))}

        <SettingsSection title="Account status">
          {accountMsg ? <Text style={styles.accountMsg}>{accountMsg}</Text> : null}
          {accountLifecycle === "delete_pending" && accountPurgeAt ? (
            <View style={styles.warnCard}>
              <Text style={styles.warnText}>
                Deletion is scheduled after {formatPurgeAt(accountPurgeAt)}. Until then, others only see a generic
                empty profile.
              </Text>
            </View>
          ) : null}
          {accountLifecycle === "delete_pending" ? (
            <AtmosphericRow
              title="Cancel account deletion"
              description="Restore a normal active profile and visibility."
              onPress={() => void onCancelDeletion()}
            />
          ) : (
            <>
              <AtmosphericRow
                title="Pause account"
                description="Sign out and hide from others until you log in again."
                onPress={() => router.push("/settings/account/pause")}
              />
              <AtmosphericRow
                title="Delete account"
                description="30-day grace, then scheduled public data removal."
                onPress={() => router.push("/settings/account/delete")}
              />
            </>
          )}
          {accountBusy ? <Text style={styles.busyHint}>Updating account…</Text> : null}
        </SettingsSection>
      </View>
    </AppSubpageScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 20,
    paddingBottom: 24,
  },
  adminLink: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    gap: 4,
  },
  adminLinkTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  adminLinkDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  feedbackCard: {
    padding: 12,
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  feedbackHint: {
    fontSize: 12,
    color: colors.textWhite50,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  categoryPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryPillOn: {
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  categoryPillLabel: {
    fontSize: 12,
    color: colors.textWhite65,
    textTransform: "capitalize",
  },
  categoryPillLabelOn: {
    color: colors.textPrimary,
  },
  fieldLabel: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textWhite50,
  },
  feedbackMsg: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite78,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(10, 12, 24, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 112,
    textAlignVertical: "top",
  },
  sendBtn: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    alignItems: "center",
    minHeight: 42,
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  inlineError: {
    fontSize: 13,
    color: "#fca5a5",
    marginBottom: 8,
  },
  accountMsg: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite78,
    marginBottom: 8,
  },
  warnCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.25)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 12,
    marginBottom: 8,
  },
  warnText: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(253, 230, 138, 0.95)",
  },
  busyHint: {
    fontSize: 12,
    color: colors.textWhite50,
    marginTop: 8,
  },
});
