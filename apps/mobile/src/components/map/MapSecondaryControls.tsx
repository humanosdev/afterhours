import { useCallback, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronDown, LocateFixed } from "lucide-react-native";
import { AvatarOnlineBadge } from "../AvatarOnlineBadge";
import { ProfileAvatar } from "../ProfileAvatar";
import { MapGlassPill, MapGlassPillLabel } from "./MapGlassPill";
import { useAuth } from "../../providers/AuthProvider";
import { useMyProfile } from "../../hooks/useMyProfile";
import { toggleGhostMode } from "../../lib/toggleGhostMode";
import { colors } from "../../theme/colors";
import type { VenuePublic } from "../../types/venue";

type FriendRow = {
  id: string;
  label: string;
  avatar_url: string | null;
  subtitle: string;
  /** False when friend has no real GPS (skip map focus). */
  canFocus?: boolean;
  isOnline?: boolean;
};

type MapSecondaryControlsProps = {
  width: number;
  friends: FriendRow[];
  onLocate?: () => void;
  onFocusFriend?: (friendId: string) => void;
  /** Any map chrome tap — resets auto-tour idle clock. */
  onMapInteraction?: () => void;
  /** After ghost_mode write — refresh map presence markers. */
  onGhostChanged?: () => void;
  /** P2O-D — immediate ghost-safe presence upsert. */
  ghostCoords?: { lat: number; lng: number } | null;
  ghostVenues?: VenuePublic[];
};

const FRIENDS_PANEL_MAX_H = Math.min(Dimensions.get("window").height * 0.42, 280);

/**
 * PWA map overlay — `inline-flex` Locate | Friends row, compact friends panel, Ghost below.
 * Presence subtitles + ghost write: P2O-C/D — see docs/SYSTEM_TRUTH_AUDIT.md Ch. 10.
 */
export function MapSecondaryControls({
  width,
  friends,
  onLocate,
  onFocusFriend,
  onMapInteraction,
  onGhostChanged,
  ghostCoords,
  ghostVenues,
}: MapSecondaryControlsProps) {
  const { user } = useAuth();
  const { profile, refresh } = useMyProfile(user?.id);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [ghostSaving, setGhostSaving] = useState(false);

  const ghostOn = !!profile?.ghost_mode;

  const onGhostToggle = useCallback(() => {
    if (!user?.id || ghostSaving) return;
    onMapInteraction?.();
    const next = !ghostOn;
    setGhostSaving(true);
    void toggleGhostMode(user.id, next, profile, {
      coords: ghostCoords ?? null,
      venues: ghostVenues,
    }).then(({ ok }) => {
      setGhostSaving(false);
      if (ok) {
        void refresh();
        onGhostChanged?.();
      }
    });
  }, [ghostCoords, ghostOn, ghostSaving, ghostVenues, onGhostChanged, onMapInteraction, profile, refresh, user?.id]);

  return (
    <View style={[styles.host, { width }]}>
      <View style={styles.locateFriendsRow}>
        <MapGlassPill
          onPress={() => {
            onMapInteraction?.();
            onLocate?.();
          }}
          accessibilityLabel="Locate map preview"
        >
          <LocateFixed size={13} color={colors.textWhite85} strokeWidth={2.2} />
          <MapGlassPillLabel>Locate</MapGlassPillLabel>
        </MapGlassPill>
        <MapGlassPill
          onPress={() => setFriendsOpen((o) => !o)}
          active={friendsOpen}
          accessibilityLabel={friendsOpen ? "Hide friends list" : "Show friends list"}
        >
          <MapGlassPillLabel>Friends</MapGlassPillLabel>
          <ChevronDown
            size={14}
            color={friendsOpen ? colors.textPrimary : colors.textWhite85}
            strokeWidth={2}
            style={{ transform: [{ rotate: friendsOpen ? "180deg" : "0deg" }] }}
          />
        </MapGlassPill>
      </View>

      {friendsOpen ? (
        <View style={[styles.friendsPanel, { maxHeight: FRIENDS_PANEL_MAX_H }]}>
          <ScrollView style={styles.friendsScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {friends.length === 0 ? (
              <Text style={styles.friendsEmpty}>No crowd yet</Text>
            ) : (
              friends.map((f) => {
                const canFocus = f.canFocus !== false;
                return (
                <Pressable
                  key={f.id}
                  style={[styles.friendRow, !canFocus && styles.friendRowDisabled]}
                  onPress={() => {
                    if (!canFocus) return;
                    onMapInteraction?.();
                    onFocusFriend?.(f.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    canFocus ? `Focus ${f.label} on map` : `${f.label} — no location on map`
                  }
                >
                  <View style={styles.friendAvatarWrap}>
                    <ProfileAvatar avatarUrl={f.avatar_url} label={f.label} size={36} bordered={false} />
                    {f.isOnline ? <AvatarOnlineBadge size={11} borderColor="rgba(18, 24, 36, 0.93)" /> : null}
                  </View>
                  <View style={styles.friendCopy}>
                    <Text style={styles.friendName} numberOfLines={1}>
                      {f.label}
                    </Text>
                    <Text style={styles.friendSub} numberOfLines={2}>
                      {f.subtitle}
                    </Text>
                  </View>
                </Pressable>
              );
              })
            )}
          </ScrollView>
        </View>
      ) : null}

      <MapGlassPill
        active={ghostOn}
        onPress={onGhostToggle}
        style={styles.ghostAlign}
        accessibilityLabel={
          ghostOn
            ? "Ghost mode on. Tap to show your location to friends again."
            : "Ghost mode off. Tap to hide your location from friends."
        }
      >
        <MapGlassPillLabel>{ghostSaving ? "…" : ghostOn ? "Ghost on" : "Ghost off"}</MapGlassPillLabel>
      </MapGlassPill>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    gap: 8,
    alignSelf: "center",
  },
  locateFriendsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  ghostAlign: {
    alignSelf: "flex-end",
  },
  friendsPanel: {
    alignSelf: "flex-end",
    width: 112,
    minHeight: 160,
    maxHeight: FRIENDS_PANEL_MAX_H,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(18, 24, 36, 0.93)",
    padding: 6,
  },
  friendsScroll: {
    flexGrow: 0,
  },
  friendsEmpty: {
    fontSize: 11,
    color: colors.textWhite45,
    textAlign: "center",
    paddingVertical: 12,
  },
  friendAvatarWrap: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginBottom: 6,
  },
  friendRowDisabled: {
    opacity: 0.55,
  },
  friendCopy: {
    flex: 1,
    minWidth: 0,
  },
  friendName: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textWhite85,
  },
  friendSub: {
    fontSize: 8,
    color: colors.textWhite45,
    lineHeight: 11,
  },
});
