import { createContext, useContext, type ReactNode } from "react";

const AppShellVisibleContext = createContext(false);

/** True once the root boot overlay (logo screen) has dismissed. */
export function AppShellVisibleProvider({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  return <AppShellVisibleContext.Provider value={visible}>{children}</AppShellVisibleContext.Provider>;
}

export function useAppShellVisible(): boolean {
  return useContext(AppShellVisibleContext);
}
