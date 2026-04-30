"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProtectedRoute from "@/components/ProtectedRoute";

type HiddenShareRow = {
  id: string;
  image_url: string;
  created_at: string;
};

export default function HiddenArchivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HiddenShareRow[]>([]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const preferred = await supabase
        .from("stories")
        .select("id, image_url, created_at, is_share, share_hidden")
        .eq("user_id", user.id)
        .eq("is_share", true)
        .eq("share_hidden", true)
        .order("created_at", { ascending: false });

      if (!preferred.error) {
        setRows((preferred.data ?? []) as HiddenShareRow[]);
        setLoading(false);
        return;
      }

      // Before SQL migration, no hidden-share columns exist.
      setRows([]);
      setLoading(false);
    })();
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="min-h-[100dvh] bg-black px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] text-white sm:px-5">
        <div className="mb-4 flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[17px] text-white/80"
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="text-[1.1rem] font-semibold tracking-tight">Hidden shares</h1>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-white/50">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-white/50">
            No hidden shares yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-white/[0.08]">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => router.push(`/moments/${encodeURIComponent(row.id)}?view=archive`)}
                className="relative aspect-square w-full overflow-hidden bg-[#0a0a0c]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.image_url} alt="Hidden share" className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-6 text-left text-[10px] font-medium text-white/90">
                  {new Date(row.created_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
