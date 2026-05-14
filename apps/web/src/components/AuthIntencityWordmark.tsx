import { IntencityBrandLockupImage } from "@/components/IntencityBrandLockupImage";

/** Brand lockup for auth / marketing headers — sized for readable tagline vs splash. */
export function AuthIntencityWordmark({ className = "" }: { className?: string }) {
  return <IntencityBrandLockupImage variant="auth" className={className} />;
}
