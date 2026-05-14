"use client";

import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";

export default function ChatListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-0 px-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex w-full items-center gap-3 rounded-[12px] px-2 py-3.5">
          <SkeletonCircle size={48} />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonLine width="48%" height={14} />
            <SkeletonLine width="78%" height={13} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <SkeletonLine width={36} height={10} />
            <SkeletonCircle size={10} />
          </div>
        </div>
      ))}
    </div>
  );
}
