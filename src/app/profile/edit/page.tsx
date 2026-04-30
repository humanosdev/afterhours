"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

const AVATAR_EXTENSION_FALLBACKS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".gif",
  ".bmp",
  ".tiff",
  ".tif",
  ".avif",
];

function fileLooksLikeImage(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  const name = (file.name || "").toLowerCase();
  return AVATAR_EXTENSION_FALLBACKS.some((ext) => name.endsWith(ext));
}

async function canDecodeImage(src: string): Promise<boolean> {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  return await new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
}

async function cropImageToSquare(
  imageSrc: string,
  cropArea: Area,
  outputType = "image/jpeg"
) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not load selected image"));
  });

  const maxOutputSize = 1400;
  const sourceSize = Math.max(1, Math.round(Math.min(cropArea.width, cropArea.height)));
  const targetSize = Math.min(maxOutputSize, sourceSize);
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize image crop");

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    sourceSize,
    sourceSize,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, 0.92)
  );
  if (!blob) throw new Error("Could not crop image");
  return blob;
}

export default function EditProfilePage() {
  const router = useRouter();
  const goBackSafe = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/profile");
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
const [userId, setUserId] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pendingAvatarName, setPendingAvatarName] = useState("avatar.jpg");

  /* ---------- Load profile ---------- */
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.replace("/login");
        return;
      }
      setUserId(auth.user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, display_name, bio, avatar_url")
        .eq("id", auth.user.id)
        .single();
      if (error || !profile) {
        setError("Could not load profile.");
        setLoading(false);
        return;
      }
      setAvatarUrl(profile.avatar_url ?? null);

      setUsername(profile.username || "");
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setLoading(false);
    })();
  }, [router]);

  /* ---------- Save profile ---------- */
  async function saveProfile() {
    setSaving(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      setSaving(false);
      return;
    }

    if (!username.trim()) {
      setError("Username cannot be empty.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", auth.user.id);

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        setError("That username is already taken.");
      } else {
        setError("Failed to save profile.");
      }
      return;
    }

    router.push("/profile");
  }

const uploadAvatar = async (file: File) => {
  if (!userId) return;
  setError(null);

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    setError("Processed image is still too large. Please zoom/crop tighter and try again.");
    return;
  }

  setUploadingAvatar(true);

  const filePath = `${userId}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    const raw = uploadError.message?.toLowerCase?.() ?? "";
    if (raw.includes("size")) {
      setError("Image is too large. Please choose an image under 8MB.");
    } else {
      setError("Could not upload profile picture. Please try another image.");
    }
    setUploadingAvatar(false);
    return;
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const publicUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (updateError) {
    setError("Could not save profile picture.");
    setUploadingAvatar(false);
    return;
  }

  setAvatarUrl(publicUrl);
  setUploadingAvatar(false);
};

const validateAvatarFile = (file: File) => {
  const maxBytes = 25 * 1024 * 1024;
  if (!fileLooksLikeImage(file)) {
    setError("Please choose a photo file (JPG, PNG, HEIC, WEBP, AVIF, etc.) from your camera roll.");
    return false;
  }
  if (file.size > maxBytes) {
    setError("Image is too large. Please choose one under 25MB.");
    return false;
  }
  return true;
};

const resetCropState = useCallback(() => {
  if (cropSrc) URL.revokeObjectURL(cropSrc);
  setCropSrc(null);
  setCrop({ x: 0, y: 0 });
  setZoom(1);
  setCroppedAreaPixels(null);
  setPendingAvatarName("avatar.jpg");
}, [cropSrc]);

const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
  setCroppedAreaPixels(croppedPixels);
}, []);

const startAvatarCrop = async (file: File) => {
  if (!validateAvatarFile(file)) return;
  setError(null);
  const objectUrl = URL.createObjectURL(file);
  const decodes = await canDecodeImage(objectUrl);
  if (!decodes) {
    URL.revokeObjectURL(objectUrl);
    setError(
      "This photo format cannot be decoded on this device/browser yet. Try re-saving it from Photos and upload again."
    );
    return;
  }
  setCropSrc(objectUrl);
  setPendingAvatarName(file.name || "avatar.jpg");
  setCrop({ x: 0, y: 0 });
  setZoom(1);
  setCroppedAreaPixels(null);
};

const confirmAvatarCrop = async () => {
  if (!cropSrc || !croppedAreaPixels) {
    setError("Please adjust crop before saving.");
    return;
  }
  try {
    const croppedBlob = await cropImageToSquare(cropSrc, croppedAreaPixels, "image/jpeg");
    const croppedFile = new File([croppedBlob], pendingAvatarName.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
    resetCropState();
    await uploadAvatar(croppedFile);
  } catch {
    setError("Could not crop profile picture. Please try another image.");
  }
};

useEffect(() => {
  return () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
  };
}, [cropSrc]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black px-4 text-[14px] text-white/50">
        Loading…
      </div>
    );
  }
  return (
    <div className="min-h-[100dvh] bg-black px-4 pb-[calc(env(safe-area-inset-bottom,0px)+92px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] text-white sm:px-5">
      <div className="mb-5 flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          type="button"
          onClick={goBackSafe}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.1] bg-white/[0.04] text-[17px] text-white/80"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-[1.25rem] font-bold tracking-tight">Edit profile</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
{cropSrc && (
  <div className="fixed inset-0 z-[170] bg-black/90">
    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
      <button
        type="button"
        onClick={resetCropState}
        className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white"
      >
        Cancel
      </button>
      <div className="text-sm font-semibold text-white">Crop profile photo</div>
      <button
        type="button"
        onClick={confirmAvatarCrop}
        className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black"
      >
        Use photo
      </button>
    </div>
    <div className="absolute inset-x-0 bottom-[120px] top-[96px]">
      <Cropper
        image={cropSrc}
        crop={crop}
        zoom={zoom}
        aspect={1}
        cropShape="round"
        showGrid={false}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={onCropComplete}
      />
    </div>
    <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] px-6">
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
  </div>
)}
<div className="mb-6 flex flex-col items-center">
  <label className="cursor-pointer">
    <Avatar
      src={avatarUrl}
      fallbackText={displayName || username}
      size="xl"
      className="border-2 border-purple-500/40"
    />

    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        if (e.target.files?.[0]) {
          void startAvatarCrop(e.target.files[0]);
        }
        e.currentTarget.value = "";
      }}
    />
  </label>

  <p className="text-xs text-white/40 mt-2">
    {uploadingAvatar ? "Uploading profile picture..." : "Tap to change profile picture"}
  </p>
  <p className="text-[11px] text-white/40 mt-1">
    Most camera-roll images supported · we optimize to lightweight JPG automatically
  </p>
</div>
      {/* Username */}
      <div className="mb-5">
        <label className="block text-sm text-white/60 mb-1">
          Username
        </label>

        <input
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "")
            )
          }
          maxLength={20}
          className="w-full rounded-xl bg-black/40 border border-white/10 p-3 outline-none"
        />

        <div className="mt-1 text-xs text-white/40">
          Letters, numbers, underscores only · max 20
        </div>
      </div>

      {/* Display name */}
      <div className="mb-5">
        <label className="block text-sm text-white/60 mb-1">
          Display name
        </label>

        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          className="w-full rounded-xl bg-black/40 border border-white/10 p-3 outline-none"
        />
      </div>

      {/* Bio */}
      <div className="mb-8">
        <label className="block text-sm text-white/60 mb-1">
          Bio
        </label>

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Say something about yourself"
          maxLength={160}
          rows={4}
          className="w-full rounded-xl bg-black/40 border border-white/10 p-3 outline-none resize-none"
        />

        <div className="mt-1 text-xs text-white/40">
          {bio.length}/160
        </div>
      </div>

      {/* Save */}
      <button
        onClick={saveProfile}
        disabled={saving || uploadingAvatar}
        className="w-full rounded-xl bg-white text-black font-semibold py-3 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}