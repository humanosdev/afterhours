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
  ringVariant = "violet",
  className = "",
}: {
  src?: string | null;
  alt?: string;
  fallbackText?: string | null;
  size?: AvatarSize;
  storyRing?: boolean;
  ringVariant?: "violet" | "cyan";
  className?: string;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);
  React.useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const ringClass =
    ringVariant === "cyan"
      ? "from-accent-cyan/80 to-accent-violet/60"
      : "from-accent-violet/80 to-accent-cyan/60";

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
      className="grid h-full w-full place-items-center bg-gradient-to-br from-[#9c6bff] via-[#7a3cff] to-[#5a26d9]"
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

  const ringPad = size === "storyLg" ? "p-[3px]" : "p-[2px]";

  return (
    <div
      className={[
        "rounded-full bg-gradient-to-tr",
        ringPad,
        ringClass,
        "shadow-glow-violet",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "overflow-hidden rounded-full border border-subtle bg-secondary",
          sizeClasses[size],
        ].join(" ")}
      >
        {image}
      </div>
    </div>
  );
}

