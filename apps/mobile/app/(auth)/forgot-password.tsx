import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppTextField } from "../../src/components/AppTextField";
import { AuthBackButton } from "../../src/components/AuthBackButton";
import { AuthFormLayout } from "../../src/components/AuthFormLayout";
import { AuthStatusMessage } from "../../src/components/AuthStatusMessage";
import { AuthTextLink } from "../../src/components/AuthTextLink";
import { IntencityBrandLockup } from "../../src/components/IntencityBrandLockup";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { getPasswordResetRedirectUrl } from "../../src/lib/authDeepLink";
import { classifyAuthError, logAuthDebug, snapshotAuthError } from "../../src/lib/authErrors";
import { supabase } from "../../src/lib/supabase/client";
import { authBrandSpacing } from "../../src/theme/brandLockup";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";

/** PWA `apps/web/src/app/forgot-password/page.tsx` */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"neutral" | "error" | "success">("neutral");

  async function onSubmit() {
    setLoading(true);
    setMsg(null);
    setMsgTone("neutral");

    const trimmed = email.trim();
    if (!trimmed) {
      setLoading(false);
      setMsgTone("error");
      setMsg("Please enter your email address.");
      return;
    }

    const redirectTo = getPasswordResetRedirectUrl();
    let recoverError: unknown = null;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      recoverError = error;
      logAuthDebug("forgot_password", {
        phase: "resetPasswordForEmail_response",
        redirectTo,
        rawError: error ? snapshotAuthError(error) : null,
        sdkReturnedError: Boolean(error),
      });
    } catch (thrown) {
      recoverError = thrown;
      logAuthDebug("forgot_password", {
        phase: "resetPasswordForEmail_threw",
        redirectTo,
        thrown: String(thrown),
      });
    }

    setLoading(false);

    if (recoverError) {
      const classified = classifyAuthError("forgot_password", recoverError);
      logAuthDebug("forgot_password", {
        phase: "recover_error_classified",
        classification: classified.classification,
      });
      setMsgTone("error");
      setMsg(classified.userMessage);
      return;
    }

    setMsgTone("success");
    setMsg(
      "If an account exists for this email, we requested a reset link. Check inbox and spam. On campus Wi‑Fi, try cellular if nothing arrives in a few minutes. When the app's email provider is at its send limit, Supabase may accept the request but not deliver mail—wait 15–60 minutes and try once."
    );
  }

  return (
    <AuthFormLayout
      header={
        <>
          <IntencityBrandLockup variant="auth" style={styles.lockup} />
          <View style={styles.headerRow}>
            <AuthBackButton onPress={() => router.push("/login")} />
            <Text style={typography.subpageTitle}>Forgot password</Text>
          </View>
          <View style={styles.rule} />
          <Text style={styles.lead}>Enter your email to receive a reset link.</Text>
          <Text style={styles.hintBody}>
            On busy campus or shared Wi‑Fi, email sends can be slow or rate-limited for everyone on that network.
            If nothing arrives, wait a few minutes, try again once, or switch to cellular data and request again.
            Don&apos;t tap send repeatedly—that uses up the limit faster.
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
          onSubmitEditing={onSubmit}
        />
        {msg ? <AuthStatusMessage message={msg} tone={msgTone} /> : null}
        <PrimaryButton
          label={loading ? "Sending…" : "Send reset link"}
          variant="auth"
          onPress={onSubmit}
          loading={loading}
          disabled={!email.trim()}
        />
        <AuthTextLink label="Back to log in" onPress={() => router.push("/login")} />
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
    marginBottom: 8,
    lineHeight: 21,
  },
  hintBody: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite45,
    marginBottom: 4,
  },
  form: {
    marginTop: 16,
    gap: 16,
  },
});
