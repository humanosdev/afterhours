import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { getSharedSmokeSummary } from "../../src/lib/sharedSmoke";
import { useAuth } from "../../src/providers/AuthProvider";

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
    <View style={styles.container}>
      <Text style={styles.title}>Signed in</Text>
      <Text style={styles.label}>User ID</Text>
      <Text style={styles.value}>{user?.id ?? "—"}</Text>
      <Text style={styles.label}>Email</Text>
      <Text style={styles.value}>{user?.email ?? "—"}</Text>

      <View style={styles.smokeCard}>
        <Text style={styles.smokeTitle}>@intencity/shared</Text>
        <Text style={styles.smokeLine}>MAP_ACTIVITY_WINDOW_MS: {sharedSmoke.mapActivityWindowMs}</Text>
        <Text style={styles.smokeLine}>
          isValidCoordinatePair(39.9526, -75.1636): {String(sharedSmoke.sampleValid)}
        </Text>
      </View>

      <Text style={styles.note}>Phase 2B scaffold — no presence writes or location.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        style={[styles.button, signingOut && styles.buttonDisabled]}
        onPress={onSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonLabel}>Sign out</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
    backgroundColor: "#fff",
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  smokeCard: {
    marginTop: 20,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f4f4f4",
    gap: 6,
  },
  smokeTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  smokeLine: {
    fontSize: 13,
    color: "#333",
  },
  note: {
    marginTop: 12,
    fontSize: 13,
    color: "#666",
  },
  button: {
    marginTop: 24,
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#b00020",
    fontSize: 14,
  },
});
