"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        Loading…
      </div>
    );
  }
const uploadAvatar = async (file: File) => {
  if (!userId) return;
  setError(null);

  if (!file.type.startsWith("image/")) {
    setError("Please choose an image file.");
    return;
  }

  setUploadingAvatar(true);

  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    setError("Could not upload profile picture.");
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
  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Back */}
      <button
        onClick={goBackSafe}
        className="mb-6 text-sm text-white/60"
      >
        ←
      </button>

      <h1 className="text-2xl font-semibold mb-6">Edit profile</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
<div className="flex flex-col items-center mb-6">
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
          uploadAvatar(e.target.files[0]);
        }
        e.currentTarget.value = "";
      }}
    />
  </label>

  <p className="text-xs text-white/40 mt-2">
    {uploadingAvatar ? "Uploading profile picture..." : "Tap to change profile picture"}
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