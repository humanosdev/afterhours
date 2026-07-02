import {
  INTENCITY_BRAND_LOCKUP_HEIGHT,
  INTENCITY_BRAND_LOCKUP_SRC,
  INTENCITY_BRAND_LOCKUP_WIDTH,
} from "@/lib/brandAssets";

/**
 * Full lockup bitmap — sits on `bg-primary` (near-black, aligned with brand art). Intrinsic
 * `width`/`height` match the PNG (1024×576) to avoid layout shift; `object-contain` scales up crisply
 * on phones up to ~2× that width without upsampling a separate 2× asset.
 */
export function IntencityBrandLockupImage({
  variant,
  className = "",
  fetchPriority = "auto",
}: {
  variant: "splash" | "auth";
  className?: string;
  fetchPriority?: "high" | "low" | "auto";
}) {
  const sizeClass =
    variant === "splash"
      ? "w-full max-w-[min(98vw,52rem)] sm:max-w-[min(96vw,60rem)] max-h-[min(76dvh,50rem)] sm:max-h-[min(80dvh,54rem)]"
      : "w-full max-w-[min(98vw,44rem)] sm:max-w-[min(96vw,54rem)] max-h-[min(62dvh,42rem)] sm:max-h-[min(66dvh,44rem)]";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public PNG; avoids next/image remote config
    <img
      src={INTENCITY_BRAND_LOCKUP_SRC}
      width={INTENCITY_BRAND_LOCKUP_WIDTH}
      height={INTENCITY_BRAND_LOCKUP_HEIGHT}
      decoding="async"
      fetchPriority={fetchPriority}
      alt="Intencity — live the city, feel the Intencity"
      className={`pointer-events-none mx-auto block h-auto w-full max-w-full object-contain object-center [transform:translateZ(0)] [backface-visibility:hidden] select-none antialiased ${sizeClass} ${className}`.trim()}
    />
  );
}
