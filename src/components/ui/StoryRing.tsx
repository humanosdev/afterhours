"use client";

import * as React from "react";
import { Avatar } from "./Avatar";

export function StoryRing({
  src,
  alt,
  fallbackText,
  size = "lg",
  active = true,
  className = "",
}: {
  src?: string | null;
  alt?: string;
  fallbackText?: string | null;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Avatar
        src={src}
        alt={alt}
        fallbackText={fallbackText}
        size={size}
        storyRing={active}
        ringVariant="violet"
      />
    </div>
  );
}

