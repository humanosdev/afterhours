import type { CSSProperties, HTMLAttributes } from "react";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

/** Instagram-style dark grey block with slow horizontal shimmer (grey only, no accent). */
export function Skeleton({ className, style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("ah-skeleton-shimmer rounded-md", className)}
      style={style}
      {...rest}
    />
  );
}

export function SkeletonCircle({
  size = 40,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Skeleton
      className={cx("shrink-0 rounded-full", className)}
      style={{ width: size, height: size, ...style }}
      aria-hidden
    />
  );
}

export function SkeletonLine({
  className,
  width,
  height = 12,
}: {
  className?: string;
  width?: number | string;
  height?: number;
}) {
  return (
    <Skeleton
      className={cx("rounded-md", className)}
      style={{
        height,
        width: width ?? "100%",
        maxWidth: "100%",
      }}
      aria-hidden
    />
  );
}

/** Large rectangular media / card block */
export function SkeletonCard({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={cx("overflow-hidden rounded-2xl", className)} {...rest}>
      {children}
    </Skeleton>
  );
}

/** Square grid cells (e.g. profile grid) */
export function SkeletonGrid({
  columns = 3,
  count = 9,
  gapClass = "gap-1",
  cellClass = "aspect-square rounded-md",
}: {
  columns?: number;
  count?: number;
  gapClass?: string;
  cellClass?: string;
}) {
  return (
    <div
      className={cx("grid w-full", gapClass)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cellClass} aria-hidden />
      ))}
    </div>
  );
}
