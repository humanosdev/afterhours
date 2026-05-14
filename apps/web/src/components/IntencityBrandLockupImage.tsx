import {
  INTENCITY_BRAND_LOCKUP_HEIGHT,
  INTENCITY_BRAND_LOCKUP_PATH,
  INTENCITY_BRAND_LOCKUP_WIDTH,
} from "@/lib/brandAssets";

/**
 * Full lockup bitmap — sits on `bg-primary` (near-black, aligned with brand art). Scales with
 * `object-contain` + `max-h` so icon + wordmark + tagline stay legible on small phones and short `dvh`.
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
      ? "w-full max-w-[min(92vw,26rem)] sm:max-w-[min(90vw,34rem)] max-h-[min(40dvh,22rem)] sm:max-h-[min(44dvh,24rem)]"
      : "w-full max-w-[min(92vw,24rem)] sm:max-w-[min(90vw,30rem)] max-h-[min(30dvh,15rem)] sm:max-h-[min(34dvh,17rem)]";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public PNG; avoids next/image remote config
    <img
      src={INTENCITY_BRAND_LOCKUP_PATH}
      width={INTENCITY_BRAND_LOCKUP_WIDTH}
      height={INTENCITY_BRAND_LOCKUP_HEIGHT}
      decoding="async"
      fetchPriority={fetchPriority}
      alt="Intencity — live the city, feel the Intencity"
      className={`pointer-events-none mx-auto block h-auto w-full max-w-full object-contain object-center select-none antialiased ${sizeClass} ${className}`.trim()}
    />
  );
}
