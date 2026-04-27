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

  const initials = (() => {
    const clean = (fallbackText ?? "").trim();
    if (!clean) return "AH";
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  })();

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
    <div className="grid h-full w-full place-items-center font-semibold text-text-secondary">
      {initials}
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

