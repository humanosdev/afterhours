import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { IntencityWordmark } from "../../src/components/IntencityWordmark";
import { PhaseBadge } from "../../src/components/PhaseBadge";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { getSharedSmokeSummary } from "../../src/lib/sharedSmoke";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sharedSmoke = getSharedSmokeSummary();

  async function onSignOut() {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign out failed.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <PhaseBadge />
        <IntencityWordmark subtitle="Signed in · viewer shell" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your account</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value} selectable>
            {user?.email ?? "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.valueMono} selectable numberOfLines={2}>
            {user?.id ?? "—"}
          </Text>
        </View>
      </View>

      <View style={styles.scaffoldCard}>
        <Text style={styles.scaffoldTitle}>What’s next</Text>
        <Text style={styles.scaffoldBody}>
          Phase 2C is a polished native shell only. Map, live presence, and push are not enabled on
          mobile yet — production presence still runs on web.
        </Text>
      </View>

      <View style={styles.smokeCard}>
        <Text style={styles.smokeLabel}>Shared package</Text>
        <Text style={styles.smokeLine}>MAP_ACTIVITY_WINDOW_MS {sharedSmoke.mapActivityWindowMs}</Text>
        <Text style={styles.smokeLine}>
          isValidCoordinatePair (Philly): {sharedSmoke.sampleValid ? "ok" : "no"}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      <PrimaryButton label="Sign out" onPress={onSignOut} loading={signingOut} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 18,
    gap: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  valueMono: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    lineHeight: 18,
  },
  scaffoldCard: {
    backgroundColor: colors.accentGlow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  scaffoldTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  scaffoldBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  smokeCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 4,
    marginBottom: 20,
  },
  smokeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  smokeLine: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  errorBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.dangerMuted,
    marginBottom: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
