"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type FacingMode = "user" | "environment";

export default function StoryCameraModal({
  open,
  onClose,
}: {
  open: boolean;
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

  const canFlip = useMemo(() => true, []);

  function stopStream() {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
  }

  async function startCamera(mode: FacingMode) {
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
        video: { facingMode: { ideal: mode } },
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

    // Reset capture state when opening
    setCapturedBlob(null);
    setCapturedUrl(null);
    setCameraUnavailable(false);
    startCamera(facingMode);

    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (capturedBlob) return; // pause camera while previewing
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

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;

    stopStream();

    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    const url = URL.createObjectURL(blob);
    setCapturedBlob(blob);
    setCapturedUrl(url);
  }

  function retake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setCameraUnavailable(false);
    startCamera(facingMode);
  }

  function onSelectUploadFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    stopStream();
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    const url = URL.createObjectURL(file);
    setCapturedBlob(file);
    setCapturedUrl(url);
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

    // stories bucket expects object key only (no nested `stories/` prefix)
    const filePath = `${user.id}-${Date.now()}.jpg`;
    const file = new File([capturedBlob], "story.jpg", { type: "image/jpeg" });

    const { error: uploadError } = await supabase.storage
      .from("stories")
      .upload(filePath, file);

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
      expires_at: expiresAt.toISOString(),
    };
    let insertError: any = null;
    const firstAttempt = await supabase
      .from("stories")
      .insert({ ...basePayload, media_url: imageUrl });
    insertError = firstAttempt.error;

    if (insertError && String(insertError.message ?? "").includes("media_url")) {
      const secondAttempt = await supabase.from("stories").insert(basePayload);
      insertError = secondAttempt.error;
    }

    if (insertError) {
      console.error("story insert error:", insertError);
      setUploading(false);
      return;
    }

    // Let mounted story surfaces refresh without hard reload.
    window.dispatchEvent(new Event("story-posted"));

    setUploading(false);
    close();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        <button
          onClick={close}
          className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white"
        >
          Close
        </button>

        <div className="text-sm font-semibold text-white">New Story</div>

        <button
          onClick={() =>
            setFacingMode((m) => (m === "user" ? "environment" : "user"))
          }
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
            alt="Story preview"
            className="h-full w-full object-cover"
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
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-6 pb-10">
        {capturedUrl ? (
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <button
              onClick={retake}
              className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white"
            >
              Retake
            </button>
            <button
              onClick={postStory}
              disabled={uploading}
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {uploading ? "Posting…" : "Post"}
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md items-center justify-center">
            <button
              onClick={capture}
              disabled={starting || cameraUnavailable}
              className="h-16 w-16 rounded-full border-4 border-white bg-white/10 disabled:opacity-60"
              aria-label="Capture"
            />
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
    </div>
  );
}

