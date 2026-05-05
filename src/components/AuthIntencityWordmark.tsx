/**
 * Horizontal INTENCITY lockup for auth screens (1024×512 asset, mobile-first width).
 */
export function AuthIntencityWordmark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mx-auto w-full max-w-[min(92vw,24rem)] [contain:layout] ${className}`.trim()}
      style={{ aspectRatio: "1024 / 512" }}
    >
      <div
        className="h-full w-full bg-center bg-no-repeat [content-visibility:auto]"
        style={{
          backgroundImage: "url(/auth-intencity-wordmark.png)",
          backgroundSize: "contain",
        }}
      />
    </div>
  );
}
