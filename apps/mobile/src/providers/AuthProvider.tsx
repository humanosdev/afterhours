import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearSessionCaches } from "../lib/clearSessionCaches";
import { unregisterNativePushSubscriptions } from "../lib/nativePushSubscription";
import { clearUserPresenceOnSignOut } from "../lib/userPresenceWrite";
import { supabase } from "../lib/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const bootTimeout = setTimeout(() => {
      if (!mounted) return;
      setLoading(false);
    }, 8_000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn("[auth] getSession failed:", error);
        }
        if (!mounted) return;
        setSession(null);
        setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(bootTimeout);
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        const uid = session?.user?.id;
        if (uid) {
          await clearUserPresenceOnSignOut(uid);
          await unregisterNativePushSubscriptions(uid);
        }
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        clearSessionCaches();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
