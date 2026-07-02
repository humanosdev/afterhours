import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppSubpageScreen } from "../../../../src/components/AppSubpageScreen";
import { PrimaryButton } from "../../../../src/components/PrimaryButton";
import { fetchAccountSettings, getCachedAccountSettings } from "../../../../src/lib/fetchAccountSettings";
import { useAuth } from "../../../../src/providers/AuthProvider";
import { supabase } from "../../../../src/lib/supabase/client";
import { colors } from "../../../../src/theme/colors";
import { layout } from "../../../../src/theme/layout";

/** PWA `/settings/account/delete` */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const cached = user?.id ? getCachedAccountSettings(user.id) : null;
  const [purgeAt, setPurgeAt] = useState<string | null>(cached?.accountPurgeAt ?? null);
  const [alreadyScheduled, setAlreadyScheduled] = useState(cached?.lifecycle === "delete_pending");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void fetchAccountSettings(user.id).then((snap) => {
      setAlreadyScheduled(snap.lifecycle === "delete_pending");
      setPurgeAt(snap.accountPurgeAt);
    });
  }, [user?.id]);

  async function onScheduleDeletion() {
    if (!acknowledged || busy || alreadyScheduled) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("request_account_deletion");
    setBusy(false);
    if (rpcError) {
      setError("Could not schedule deletion. Try again.");
      return;
    }
    await signOut();
    router.replace("/login");
  }

  const purgeLabel =
    purgeAt && alreadyScheduled
      ? new Date(purgeAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  if (alreadyScheduled) {
    return (
      <AppSubpageScreen title="Delete account" subtitle="Permanent removal after a grace period.">
        <Text style={styles.body}>
          You already have deletion scheduled.
          {purgeLabel ? ` Public data is set to be removed after ${purgeLabel}.` : ""} Until then, others only see a
          generic empty profile. Cancel deletion from Settings if you changed your mind.
        </Text>
        <PrimaryButton label="Back to Settings" onPress={() => router.back()} variant="auth" />
      </AppSubpageScreen>
    );
  }

  return (
    <AppSubpageScreen title="Delete account" subtitle="Permanent removal after a grace period.">
      <View style={[styles.card, styles.cardDanger]}>
        <Text style={styles.cardTitle}>What deleting does</Text>
        <Text style={styles.bullet}>
          • You are signed out after confirm. A 30-day grace period starts; then public data removal runs on the server.
        </Text>
        <Text style={styles.bullet}>
          • Before the removal date, sign in and tap Cancel account deletion in Settings to restore your account.
        </Text>
        <Text style={styles.bullet}>
          • After purge, reusing your email for a new login may require support to update Supabase Auth.
        </Text>
      </View>

      <Pressable
        onPress={() => setAcknowledged((v) => !v)}
        style={styles.checkRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acknowledged }}
      >
        <View style={[styles.checkbox, acknowledged && styles.checkboxOn]} />
        <Text style={styles.checkLabel}>
          I understand I will be signed out, deletion will be scheduled with a 30-day grace period, and public data will
          be removed after that unless I cancel in Settings.
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={() => void onScheduleDeletion()}
        disabled={!acknowledged || busy}
        style={[styles.deleteBtn, (!acknowledged || busy) && styles.deleteBtnDisabled]}
        accessibilityRole="button"
      >
        <Text style={styles.deleteBtnLabel}>
          {busy ? "Scheduling…" : "Schedule account deletion and sign out"}
        </Text>
      </Pressable>
    </AppSubpageScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textWhite78,
    marginBottom: 20,
  },
  card: {
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  cardDanger: {
    borderColor: "rgba(248, 113, 113, 0.25)",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fecaca",
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(254, 226, 226, 0.88)",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    padding: 14,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: colors.accentActive,
    borderColor: colors.accentActive,
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite78,
  },
  error: {
    fontSize: 13,
    color: "#fca5a5",
    marginBottom: 12,
  },
  deleteBtn: {
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.35)",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteBtnDisabled: {
    opacity: 0.45,
  },
  deleteBtnLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fecaca",
  },
});
