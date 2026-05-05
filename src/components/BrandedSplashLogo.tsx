/** Centered wordmark — kept in sync with `InitialAppSplash` and layout boot splash. */
export function BrandedSplashLogo({ className }: { className?: string }) {
  return (
    <div
      className={`w-[min(92vw,720px)] max-w-[min(92vw,720px)] shrink-0 bg-center bg-no-repeat will-change-transform${className ? ` ${className}` : ""}`}
      style={{
        aspectRatio: "1024 / 512",
        backgroundColor: "#000000",
        backgroundImage: "url(/splash-intencity-logo.png)",
        backgroundSize: "contain",
      }}
    />
  );
}
