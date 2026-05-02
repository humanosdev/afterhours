"use client";

import { SkeletonCircle, SkeletonLine } from "@/components/ui/Skeleton";

export default function EditProfileSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-black px-4 pb-[calc(env(safe-area-inset-bottom,0px)+92px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] text-white sm:px-5">
      <div className="mb-5 flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <SkeletonLine width={40} height={40} className="rounded-full" />
        <SkeletonLine width={140} height={22} className="rounded-md" />
      </div>
      <div className="flex flex-col items-center">
        <SkeletonCircle size={112} />
        <SkeletonLine width={180} height={14} className="mt-4" />
      </div>
      <div className="mt-8 space-y-4">
        <SkeletonLine width={72} height={11} />
        <SkeletonLine width="100%" height={48} className="rounded-xl" />
        <SkeletonLine width={88} height={11} />
        <SkeletonLine width="100%" height={48} className="rounded-xl" />
        <SkeletonLine width={64} height={11} />
        <SkeletonLine width="100%" height={96} className="rounded-xl" />
      </div>
    </div>
  );
}
