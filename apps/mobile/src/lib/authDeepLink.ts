import * as Linking from "expo-linking";
import { logAuthDebug } from "./authErrors";
import { supabase } from "./supabase/client";

/** Native redirect target for Supabase reset emails — must be allowlisted in Supabase Auth. */
export function getPasswordResetRedirectUrl(): string {
  const url = Linking.createURL("reset-password");
  logAuthDebug("forgot_password", { phase: "redirect_url_built", redirectTo: url });
  return url;
}

export type ParsedAuthUrl = {
  access_token: string | null;
  refresh_token: string | null;
  type: string | null;
  error: string | null;
  error_description: string | null;
};

export function parseAuthParamsFromUrl(url: string): ParsedAuthUrl {
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  const paramString =
    hashIdx >= 0 ? url.slice(hashIdx + 1) : queryIdx >= 0 ? url.slice(queryIdx + 1) : "";
  const params = new URLSearchParams(paramString);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
    error: params.get("error"),
    error_description: params.get("error_description"),
  };
}

/**
 * Exchange recovery/login deep link tokens into a Supabase session.
 * Mirrors web `reset-password` relying on hash tokens + `onAuthStateChange`.
 */
export async function createSessionFromUrl(url: string): Promise<boolean> {
  const parsed = parseAuthParamsFromUrl(url);
  logAuthDebug("reset_password", {
    phase: "deep_link_parse",
    url: url.slice(0, 120),
    type: parsed.type,
    hasAccessToken: Boolean(parsed.access_token),
    hasRefreshToken: Boolean(parsed.refresh_token),
    oauthError: parsed.error,
    oauthErrorDescription: parsed.error_description,
  });

  if (parsed.error) {
    return false;
  }

  if (!parsed.access_token || !parsed.refresh_token) {
    return false;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: parsed.access_token,
    refresh_token: parsed.refresh_token,
  });

  logAuthDebug("reset_password", {
    phase: "set_session_result",
    ok: !error,
    hasSession: Boolean(data.session),
    error: error
      ? { message: error.message, code: error.code, status: error.status }
      : null,
  });

  return !error;
}

/** Initial cold-start URL (app opened from email link). */
export async function hydrateSessionFromInitialUrl(): Promise<boolean> {
  const initial = await Linking.getInitialURL();
  logAuthDebug("reset_password", { phase: "initial_url", initialUrl: initial });
  if (!initial) return false;
  return createSessionFromUrl(initial);
}
