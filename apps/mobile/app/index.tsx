import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { AppLoadingScreen } from "../src/components/AppLoadingScreen";
import { POST_AUTH_HOME, resolvePostAuthHref, type PostAuthHref } from "../src/lib/authRouting";
import { useAuth } from "../src/providers/AuthProvider";
import { LandingScreen } from "../src/screens/LandingScreen";

export default function Index() {
  const { session, loading, user } = useAuth();
  const [dest, setDest] = useState<PostAuthHref | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setDest(null);
      return;
    }
    let cancelled = false;
    void resolvePostAuthHref(user.id)
      .then((href) => {
        if (!cancelled) setDest(href);
      })
      .catch(() => {
        if (!cancelled) setDest(POST_AUTH_HOME);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || (session && !dest)) {
    return <AppLoadingScreen />;
  }

  if (session && dest) {
    return <Redirect href={dest} />;
  }

  return <LandingScreen />;
}
