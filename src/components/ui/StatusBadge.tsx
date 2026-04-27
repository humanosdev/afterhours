"use client";

import * as React from "react";

const variantClasses = {
  neutral:
    "border-subtle bg-white/5 text-text-secondary",
  success:
    "border-success/25 bg-success/10 text-success",
  warning:
    "border-warning/25 bg-warning/10 text-warning",
  error:
    "border-error/25 bg-error/10 text-error",
  violet:
    "border-accent-violet/25 bg-accent-violet/10 text-accent-violet",
  cyan:
    "border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan",
} as const;

export function StatusBadge({
  label,
  variant = "neutral",
  className = "",
}: {
  label: string;
  variant?: keyof typeof variantClasses;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

