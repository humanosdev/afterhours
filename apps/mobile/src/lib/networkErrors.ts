/** RN fetch / Supabase offline failures — avoid LogBox spam from unhandled rejections. */
export function isNetworkRequestFailed(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "Network request failed") return true;
  if (error instanceof Error && /network request failed/i.test(error.message)) return true;
  return false;
}

/** Supabase PostgrestError and fetch failures surfaced as `{ message: string }`. */
export function isLikelyNetworkFailure(error: unknown): boolean {
  if (isNetworkRequestFailed(error)) return true;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && /network request failed|failed to fetch|network error/i.test(message)) {
      return true;
    }
  }
  return false;
}

export function describeRequestFailure(error: unknown): string {
  if (isNetworkRequestFailed(error)) {
    return "Could not reach the server. Check Wi‑Fi and EXPO_PUBLIC_SUPABASE_URL in apps/mobile/.env.";
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Request failed";
}

/** Physical devices cannot reach localhost / LAN-only Supabase from a stale .env. */
export function getSupabaseUrlMisconfigHint(url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
      return "EXPO_PUBLIC_SUPABASE_URL points at localhost — use your hosted Supabase URL on a physical device.";
    }
  } catch {
    return "EXPO_PUBLIC_SUPABASE_URL is not a valid URL.";
  }
  return null;
}
