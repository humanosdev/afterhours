import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { RESUME_BURST_DEBOUNCE_MS } from "../lib/backgroundReadPolicy";
import { runForegroundResumeBurst } from "../lib/foregroundResumeBurst";
import { refreshCachedLocationOnResume } from "../lib/nativeResumeLocation";

type AppLifecycleContextValue = {
  /** `true` when AppState is `active`. */
  isAppForeground: boolean;
  appState: AppStateStatus;
};

const AppLifecycleContext = createContext<AppLifecycleContextValue | null>(null);

function isForegroundState(state: AppStateStatus): boolean {
  return state === "active";
}

/** EVOLVE-4 — foreground/background read policy + resume burst (reads only). */
export function AppLifecycleProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppStateStatus>(() => AppState.currentState);
  const lastResumeBurstAtRef = useRef(0);

  const onForegroundResume = useCallback(() => {
    const now = Date.now();
    if (now - lastResumeBurstAtRef.current < RESUME_BURST_DEBOUNCE_MS) return;
    lastResumeBurstAtRef.current = now;
    runForegroundResumeBurst();
    void refreshCachedLocationOnResume();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setAppState(next);
      if (isForegroundState(next)) {
        onForegroundResume();
      }
    });
    return () => sub.remove();
  }, [onForegroundResume]);

  const value = useMemo(
    () => ({
      isAppForeground: isForegroundState(appState),
      appState,
    }),
    [appState]
  );

  return <AppLifecycleContext.Provider value={value}>{children}</AppLifecycleContext.Provider>;
}

export function useAppLifecycle(): AppLifecycleContextValue {
  const ctx = useContext(AppLifecycleContext);
  if (!ctx) {
    throw new Error("useAppLifecycle must be used within AppLifecycleProvider");
  }
  return ctx;
}
