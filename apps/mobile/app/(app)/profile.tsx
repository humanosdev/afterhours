import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { ShellCard } from "../../src/components/ShellCard";
import { TabScreenHeader } from "../../src/components/TabScreenHeader";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";

export default function ProfileTabScreen() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <Screen scroll edges={["top", "left", "right"]}>
      <TabScreenHeader
        title="Profile"
        subtitle="Account shell from Supabase auth only — no profiles table read in Phase 2E."
      />

      <ShellCard title="Signed in as">
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value} selectable>
            {user?.email ?? "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.valueMono} selectable numberOfLines={3}>
            {user?.id ?? "—"}
          </Text>
        </View>
      </ShellCard>

      <ShellCard
        title="Production app"
        description="Full profile, moments, and settings remain on web/PWA until native surfaces are wired read-only."
        style={styles.cardSpacing}
      />

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
  row: {
    gap: 4,
    marginBottom: 12,
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
  cardSpacing: {
    marginTop: 14,
    marginBottom: 8,
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
