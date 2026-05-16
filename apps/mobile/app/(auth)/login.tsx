import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { AppTextField } from "../../src/components/AppTextField";
import { GlassSurface } from "../../src/components/GlassSurface";
import { PhaseBadge } from "../../src/components/PhaseBadge";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Screen } from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase/client";
import { colors } from "../../src/theme/colors";
import { layout } from "../../src/theme/layout";

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
          <View style={styles.brand}>
            <Image
              accessibilityIgnoresInvertColors
              source={require("../../assets/icon.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandWord}>Intencity</Text>
            <Text style={styles.slogan}>
              Live the city, feel the <Text style={styles.sloganAccent}>intencity</Text>.
            </Text>
            <Text style={styles.heroSub}>Same account as web/PWA.</Text>
          </View>
        </View>

        <GlassSurface style={styles.card} muted>
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
        </GlassSurface>

        <Text style={styles.footer}>Production map and presence stay on web/PWA.</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: "center",
    gap: 24,
    paddingVertical: 12,
  },
  hero: {
    alignItems: "center",
    gap: 20,
  },
  brand: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  brandLogo: {
    width: 72,
    height: 72,
    marginBottom: 4,
  },
  brandWord: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  slogan: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textWhite55,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 320,
    marginTop: 2,
  },
  sloganAccent: {
    fontWeight: "700",
    color: colors.accentActive,
  },
  heroSub: {
    fontSize: 13,
    color: colors.textWhite42,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    borderRadius: layout.cardRadius,
    padding: 22,
    gap: 14,
    borderColor: colors.glassBorder,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
    marginBottom: 2,
  },
  errorBox: {
    padding: 12,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 122, 0.28)",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite42,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 8,
  },
});
