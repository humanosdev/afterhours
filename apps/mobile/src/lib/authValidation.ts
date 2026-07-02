import { classifyAuthError } from "./authErrors";

/** Mirrors `apps/web` auth validation helpers — keep in sync with PWA. */

export function passwordValidation(value: string): boolean {
  const hasMin = value.length >= 8;
  const hasNumber = /\d/.test(value);
  const hasLetter = /[A-Za-z]/.test(value);
  return hasMin && hasNumber && hasLetter;
}

export function isTempleEmail(value: string): boolean {
  return value.toLowerCase().trim().endsWith("@temple.edu");
}

/** `apps/web/src/app/onboarding/username/page.tsx` */
export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

/** @deprecated Prefer `classifyAuthError(flow, error)` — message-only mapping drifts from provider codes. */
export function getResetPasswordErrorMessage(rawMessage: string): string {
  return classifyAuthError("forgot_password", { message: rawMessage }).userMessage;
}

/** @deprecated Prefer `classifyAuthError(flow, error)` */
export function getSignupErrorMessage(rawMessage: string): string {
  return classifyAuthError("signup", { message: rawMessage }).userMessage;
}

export function mapLoginError(error: unknown): string {
  return classifyAuthError("login", error).userMessage;
}
