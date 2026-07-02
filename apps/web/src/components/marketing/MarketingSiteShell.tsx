"use client";

import type { ReactNode } from "react";
import { MarketingSiteFooter } from "./MarketingSiteFooter";
import { MarketingSiteHeader } from "./MarketingSiteHeader";

export function MarketingSiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-clip bg-primary text-text-primary">
      <MarketingSiteHeader />
      <main className="w-full min-w-0">{children}</main>
      <MarketingSiteFooter />
    </div>
  );
}
