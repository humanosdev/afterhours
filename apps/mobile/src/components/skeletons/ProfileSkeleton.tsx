import { StyleSheet, View } from "react-native";
import { Skeleton, SkeletonCircle, SkeletonGrid, SkeletonLine } from "../ui/Skeleton";
import { profileLayout } from "../../theme/profileLayout";
import { profileGridCellSize } from "../../theme/mediaLayout";

/** StoryRing `xl` outer diameter — wider than `avatarColWidth` (84). */
const PROFILE_RING_OUTER = 90;

/** Identity block — avatar, stats, bio lines. */
export function ProfileHeaderSkeleton() {
  return (
    <View style={styles.header}>
      <View style={styles.gridRow}>
        <View style={styles.avatarCol}>
          <SkeletonCircle size={PROFILE_RING_OUTER} />
        </View>
        <View style={styles.statsCol}>
          <View style={styles.statsRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.stat}>
                <SkeletonLine width={24} height={18} />
                <SkeletonLine width={40} height={10} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
          <Skeleton style={styles.pill} borderRadius={999} />
        </View>
      </View>
      <SkeletonLine width={profileLayout.avatarColWidth} height={14} style={{ marginTop: 10 }} />
      <SkeletonLine width="90%" height={14} style={{ marginTop: 16 }} />
    </View>
  );
}

/** Matches `ProfileTabGrid` / `squareGridCellStyle` 3-column shares grid. */
export function ProfileSharesGridSkeleton() {
  return <SkeletonGrid columns={3} count={9} gap={2} />;
}

/** Full profile route shell — header, actions, tabs, grid (blocks layout jump). */
export function ProfilePageSkeleton({
  tabCount = 3,
  minHeight,
}: {
  tabCount?: number;
  minHeight?: number;
}) {
  const baseGridRows = 3;
  const cell = profileGridCellSize();
  const baseMin = profilePageMinHeight(tabCount, baseGridRows);
  const extraH = minHeight ? Math.max(0, minHeight - baseMin) : 0;
  const rowStride = cell + 2;
  const extraGridRows = extraH > 0 ? Math.ceil(extraH / rowStride) : 0;
  const gridRows = baseGridRows + extraGridRows;
  const gridCount = gridRows * 3;

  return (
    <View style={styles.page}>
      <ProfileHeaderSkeleton />
      <View style={styles.actionRow}>
        <Skeleton style={styles.actionBtn} borderRadius={profileLayout.actionRadius} />
        <Skeleton style={styles.actionBtn} borderRadius={profileLayout.actionRadius} />
      </View>
      <View style={styles.tabRow}>
        {Array.from({ length: tabCount }).map((_, i) => (
          <Skeleton key={i} style={styles.tabPill} borderRadius={6} />
        ))}
      </View>
      <View style={styles.sharesHead}>
        <SkeletonLine width={56} height={15} />
        <Skeleton style={styles.newBtnSk} borderRadius={999} />
      </View>
      <SkeletonGrid columns={3} count={gridCount} gap={2} />
    </View>
  );
}

/** Reserved height for profile tab `StableSlot` — mirrors `ProfilePageSkeleton`. */
export function profilePageMinHeight(tabCount = 3, gridRows = 3): number {
  const cell = profileGridCellSize();
  const gridHeight = gridRows * cell + (gridRows - 1) * 2;
  return (
    profileLayout.identityTop +
    PROFILE_RING_OUTER +
    16 +
    14 +
    profileLayout.actionsTop +
    profileLayout.actionHeight +
    profileLayout.tabsTop +
    18 +
    profileLayout.tabContentTop +
    12 +
    32 +
    gridHeight +
    8
  );
}

/** Edit profile form shell. */
export function ProfileEditSkeleton() {
  return (
    <View style={styles.page}>
      <View style={styles.editAvatarRow}>
        <SkeletonCircle size={96} />
        <SkeletonLine width={120} height={14} style={{ marginTop: 12 }} />
      </View>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.fieldBlock}>
          <SkeletonLine width={72} height={12} />
          <Skeleton style={styles.fieldInput} borderRadius={12} />
        </View>
      ))}
      <Skeleton style={styles.saveBtn} borderRadius={profileLayout.actionRadius} />
    </View>
  );
}

/** @deprecated Use ProfileSharesGridSkeleton */
export function ProfileGridSkeleton() {
  return <ProfileSharesGridSkeleton />;
}

const styles = StyleSheet.create({
  header: {
    paddingTop: profileLayout.identityTop,
  },
  gridRow: {
    flexDirection: "row",
    gap: profileLayout.gridGapX,
    alignItems: "flex-start",
  },
  avatarCol: {
    width: profileLayout.avatarColWidth,
    height: PROFILE_RING_OUTER,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  statsCol: {
    flex: 1,
    minHeight: 88,
    justifyContent: "center",
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  pill: {
    height: 28,
    width: "100%",
  },
  page: {
    width: "100%",
  },
  actionRow: {
    flexDirection: "row",
    gap: profileLayout.actionsGap,
    marginTop: profileLayout.actionsTop,
    marginBottom: profileLayout.tabsTop,
  },
  actionBtn: {
    flex: 1,
    height: profileLayout.actionHeight,
  },
  tabRow: {
    flexDirection: "row",
    gap: profileLayout.tabGap,
    marginBottom: profileLayout.tabContentTop,
  },
  tabPill: {
    width: 56,
    height: 18,
  },
  sharesHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  newBtnSk: {
    width: 72,
    height: 32,
  },
  editAvatarRow: {
    alignItems: "center",
    marginBottom: 24,
  },
  fieldBlock: {
    gap: 8,
    marginBottom: 16,
  },
  fieldInput: {
    height: 48,
    width: "100%",
  },
  saveBtn: {
    height: profileLayout.actionHeight,
    width: "100%",
    marginTop: 8,
  },
});
