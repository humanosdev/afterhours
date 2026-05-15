import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { AppTextField } from "../../src/components/AppTextField";
import { IntencityWordmark } from "../../src/components/IntencityWordmark";
import { PhaseBadge } from "../../src/components/PhaseBadge";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase/client";
import { colors } from "../../src/theme/colors";

function mapLoginError(raw: string) {
  const text = raw.toLowerCase();
  if (text.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (text.includes("email not confirmed")) {
    return "Please verify your email before logging in.";
  }
  return "Unable to log in right now. Please try again.";
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onLogin() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setMessage("Enter email and password.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(mapLoginError(error.message));
      return;
    }

    router.replace("/hub");
  }

  return (
    <Screen scroll>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.hero}>
          <PhaseBadge label="Sign in" />
          <IntencityWordmark size="large" subtitle="Same account as web/PWA." />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardHint}>Use the same credentials as the web app.</Text>

          <AppTextField
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
          <AppTextField
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            onSubmitEditing={onLogin}
          />

          {message ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{message}</Text>
            </View>
          ) : null}

          <PrimaryButton label="Sign in" onPress={onLogin} loading={loading} />
        </View>

        <Text style={styles.footer}>Production map and presence run on web/PWA.</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: "center",
    gap: 28,
    paddingVertical: 12,
  },
  hero: {
    alignItems: "center",
    gap: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  errorBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 122, 0.25)",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
