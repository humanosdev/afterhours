import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppSubpageScreen } from "../../../src/components/AppSubpageScreen";
import { GlassToggleRow } from "../../../src/components/ui/GlassToggleRow";
import { useAuth } from "../../../src/providers/AuthProvider";
import { colors } from "../../../src/theme/colors";
import { layout } from "../../../src/theme/layout";
import {
  registerNativePushSubscription,
  unregisterNativePushSubscriptions,
} from "../../../src/lib/nativePushSubscription";
import {
  getCachedNotificationPreferences,
  loadNotificationPreferences,
  prefsEqual,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "../../../src/lib/notificationPreferences";

const TOGGLE_ROWS: Array<{
  key: keyof Omit<NotificationPreferences, "quietStart" | "quietEnd">;
  title: string;
  description: string;
}> = [
  {
    key: "pushEnabled",
    title: "Push Notifications",
    description: "Enable device push alerts.",
  },
  {
    key: "messagesEnabled",
    title: "Messages",
    description: "Allow message alerts and in-app toasts.",
  },
  {
    key: "friendActivityEnabled",
    title: "Friends nearby",
    description: "Know when friends are out.",
  },
  {
    key: "venuePopEnabled",
    title: "Venue getting active",
    description: "Hear when venues start popping.",
  },
  {
    key: "storiesEnabled",
    title: "Friend posted Moment",
    description: "Get notified on new Moments.",
  },
  {
    key: "friendRequestEnabled",
    title: "Friend request accepted",
    description: "Get notified on new connections.",
  },
];

/** PWA `/settings/notifications` — prefs in `notification_preferences` (Supabase). */
export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getCachedNotificationPreferences());
  const [initialPrefs, setInitialPrefs] = useState<NotificationPreferences | null>(null);
  const [uiMsg, setUiMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadNotificationPreferences(user?.id).then((loaded) => {
      if (!mounted) return;
      setPrefs(loaded);
      setInitialPrefs(loaded);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const hasUnsavedChanges = useMemo(
    () => !!initialPrefs && !prefsEqual(initialPrefs, prefs),
    [initialPrefs, prefs]
  );

  const patch = useCallback((next: Partial<NotificationPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...next }));
    setUiMsg(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (saving || !hasUnsavedChanges || !user?.id) return;
    setSaving(true);
    setUiMsg(null);

    const result = await saveNotificationPreferences(user.id, prefs);
    if (!result.ok) {
      setSaving(false);
      setUiMsg(result.message);
      return;
    }

    let pushNote: string | null = null;
    if (prefs.pushEnabled) {
      const reg = await registerNativePushSubscription(user.id);
      if (!reg.ok) {
        const reasonMessages: Record<string, string> = {
          simulator: "Push requires a physical device.",
          missing_project_id:
            "Set EXPO_PUBLIC_EAS_PROJECT_ID in apps/mobile/.env (EAS project UUID) and rebuild the dev client.",
          permission_denied: "Enable notifications in system Settings to receive alerts.",
          token_failed: "Could not register for push on this device. Try again after reinstalling the dev client.",
          db_error: "Could not save push token. Check your connection.",
        };
        pushNote = reasonMessages[reg.reason] ?? "Push registration did not complete.";
      }
    } else {
      await unregisterNativePushSubscriptions(user.id);
    }

    setSaving(false);
    setInitialPrefs(prefs);
    setUiMsg(pushNote ? `${pushNote} Other settings were saved.` : "Notification settings saved.");
  }, [hasUnsavedChanges, initialPrefs, prefs, saving, user?.id]);

  return (
    <AppSubpageScreen title="Notification settings" subtitle="Tune alerts without spam.">
      <View style={styles.list}>
        {TOGGLE_ROWS.map((row) => (
          <GlassToggleRow
            key={row.key}
            title={row.title}
            description={row.description}
            value={prefs[row.key]}
            onValueChange={(v) => patch({ [row.key]: v })}
          />
        ))}

        <View style={styles.quietCard}>
          <Text style={styles.quietTitle}>Quiet hours</Text>
          <Text style={styles.quietDesc}>No push delivery during this window.</Text>
          <View style={styles.quietGrid}>
            <TextInput
              style={styles.timeInput}
              value={prefs.quietStart}
              onChangeText={(quietStart) => patch({ quietStart })}
              placeholder="Start"
              placeholderTextColor={colors.textWhite42}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Quiet hours start"
            />
            <TextInput
              style={styles.timeInput}
              value={prefs.quietEnd}
              onChangeText={(quietEnd) => patch({ quietEnd })}
              placeholder="End"
              placeholderTextColor={colors.textWhite42}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Quiet hours end"
            />
          </View>
        </View>

        <Pressable
          onPress={() => void handleSave()}
          disabled={saving || !hasUnsavedChanges}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving || !hasUnsavedChanges }}
          style={({ pressed }) => [
            styles.saveBtn,
            (saving || !hasUnsavedChanges) && styles.saveBtnDisabled,
            pressed && hasUnsavedChanges && !saving && styles.saveBtnPressed,
          ]}
        >
          <Text style={styles.saveBtnLabel}>{saving ? "Saving..." : "Save changes"}</Text>
        </Pressable>
      </View>

      {uiMsg ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{uiMsg}</Text>
        </View>
      ) : null}
      {saving ? <Text style={styles.savingHint}>Saving…</Text> : null}
    </AppSubpageScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  quietCard: {
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 16,
  },
  quietTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  quietDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textWhite50,
  },
  quietGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  timeInput: {
    flex: 1,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(10, 12, 24, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  saveBtn: {
    marginTop: 4,
    borderRadius: layout.cardRadius,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "rgba(59, 102, 255, 0.15)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnPressed: {
    opacity: 0.92,
  },
  saveBtnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  banner: {
    marginTop: 16,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.25)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(253, 230, 138, 0.95)",
  },
  savingHint: {
    marginTop: 16,
    fontSize: 12,
    color: colors.textWhite50,
  },
});
