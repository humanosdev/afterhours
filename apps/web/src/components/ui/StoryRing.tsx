"use client";

import * as React from "react";
import { Avatar } from "./Avatar";

/**
 * Story / moment ring: **ring is always drawn** (muted when `active` is false, brand glow when true).
 * Matches hub “Your moment” and profile — no more disappearing ring on profile when there’s no live story.
 */
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
  size?: "sm" | "md" | "lg" | "xl" | "story" | "storyLg";
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
        storyRing
        ringActive={active}
      />
    </div>
  );
}
