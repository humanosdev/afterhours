"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, MapPin, Navigation, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ProtectedRoute from "@/components/ProtectedRoute";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";
import { resolveVenueContextLine } from "@/lib/venueContextCopy";
import { formatVenueCategoryLabel } from "@/lib/venueCategoryLabel";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TAIL_PADDING_CLASS,
  APP_TAB_PAGE_ROOT_CLASS,
  APP_TAB_PRIMARY_SCROLL_CLASS,
} from "@/lib/appShellLayout";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function VenueActivityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venueId");
  const [activeTab, setActiveTab] = useState<"activity" | "info">("activity");
  const [name, setName] = useState("Venue");
  const [category, setCategory] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolved, setResolved] = useState(false);
  const [contextCopyRaw, setContextCopyRaw] = useState<unknown>(null);

  const headerContextLine = useMemo(
    () => (resolved && venueId ? resolveVenueContextLine(new Date(), contextCopyRaw) : null),
    [resolved, venueId, contextCopyRaw]
  );

  const mapToneParam = searchParams.get("mapTone");
  const [osPrefersLight, setOsPrefersLight] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const sync = () => setOsPrefersLight(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const sceneLight = useMemo(() => {
    if (mapToneParam === "day") return true;
    if (mapToneParam === "night") return false;
    return osPrefersLight;
  }, [mapToneParam, osPrefersLight]);

  const backBtnClass = sceneLight
    ? "!border-black/10 !bg-white/90 !text-[#0f172a]/88 !shadow-[0_8px_26px_rgba(15,20,29,0.1)] hover:!bg-white"
    : "";

  useEffect(() => {
    if (!venueId) {
      setContextCopyRaw(null);
      setResolved(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("venues")
        .select("name, category, image_url, photo_url, cover_image_url, lat, lng, context_copy")
        .eq("id", venueId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const row = data as Record<string, unknown>;
        setName(typeof row.name === "string" && row.name ? row.name : "Venue");
        setCategory(typeof row.category === "string" ? row.category : null);
        const img =
          (typeof row.image_url === "string" && row.image_url) ||
          (typeof row.photo_url === "string" && row.photo_url) ||
          (typeof row.cover_image_url === "string" && row.cover_image_url) ||
          null;
        setImageUrl(img);
        const lat = row.lat;
        const lng = row.lng;
        if (typeof lat === "number" && typeof lng === "number") {
          setCoords({ lat, lng });
        } else {
          setCoords(null);
        }
        setContextCopyRaw(row.context_copy ?? null);
      } else {
        setContextCopyRaw(null);
      }
      setResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  const openDirections = () => {
    if (!coords) return;
    const destination = `${coords.lat},${coords.lng}`;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const href = isIOS
      ? `http://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    window.open(href, "_blank");
  };

  if (!venueId) {
    return (
      <div
        className={`${APP_TAB_PAGE_ROOT_CLASS} overflow-hidden ${sceneLight ? "text-[#0b0f14]" : "text-white"}`}
      >
        <div
          className={`relative ${APP_CONTENT_MAX_CLASS} ${APP_TAB_PRIMARY_SCROLL_CLASS} overflow-x-hidden px-4 ${APP_PAGE_TAIL_PADDING_CLASS} pt-[calc(env(safe-area-inset-top,0px)+16px)] sm:px-5 sm:pt-[calc(env(safe-area-inset-top,0px)+12px)] ${
            sceneLight
              ? "bg-gradient-to-b from-[#f7f8fb] via-[#eef1f6] to-[#e2e8f0]"
              : "bg-gradient-to-b from-[#101422] via-primary to-[#05060d]"
          }`}
        >
          <div className="relative mx-auto w-full max-w-md">
            <div className="mb-5 flex items-start gap-2">
              <SubpageBackButton onBack={() => navigateBack(router, "/live-places")} className={backBtnClass} />
              <div className="min-w-0 flex-1 pt-0.5">
                <h1 className={`text-[1.15rem] font-bold tracking-tight ${sceneLight ? "text-[#0b0f14]" : ""}`}>
                  Venue activity
                </h1>
              </div>
            </div>
            <div
              className={`relative overflow-hidden rounded-2xl px-5 py-12 text-center backdrop-blur-xl ${
                sceneLight
                  ? "border border-black/[0.06] bg-white/80 shadow-[0_20px_50px_rgba(15,20,29,0.1),0_0_0_1px_rgba(59,102,255,0.08)]"
                  : "bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-0 z-[1] rounded-2xl border ah-premium-surface-pulse ${
                  sceneLight ? "border-accent-violet/22 shadow-[0_0_36px_rgba(59,102,255,0.12)]" : "border-accent-violet/24 shadow-[0_0_32px_rgba(59,102,255,0.1)]"
                }`}
                aria-hidden
              />
              <div className="relative z-[2]">
                <MapPin
                  className={sceneLight ? "mx-auto text-accent-violet" : "mx-auto text-accent-violet-active/90"}
                  size={28}
                  strokeWidth={2}
                  aria-hidden
                />
                <p className={`mt-4 text-[15px] font-semibold ${sceneLight ? "text-[#0f172a]" : "text-white/90"}`}>
                  No pin selected
                </p>
                <p
                  className={`mx-auto mt-2 max-w-[16rem] text-[13px] leading-relaxed ${
                    sceneLight ? "text-[#64748b]" : "text-white/45"
                  }`}
                >
                  Open this screen from Live Places or the map so we know which room you&apos;re standing in.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/live-places")}
                  className={`mt-6 w-full rounded-xl py-3 text-[14px] font-bold transition active:scale-[0.99] ${
                    sceneLight
                      ? "border border-black/10 bg-gradient-to-b from-white to-[#f1f4f8] text-[#0b0f14] shadow-[0_10px_32px_rgba(15,20,29,0.12)] hover:brightness-[1.02]"
                      : "bg-gradient-to-r from-accent-violet-active via-accent-violet to-[#3558d4] text-white shadow-[0_0_30px_rgba(59,102,255,0.32)] hover:brightness-110"
                  }`}
                >
                  Browse Live Places
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${APP_TAB_PAGE_ROOT_CLASS} overflow-hidden ${sceneLight ? "text-[#0b0f14]" : "text-white"}`}>
      <div
        className={`relative ${APP_CONTENT_MAX_CLASS} ${APP_TAB_PRIMARY_SCROLL_CLASS} overflow-x-hidden px-4 ${APP_PAGE_TAIL_PADDING_CLASS} pt-[calc(env(safe-area-inset-top,0px)+16px)] sm:px-5 sm:pt-[calc(env(safe-area-inset-top,0px)+12px)] ${
          sceneLight
            ? "bg-gradient-to-b from-[#f7f8fb] via-[#eef1f6] to-[#e2e8f0]"
            : "bg-gradient-to-b from-[#101422] via-primary to-[#05060d]"
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-16 top-24 h-[220px] w-[220px] rounded-full blur-3xl ${
            sceneLight ? "bg-accent-violet/[0.14]" : "bg-accent-violet/[0.07]"
          }`}
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-5 flex items-start gap-2">
            <SubpageBackButton onBack={() => navigateBack(router, "/live-places")} className={backBtnClass} />
            <div className="min-w-0 flex-1 pt-0.5">
              <h1
                className={`truncate text-[1.15rem] font-bold tracking-tight ${sceneLight ? "text-[#0b0f14]" : "text-white"}`}
              >
                {!resolved ? "…" : name}
              </h1>
              {resolved && category ? (
                <p className={`mt-1 truncate text-[12px] font-medium ${sceneLight ? "text-[#64748b]" : "text-white/45"}`}>
                  {formatVenueCategoryLabel(category)}
                </p>
              ) : null}
              {headerContextLine ? (
                <p
                  className={`mt-1.5 line-clamp-2 text-[11px] font-medium leading-snug ${
                    sceneLight ? "text-[#64748b]" : "text-white/42"
                  }`}
                >
                  {headerContextLine}
                </p>
              ) : null}
            </div>
          </div>

          <div
            className={`relative overflow-hidden rounded-2xl ${
              sceneLight ? "shadow-[0_22px_50px_rgba(15,20,29,0.12)]" : "shadow-[0_22px_60px_rgba(0,0,0,0.42)]"
            }`}
          >
            <div
              className={`pointer-events-none absolute inset-0 z-[1] rounded-2xl border ah-premium-surface-pulse ${
                sceneLight
                  ? "border-accent-violet/22 shadow-[0_0_40px_rgba(59,102,255,0.14)]"
                  : "border-accent-violet/24 shadow-[0_0_36px_rgba(59,102,255,0.12)]"
              }`}
              aria-hidden
            />
            <div className="relative z-[2] h-[148px] w-full overflow-hidden sm:h-[168px]">
              {imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
                    aria-hidden
                  />
                </>
              ) : (
                <div
                  className={`flex h-full w-full flex-col items-center justify-center ${
                    sceneLight
                      ? "bg-gradient-to-br from-white via-[#f1f4f8] to-[#e2e8f0]"
                      : "bg-gradient-to-br from-[#1a2433] via-[#121a26] to-[#080c12]"
                  }`}
                >
                  <span
                    className={`text-[3rem] font-black leading-none tracking-tighter ${
                      sceneLight ? "text-[#0f172a]/[0.12]" : "text-white/[0.09]"
                    }`}
                  >
                    {resolved ? initialsFromName(name) : "—"}
                  </span>
                  <p
                    className={`absolute bottom-3 left-0 right-0 text-center text-[11px] font-medium ${
                      sceneLight ? "text-[#64748b]" : "text-white/38"
                    }`}
                  >
                    Art lands here when we have a cover for this spot
                  </p>
                </div>
              )}
            </div>

            <div
              className={`relative z-[2] space-y-5 px-4 pb-5 pt-4 backdrop-blur-xl ${
                sceneLight
                  ? "bg-gradient-to-b from-white/[0.97] via-[#f8fafc]/[0.98] to-[#eef2f7]/[0.99]"
                  : "bg-gradient-to-b from-[#141a24]/[0.97] to-[#0a0c12]/[0.99]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles
                  className={`shrink-0 ${sceneLight ? "text-accent-violet" : "text-accent-violet-active"}`}
                  size={18}
                  strokeWidth={2.2}
                  aria-hidden
                />
                <p
                  className={`text-[13px] font-semibold leading-snug ${sceneLight ? "text-[#0f172a]/92" : "text-white/88"}`}
                >
                  Moments &amp; check-ins for this pin
                </p>
              </div>

              <div className={`flex rounded-xl p-1 ${sceneLight ? "bg-black/[0.05]" : "bg-black/35"}`}>
                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[12px] font-bold transition ${
                    activeTab === "activity"
                      ? sceneLight
                        ? "bg-white text-[#0b0f14] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_8px_rgba(15,20,29,0.08)]"
                        : "bg-gradient-to-r from-accent-violet/45 via-accent-violet/30 to-[#3558d4]/35 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : sceneLight
                        ? "text-[#64748b] hover:text-[#475569]"
                        : "text-white/45 hover:text-white/65"
                  }`}
                >
                  <Sparkles
                    size={14}
                    strokeWidth={2.2}
                    className={activeTab === "activity" ? "opacity-100" : "opacity-50"}
                    aria-hidden
                  />
                  Activity
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("info")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[12px] font-bold transition ${
                    activeTab === "info"
                      ? sceneLight
                        ? "bg-white text-[#0b0f14] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_8px_rgba(15,20,29,0.08)]"
                        : "bg-gradient-to-r from-accent-violet/45 via-accent-violet/30 to-[#3558d4]/35 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : sceneLight
                        ? "text-[#64748b] hover:text-[#475569]"
                        : "text-white/45 hover:text-white/65"
                  }`}
                >
                  <Info
                    size={14}
                    strokeWidth={2.2}
                    className={activeTab === "info" ? "opacity-100" : "opacity-50"}
                    aria-hidden
                  />
                  Info
                </button>
              </div>

              <div
                className={`rounded-xl px-4 py-5 ${sceneLight ? "border border-black/[0.06] bg-white/70" : "bg-white/[0.04]"}`}
              >
                {activeTab === "activity" ? (
                  <div className="text-center">
                    <p className={`text-[15px] font-bold ${sceneLight ? "text-[#0f172a]" : "text-white/92"}`}>
                      Signal&apos;s quiet
                    </p>
                    <p
                      className={`mx-auto mt-2 max-w-[15rem] text-[13px] leading-relaxed ${
                        sceneLight ? "text-[#64748b]" : "text-white/48"
                      }`}
                    >
                      First Moment dropped here will anchor the feed — pull friends in from the map when you&apos;re on
                      site.
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className={`text-[15px] font-bold ${sceneLight ? "text-[#0f172a]" : "text-white/92"}`}>Venue card</p>
                    <p
                      className={`mx-auto mt-2 max-w-[15rem] text-[13px] leading-relaxed ${
                        sceneLight ? "text-[#64748b]" : "text-white/48"
                      }`}
                    >
                      Hours, links, and live headcounts will layer in next — for now use the map for the full scene read.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push(`/map?venueId=${encodeURIComponent(venueId)}`)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold transition active:scale-[0.99] ${
                    sceneLight
                      ? "border border-black/10 bg-white/90 text-[#0b0f14] shadow-[0_8px_24px_rgba(15,20,29,0.1)] hover:bg-white"
                      : "bg-white/[0.08] text-white/92 hover:bg-white/[0.11]"
                  }`}
                >
                  <Navigation
                    size={17}
                    strokeWidth={2.1}
                    className={sceneLight ? "text-accent-violet" : "text-accent-violet-active/95"}
                    aria-hidden
                  />
                  Open on map
                </button>
                {coords ? (
                  <button
                    type="button"
                    onClick={openDirections}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold transition active:scale-[0.99] ${
                      sceneLight
                        ? "border border-black/[0.08] bg-[#f1f5f9] text-[#334155] hover:bg-[#e8eef5]"
                        : "bg-white/[0.06] text-white/75 hover:bg-white/[0.09]"
                    }`}
                  >
                    Directions
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VenueActivityPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-[100dvh] w-screen bg-primary" aria-hidden />}>
        <VenueActivityContent />
      </Suspense>
    </ProtectedRoute>
  );
}
