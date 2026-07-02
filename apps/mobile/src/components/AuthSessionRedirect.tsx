import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { AppLoadingScreen } from "./AppLoadingScreen";
import { POST_AUTH_HOME, resolvePostAuthHref, type PostAuthHref } from "../lib/authRouting";
import { useAuth } from "../providers/AuthProvider";

/** Auth stack guard — send signed-in users to map home or onboarding. */
export function AuthSessionRedirect() {
  const { user } = useAuth();
  const [href, setHref] = useState<PostAuthHref | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void resolvePostAuthHref(user.id)
      .then((dest) => {
        if (!cancelled) setHref(dest);
      })
      .catch(() => {
        if (!cancelled) setHref(POST_AUTH_HOME);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!href) {
    return <AppLoadingScreen />;
  }

  return <Redirect href={href} />;
}
