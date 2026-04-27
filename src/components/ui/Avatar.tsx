"use client";

import * as React from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-lg",
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

  return (
    <div
      className={[
        "rounded-full p-[2px] bg-gradient-to-tr",
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

