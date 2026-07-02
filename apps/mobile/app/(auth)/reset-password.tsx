import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { AppTextField } from "../../src/components/AppTextField";
import { AuthBackButton } from "../../src/components/AuthBackButton";
import { AuthFormLayout } from "../../src/components/AuthFormLayout";
import { AuthStatusMessage } from "../../src/components/AuthStatusMessage";
import { IntencityBrandLockup } from "../../src/components/IntencityBrandLockup";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { createSessionFromUrl, hydrateSessionFromInitialUrl } from "../../src/lib/authDeepLink";
import { classifyAuthError, logAuthDebug } from "../../src/lib/authErrors";
import { passwordValidation } from "../../src/lib/authValidation";
import { supabase } from "../../src/lib/supabase/client";
import { authBrandSpacing } from "../../src/theme/brandLockup";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";

/** PWA `apps/web/src/app/reset-password/page.tsx` */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const hydrated = await hydrateSessionFromInitialUrl();
      const { data } = await supabase.auth.getSession();
      logAuthDebug("reset_password", {
        phase: "cold_start_hydrate",
        hydrated,
        hasSession: Boolean(data.session),
        sessionUserId: data.session?.user?.id ?? null,
      });
      if (!cancelled && data.session) setRecoveryReady(true);
      if (!cancelled) setSessionChecked(true);
    })();

    const sub = Linking.addEventListener("url", ({ url }) => {
      void createSessionFromUrl(url).then((ok) => {
        logAuthDebug("reset_password", { phase: "linking_url_event", ok, url: url.slice(0, 120) });
        if (ok) setRecoveryReady(true);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logAuthDebug("reset_password", {
        phase: "auth_state_change",
        event,
        hasSession: Boolean(session),
      });
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setRecoveryReady(true);
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit() {
    setMsg(null);

    if (!passwordValidation(password)) {
      setMsg("Password must be at least 8 characters and include letters and numbers.");
      return;
    }
    if (password !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    let updateError: unknown = null;
    try {
      const { error } = await supabase.auth.updateUser({ password });
      updateError = error;
    } catch (thrown) {
      updateError = thrown;
      logAuthDebug("reset_password", { phase: "updateUser_threw", thrown: String(thrown) });
    }
    setLoading(false);

    if (updateError) {
      const classified = classifyAuthError("reset_password", updateError);
      logAuthDebug("reset_password", {
        phase: "updateUser_error",
        classification: classified.classification,
      });
      setMsg(classified.userMessage);
      return;
    }

    setMsg("Password updated. Redirecting to login…");
    setTimeout(() => router.replace("/login"), 1200);
  }

  const msgTone =
    msg && (msg.includes("Redirecting") || msg.includes("updated")) ? "success" : msg ? "error" : "neutral";

  return (
    <AuthFormLayout
      header={
        <>
          <IntencityBrandLockup variant="auth" style={styles.lockup} />
          <View style={styles.headerRow}>
            <AuthBackButton onPress={() => router.push("/login")} />
            <Text style={typography.subpageTitle}>Reset password</Text>
          </View>
          <View style={styles.rule} />
          <Text style={styles.lead}>Choose a new password for your account.</Text>
          {sessionChecked && !recoveryReady ? (
            <Text style={styles.recoveryHint}>
              Open this screen from the link in your reset email (or request a new link from Forgot password).
            </Text>
          ) : null}
        </>
      }
    >
      <View style={styles.form}>
        <AppTextField
          placeholder="New password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          editable={recoveryReady && !loading}
        />
        <AppTextField
          placeholder="Confirm new password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          value={confirm}
          onChangeText={setConfirm}
          editable={recoveryReady && !loading}
          onSubmitEditing={onSubmit}
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

        {msg ? <AuthStatusMessage message={msg} tone={msgTone} /> : null}

        <PrimaryButton
          label={loading ? "Updating…" : "Update password"}
          variant="auth"
          onPress={onSubmit}
          loading={loading}
          disabled={!recoveryReady}
        />

        {!recoveryReady ? (
          <Pressable onPress={() => router.push("/forgot-password")} accessibilityRole="button">
            <Text style={styles.forgotLink}>Request a new reset link</Text>
          </Pressable>
        ) : null}
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  lockup: {
    marginBottom: authBrandSpacing.lockupMarginBottom,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 20,
  },
  lead: {
    ...typography.body,
    lineHeight: 21,
  },
  recoveryHint: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textWhite45,
  },
  form: {
    marginTop: 16,
    gap: 16,
  },
  showRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    borderColor: colors.accent,
    backgroundColor: "rgba(59, 102, 255, 0.35)",
  },
  checkMark: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  showLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.accent,
    textAlign: "center",
  },
});
