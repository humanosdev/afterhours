"use client";

import type { ReactNode } from "react";
import { MarketingSiteFooter } from "./MarketingSiteFooter";
import { MarketingSiteHeader } from "./MarketingSiteHeader";

export function MarketingSiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-hidden bg-primary text-text-primary">
      <MarketingSiteHeader />
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      <MarketingSiteFooter />
    </div>
  );
}
