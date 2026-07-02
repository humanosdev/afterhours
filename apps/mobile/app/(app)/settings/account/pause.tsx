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

/** PWA `/settings/account/pause` */
export default function PauseAccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const cached = user?.id ? getCachedAccountSettings(user.id) : null;
  const [blocked, setBlocked] = useState<string | null>(
    cached?.lifecycle === "delete_pending"
      ? "You already have account deletion scheduled. Go back to Settings to cancel it first if you want to pause instead."
      : null
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void fetchAccountSettings(user.id).then((snap) => {
      if (snap.lifecycle === "delete_pending") {
        setBlocked(
          "You already have account deletion scheduled. Go back to Settings to cancel it first if you want to pause instead."
        );
      }
    });
  }, [user?.id]);

  async function onPause() {
    if (!acknowledged || busy || blocked) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("pause_my_account");
    setBusy(false);
    if (rpcError) {
      setError("Could not pause your account. Try again.");
      return;
    }
    await signOut();
    router.replace("/login");
  }

  if (blocked) {
    return (
      <AppSubpageScreen title="Pause account" subtitle="Step away without losing your account.">
        <Text style={styles.body}>{blocked}</Text>
        <PrimaryButton label="Back to Settings" onPress={() => router.back()} variant="auth" />
      </AppSubpageScreen>
    );
  }

  return (
    <AppSubpageScreen title="Pause account" subtitle="Step away without losing your account.">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What pausing does</Text>
        <Text style={styles.bullet}>• You are signed out. Signing in again makes your account active.</Text>
        <Text style={styles.bullet}>
          • While paused, others see a generic empty profile — no moments, shares, or map presence.
        </Text>
        <Text style={styles.bullet}>• Pausing is reversible anytime by signing in. No scheduled data removal.</Text>
      </View>

      <Pressable
        onPress={() => setAcknowledged((v) => !v)}
        style={styles.checkRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acknowledged }}
      >
        <View style={[styles.checkbox, acknowledged && styles.checkboxOn]} />
        <Text style={styles.checkLabel}>
          I understand I will be signed out, and others will only see a generic empty profile until I sign in again.
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label={busy ? "Pausing…" : "Pause account and sign out"}
        onPress={() => void onPause()}
        loading={busy}
        disabled={!acknowledged}
        variant="auth"
      />
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
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textWhite78,
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
});
