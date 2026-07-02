import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppTextField } from "../../src/components/AppTextField";
import { AuthBackButton } from "../../src/components/AuthBackButton";
import { AuthFormLayout } from "../../src/components/AuthFormLayout";
import { AuthTextLink } from "../../src/components/AuthTextLink";
import { IntencityBrandLockup } from "../../src/components/IntencityBrandLockup";
import { LegalTextLinks } from "../../src/components/LegalTextLinks";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { resolvePostAuthHref } from "../../src/lib/authRouting";
import { mapLoginError } from "../../src/lib/authValidation";
import { ensureProfileExists } from "../../src/lib/ensureProfile";
import { supabase } from "../../src/lib/supabase/client";
import { authBrandSpacing } from "../../src/theme/brandLockup";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session?.user?.id) return;
      const dest = await resolvePostAuthHref(session.user.id);
      router.replace(dest);
    });
  }, [router]);

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
      setMessage(mapLoginError(error));
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session?.user?.id) {
      setMessage("Please verify your email before logging in.");
      return;
    }

    await ensureProfileExists(session.user.id);
    try {
      await supabase.rpc("reactivate_my_account_after_login");
    } catch {
      /* RPC optional — mirrors web login when unavailable */
    }

    const dest = await resolvePostAuthHref(session.user.id);
    router.replace(dest);
  }

  return (
    <AuthFormLayout
      header={
        <>
          <AuthBackButton onPress={() => router.replace("/")} />
          <IntencityBrandLockup variant="auth" style={styles.lockup} />
          <Text style={typography.authTitle}>Log in</Text>
        </>
      }
    >
      <View style={styles.form}>
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

        <View style={styles.forgotRow}>
          <AuthTextLink label="Forgot password?" onPress={() => router.push("/forgot-password")} />
        </View>

        {message ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{message}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label={loading ? "Logging in…" : "Log in"}
          variant="auth"
          onPress={onLogin}
          loading={loading}
        />

        <Text style={styles.signupLine}>
          Don&apos;t have an account?{" "}
          <Text style={styles.signupLink} onPress={() => router.push("/signup")}>
            Sign up
          </Text>
        </Text>

        <LegalTextLinks prefix="By continuing, you agree to our " />
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  lockup: {
    marginBottom: authBrandSpacing.lockupMarginBottom,
  },
  form: {
    marginTop: authBrandSpacing.titleToFormGap,
    gap: 16,
    width: "100%",
  },
  forgotRow: {
    alignItems: "flex-end",
    marginTop: -4,
  },
  errorBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.errorMuted,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.3)",
  },
  error: {
    color: colors.errorText,
    fontSize: 14,
    lineHeight: 20,
  },
  signupLine: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  signupLink: {
    fontWeight: "500",
    color: colors.accent,
  },
});
