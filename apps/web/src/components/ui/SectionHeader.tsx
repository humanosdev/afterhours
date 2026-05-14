"use client";

import * as React from "react";

export function SectionHeader({
  title,
  subtitle,
  right,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["flex items-end justify-between gap-4", className].join(" ")}>
      <div className="min-w-0">
        <div className="text-sm font-semibold tracking-wide text-text-primary">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-xs text-text-secondary">{subtitle}</div>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

