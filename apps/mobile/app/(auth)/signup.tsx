import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppTextField } from "../../src/components/AppTextField";
import { AuthBackButton } from "../../src/components/AuthBackButton";
import { AuthFormLayout } from "../../src/components/AuthFormLayout";
import { AuthStatusMessage } from "../../src/components/AuthStatusMessage";
import { AuthTextLink } from "../../src/components/AuthTextLink";
import { IntencityBrandLockup } from "../../src/components/IntencityBrandLockup";
import { LegalTextLinks } from "../../src/components/LegalTextLinks";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { classifyAuthError, logAuthDebug, snapshotAuthError } from "../../src/lib/authErrors";
import { resolvePostAuthHref } from "../../src/lib/authRouting";
import { isTempleEmail, passwordValidation } from "../../src/lib/authValidation";
import { ensureProfileExists } from "../../src/lib/ensureProfile";
import { supabase } from "../../src/lib/supabase/client";
import { authBrandSpacing } from "../../src/theme/brandLockup";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";

/** PWA `apps/web/src/app/signup/page.tsx` — legal consent API deferred (see SYSTEM_TRUTH_AUDIT U5). */
export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session?.user?.id) return;
      const dest = await resolvePostAuthHref(session.user.id);
      router.replace(dest);
    });
  }, [router]);

  async function onSignup() {
    setMessage(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!isTempleEmail(trimmedEmail)) {
      setMessage("Use a Temple University email to join Intencity.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!passwordValidation(password)) {
      setMessage("Password must be at least 8 characters and include letters and numbers.");
      return;
    }
    if (!agreedToPolicies) {
      setMessage("Please confirm you agree to the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);
    let signUpError: unknown = null;
    let signUpData: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"] | null = null;

    try {
      const result = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      signUpError = result.error;
      signUpData = result.data;
    } catch (thrown) {
      signUpError = thrown;
      logAuthDebug("signup", { phase: "signUp_threw", thrown: String(thrown) });
    }

    const { data: sessionData } = await supabase.auth.getSession();
    setLoading(false);

    logAuthDebug("signup", {
      phase: "signUp_complete",
      rawError: signUpError ? snapshotAuthError(signUpError) : null,
      hasUser: Boolean(signUpData?.user),
      userConfirmedAt: signUpData?.user?.confirmed_at ?? null,
      identitiesCount: signUpData?.user?.identities?.length ?? 0,
      sessionAfterSignUp: sessionData.session
        ? { userId: sessionData.session.user.id, expiresAt: sessionData.session.expires_at }
        : null,
    });

    if (signUpError) {
      const classified = classifyAuthError("signup", signUpError);
      logAuthDebug("signup", {
        phase: "signUp_error_classified",
        classification: classified.classification,
        rawCode: classified.rawCode,
        rawStatus: classified.rawStatus,
      });
      setMessage(classified.userMessage);
      return;
    }

    if (sessionData.session?.user?.id) {
      const dest = await resolvePostAuthHref(sessionData.session.user.id);
      logAuthDebug("signup", {
        phase: "session_immediate",
        resolvePostAuthHref: dest,
      });
      await ensureProfileExists(sessionData.session.user.id);
      router.replace(dest);
      return;
    }

    setSuccessMsg(
      "Anyone can type characters before @temple.edu. If this email is valid, check your Temple email to verify your account. On busy Wi‑Fi, try cellular if the message is slow."
    );
  }

  return (
    <AuthFormLayout
      header={
        <>
          <AuthBackButton onPress={() => router.back()} />
          <IntencityBrandLockup variant="auth" style={styles.lockup} />
          <Text style={typography.authTitle}>Sign up</Text>
          <Text style={styles.lead}>
            Verification email may be delayed on crowded campus Wi‑Fi. If it doesn&apos;t arrive, wait a bit,
            try cellular, and avoid tapping Create account over and over.
          </Text>
        </>
      }
    >
      <View style={styles.form}>
        <AppTextField
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        <AppTextField
          placeholder="Password (min 8, letters + numbers)"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
        <AppTextField
          placeholder="Confirm password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!loading}
        />

        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: showPassword }}
          style={styles.showRow}
        >
          <View style={[styles.checkbox, showPassword && styles.checkboxOn]}>
            {showPassword ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.showLabel}>Show password</Text>
        </Pressable>

        <Pressable
          onPress={() => setAgreedToPolicies((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreedToPolicies }}
          style={styles.policyRow}
        >
          <View style={[styles.checkbox, agreedToPolicies && styles.checkboxOn]}>
            {agreedToPolicies ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <View style={styles.policyTextWrap}>
            <LegalTextLinks prefix="I agree to the " />
          </View>
        </Pressable>

        {message ? <AuthStatusMessage message={message} tone="error" /> : null}
        {successMsg ? <AuthStatusMessage message={successMsg} tone="success" /> : null}

        <PrimaryButton
          label={loading ? "Creating account…" : "Create account"}
          variant="auth"
          onPress={onSignup}
          loading={loading}
        />
        <AuthTextLink label="Already have an account? Log in" onPress={() => router.push("/login")} />
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  lockup: {
    marginBottom: authBrandSpacing.lockupMarginBottom,
  },
  lead: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite45,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  form: {
    marginTop: authBrandSpacing.titleToFormGap,
    gap: 16,
    width: "100%",
  },
  showRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxOn: {
    borderColor: colors.accent,
    backgroundColor: "rgba(59, 102, 255, 0.35)",
  },
  checkMark: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  showLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  policyTextWrap: {
    flex: 1,
    minWidth: 0,
  },
});
