import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import { describeRequestFailure } from "./networkErrors";

export type SupabaseReachability = {
  ok: boolean;
  message: string | null;
};

/** Quick health probe — catches dead project URLs (NXDOMAIN) before auth boot hangs. */
export async function checkSupabaseReachability(
  timeoutMs = 8_000
): Promise<SupabaseReachability> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const anonKey = getSupabaseAnonKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}/auth/v1/health`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (!res.ok) {
      const hint =
        res.status === 401
          ? "Check EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env (must match web NEXT_PUBLIC_SUPABASE_ANON_KEY)."
          : "Check EXPO_PUBLIC_SUPABASE_URL in apps/mobile/.env.";
      return {
        ok: false,
        message: `Supabase returned ${res.status}. ${hint}`,
      };
    }
    return { ok: true, message: null };
  } catch (error) {
    return {
      ok: false,
      message: describeRequestFailure(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
