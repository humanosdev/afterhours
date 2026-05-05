"use client";

import { createContext, useContext } from "react";

export type ClientAuthSnapshot = {
  /** `getSession` (or `onAuthStateChange`) has run at least once in `AppShell`. */
  sessionResolved: boolean;
  userId: string | null;
};

const ClientAuthContext = createContext<ClientAuthSnapshot>({
  sessionResolved: false,
  userId: null,
});

export function ClientAuthProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ClientAuthSnapshot;
}) {
  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>;
}

export function useClientAuth() {
  return useContext(ClientAuthContext);
}
