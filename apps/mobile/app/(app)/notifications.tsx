import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { NotificationActivityRow } from "../../src/components/notifications/NotificationActivityRow";
import { ListRowSkeleton } from "../../src/components/skeletons/ListRowSkeleton";
import { AsyncSection } from "../../src/components/ui/AsyncSection";
import { AppSubpageScreen } from "../../src/components/AppSubpageScreen";
import { TextAction } from "../../src/components/TextAction";
import { ProfileAvatar } from "../../src/components/ProfileAvatar";
import { IntencityPanel } from "../../src/components/ui/IntencityPanel";
import { useNotificationsScreen } from "../../src/hooks/useNotificationsScreen";
import { usePullToRefresh } from "../../src/hooks/usePullToRefresh";
import { resolveAvatarUri } from "../../src/lib/avatar";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";
import { chrome } from "../../src/theme/chrome";

function requestLabel(r: { display_name: string | null; username: string | null }) {
  return r.display_name?.trim() || r.username?.trim() || "Someone";
}

/** PWA `/notifications` — NOTIF-1 activity feed + friend requests. */
export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [requestsOpen, setRequestsOpen] = useState(true);

  const {
    loading,
    groupedItems,
    feedError,
    friendRequests,
    requestsError,
    requestBusyId,
    navigateToNotification,
    deleteNotification,
    acceptRequest,
    denyRequest,
    reload,
  } = useNotificationsScreen(user?.id);

  const { refreshing, onRefresh } = usePullToRefresh(reload);

  const activityContentKey = useMemo(() => `${groupedItems.length}.${feedError ?? ""}`, [groupedItems, feedError]);

  return (
    <AppSubpageScreen
      title="Notifications"
      subtitle="Friend requests and activity"
      tabBarInset
      refreshing={refreshing}
      onRefresh={onRefresh}
      refreshVariant="activity"
      headerRight={
        <TextAction label="Settings" onPress={() => router.push("/settings/notifications")} />
      }
    >
      <IntencityPanel style={styles.requestsPanel}>
        <Pressable
          onPress={() => setRequestsOpen((v) => !v)}
          accessibilityRole="button"
          style={styles.requestsToggle}
        >
          <View>
            <Text style={styles.requestsTitle}>Friend requests</Text>
            <Text style={styles.requestsMeta}>{friendRequests.length} pending</Text>
          </View>
          <Text style={styles.requestsShow}>{requestsOpen ? "Hide" : "Show"}</Text>
        </Pressable>

        {requestsOpen ? (
          <View style={styles.requestsBody}>
            <AsyncSection
              loading={loading}
              skeleton={<ListRowSkeleton rows={3} />}
              contentKey={friendRequests.length}
            >
              {requestsError ? (
                <Text style={styles.err}>{requestsError}</Text>
              ) : friendRequests.length === 0 ? (
                <Text style={styles.emptyRequests}>No pending requests.</Text>
              ) : (
                friendRequests.map((r) => {
                  const busy = requestBusyId === r.id;
                  const label = requestLabel(r);
                  const handle = r.username?.replace(/^@/, "") ?? null;
                  return (
                    <View key={r.id} style={styles.requestRow}>
                      <Pressable
                        style={styles.requestProfile}
                        onPress={() =>
                          handle
                            ? router.push(`/u/${encodeURIComponent(handle)}`)
                            : undefined
                        }
                        disabled={!handle}
                      >
                        <ProfileAvatar
                          avatarUrl={resolveAvatarUri(r.avatar_url)}
                          label={label}
                          size={36}
                        />
                        <View style={styles.requestText}>
                          <Text style={styles.requestName} numberOfLines={1}>
                            {label}
                          </Text>
                          {handle ? (
                            <Text style={styles.requestHandle} numberOfLines={1}>
                              @{handle}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                      <Pressable
                        style={[styles.acceptBtn, busy && styles.btnBusy]}
                        disabled={busy}
                        onPress={() => void acceptRequest(r.id, r.requester_id)}
                      >
                        <Text style={styles.acceptLabel}>Accept</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.denyBtn, busy && styles.btnBusy]}
                        disabled={busy}
                        onPress={() => void denyRequest(r.id)}
                      >
                        <Text style={styles.denyLabel}>Deny</Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </AsyncSection>
          </View>
        ) : null}
      </IntencityPanel>

      <View style={styles.activitySection}>
        <AsyncSection
          loading={loading}
          skeleton={<ListRowSkeleton rows={8} />}
          contentKey={activityContentKey}
        >
          {feedError ? (
            <Text style={styles.err}>{feedError}</Text>
          ) : groupedItems.length === 0 ? (
            <IntencityPanel style={styles.activityPanel}>
              <View style={styles.caughtUp}>
                <Text style={styles.caughtUpTitle}>You&apos;re caught up</Text>
                <Text style={styles.caughtUpBody}>
                  When friends go out, react to posts, or venues heat up, it shows up here.
                </Text>
              </View>
            </IntencityPanel>
          ) : (
            <IntencityPanel style={styles.activityListPanel}>
              {groupedItems.map((n, index) => {
                const username = n.actor_username?.trim();
                return (
                  <NotificationActivityRow
                    key={n.id}
                    item={n}
                    isLast={index === groupedItems.length - 1}
                    onPress={() =>
                      void navigateToNotification(n)
                    }
                    onDelete={() => void deleteNotification(n)}
                    onAvatarPress={
                      username
                        ? () => router.push(`/u/${encodeURIComponent(username)}`)
                        : undefined
                    }
                  />
                );
              })}
            </IntencityPanel>
          )}
        </AsyncSection>
      </View>
    </AppSubpageScreen>
  );
}

const styles = StyleSheet.create({
  requestsPanel: {
    padding: 10,
    marginBottom: 16,
  },
  requestsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  requestsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textWhite85,
  },
  requestsMeta: {
    fontSize: 11,
    color: colors.textWhite45,
    marginTop: 2,
  },
  requestsShow: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textWhite50,
  },
  requestsBody: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: chrome.hairlineWidth,
    borderTopColor: chrome.listDivider,
    gap: 6,
    minHeight: 180,
  },
  err: {
    fontSize: 13,
    color: colors.danger,
    paddingVertical: 8,
  },
  emptyRequests: {
    fontSize: 12,
    color: colors.textWhite42,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: chrome.hairlineWidth,
    borderColor: chrome.listDivider,
    backgroundColor: "rgba(10, 12, 24, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  requestProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  requestText: {
    flex: 1,
    minWidth: 0,
  },
  requestName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  requestHandle: {
    fontSize: 12,
    color: colors.textWhite45,
  },
  acceptBtn: {
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  acceptLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  denyBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  denyLabel: {
    fontSize: 12,
    color: colors.textWhite78,
  },
  btnBusy: {
    opacity: 0.5,
  },
  activitySection: {
    marginTop: 4,
    minHeight: 440,
  },
  activityPanel: {
    minHeight: 120,
  },
  activityListPanel: {
    padding: 0,
    overflow: "hidden",
  },
  caughtUp: {
    paddingVertical: 48,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  caughtUpTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textWhite85,
    textAlign: "center",
  },
  caughtUpBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite45,
    textAlign: "center",
    maxWidth: 300,
  },
});
