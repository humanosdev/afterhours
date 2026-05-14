"use client";

import * as React from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "story" | "storyLg";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-lg",
  /** ~64px — compact strips, secondary rows */
  story: "h-16 w-16 text-sm",
  /** ~72px inner — hub / home story row (IG-scale hero rings) */
  storyLg: "h-[4.5rem] w-[4.5rem] text-[15px]",
};

export function Avatar({
  src,
  alt,
  fallbackText,
  size = "md",
  storyRing = false,
  /** When `storyRing`, false = muted ring (no live story); true = brand emphasis. */
  ringActive = true,
  className = "",
}: {
  src?: string | null;
  alt?: string;
  fallbackText?: string | null;
  size?: AvatarSize;
  storyRing?: boolean;
  ringActive?: boolean;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);
  React.useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const ringClassLive = "from-accent-violet/72 to-white/22";

  const ringClassMuted = "from-white/[0.16] to-white/[0.07]";

  const ringClass = storyRing ? (ringActive ? ringClassLive : ringClassMuted) : "";

  /** Extra gradient thickness; keep hub `w-[84px]` column fitting (~≤83px total for storyLg). */
  const storyRingOuterPad =
    size === "storyLg" ? "p-[4px]" : size === "xl" ? "p-[5px]" : size === "story" ? "p-[3.5px]" : "p-[3px]";

  const storyRingGlowLive =
    "shadow-[0_0_0_1px_rgba(59,102,255,0.22),0_0_12px_rgba(59,102,255,0.14),0_0_22px_rgba(255,255,255,0.04)]";

  const storyRingGlowMuted = "shadow-[0_0_0_1px_rgba(255,255,255,0.07)]";

  const storyRingGlow = storyRing ? (ringActive ? storyRingGlowLive : storyRingGlowMuted) : "";

  const image = src && !imageFailed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || "avatar"}
      className="h-full w-full object-cover"
      draggable={false}
      onError={() => setImageFailed(true)}
    />
  ) : (
    <div
      className="grid h-full w-full place-items-center bg-gradient-to-br from-[#5B82FF] via-[#3B66FF] to-[#4774FF]"
      aria-label={fallbackText ? `${fallbackText} avatar` : "Default avatar"}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[60%] w-[60%] text-white/95"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="8.25" r="3.5" fill="currentColor" />
        <path
          d="M5 19.25C5 15.9363 7.68629 13.25 11 13.25H13C16.3137 13.25 19 15.9363 19 19.25V20.25H5V19.25Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );

  if (!storyRing) {
    return (
      <div
        className={[
          "overflow-hidden rounded-full border border-subtle bg-secondary",
          sizeClasses[size],
          className,
        ].join(" ")}
      >
        {image}
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-full bg-gradient-to-tr",
        storyRingOuterPad,
        ringClass,
        storyRingGlow,
        className,
      ].join(" ")}
    >
      {/* Dark gutter so gradient never sits flush on the photo */}
      <div className="rounded-full bg-black/55 p-[1.5px]">
        <div
          className={[
            "overflow-hidden rounded-full border-[2.5px] border-primary bg-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            sizeClasses[size],
          ].join(" ")}
        >
          {image}
        </div>
      </div>
    </div>
  );
}
