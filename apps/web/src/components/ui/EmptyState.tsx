"use client";

import * as React from "react";

export function EmptyState({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-subtle bg-surface p-4 shadow-surface-sm",
        className,
      ].join(" ")}
    >
      <div className="text-sm font-semibold text-text-primary">{title}</div>
      {description ? (
        <div className="mt-1 text-sm text-text-secondary">{description}</div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

