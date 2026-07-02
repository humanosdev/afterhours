import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../providers/AuthProvider";

function paramString(value: string | string[] | undefined): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return (value[0] ?? "").trim();
  return "";
}

/**
 * Owner-only routes (e.g. `/blocks`) — reject `view` / foreign context params and require session.
 */
export function useOwnerOnlyRoute(fallback: "/profile" | "/login" = "/profile"): boolean {
  const router = useRouter();
  const { user, loading } = useAuth();
  const params = useLocalSearchParams();

  const foreignView = paramString(params.view);
  const foreignUserId = paramString(params.userId);

  useEffect(() => {
    if (loading) return;
    if (foreignView || foreignUserId) {
      router.replace(fallback);
      return;
    }
    if (!user?.id) {
      router.replace("/login");
    }
  }, [loading, user?.id, foreignView, foreignUserId, router, fallback]);

  return !loading && !!user?.id && !foreignView && !foreignUserId;
}
