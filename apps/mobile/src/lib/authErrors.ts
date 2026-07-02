import type { AuthError } from "@supabase/supabase-js";

export type AuthFlow = "signup" | "forgot_password" | "reset_password" | "login";

export type AuthErrorClassification =
  | "project_email_send_rate_limit"
  | "request_rate_limit"
  | "user_already_registered"
  | "invalid_email"
  | "email_not_authorized"
  | "email_send_failed"
  | "weak_password"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "session_missing"
  | "redirect_not_allowed"
  | "signup_disabled"
  | "unknown";

export type AuthErrorSnapshot = {
  name: string | null;
  message: string | null;
  status: number | null;
  code: string | null;
};

export type ClassifiedAuthError = {
  classification: AuthErrorClassification;
  userMessage: string;
  /** Raw provider message — show in __DEV__ only */
  rawMessage: string | null;
  rawCode: string | null;
  rawStatus: number | null;
};

export function snapshotAuthError(error: unknown): AuthErrorSnapshot {
  if (!error || typeof error !== "object") {
    return { name: null, message: null, status: null, code: null };
  }
  const e = error as AuthError & { msg?: string };
  return {
    name: typeof e.name === "string" ? e.name : null,
    message: (e.message ?? e.msg ?? null) as string | null,
    status: typeof e.status === "number" ? e.status : null,
    code: typeof e.code === "string" ? e.code : null,
  };
}

/**
 * Code-first auth error semantics — do not rely on loose substring matching alone.
 * PWA copy reference: `apps/web/src/app/signup/page.tsx`, `forgot-password/page.tsx`.
 */
export function classifyAuthError(flow: AuthFlow, error: unknown): ClassifiedAuthError {
  const snap = snapshotAuthError(error);
  const msg = (snap.message ?? "").toLowerCase();
  const code = snap.code ?? "";

  if (code === "over_email_send_rate_limit" || msg.includes("email rate limit")) {
    return {
      classification: "project_email_send_rate_limit",
      userMessage:
        flow === "forgot_password"
          ? "Our email provider is temporarily limiting outbound mail for the whole app (not just your device). Password reset messages may not send until the limit clears—often 15–60 minutes. Try cellular data or wait and request once."
          : "Our email provider is temporarily limiting verification emails for the whole app (not just your device). New signups cannot send confirmation mail until the limit clears—often 15–60 minutes. Try again later or log in if you already have an account.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (
    code === "over_request_rate_limit" ||
    code === "too_many_requests" ||
    (msg.includes("too many requests") && !msg.includes("email rate limit"))
  ) {
    return {
      classification: "request_rate_limit",
      userMessage: "Too many requests from this device right now. Wait a minute and try again once.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (
    code === "user_already_registered" ||
    msg.includes("user already registered") ||
    msg.includes("email exists") ||
    code === "email_exists"
  ) {
    return {
      classification: "user_already_registered",
      userMessage:
        "An account with this email already exists. Try logging in or use Forgot password to reset it.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (code === "signup_disabled" || msg.includes("signup is disabled")) {
    return {
      classification: "signup_disabled",
      userMessage: "Sign up is disabled on this project. Contact support if this seems wrong.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (
    code === "email_address_invalid" ||
    code === "invalid_email" ||
    msg.includes("invalid email")
  ) {
    return {
      classification: "invalid_email",
      userMessage:
        flow === "signup" ? "Please enter a valid Temple email." : "Please enter a valid email address.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (msg.includes("email address not authorized")) {
    return {
      classification: "email_not_authorized",
      userMessage: "This email is not allowed to sign up for this app.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (msg.includes("database error saving new user")) {
    return {
      classification: "unknown",
      userMessage: "Signup is temporarily unavailable due to a server issue. Please try again soon.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (msg.includes("error sending confirmation email") || msg.includes("error sending email")) {
    return {
      classification: "email_send_failed",
      userMessage: "We couldn't send the verification email right now. Please try again shortly.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (
    code === "weak_password" ||
    (msg.includes("password") &&
      (msg.includes("weak") || msg.includes("at least") || msg.includes("requirements")))
  ) {
    return {
      classification: "weak_password",
      userMessage: "Password must be at least 8 characters and include letters and numbers.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (msg.includes("redirect") && (msg.includes("not allowed") || msg.includes("invalid"))) {
    return {
      classification: "redirect_not_allowed",
      userMessage:
        "This build's password-reset link is not allowlisted in Supabase Auth redirect URLs. Add the native redirect (intencity://reset-password and your Expo dev URL) in the Supabase dashboard.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return {
      classification: "email_not_confirmed",
      userMessage: "Please verify your email before logging in.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return {
      classification: "invalid_credentials",
      userMessage: "Email or password is incorrect.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  if (
    msg.includes("only request this once") ||
    (msg.includes("security purposes") && msg.includes("60"))
  ) {
    return {
      classification: "request_rate_limit",
      userMessage:
        "Please wait about a minute before requesting another email from this screen, then try again once.",
      rawMessage: snap.message,
      rawCode: snap.code,
      rawStatus: snap.status,
    };
  }

  const fallback =
    flow === "signup"
      ? "Signup failed. Please try again or use Forgot password if you already created an account."
      : flow === "forgot_password"
        ? "Could not send a reset email. Please try again."
        : flow === "reset_password"
          ? "Could not update your password. Open the link from your email again or request a new reset."
          : "Unable to log in right now. Please try again.";

  return {
    classification: "unknown",
    userMessage: snap.message?.trim() ? snap.message : fallback,
    rawMessage: snap.message,
    rawCode: snap.code,
    rawStatus: snap.status,
  };
}

/** Temporary structured auth diagnostics — __DEV__ console only. */
export function logAuthDebug(flow: AuthFlow, payload: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.log(`[auth:${flow}]`, JSON.stringify(payload, null, 2));
}
