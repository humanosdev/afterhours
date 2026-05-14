"use client";

import * as React from "react";

export function SocialCard({
  children,
  className = "",
  interactive = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const interactiveClasses = interactive
    ? "cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface-hover/80"
    : "";

  const Comp: any = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl border border-subtle bg-surface p-4 shadow-surface-sm",
        interactiveClasses,
        className,
      ].join(" ")}
    >
      {children}
    </Comp>
  );
}

