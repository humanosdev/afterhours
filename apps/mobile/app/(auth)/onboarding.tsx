import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppTextField } from "../../src/components/AppTextField";
import { AuthViewportLayout } from "../../src/components/AuthViewportLayout";
import { IntencityBrandLockup } from "../../src/components/IntencityBrandLockup";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { FormField } from "../../src/components/ui/FormField";
import { checkUsernameAvailable } from "../../src/lib/checkUsernameAvailable";
import { completeProfileOnboarding } from "../../src/lib/authRouting";
import { normalizeUsername } from "../../src/lib/authValidation";
import { ensureProfileExists } from "../../src/lib/ensureProfile";
import { hasRequiredDisplayName } from "../../src/lib/profileOnboarding";
import { supabase } from "../../src/lib/supabase/client";
import { useAuth } from "../../src/providers/AuthProvider";
import { authBrandSpacing } from "../../src/theme/brandLockup";
import { colors } from "../../src/theme/colors";
import { layout } from "../../src/theme/layout";

const FEATURES = [
  { title: "Live Venues", body: "See active spots in real time" },
  { title: "Friends", body: "Know when friends are outside" },
  { title: "Heat Map", body: "Find where energy is building" },
] as const;

/** Post-auth onboarding — name and username are required before entering the app. */
export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [usernameRaw, setUsernameRaw] = useState("");
  const username = useMemo(() => normalizeUsername(usernameRaw), [usernameRaw]);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) {
      router.replace("/login");
      return;
    }
    void (async () => {
      await ensureProfileExists(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name?.trim()) setDisplayName(profile.display_name.trim());
      if (profile?.username?.trim()) setUsernameRaw(profile.username.trim());
      setReady(true);
    })();
  }, [user?.id, router]);

  useEffect(() => {
    if (!user?.id || username.length < 3) {
      setAvailable(null);
      return;
    }

    let cancelled = false;
    setChecking(true);
    setError(null);

    void (async () => {
      const { available: free, error: checkError } = await checkUsernameAvailable(username, user.id);
      if (!cancelled) {
        setAvailable(checkError ? null : free);
        if (checkError) setError("Could not check username. Try again.");
        setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username, user?.id]);

  const nameValid = hasRequiredDisplayName(displayName);
  const usernameValid = username.length >= 3 && available === true;
  const canSubmit = ready && nameValid && usernameValid && !saving && !checking;

  async function completeOnboarding() {
    if (!user?.id || saving || !canSubmit) return;
    setSaving(true);
    setError(null);
    const { error: err } = await completeProfileOnboarding(user.id, displayName, username);
    setSaving(false);
    if (err) {
      setError(err.includes("23505") ? "Username already taken." : "Could not finish onboarding. Try again.");
      return;
    }
    router.replace("/map");
  }

  return (
    <AuthViewportLayout pinFooter>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.upper}>
          <IntencityBrandLockup variant="auth" compact style={styles.lockup} />
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Welcome to Intencity</Text>
            <Text style={styles.heroSub}>Set your name and username so friends can find you.</Text>
          </View>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            ))}
          </View>

          <View style={styles.profileForm}>
            <FormField
              label="Name"
              hint="How you appear to friends"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              autoCapitalize="words"
              maxLength={64}
            />
            <View style={styles.usernameField}>
              <Text style={styles.fieldLabel}>Username</Text>
              <AppTextField
                placeholder="username"
                autoCapitalize="none"
                autoCorrect={false}
                value={usernameRaw}
                onChangeText={setUsernameRaw}
                editable={!saving}
              />
              <View style={styles.availability}>
                {checking ? <Text style={styles.availMuted}>Checking…</Text> : null}
                {!checking && username.length >= 3 && available === true ? (
                  <Text style={styles.availOk}>Available</Text>
                ) : null}
                {!checking && username.length >= 3 && available === false ? (
                  <Text style={styles.availBad}>Not available</Text>
                ) : null}
                {!checking && username.length > 0 && username.length < 3 ? (
                  <Text style={styles.availMuted}>At least 3 characters</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.lower}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={saving ? "Entering…" : "Enter Intencity"}
          variant="accent"
          onPress={completeOnboarding}
          loading={saving}
          disabled={!canSubmit}
        />
        {!ready ? <Text style={styles.loadingHint}>Preparing your account…</Text> : null}
      </View>
    </AuthViewportLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  upper: {
    width: "100%",
  },
  lockup: {
    marginBottom: authBrandSpacing.lockupMarginBottom,
  },
  heroCard: {
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  features: {
    gap: 12,
    marginBottom: 16,
  },
  featureCard: {
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: 16,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  featureBody: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  profileForm: {
    gap: 16,
    marginBottom: 8,
  },
  usernameField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textWhite65,
  },
  availability: {
    minHeight: 20,
  },
  availMuted: {
    fontSize: 14,
    color: colors.textWhite45,
  },
  availOk: {
    fontSize: 14,
    color: "#4ade80",
  },
  availBad: {
    fontSize: 14,
    color: colors.errorText,
  },
  lower: {
    width: "100%",
    gap: 10,
    paddingTop: 8,
  },
  error: {
    fontSize: 13,
    color: colors.errorText,
    textAlign: "center",
  },
  loadingHint: {
    fontSize: 12,
    color: colors.textWhite45,
    textAlign: "center",
  },
});
