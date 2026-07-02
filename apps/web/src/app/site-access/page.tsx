import { Suspense } from "react";
import SiteAccessClient from "./SiteAccessClient";

export default function SiteAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-primary text-sm text-white/50">
          Loading…
        </div>
      }
    >
      <SiteAccessClient />
    </Suspense>
  );
}
