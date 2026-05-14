import { IntencityBrandLockupImage } from "@/components/IntencityBrandLockupImage";

/** Centered lockup — same presentation as auth (`IntencityBrandLockupImage` splash variant). */
export function BrandedSplashLogo({ className }: { className?: string }) {
  return <IntencityBrandLockupImage variant="splash" fetchPriority="high" className={className} />;
}
