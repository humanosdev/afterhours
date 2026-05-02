"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProtectedRoute from "@/components/ProtectedRoute";

function VenueActivityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venueId");
  const [venueName, setVenueName] = useState("Venue");
  const [activeTab, setActiveTab] = useState<"activity" | "info">("activity");

  useEffect(() => {
    if (!venueId) return;
    (async () => {
      const { data } = await supabase
        .from("venues")
        .select("name")
        .eq("id", venueId)
        .maybeSingle();
      if (data?.name) setVenueName(data.name);
    })();
  }, [venueId]);

  return (
    <div className="min-h-screen bg-primary px-4 pb-[calc(env(safe-area-inset-bottom,0px)+36px)] pt-[calc(env(safe-area-inset-top,0px)+16px)] text-white">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/85"
        >
          Back
        </button>

        <div className="rounded-2xl border border-white/10 bg-[#0b0f18cc] p-4 backdrop-blur">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-violet-active/80">VENUE ACTIVITY</p>
          <h1 className="mt-1 text-2xl font-semibold">{venueName}</h1>
          <p className="mt-1 text-sm text-white/60">Live Moments and check-ins tied to this place.</p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("activity")}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                activeTab === "activity"
                  ? "border-accent-violet/45 bg-accent-violet/28 text-white"
                  : "border-white/15 bg-white/5 text-white/70"
              }`}
            >
              Activity
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                activeTab === "info"
                  ? "border-sky-300/40 bg-sky-500/20 text-sky-100"
                  : "border-white/15 bg-white/5 text-white/70"
              }`}
            >
              Info
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
            {activeTab === "activity" ? (
              <>
                <p className="text-sm font-semibold">No activity yet</p>
                <p className="mt-1 text-xs text-white/60">
                  Moments posted here will appear in real time.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Venue info</p>
                <p className="mt-1 text-xs text-white/60">
                  Venue details and live stats will appear here.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VenueActivityPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={<div className="min-h-screen w-screen bg-black" aria-hidden />}
      >
        <VenueActivityContent />
      </Suspense>
    </ProtectedRoute>
  );
}
