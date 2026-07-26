import type { ReactNode } from "react";

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

/** Session-scoped tab boot — consumed keys reset on sign-out via `clearSessionCaches`. */
export function AppTabBootProvider({ children }: { children: ReactNode }) {
  return children;
}
