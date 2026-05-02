"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
  const [captureSource, setCaptureSource] = useState<"camera" | "file">("camera");
  const [uploading, setUploading] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [filterId, setFilterId] = useState("none");

  const activeFilterCss = useMemo(() => filterCss(filterId), [filterId]);

  const canFlip = useMemo(() => true, []);

  function stopStream() {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
  }

  async function startCamera(nextMode: FacingMode) {
    if (!open) return;
    setStarting(true);
    stopStream();

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setCameraUnavailable(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextMode } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraUnavailable(false);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("camera start error:", err);
      setCameraUnavailable(true);
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    setCapturedBlob(null);
    setCapturedUrl(null);
    setCameraUnavailable(false);
    setZoom(1);
    setFilterId("none");
    setCaptureSource("camera");
    startCamera(facingMode);

    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (capturedBlob) return;
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
    onClose();
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const z = Math.min(2.5, Math.max(1, zoom));
    const cropW = w / z;
    const cropH = h / z;
    const sx = (w - cropW) / 2;
    const sy = (h - cropH) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const css = activeFilterCss;
    ctx.filter = css === "none" ? "none" : css;
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;

    stopStream();

    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    const url = URL.createObjectURL(blob);
    setCapturedBlob(blob);
    setCapturedUrl(url);
    setCaptureSource("camera");
  }

  function retake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setCameraUnavailable(false);
    setCaptureSource("camera");
    startCamera(facingMode);
  }

  function onSelectUploadFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    stopStream();
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    const url = URL.createObjectURL(file);
    setCapturedBlob(file);
    setCapturedUrl(url);
    setCaptureSource("file");
    setCameraUnavailable(false);
    setZoom(1);
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
      if (captureSource === "file" && activeFilterCss !== "none") {
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
    let insertError: any = null;
    const firstAttempt = await supabase.from("stories").insert(
      mode === "shares"
        ? {
            ...basePayload,
            media_url: imageUrl,
            is_share: true,
            share_visible: true,
            share_hidden: false,
          }
        : { ...basePayload, media_url: imageUrl }
    );
    insertError = firstAttempt.error;

    if (insertError && String(insertError.message ?? "").includes("media_url")) {
      const secondAttempt = await supabase.from("stories").insert(
        mode === "shares"
          ? {
              ...basePayload,
              is_share: true,
              share_visible: true,
              share_hidden: false,
            }
          : basePayload
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

  const showLiveCamera = !capturedUrl && !cameraUnavailable;

  return (
    <div className="fixed inset-0 z-[140] bg-black">
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <button
          type="button"
          onClick={close}
          className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white"
        >
          Close
        </button>

        <div className="text-sm font-semibold text-white">
          {mode === "shares" ? "New Share" : "New Moment"}
        </div>

        <button
          type="button"
          onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
          disabled={!canFlip || starting || !!capturedBlob || cameraUnavailable}
          className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Flip
        </button>
      </div>

      {/* Camera / Preview */}
      <div className="absolute inset-0">
        {capturedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedUrl}
            alt="Moment preview"
            className="h-full w-full object-cover"
            style={{
              filter: captureSource === "file" ? activeFilterCss : "none",
            }}
          />
        ) : cameraUnavailable ? (
          <div className="flex h-full w-full items-center justify-center bg-black px-6">
            <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-sm font-semibold text-white">Camera not available on this connection</div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black"
              >
                Upload from device
              </button>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover transition-transform duration-150 ease-out"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                filter: activeFilterCss,
              }}
            />
          </div>
        )}
      </div>

      {/* Filter strip — live camera or library preview */}
      {(showLiveCamera || capturedUrl) && (
        <div className="scrollbar-none absolute inset-x-0 bottom-[11.5rem] z-20 flex gap-2 overflow-x-auto px-3 pb-1 pt-2 sm:bottom-[12rem]">
          {LOOK_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterId(f.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                filterId === f.id
                  ? "border-accent-violet/70 bg-accent-violet/35 text-white shadow-[0_0_14px_rgba(122,60,255,0.35)]"
                  : "border-white/15 bg-black/45 text-white/75 backdrop-blur-sm"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Zoom — live view only */}
      {showLiveCamera && (
        <div className="absolute inset-x-0 bottom-[8.25rem] z-20 px-5 sm:bottom-[8.75rem]">
          <label className="mb-1 flex items-center justify-between text-[11px] font-medium text-white/55">
            <span>Zoom</span>
            <span className="tabular-nums text-white/70">{zoom.toFixed(2)}×</span>
          </label>
          <input
            type="range"
            min={1}
            max={2.5}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-accent-violet"
          />
        </div>
      )}

      {/* Gallery FAB — same affordance as share composer */}
      {showLiveCamera && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] right-5 z-30 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/55 text-white/90 shadow-lg backdrop-blur-sm transition hover:bg-black/70"
          aria-label="Add photo from library"
        >
          <ImagePlus size={18} strokeWidth={2.2} aria-hidden />
        </button>
      )}

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-6 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))]">
        {capturedUrl ? (
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <button
              type="button"
              onClick={retake}
              className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={postStory}
              disabled={uploading}
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {uploading ? "Posting…" : mode === "shares" ? "Post Share" : "Post Moment"}
            </button>
          </div>
        ) : (
          <div className="relative mx-auto flex h-[4.5rem] max-w-md items-center justify-center">
            <button
              type="button"
              onClick={capture}
              disabled={starting || cameraUnavailable}
              className="h-16 w-16 rounded-full border-4 border-white bg-white/10 disabled:opacity-60"
              aria-label="Capture"
            />
          </div>
        )}
        {/* Hidden file input when camera shown — duplicated ref only when preview? Use single ref - gallery label above owns input when live; fallback for camera unavailable */}
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
    </div>
  );
}
