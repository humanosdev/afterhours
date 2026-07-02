import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useAcceptedFriends } from "../hooks/useAcceptedFriends";
import { useUserPresenceState } from "../hooks/useUserPresenceState";
import type { PresenceRefreshBoost } from "../lib/mapPresenceRefresh";
import { useAppLifecycle } from "./AppLifecycleProvider";
import { useAuth } from "./AuthProvider";
import type { UserPresenceRow } from "../types/presence";

type PresenceContextValue = {
  presence: UserPresenceRow[];
  presenceLoading: boolean;
  /** True after the first presence fetch completes for this signed-in session. */
  presenceInitialSyncDone: boolean;
  ghostByUserId: Record<string, boolean>;
  blockedUserIds: Set<string>;
  friendIdSet: Set<string>;
  /** UI re-render tick for freshness labels — use `presenceNowMs()` for window math. */
  presenceClock: number;
  reloadPresence: (opts?: { quiet?: boolean }) => Promise<void>;
  /** EVOLVE-2a — non-null when map tab boosts poll/clock. */
  presenceRefreshBoost: PresenceRefreshBoost | null;
  setPresenceRefreshBoost: (boost: PresenceRefreshBoost | null) => void;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAppForeground } = useAppLifecycle();
  const { friends } = useAcceptedFriends(user?.id, { reloadOnFocus: false });
  const [refreshBoost, setRefreshBoostState] = useState<PresenceRefreshBoost | null>(null);
  const friendIdsKey = useMemo(
    () => friends.map((f) => f.id).sort().join(","),
    [friends]
  );
  const friendIds = useMemo(
    () => (friendIdsKey ? friendIdsKey.split(",") : []),
    [friendIdsKey]
  );
  const presenceState = useUserPresenceState(
    Boolean(user?.id),
    friendIds,
    user?.id,
    refreshBoost,
    isAppForeground
  );

  const setPresenceRefreshBoost = useCallback((boost: PresenceRefreshBoost | null) => {
    setRefreshBoostState(boost);
  }, []);

  const value = useMemo(
    () => ({
      ...presenceState,
      presenceRefreshBoost: refreshBoost,
      setPresenceRefreshBoost,
    }),
    [presenceState, refreshBoost, setPresenceRefreshBoost]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence(): PresenceContextValue {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error("usePresence must be used within PresenceProvider");
  }
  return ctx;
}
