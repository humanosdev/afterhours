import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ListRowSkeleton } from "../../src/components/skeletons/ListRowSkeleton";
import { AsyncSection } from "../../src/components/ui/AsyncSection";
import { AppSubpageScreen } from "../../src/components/AppSubpageScreen";
import { ProfileAvatar } from "../../src/components/ProfileAvatar";
import { IntencityPanel } from "../../src/components/ui/IntencityPanel";
import { useOwnerOnlyRoute } from "../../src/hooks/useOwnerOnlyRoute";
import { unblockUser } from "../../src/lib/blockActions";
import { fetchBlockLists, type BlockProfile } from "../../src/lib/fetchBlockLists";
import { resolveAvatarUri } from "../../src/lib/avatar";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";
import { chrome } from "../../src/theme/chrome";
import { layout } from "../../src/theme/layout";

function profileTitle(p: BlockProfile) {
  return p.display_name?.trim() || p.username?.trim() || "User";
}

/** PWA `/profile/blocks` — owner-only lists + unblock. */
export default function BlocksScreen() {
  const allowed = useOwnerOnlyRoute("/profile");
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [youBlocked, setYouBlocked] = useState<BlockProfile[]>([]);
  const [blockedYou, setBlockedYou] = useState<BlockProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchBlockLists(user.id);
    setYouBlocked(result.youBlocked);
    setBlockedYou(result.blockedYou);
    setError(result.error);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUnblock = useCallback(
    async (themId: string) => {
      if (!user?.id || busyId) return;
      setBusyId(themId);
      const result = await unblockUser(user.id, themId);
      setBusyId(null);
      if (!result.ok) {
        Alert.alert("Could not unblock", result.message ?? "Try again.");
        return;
      }
      await load();
    },
    [busyId, load, user?.id]
  );

  if (!allowed) {
    return (
      <AppSubpageScreen title="Blocked users" subtitle="People you've blocked and people who've blocked you.">
        <ListRowSkeleton rows={4} />
      </AppSubpageScreen>
    );
  }

  return (
    <AppSubpageScreen
      title="Blocked users"
      subtitle="People you've blocked and people who've blocked you."
    >
      <AsyncSection
        loading={loading}
        skeleton={<ListRowSkeleton rows={6} />}
        style={styles.listSlot}
        contentKey={`${youBlocked.length}-${blockedYou.length}`}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : youBlocked.length === 0 && blockedYou.length === 0 ? (
          <IntencityPanel style={styles.emptyPanel}>
            <Text style={styles.emptyText}>No active blocks in either direction.</Text>
          </IntencityPanel>
        ) : (
          <>
            <BlockSection title="You blocked">
              {youBlocked.length === 0 ? (
                <IntencityPanel style={styles.sectionEmpty}>
                  <Text style={styles.emptyText}>
                    You haven&apos;t blocked anyone. If someone blocked you, they appear below.
                  </Text>
                </IntencityPanel>
              ) : (
                youBlocked.map((p) => (
                  <BlockRow
                    key={p.id}
                    profile={p}
                    showUnblock
                    busy={busyId === p.id}
                    onUnblock={() => void onUnblock(p.id)}
                  />
                ))
              )}
            </BlockSection>

            <BlockSection title="Blocked you">
              {blockedYou.length === 0 ? (
                <IntencityPanel style={styles.sectionEmpty}>
                  <Text style={styles.emptyText}>No one has blocked you from this account.</Text>
                </IntencityPanel>
              ) : (
                <>
                  <Text style={styles.hint}>
                    These accounts have blocked you. You can&apos;t view their profile or message them.
                  </Text>
                  {blockedYou.map((p) => (
                    <BlockRow key={p.id} profile={p} />
                  ))}
                </>
              )}
            </BlockSection>
          </>
        )}
      </AsyncSection>
    </AppSubpageScreen>
  );
}

function BlockSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BlockRow({
  profile,
  showUnblock,
  busy,
  onUnblock,
}: {
  profile: BlockProfile;
  showUnblock?: boolean;
  busy?: boolean;
  onUnblock?: () => void;
}) {
  const title = profileTitle(profile);
  return (
    <View style={styles.row}>
      <ProfileAvatar avatarUrl={resolveAvatarUri(profile.avatar_url)} label={title} size={36} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {profile.username ? (
          <Text style={styles.rowHandle} numberOfLines={1}>
            @{profile.username.replace(/^@/, "")}
          </Text>
        ) : null}
      </View>
      {showUnblock ? (
        <Pressable
          style={[styles.unblockBtn, busy && styles.unblockBtnBusy]}
          onPress={onUnblock}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Unblock ${title}`}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.textWhite85} />
          ) : (
            <Text style={styles.unblockLabel}>Unblock</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listSlot: {
    minHeight: 340,
  },
  errorBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  errorText: {
    fontSize: 14,
    color: "#fca5a5",
  },
  section: {
    marginBottom: 28,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textWhite50,
    paddingHorizontal: 4,
  },
  emptyPanel: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  sectionEmpty: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textWhite45,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite42,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: layout.rowPaddingY,
    paddingHorizontal: 14,
    borderRadius: layout.cardRadius,
    borderWidth: chrome.hairlineWidth,
    borderColor: chrome.pageHeaderBorder,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    marginBottom: 8,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  rowHandle: {
    fontSize: 12,
    color: colors.textWhite45,
    marginTop: 2,
  },
  unblockBtn: {
    minWidth: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  unblockBtnBusy: {
    opacity: 0.7,
  },
  unblockLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textWhite85,
  },
});
