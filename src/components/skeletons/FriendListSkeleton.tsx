"use client";

import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";

export default function FriendListSkeleton({
  rows = 12,
  withHeader = false,
}: {
  rows?: number;
  /** When true, includes sticky header + search bar to match /profile/friends layout. */
  withHeader?: boolean;
}) {
  const rowList = (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-white/[0.06] py-3">
          <SkeletonCircle size={44} />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonLine width="52%" height={14} />
            <SkeletonLine width="36%" height={11} />
          </div>
        </div>
      ))}
    </div>
  );

  if (!withHeader) {
    return (
      <div className="px-4 pt-3">
        <SkeletonLine width="100%" height={44} className="rounded-xl" />
        <div className="mt-4">{rowList}</div>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)] backdrop-blur">
        <div className="flex items-center justify-between">
          <SkeletonLine width={28} height={28} className="rounded-full" />
          <SkeletonLine width={100} height={24} className="rounded-md" />
          <SkeletonLine width={72} height={32} className="rounded-full" />
        </div>
        <div className="mt-3">
          <SkeletonLine width="100%" height={44} className="rounded-xl" />
        </div>
      </div>
      <div className="px-4 pt-2">{rowList}</div>
    </>
  );
}
