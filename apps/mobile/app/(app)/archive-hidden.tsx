import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ProfileSharesGridSkeleton } from "../../src/components/skeletons/ProfileSkeleton";
import { ProfileMediaGridCell } from "../../src/components/profile/ProfileMediaGridCell";
import { StableSlot } from "../../src/components/ui/StableSlot";
import { squareGridCellStyle } from "../../src/theme/mediaLayout";
import { useRouter } from "expo-router";
import { AppSubpageScreen } from "../../src/components/AppSubpageScreen";
import { fetchHiddenShares, type HiddenShareRow } from "../../src/lib/fetchHiddenShares";
import { deleteHubShare, toggleHubShareHidden } from "../../src/lib/hubShareMutations";
import { useAuth } from "../../src/providers/AuthProvider";
import { useCreateComposer } from "../../src/providers/CreateComposerProvider";
import { colors } from "../../src/theme/colors";

function formatStamp(iso: string) {
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** PWA `/archive/hidden` — hidden shares grid with restore + delete. */
export default function ArchiveHiddenScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { storyEpoch, bumpStoryEpoch } = useCreateComposer();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HiddenShareRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchHiddenShares(user.id);
    setRows(result.rows);
    setError(result.error);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load, storyEpoch]);

  async function onUnhide(row: HiddenShareRow) {
    if (!user?.id) return;
    setBusyId(row.id);
    const { ok, error: err } = await toggleHubShareHidden(row.id, user.id, false);
    setBusyId(null);
    if (!ok) {
      Alert.alert("Couldn't restore", err ?? "Try again.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    bumpStoryEpoch();
  }

  function onDelete(row: HiddenShareRow) {
    if (!user?.id) return;
    Alert.alert("Delete hidden share?", "This permanently removes the share.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusyId(row.id);
            const { ok, error: err } = await deleteHubShare(row.id, user.id);
            setBusyId(null);
            if (!ok) {
              Alert.alert("Couldn't delete", err ?? "Try again.");
              return;
            }
            setRows((prev) => prev.filter((r) => r.id !== row.id));
            bumpStoryEpoch();
          })();
        },
      },
    ]);
  }

  return (
    <AppSubpageScreen title="Hidden shares" subtitle="Shares hidden from your profile grid." tabBarInset>
      {error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <StableSlot
          loading={loading}
          variant="section"
          skeleton={<ProfileSharesGridSkeleton />}
          contentKey={rows.map((r) => r.id).join(",")}
          style={styles.gridSlot}
        >
          {rows.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.empty}>No hidden shares yet.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {rows.map((row) => (
                <View key={row.id} style={styles.cell}>
                  <ProfileMediaGridCell
                    imageUrl={row.image_url}
                    onPress={() =>
                      router.push({ pathname: "/moments/[id]", params: { id: row.id, view: "archive" } })
                    }
                    debugLabel={`hidden-${row.id}`}
                  />
                  <View style={styles.cellScrim} pointerEvents="none">
                    <Text style={styles.cellStamp}>{formatStamp(row.created_at)}</Text>
                  </View>
                  <Pressable
                    onPress={() => void onUnhide(row)}
                    disabled={busyId === row.id}
                    accessibilityRole="button"
                    accessibilityLabel="Restore share"
                    style={styles.restoreBtn}
                  >
                    <Text style={styles.restoreLabel}>{busyId === row.id ? "…" : "Restore"}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(row)}
                    accessibilityRole="button"
                    accessibilityLabel="Delete hidden share"
                    style={styles.deleteChip}
                  >
                    <Text style={styles.deleteChipText}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </StableSlot>
      )}
    </AppSubpageScreen>
  );
}

const styles = StyleSheet.create({
  gridSlot: {
    minHeight: 420,
  },
  center: {
    paddingVertical: 40,
    alignItems: "center",
  },
  empty: {
    fontSize: 14,
    color: colors.textWhite50,
    textAlign: "center",
  },
  err: {
    fontSize: 14,
    color: colors.danger,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  cell: {
    ...squareGridCellStyle(),
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  cellScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  cellStamp: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textWhite85,
  },
  deleteChip: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(18, 24, 36, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deleteChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textWhite85,
    textTransform: "uppercase",
  },
  restoreBtn: {
    position: "absolute",
    left: 4,
    bottom: 4,
    zIndex: 2,
    borderRadius: 999,
    backgroundColor: "rgba(59, 102, 255, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  restoreLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
});
