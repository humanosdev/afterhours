import { supabase } from "./supabase/client";
import { describeRequestFailure } from "./networkErrors";
import { ensureProfileExists } from "./ensureProfile";
import { needsProfileOnboarding } from "./profileOnboarding";

/** Signed-in home tab — map is the default landing surface. */
export const POST_AUTH_HOME = "/map" as const;
/** @deprecated Use `POST_AUTH_HOME` — kept for imports that still say "hub". */
export const POST_AUTH_HUB = POST_AUTH_HOME;
export const POST_AUTH_ONBOARDING = "/onboarding" as const;

export type PostAuthHref = typeof POST_AUTH_HOME | typeof POST_AUTH_ONBOARDING;

const POST_AUTH_RESOLVE_TIMEOUT_MS = 10_000;

let postAuthHrefCache: { userId: string; href: PostAuthHref } | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

/** Sync read after `resolvePostAuthHref` — used by app shell gate without a second fetch. */
export function peekPostAuthHref(userId: string): PostAuthHref | null {
  return postAuthHrefCache?.userId === userId ? postAuthHrefCache.href : null;
}

export function clearPostAuthHrefCache(): void {
  postAuthHrefCache = null;
}

/**
 * PWA login/signup/index session redirect — requires name, username, and `onboarding_complete`.
 * Source: `apps/web/src/app/login/page.tsx`, `signup/page.tsx`, `page.tsx`.
 */
async function resolvePostAuthHrefInner(userId: string): Promise<PostAuthHref> {
  try {
    await ensureProfileExists(userId);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("display_name, username, onboarding_complete")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      if (__DEV__) {
        console.warn("[authRouting] profile fetch failed:", error.message);
      }
      postAuthHrefCache = { userId, href: POST_AUTH_HOME };
      return POST_AUTH_HOME;
    }

    const href = needsProfileOnboarding(profile) ? POST_AUTH_ONBOARDING : POST_AUTH_HOME;
    postAuthHrefCache = { userId, href };
    return href;
  } catch (error) {
    if (__DEV__) {
      console.warn("[authRouting] resolvePostAuthHref failed:", describeRequestFailure(error));
    }
    postAuthHrefCache = { userId, href: POST_AUTH_HOME };
    return POST_AUTH_HOME;
  }
}

export async function resolvePostAuthHref(userId: string): Promise<PostAuthHref> {
  const cached = peekPostAuthHref(userId);
  if (cached) return cached;

  const href = await withTimeout(
    resolvePostAuthHrefInner(userId),
    POST_AUTH_RESOLVE_TIMEOUT_MS,
    POST_AUTH_HOME
  );
  if (href === POST_AUTH_HOME && !postAuthHrefCache) {
    if (__DEV__) {
      console.warn("[authRouting] resolvePostAuthHref timed out — defaulting to map home");
    }
    postAuthHrefCache = { userId, href: POST_AUTH_HOME };
  }
  return href;
}

/** Saves required profile identity and marks onboarding complete. */
export async function completeProfileOnboarding(
  userId: string,
  displayName: string,
  username: string
): Promise<{ error: string | null }> {
  await ensureProfileExists(userId);
  const trimmedName = displayName.trim();
  const trimmedUsername = username.trim();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: trimmedName,
      username: trimmedUsername,
      onboarding_complete: true,
    })
    .eq("id", userId);
  if (!error) {
    postAuthHrefCache = { userId, href: POST_AUTH_HOME };
  }
  return { error: error?.message ?? null };
}

/** @deprecated Prefer `completeProfileOnboarding` — kept for callers that only flip the flag. */
export async function markOnboardingComplete(userId: string): Promise<{ error: string | null }> {
  await ensureProfileExists(userId);
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_complete: true })
    .eq("id", userId);
  return { error: error?.message ?? null };
}
