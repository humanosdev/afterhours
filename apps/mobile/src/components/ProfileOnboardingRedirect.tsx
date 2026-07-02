import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BootLoadingOverlay } from "./BootLoadingOverlay";
import { POST_AUTH_ONBOARDING, peekPostAuthHref, resolvePostAuthHref } from "../lib/authRouting";
import { isMapBootReady, markMapBootReady, subscribeMapBootGate } from "../lib/mapBootGate";
import { useAuth } from "../providers/AuthProvider";

type ProfileOnboardingGateProps = {
  children: ReactNode;
};

/**
 * Blocks the signed-in app shell until profile onboarding is complete.
 * Keep the navigator mounted — overlay the boot screen instead of replacing the tree.
 */
export function ProfileOnboardingGate({ children }: ProfileOnboardingGateProps) {
  const { user } = useAuth();
  const cachedHref = user?.id ? peekPostAuthHref(user.id) : null;
  const [ready, setReady] = useState(() => cachedHref !== null);
  const [needsOnboarding, setNeedsOnboarding] = useState(
    () => cachedHref === POST_AUTH_ONBOARDING
  );
  const [mapBootReady, setMapBootReady] = useState(isMapBootReady);

  useEffect(() => subscribeMapBootGate(() => setMapBootReady(isMapBootReady())), []);

  useEffect(() => {
    if (!ready || needsOnboarding || mapBootReady) return;
    const id = setTimeout(() => markMapBootReady(), 4500);
    return () => clearTimeout(id);
  }, [ready, needsOnboarding, mapBootReady]);

  useEffect(() => {
    if (!user?.id) {
      setReady(true);
      setNeedsOnboarding(false);
      return;
    }
    const peek = peekPostAuthHref(user.id);
    if (peek !== null) {
      setNeedsOnboarding(peek === POST_AUTH_ONBOARDING);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void resolvePostAuthHref(user.id)
      .then((dest) => {
        if (cancelled) return;
        setNeedsOnboarding(dest === POST_AUTH_ONBOARDING);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setNeedsOnboarding(false);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (ready && needsOnboarding) {
    return <Redirect href={POST_AUTH_ONBOARDING} />;
  }

  const showBootOverlay = !ready || !mapBootReady;

  return (
    <View style={styles.root}>
      {children}
      <BootLoadingOverlay visible={showBootOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
