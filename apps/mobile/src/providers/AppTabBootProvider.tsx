import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useAppShellVisible } from "./AppShellVisibleProvider";

type AppTabBootContextValue = {
  /** True for this cold launch until the app backgrounds — enables one boot skeleton per tab. */
  coldOpenEligible: boolean;
};

const AppTabBootContext = createContext<AppTabBootContextValue>({ coldOpenEligible: false });

const consumedTabBootKeys = new Set<string>();

export function resetTabBootSession(): void {
  consumedTabBootKeys.clear();
}

export function markTabBootConsumed(tabBootKey: string): void {
  if (tabBootKey) consumedTabBootKeys.add(tabBootKey);
}

export function isTabBootConsumed(tabBootKey: string): boolean {
  return consumedTabBootKeys.has(tabBootKey);
}

export function AppTabBootProvider({ children }: { children: ReactNode }) {
  const shellVisible = useAppShellVisible();
  const [coldOpenEligible, setColdOpenEligible] = useState(false);
  const coldLaunchStartedRef = useRef(false);

  useEffect(() => {
    if (!shellVisible || coldLaunchStartedRef.current) return;
    coldLaunchStartedRef.current = true;
    setColdOpenEligible(true);
  }, [shellVisible]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "background") return;
      setColdOpenEligible(false);
      consumedTabBootKeys.clear();
    });
    return () => sub.remove();
  }, []);

  const value = useMemo(() => ({ coldOpenEligible }), [coldOpenEligible]);
  return <AppTabBootContext.Provider value={value}>{children}</AppTabBootContext.Provider>;
}

export function useColdOpenBootEligible(): boolean {
  return useContext(AppTabBootContext).coldOpenEligible;
}

/** @deprecated Use useColdOpenBootEligible + useTabBootShell */
export function useAppTabBootActive(): boolean {
  return useColdOpenBootEligible();
}
