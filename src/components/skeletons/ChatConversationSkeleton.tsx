"use client";

import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";

/** Matches chat/[id] header + bubble column + composer (grey shimmer only). */
export default function ChatConversationSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <div className="sticky top-0 z-20 border-b border-white/[0.08] bg-black/92 px-3 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+8px)] backdrop-blur-xl sm:px-4">
        <div className="flex min-h-[44px] items-center gap-2">
          <SkeletonLine width={40} height={40} className="shrink-0 rounded-full" />
          <SkeletonCircle size={40} />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonLine width="46%" height={15} />
            <SkeletonLine width="28%" height={12} />
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-4">
        <div className="flex justify-start">
          <SkeletonLine width="72%" height={40} className="rounded-2xl rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <SkeletonLine width="58%" height={36} className="rounded-2xl rounded-br-md" />
        </div>
        <div className="flex justify-start">
          <SkeletonLine width="64%" height={44} className="rounded-2xl rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <SkeletonLine width="52%" height={32} className="rounded-2xl rounded-br-md" />
        </div>
        <div className="flex justify-start">
          <SkeletonLine width="78%" height={36} className="rounded-2xl rounded-bl-md" />
        </div>
      </div>

      <div
        className="border-t border-white/10 bg-black/90 px-3 py-2 backdrop-blur"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 8px)` }}
      >
        <div className="flex items-end gap-2">
          <SkeletonLine width="100%" height={44} className="min-w-0 flex-1 rounded-2xl" />
          <SkeletonLine width={72} height={44} className="shrink-0 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
