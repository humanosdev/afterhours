"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { ImagePlus, RotateCcw, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cropImageFromArea } from "@/lib/cropImageFromArea";

type FacingMode = "user" | "environment";

/** Preview + canvas export (approximates IG-style looks). */
const LOOK_FILTERS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Normal", css: "none" },
  { id: "warm", label: "Warm", css: "brightness(1.06) sepia(0.22) contrast(1.05)" },
  { id: "cool", label: "Cool", css: "brightness(1.03) saturate(1.12) hue-rotate(-12deg)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.38) contrast(1.1)" },
  { id: "mono", label: "B&W", css: "grayscale(1) contrast(1.06)" },
  { id: "fade", label: "Soft", css: "brightness(1.08) contrast(0.9) saturate(0.88)" },
];

function filterCss(id: string) {
  return LOOK_FILTERS.find((f) => f.id === id)?.css ?? "none";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

async function bakeBlobWithFilter(blob: Blob, css: string): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.filter = css === "none" ? "none" : css;
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!out) throw new Error("toBlob");
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function StoryCameraModal({
  open,
  mode = "moments",
  onClose,
}: {
  open: boolean;
  mode?: "moments" | "shares";
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [starting, setStarting] = useState(false);

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  /** True only after `getUserMedia` stream is attached and `video.play()` succeeds — never overlap with unavailable UI. */
  const [streamReady, setStreamReady] = useState(false);

  const [cropEditUrl, setCropEditUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [filterId, setFilterId] = useState("none");

  const activeFilterCss = useMemo(() => filterCss(filterId), [filterId]);
  const cropAspect = useMemo(() => (mode === "shares" ? 4 / 5 : 9 / 16), [mode]);

  const canFlip = useMemo(() => true, []);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function stopStream() {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
  }

  function revokeCropEditUrl() {
    setCropEditUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCrop({ x: 0, y: 0 });
    setCropZoom(1);
    setCroppedAreaPixels(null);
  }

  async function startCamera(nextMode: FacingMode) {
    if (!open) return;
    setStarting(true);
    setStreamReady(false);
    stopStream();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setCameraUnavailable(true);
        setStreamReady(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextMode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraUnavailable(false);
      setStreamReady(true);
    } catch (err) {
      console.error("camera start error:", err);
      stopStream();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStreamReady(false);
      setCameraUnavailable(true);
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    setCapturedBlob(null);
    setCapturedUrl(null);
    revokeCropEditUrl();
    setCameraUnavailable(false);
    setStreamReady(false);
    setFilterId("none");
    startCamera(facingMode);

    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (cropEditUrl || capturedBlob) return;
    startCamera(facingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  function close() {
    stopStream();
    setCropEditUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCrop({ x: 0, y: 0 });
    setCropZoom(1);
    setCroppedAreaPixels(null);
    setCapturedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCapturedBlob(null);
    onClose();
  }

  function enterCropStage(blob: Blob) {
    stopStream();
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(null);
    }
    setCapturedBlob(null);
    setCropEditUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setCrop({ x: 0, y: 0 });
    setCropZoom(1);
    setCroppedAreaPixels(null);
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;

    enterCropStage(blob);
  }

  function cancelCropStage() {
    revokeCropEditUrl();
    setCameraUnavailable(false);
    setStreamReady(false);
    startCamera(facingMode);
  }

  async function confirmCropStage() {
    if (!cropEditUrl || !croppedAreaPixels) return;
    try {
      const cropped = await cropImageFromArea(cropEditUrl, croppedAreaPixels);
      revokeCropEditUrl();
      setFilterId("none");
      setCapturedBlob(cropped);
      setCapturedUrl(URL.createObjectURL(cropped));
    } catch (e) {
      console.error("crop error:", e);
    }
  }

  function retake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    revokeCropEditUrl();
    setCameraUnavailable(false);
    setStreamReady(false);
    startCamera(facingMode);
  }

  function onSelectUploadFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    enterCropStage(file);
    setCameraUnavailable(false);
  }

  async function postStory() {
    if (!capturedBlob) return;

    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploading(false);
      return;
    }

    let uploadBlob: Blob = capturedBlob;
    try {
      if (activeFilterCss !== "none") {
        uploadBlob = await bakeBlobWithFilter(capturedBlob, activeFilterCss);
      }
    } catch (e) {
      console.error("filter bake error:", e);
      setUploading(false);
      return;
    }

    const filePath = `${user.id}-${Date.now()}.jpg`;
    const file = new File([uploadBlob], "story.jpg", { type: "image/jpeg" });

    const { error: uploadError } = await supabase.storage.from("stories").upload(filePath, file);

    if (uploadError) {
      console.log(uploadError);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("stories").getPublicUrl(filePath);
    const imageUrl = data.publicUrl;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const basePayload = {
      user_id: user.id,
      image_url: imageUrl,
      created_at: now.toISOString(),
      expires_at: mode === "shares" ? null : expiresAt.toISOString(),
    };
    let insertError: unknown = null;
    const firstAttempt = await supabase.from("stories").insert(
      mode === "shares"
        ? {
            ...basePayload,
            media_url: imageUrl,
            is_share: true,
            share_visible: true,
            share_hidden: false,
          }
        : { ...basePayload, media_url: imageUrl, is_share: false }
    );
    insertError = firstAttempt.error;

    if (insertError && String((insertError as { message?: string }).message ?? "").includes("media_url")) {
      const secondAttempt = await supabase.from("stories").insert(
        mode === "shares"
          ? {
              ...basePayload,
              is_share: true,
              share_visible: true,
              share_hidden: false,
            }
          : { ...basePayload, is_share: false }
      );
      insertError = secondAttempt.error;
    }

    if (insertError) {
      console.error("story insert error:", insertError);
      setUploading(false);
      return;
    }

    window.dispatchEvent(new Event("story-posted"));

    setUploading(false);
    close();
  }

  if (!open) return null;

  const showLiveCamera = !cropEditUrl && !capturedUrl && !cameraUnavailable && streamReady;
  const modeLabel = mode === "shares" ? "Share" : "Moment";

  return (
    <div data-ah-suppress-window-pull-refresh="" className="fixed inset-0 z-[10140] bg-black text-white">
      {cropEditUrl ? (
        <div className="absolute inset-0 z-[10150] flex flex-col bg-black">
          <div className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
            <button
              type="button"
              onClick={cancelCropStage}
              className="ah-glass-control ah-glass-control-interactive grid h-11 w-11 place-items-center rounded-full text-white transition active:scale-[0.97]"
              aria-label="Back"
            >
              <X size={22} strokeWidth={2.25} aria-hidden />
            </button>
            <p className="text-center text-[12px] font-medium text-white/55">
              Pinch to zoom · drag to position
            </p>
            <div className="w-11" aria-hidden />
          </div>
          <p className="mt-1 px-4 text-center text-[13px] text-white/45">
            {mode === "shares" ? "4:5 feed crop" : "9:16 story crop"}
          </p>
          <div className="relative mt-2 min-h-0 flex-1 overflow-hidden">
            <Cropper
              image={cropEditUrl}
              crop={crop}
              zoom={cropZoom}
              aspect={cropAspect}
              onCropChange={setCrop}
              onZoomChange={setCropZoom}
              onCropComplete={onCropComplete}
              showGrid={false}
              objectFit="contain"
            />
          </div>
          <div className="shrink-0 space-y-3 px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-white/[0.1] bg-black/50 px-3 py-2 backdrop-blur-md">
              <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-white/45">
                <span>Zoom</span>
                <span className="tabular-nums text-white/65">{cropZoom.toFixed(2)}×</span>
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={cropZoom}
                onChange={(e) => setCropZoom(Number(e.target.value))}
                className="w-full accent-accent-violet"
              />
            </div>
            <button
              type="button"
              onClick={() => void confirmCropStage()}
              disabled={!croppedAreaPixels}
              className="mx-auto flex w-full max-w-md items-center justify-center rounded-full bg-white py-3.5 text-[15px] font-semibold text-black shadow-glow-violet transition enabled:active:scale-[0.99] disabled:opacity-45"
            >
              Use photo
            </button>
          </div>
        </div>
      ) : null}

      {/* Full-bleed camera / preview */}
      <div className="absolute inset-0">
        {capturedUrl ? (
          <div className="flex h-full w-full items-center justify-center bg-black px-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedUrl}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
              style={{
                filter: activeFilterCss,
              }}
            />
          </div>
        ) : cameraUnavailable ? (
          <div className="flex h-full w-full items-center justify-center bg-black px-5">
            <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-secondary/95 p-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md">
              <p className="text-[15px] font-semibold leading-snug text-white">Camera unavailable</p>
              <p className="mt-1.5 text-[13px] leading-snug text-white/50">
                On HTTP or blocked permissions, open your library instead.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 w-full rounded-full bg-white py-3 text-[14px] font-semibold text-black"
              >
                Choose from library
              </button>
            </div>
          </div>
        ) : streamReady ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full bg-black object-contain"
            style={{
              filter: activeFilterCss,
            }}
          />
        ) : (
          <div className="h-full w-full bg-black" aria-hidden />
        )}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/75 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(55%,22rem)] bg-gradient-to-t from-black via-black/55 to-transparent"
          aria-hidden
        />
      </div>

      {!cropEditUrl ? (
        <>
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
            <button
              type="button"
              onClick={close}
              className="ah-glass-control ah-glass-control-interactive grid h-11 w-11 place-items-center rounded-full text-white transition active:scale-[0.97]"
              aria-label="Close"
            >
              <X size={22} strokeWidth={2.25} aria-hidden />
            </button>
            <div className="pointer-events-none flex flex-col items-center gap-0.5">
              <span className="ah-glass-control rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
                <span>New {modeLabel}</span>
              </span>
              <span className="text-[11px] font-medium text-white/70">Intencity</span>
            </div>
            <button
              type="button"
              onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
              disabled={!canFlip || starting || !!capturedBlob || cameraUnavailable}
              className="ah-glass-control ah-glass-control-interactive grid h-11 w-11 place-items-center rounded-full text-white transition enabled:active:scale-[0.97] disabled:opacity-35"
              aria-label="Flip camera"
            >
              <RotateCcw size={20} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-1 sm:pb-[calc(18px+env(safe-area-inset-bottom,0px))]">
            {showLiveCamera || capturedUrl ? (
              <div
                className={`scrollbar-none touch-pan-x mx-auto w-full max-w-lg overflow-x-auto px-[max(1rem,calc(env(safe-area-inset-left,0px)+12px))] pr-[max(1rem,calc(env(safe-area-inset-right,0px)+12px))] sm:px-5 ${
                  capturedUrl ? "mb-4 sm:mb-6" : "mb-2 sm:mb-3"
                }`}
              >
                <div className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-2xl border border-white/[0.1] bg-black/45 px-2 py-2 backdrop-blur-md sm:gap-2.5 sm:px-2.5 sm:py-2.5">
                  {LOOK_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilterId(f.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                        filterId === f.id
                          ? "bg-accent-violet/45 text-white ring-1 ring-accent-violet-active/50 shadow-[0_0_16px_rgba(59,102,255,0.35)]"
                          : "bg-white/[0.06] text-white/72 ring-1 ring-transparent hover:bg-white/[0.1]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {capturedUrl ? (
              <div className="mx-auto flex w-full max-w-lg items-stretch gap-3 px-[max(1rem,calc(env(safe-area-inset-left,0px)+12px))] pr-[max(1rem,calc(env(safe-area-inset-right,0px)+12px))] sm:gap-4 sm:px-5">
                <button
                  type="button"
                  onClick={retake}
                  className="ah-glass-control ah-glass-control-interactive flex-1 rounded-full py-3.5 text-[14px] font-semibold text-white transition active:scale-[0.99]"
                >
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={postStory}
                  disabled={uploading}
                  className="flex-[1.15] rounded-full bg-white py-3.5 text-[14px] font-semibold text-black shadow-glow-violet transition enabled:active:scale-[0.99] disabled:opacity-55"
                >
                  {uploading ? "Posting…" : mode === "shares" ? "Share" : "Your story"}
                </button>
              </div>
            ) : (
              <div className="relative mx-auto flex min-h-[5.75rem] w-full max-w-lg items-center justify-center px-[max(1rem,calc(env(safe-area-inset-left,0px)+12px))] pr-[max(1rem,calc(env(safe-area-inset-right,0px)+12px))] pb-0.5 sm:min-h-[6rem] sm:px-5">
                {showLiveCamera ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute left-[max(0.75rem,calc(env(safe-area-inset-left,0px)+8px))] top-1/2 grid h-[3.25rem] w-[3.25rem] -translate-y-1/2 place-items-center rounded-2xl border-2 border-white/35 bg-black/50 text-white/95 shadow-lg backdrop-blur-md transition active:scale-[0.97] sm:left-5 sm:h-14 sm:w-14"
                    aria-label="Open photo library"
                  >
                    <ImagePlus size={22} strokeWidth={2.1} aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={capture}
                  disabled={starting || cameraUnavailable}
                  className="relative grid h-[4.75rem] w-[4.75rem] place-items-center rounded-full border-[4px] border-white bg-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.12)] disabled:opacity-45"
                  aria-label="Capture photo"
                >
                  <span className="h-[3.35rem] w-[3.35rem] rounded-full bg-white shadow-inner" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onSelectUploadFile(e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </>
      ) : null}

      {uploading ? (
        <div className="pointer-events-none absolute inset-0 z-[10155] flex items-center justify-center bg-black/40">
          <div className="ah-glass-control rounded-full px-5 py-3 text-[13px] font-medium text-white/90">
            <span>Posting…</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
