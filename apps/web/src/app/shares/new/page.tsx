"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cropImageFromArea } from "@/lib/cropImageFromArea";
import ProtectedRoute from "@/components/ProtectedRoute";
import { navigateBack, SubpageBackButton } from "@/components/AppSubpageHeader";
import {
  APP_CONTENT_MAX_CLASS,
  APP_PAGE_TAIL_PADDING_CLASS,
  APP_PAGE_TOP_PADDING_CLASS,
} from "@/lib/appShellLayout";

export default function NewSharePage() {
  const router = useRouter();
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [starting, setStarting] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pendingName, setPendingName] = useState("share.jpg");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  const resetCrop = useCallback(() => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setPendingName("share.jpg");
  }, [cropSrc]);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [cropSrc, stream]);

  const startCamera = useCallback(async () => {
    if (cropSrc) return;
    setStarting(true);
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setCameraUnavailable(true);
        return;
      }
      stopStream();
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setStream(nextStream);
      setCameraUnavailable(false);
      if (videoEl) {
        videoEl.srcObject = nextStream;
        await videoEl.play();
      }
    } catch {
      setCameraUnavailable(true);
    } finally {
      setStarting(false);
    }
  }, [cropSrc, stopStream, videoEl]);

  useEffect(() => {
    if (!videoEl || cropSrc) return;
    startCamera();
  }, [videoEl, cropSrc, startCamera]);

  const onCropComplete = useCallback((_c: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const startFileFlow = (file: File) => {
    const type = (file.type || "").toLowerCase();
    if (!type.startsWith("image/")) {
      setError("Please choose an image.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("Image is too large. Please choose one under 25MB.");
      return;
    }
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    stopStream();
    setCropSrc(objectUrl);
    setPendingName(file.name || "share.jpg");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const postShare = async () => {
    if (!cropSrc || !croppedAreaPixels || posting) return;
    setPosting(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const croppedBlob = await cropImageFromArea(cropSrc, croppedAreaPixels);
      if (croppedBlob.size > 6 * 1024 * 1024) {
        setError("Processed share is too large. Try a tighter crop.");
        setPosting(false);
        return;
      }
      const file = new File(
        [croppedBlob],
        pendingName.replace(/\.[^.]+$/, ".jpg"),
        { type: "image/jpeg" }
      );

      const filePath = `${user.id}-share-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(filePath, file, { upsert: false });
      if (uploadError) {
        setError("Could not upload share image.");
        setPosting(false);
        return;
      }

      const { data: publicData } = supabase.storage.from("stories").getPublicUrl(filePath);
      const imageUrl = publicData.publicUrl;

      const insertPreferred = await supabase.from("stories").insert({
        user_id: user.id,
        image_url: imageUrl,
        media_url: imageUrl,
        created_at: new Date().toISOString(),
        expires_at: null,
        is_share: true,
        share_visible: true,
        share_hidden: false,
      });

      if (insertPreferred.error) {
        const fallbackInsert = await supabase.from("stories").insert({
          user_id: user.id,
          image_url: imageUrl,
          media_url: imageUrl,
          created_at: new Date().toISOString(),
          expires_at: null,
          is_share: true,
        });
        if (fallbackInsert.error) {
          setError("Could not create share post.");
          setPosting(false);
          return;
        }
      }

      window.dispatchEvent(new Event("story-posted"));
      resetCrop();
      router.push("/profile");
    } catch {
      setError("Could not post share. Try again.");
      setPosting(false);
      return;
    }
    setPosting(false);
  };

  const captureFromCamera = async () => {
    if (!videoEl) return;
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;
    const file = new File([blob], `share-${Date.now()}.jpg`, { type: "image/jpeg" });
    startFileFlow(file);
  };

  return (
    <ProtectedRoute>
      <div
        className={`min-h-[100dvh] px-4 ${APP_PAGE_TAIL_PADDING_CLASS} ${APP_PAGE_TOP_PADDING_CLASS} text-white sm:px-5 ${APP_CONTENT_MAX_CLASS} ${
          !cropSrc ? "bg-black" : "bg-primary"
        }`}
      >
        <div
          className={`mb-4 flex items-center gap-3 border-b pb-3 ${
            !cropSrc ? "border-white/10" : "border-white/[0.08]"
          }`}
        >
          <SubpageBackButton onBack={() => navigateBack(router, "/hub")} />
          <div>
            <h1 className="text-[1.05rem] font-semibold tracking-tight">New share</h1>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">Feed poster</p>
          </div>
        </div>

        {error ? (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {!cropSrc ? (
          <div className="relative -mx-4 min-h-[62dvh] overflow-hidden rounded-[1.35rem] border border-white/[0.1] bg-[#050508] shadow-[0_32px_100px_rgba(0,0,0,0.65)] sm:-mx-5">
            {cameraUnavailable ? (
              <div className="grid h-full min-h-[62dvh] place-items-center px-6 text-center">
                <div>
                  <p className="text-[17px] font-semibold text-white">Camera unavailable</p>
                  <p className="mt-2 text-[14px] text-white/45">Use your library to pick a photo.</p>
                </div>
              </div>
            ) : (
              <video
                ref={setVideoEl}
                playsInline
                muted
                className="h-full min-h-[62dvh] w-full object-cover"
              />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" aria-hidden />
            <button
              type="button"
              onClick={captureFromCamera}
              disabled={starting || cameraUnavailable}
              className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-1/2 grid h-[4.5rem] w-[4.5rem] -translate-x-1/2 place-items-center rounded-full border-[4px] border-white bg-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.1)] disabled:opacity-45"
              aria-label="Capture share"
            >
              <span className="h-[3.1rem] w-[3.1rem] rounded-full bg-white shadow-inner" />
            </button>
            <label className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-5 grid h-[3.25rem] w-[3.25rem] cursor-pointer place-items-center rounded-2xl border-2 border-white/35 bg-black/50 text-white/95 shadow-lg backdrop-blur-md">
              <ImagePlus size={22} strokeWidth={2.1} aria-hidden />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) startFileFlow(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        ) : (
          <>
            <p className="mb-2 text-center text-[13px] text-white/50">
              Pinch and align — <span className="font-semibold text-white/85">4:5</span> feed crop
            </p>
            <div className="relative h-[52vh] overflow-hidden rounded-[1.25rem] border border-white/[0.1] bg-[#08090f] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={4 / 5}
                cropShape="rect"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="mt-3">
              <label className="mb-2 block text-center text-xs text-white/70">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-accent-violet"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetCrop}
                className="ah-glass-control ah-glass-control-interactive h-12 rounded-full text-[14px] font-semibold text-white/90"
              >
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={postShare}
                disabled={posting}
                className="h-12 rounded-full bg-white text-[14px] font-semibold text-black shadow-glow-violet disabled:opacity-55"
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
