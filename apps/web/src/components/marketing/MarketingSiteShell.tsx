"use client";

import type { ReactNode } from "react";
import { MarketingSiteFooter } from "./MarketingSiteFooter";
import { MarketingSiteHeader } from "./MarketingSiteHeader";

export function MarketingSiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-primary text-text-primary">
      <MarketingSiteHeader />
      <main className="flex-1">{children}</main>
      <MarketingSiteFooter />
    </div>
  );
}
