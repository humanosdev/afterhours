import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProfileMediaGridCell } from "./ProfileMediaGridCell";
import { ProfileVenuesPanel } from "./ProfileVenuesPanel";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProfileSharesGridSkeleton } from "../skeletons/ProfileSkeleton";
import { StableSlot } from "../ui/StableSlot";
import { mediaLexicon } from "../../content/mediaLexicon";
import { subscribeStoryPosted } from "../../lib/storyPostEvents";
import { fetchMyProfileArchive, type ProfileArchiveRow } from "../../lib/fetchProfileArchive";
import { fetchMyProfileShares, type ProfileShareRow } from "../../lib/fetchProfileShares";
import { setMomentDetailSeedFromProfileShare } from "../../lib/momentDetailSeedCache";
import {
  buildExpiredArchiveViewerGroup,
  expiredArchiveStoryIndex,
} from "../../lib/expiredArchiveViewer";
import { momentDetailRouteParams } from "../../lib/momentDetailNavigation";
import { prefetchStoryMediaUri } from "../../lib/prefetchStoryMedia";
import { useMyProfile } from "../../hooks/useMyProfile";
import { performShareLike } from "../../lib/performShareLike";
import {
  getCachedProfileArchive,
  setCachedProfileArchive,
} from "../../lib/profileArchiveCache";
import {
  getCachedProfileShares,
  setCachedProfileShares,
} from "../../lib/profileSharesCache";
import { useAuth } from "../../providers/AuthProvider";
import { useCreateComposer } from "../../providers/CreateComposerProvider";
import { colors } from "../../theme/colors";
import { profileLayout } from "../../theme/profileLayout";
import { profileGridCellSize } from "../../theme/mediaLayout";

type ProfileTab = "Shares" | "Archive" | "Venues";
type ArchiveSubview = "hidden" | "expired";

type ProfileTabGridProps = {
  tab: ProfileTab;
  onSharesCount?: (count: number) => void;
  onVenuesCount?: (count: number) => void;
  /** Parent page shell is active — skip duplicate grid skeleton. */
  suppressShellSkeleton?: boolean;
};

export function ProfileTabGrid({
  tab,
  onSharesCount,
  onVenuesCount,
  suppressShellSkeleton = false,
}: ProfileTabGridProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useMyProfile(user?.id);
  const { openCreateComposer, openStoryViewer, storyEpoch } = useCreateComposer();
  const initialShares = user?.id ? getCachedProfileShares(user.id) : null;
  const initialArchive = user?.id ? getCachedProfileArchive(user.id) : null;
  const [shares, setShares] = useState<ProfileShareRow[]>(() => initialShares?.rows ?? []);
  const [sharesLoading, setSharesLoading] = useState(
    () => Boolean(user?.id) && initialShares == null
  );
  const [sharesError, setSharesError] = useState<string | null>(null);
  const [archive, setArchive] = useState<ProfileArchiveRow[]>(() => initialArchive ?? []);
  const [archiveLoading, setArchiveLoading] = useState(
    () => Boolean(user?.id) && initialArchive == null
  );
  const [archiveSubview, setArchiveSubview] = useState<ArchiveSubview>("hidden");
  const onSharesCountRef = useRef(onSharesCount);
  onSharesCountRef.current = onSharesCount;

  const loadShares = useCallback((opts?: { quiet?: boolean }) => {
    if (!user?.id) {
      setShares([]);
      setSharesLoading(false);
      setSharesError(null);
      return;
    }
    const quiet = opts?.quiet ?? getCachedProfileShares(user.id) != null;
    if (!quiet) setSharesLoading(true);
    setSharesError(null);
    void fetchMyProfileShares(user.id).then(({ shares: rows, count, error }) => {
      if (error) {
        setSharesError(error);
      } else {
        setCachedProfileShares(user.id, rows, count);
        setShares(rows);
        onSharesCountRef.current?.(count);
      }
      setSharesLoading(false);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const cached = getCachedProfileShares(user.id);
    if (cached) onSharesCountRef.current?.(cached.count);
  }, [user?.id]);

  useEffect(() => {
    loadShares({ quiet: getCachedProfileShares(user?.id ?? "") != null });
  }, [user?.id, storyEpoch, loadShares]);

  useFocusEffect(
    useCallback(() => {
      if (tab === "Shares") {
        loadShares({ quiet: true });
      }
    }, [tab, loadShares])
  );

  useEffect(() => {
    if (tab !== "Shares" || shares.length === 0) return;
    for (const row of shares.slice(0, 16)) {
      if (row.image_url) void prefetchStoryMediaUri(row.image_url);
    }
  }, [tab, shares]);

  useEffect(() => {
    return subscribeStoryPosted(() => {
      loadShares({ quiet: false });
    });
  }, [loadShares]);

  useEffect(() => {
    if (!user?.id) return;
    const cached = getCachedProfileArchive(user.id);
    if (cached) {
      setArchive(cached);
      setArchiveLoading(false);
    } else {
      setArchiveLoading(true);
    }
    let cancelled = false;
    void fetchMyProfileArchive(user.id).then(({ rows, error }) => {
      if (cancelled) return;
      if (!error) {
        setCachedProfileArchive(user.id, rows);
        setArchive(rows);
      }
      setArchiveLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, storyEpoch]);

  const sharesSlotLoading =
    tab === "Shares" && sharesLoading && shares.length === 0 && !suppressShellSkeleton;
  const hiddenShares = useMemo(() => archive.filter((r) => r.is_share), [archive]);
  const expiredMoments = useMemo(() => archive.filter((r) => !r.is_share), [archive]);
  const archiveRows = archiveSubview === "hidden" ? hiddenShares : expiredMoments;

  const archiveSlotLoading = tab === "Archive" && archiveLoading && archive.length === 0 && !suppressShellSkeleton;
  const gridCellSize = profileGridCellSize();

  return (
    <View style={styles.panel}>
      {tab === "Shares" ? (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{mediaLexicon.share.labelPlural}</Text>
            <Pressable
              style={styles.newBtn}
              onPress={() => openCreateComposer({ mode: "shares_only", tab: "shares" })}
              accessibilityRole="button"
              accessibilityLabel={mediaLexicon.share.new}
            >
              <Ionicons name="add" size={16} color="#000" />
              <Text style={styles.newBtnLabel}>New</Text>
            </Pressable>
          </View>
          {sharesError ? <Text style={styles.sharesError}>{sharesError}</Text> : null}
          <StableSlot
            loading={sharesSlotLoading}
            skeleton={<ProfileSharesGridSkeleton />}
            contentKey={shares.length > 0 ? `shares-${shares.length}` : "shares-empty"}
            style={{ minHeight: gridCellSize }}
            variant="section"
          >
            {shares.length > 0 ? (
              <View style={[styles.grid, { minHeight: gridCellSize }]}>
                {shares.map((s) => (
                  <ProfileMediaGridCell
                    key={s.id}
                    storyId={s.id}
                    imageUrl={s.image_url}
                    onPressIn={() => {
                      if (s.image_url) void prefetchStoryMediaUri(s.image_url);
                    }}
                    onPress={() => {
                      if (!user?.id) return;
                      setMomentDetailSeedFromProfileShare(s, {
                        id: user.id,
                        username: profile?.username ?? null,
                        avatar_url: profile?.avatar_url ?? null,
                      });
                      router.push(momentDetailRouteParams(s.id, "profile"));
                    }}
                    onDoublePress={() => {
                      if (!user?.id) return;
                      void performShareLike({
                        storyId: s.id,
                        meId: user.id,
                        ownerUserId: s.user_id,
                        currentlyLiked: false,
                        onOptimistic: () => {},
                      });
                    }}
                    debugLabel={`profile-share-${s.id}`}
                  />
                ))}
              </View>
            ) : (
              <ProfileEmpty
                title={`No ${mediaLexicon.share.labelPlural.toLowerCase()} yet`}
                body={`Tap New to post your first ${mediaLexicon.share.label.toLowerCase()}.`}
              />
            )}
          </StableSlot>
        </>
      ) : null}

      {tab === "Archive" ? (
        <>
          <View style={styles.archiveSubTabs}>
            <Pressable
              onPress={() => setArchiveSubview("hidden")}
              style={[styles.archiveSubTab, archiveSubview === "hidden" && styles.archiveSubTabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: archiveSubview === "hidden" }}
            >
              <Text
                style={[
                  styles.archiveSubTabLabel,
                  archiveSubview === "hidden" && styles.archiveSubTabLabelActive,
                ]}
              >
                Hidden {mediaLexicon.share.labelPlural.toLowerCase()}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setArchiveSubview("expired")}
              style={[styles.archiveSubTab, archiveSubview === "expired" && styles.archiveSubTabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: archiveSubview === "expired" }}
            >
              <Text
                style={[
                  styles.archiveSubTabLabel,
                  archiveSubview === "expired" && styles.archiveSubTabLabelActive,
                ]}
              >
                Expired {mediaLexicon.moment.labelPlural.toLowerCase()}
              </Text>
            </Pressable>
          </View>
          <StableSlot
            loading={archiveSlotLoading}
            skeleton={<ProfileSharesGridSkeleton />}
            contentKey={`archive-${archiveSubview}-${archiveRows.length}`}
            style={{ minHeight: gridCellSize }}
            variant="section"
          >
            {archiveRows.length > 0 ? (
              <View style={[styles.grid, { minHeight: gridCellSize }]}>
                {archiveRows.map((row) => (
                  <View key={row.id} style={[styles.archiveCellWrap, { width: gridCellSize, height: gridCellSize }]}>
                    <ProfileMediaGridCell
                      storyId={row.id}
                      imageUrl={row.image_url}
                      onPressIn={() => {
                        if (row.image_url) void prefetchStoryMediaUri(row.image_url);
                      }}
                      onPress={() => {
                        if (!user?.id) return;
                        if (archiveSubview === "expired" && !row.is_share) {
                          const group = buildExpiredArchiveViewerGroup({
                            userId: user.id,
                            username: profile?.username ?? null,
                            avatarUrl: profile?.avatar_url ?? null,
                            rows: expiredMoments,
                          });
                          if (!group) return;
                          openStoryViewer(group, {
                            storyIndex: expiredArchiveStoryIndex(group, row.id),
                            reviewMode: "expired-archive",
                          });
                          return;
                        }
                        setMomentDetailSeedFromProfileShare(
                          row,
                          {
                            id: user.id,
                            username: profile?.username ?? null,
                            avatar_url: profile?.avatar_url ?? null,
                          },
                          { is_share: row.is_share }
                        );
                        router.push(
                          momentDetailRouteParams(row.id, "profile", { view: "archive" })
                        );
                      }}
                      debugLabel={`profile-archive-${row.id}`}
                    />
                    {row.created_at ? (
                      <View style={styles.archiveStamp}>
                        <Text style={styles.archiveStampText} numberOfLines={1}>
                          {formatArchiveStamp(row.created_at)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <ProfileEmpty
                title={
                  archiveSubview === "hidden"
                    ? `No hidden ${mediaLexicon.share.labelPlural.toLowerCase()}`
                    : `No expired ${mediaLexicon.moment.labelPlural.toLowerCase()}`
                }
                body={
                  archiveSubview === "hidden"
                    ? `Hidden ${mediaLexicon.share.labelPlural.toLowerCase()} from your grid appear here.`
                    : `Expired ${mediaLexicon.moment.labelPlural.toLowerCase()} from the last 24 hours appear here.`
                }
              />
            )}
          </StableSlot>
        </>
      ) : null}

      {tab === "Venues" ? (
        <ProfileVenuesPanel
          userId={user?.id}
          onCount={onVenuesCount}
          suppressShellSkeleton={suppressShellSkeleton}
        />
      ) : null}
    </View>
  );
}

function formatArchiveStamp(createdAt: string): string {
  return new Date(createdAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ProfileEmpty({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingTop: profileLayout.tabContentTop,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  placesHead: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  archiveSubTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 12,
  },
  archiveSubTab: {
    paddingVertical: 4,
  },
  archiveSubTabActive: {},
  archiveSubTabLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textWhite45,
  },
  archiveSubTabLabelActive: {
    fontWeight: "600",
    color: colors.accentActive,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newBtnLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
  },
  sharesError: {
    fontSize: 13,
    color: colors.danger,
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    width: "100%",
    minHeight: 100,
  },
  archiveCellWrap: {
    position: "relative",
    overflow: "hidden",
  },
  archiveStamp: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 24,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  archiveStampText: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
  },
  empty: {
    paddingVertical: 32,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
    textAlign: "center",
    maxWidth: 300,
  },
});
