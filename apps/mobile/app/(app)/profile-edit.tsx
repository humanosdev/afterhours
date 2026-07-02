import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppSubpageScreen } from "../../src/components/AppSubpageScreen";
import { AvatarPhotoComposer } from "../../src/components/profile/AvatarPhotoComposer";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProfileAvatar } from "../../src/components/ProfileAvatar";
import { FormField } from "../../src/components/ui/FormField";
import { ModalGestureRoot } from "../../src/components/ModalGestureRoot";
import { useMyAvatar } from "../../src/hooks/useMyAvatar";
import { useMyProfile } from "../../src/hooks/useMyProfile";
import { getCachedMyProfile } from "../../src/lib/myProfileCache";
import { normalizeUsername } from "../../src/lib/normalizeUsername";
import { updateMyProfile } from "../../src/lib/updateMyProfile";
import { uploadProfileAvatar } from "../../src/lib/uploadProfileAvatar";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";
import { useRouter } from "expo-router";

function seedFormFields(userId: string | undefined) {
  const cached = userId ? getCachedMyProfile(userId) : null;
  return {
    username: cached?.username ?? "",
    displayName: cached?.display_name ?? "",
    bio: cached?.bio ?? "",
  };
}

/** PWA `/profile/edit` — form + in-app avatar picker with circular crop. */
export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, refresh } = useMyProfile(user?.id);
  const { avatarUrl, label } = useMyAvatar();
  const seed = seedFormFields(user?.id);

  const [username, setUsername] = useState(seed.username);
  const [displayName, setDisplayName] = useState(seed.displayName);
  const [bio, setBio] = useState(seed.bio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarComposerOpen, setAvatarComposerOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? "");
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  async function onAvatarCropDone(croppedUri: string) {
    setAvatarComposerOpen(false);
    setUploadingAvatar(true);
    setError(null);
    const result = await uploadProfileAvatar(croppedUri);
    setUploadingAvatar(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await refresh();
  }

  async function onSave() {
    if (!user?.id) return;
    const normalized = normalizeUsername(username);
    if (normalized.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: saveError } = await updateMyProfile(user.id, {
      username: normalized,
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    await refresh();
    router.back();
  }

  const avatarBusy = uploadingAvatar;

  return (
    <>
      <AppSubpageScreen title="Edit profile" subtitle="Photo, name, and bio">
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.avatarSection}>
          <Pressable
            onPress={() => setAvatarComposerOpen(true)}
            disabled={avatarBusy}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            <ProfileAvatar avatarUrl={avatarUrl} label={label} size={80} bordered />
            {avatarBusy ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </Pressable>
          <Text style={styles.avatarHint}>Tap to change profile picture</Text>
        </View>

        <FormField
          label="Username"
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          maxLength={20}
          autoCapitalize="none"
          hint="Letters, numbers, underscores only · max 20"
        />

        <FormField
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          maxLength={40}
        />

        <FormField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Short bio (optional)"
          maxLength={160}
          multiline
          rows={4}
          hint={`${bio.length}/160`}
        />

        <PrimaryButton
          label={saving ? "Saving…" : "Save changes"}
          onPress={() => void onSave()}
          loading={saving}
          variant="auth"
        />
      </AppSubpageScreen>

      <ModalGestureRoot
        visible={avatarComposerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAvatarComposerOpen(false)}
      >
        <AvatarPhotoComposer
          onClose={() => setAvatarComposerOpen(false)}
          onDone={(uri) => void onAvatarCropDone(uri)}
        />
      </ModalGestureRoot>
    </>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  errorText: {
    fontSize: 14,
    color: "#fca5a5",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textWhite42,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
});
