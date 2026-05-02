"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ProtectedRoute from "@/components/ProtectedRoute";

/** Export full crop rectangle (e.g. 4:5 poster), max edge 1600px. */
async function cropImageFromArea(imageSrc: string, cropArea: Area) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not load selected image"));
  });

  const maxDim = 1600;
  let outW = cropArea.width;
  let outH = cropArea.height;
  const scale = Math.min(maxDim / outW, maxDim / outH, 1);
  outW = Math.max(1, Math.round(outW * scale));
  outH = Math.max(1, Math.round(outH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize image crop");

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outW,
    outH
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9)
  );
  if (!blob) throw new Error("Could not crop image");
  return blob;
}

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
          <h1 className="text-[1.1rem] font-semibold tracking-tight">New share</h1>
        </div>

        {error ? (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {!cropSrc ? (
          <div className="relative min-h-[56vh] overflow-hidden rounded-2xl border border-white/10 bg-[#08090f]">
            {cameraUnavailable ? (
              <div className="grid h-full min-h-[56vh] place-items-center px-6 text-center">
                <div>
                  <p className="text-base font-semibold text-white">Camera unavailable</p>
                  <p className="mt-1 text-sm text-white/50">Upload from device to create a share.</p>
                </div>
              </div>
            ) : (
              <video
                ref={setVideoEl}
                playsInline
                muted
                className="h-full min-h-[56vh] w-full object-cover"
              />
            )}
            <button
              type="button"
              onClick={captureFromCamera}
              disabled={starting || cameraUnavailable}
              className="absolute bottom-6 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-white bg-white/10 disabled:opacity-60"
              aria-label="Capture share"
            />
            <label className="absolute bottom-8 right-5 grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/55 text-white/90">
              <ImagePlus size={18} strokeWidth={2.2} />
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
            <p className="mb-2 text-center text-[13px] text-white/55">
              Crop your poster —{" "}
              <span className="font-semibold text-white/85">4:5 portrait</span> (feed preview)
            </p>
            <div className="relative h-[52vh] overflow-hidden rounded-2xl border border-white/10 bg-[#08090f]">
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

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={resetCrop}
                className="h-11 rounded-[10px] border border-white/[0.12] bg-white/[0.05] text-sm font-semibold text-white/90"
              >
                Choose another
              </button>
              <button
                type="button"
                onClick={postShare}
                disabled={posting}
                className="h-11 rounded-[10px] bg-white text-sm font-semibold text-black disabled:opacity-60"
              >
                {posting ? "Posting..." : "Post share"}
              </button>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
