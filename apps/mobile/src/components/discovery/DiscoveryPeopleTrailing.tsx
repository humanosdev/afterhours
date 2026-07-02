import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DiscoverySocialGraph } from "../../lib/fetchDiscoverySocialGraph";
import { colors } from "../../theme/colors";

type TrailingKind = "you_blocked" | "they_blocked" | "friend" | "requested" | "incoming" | "view";

function trailingKind(
  userId: string,
  friendSet: Set<string>,
  graph: DiscoverySocialGraph
): TrailingKind {
  if (graph.iBlockedThem.has(userId)) return "you_blocked";
  if (graph.theyBlockedMe.has(userId)) return "they_blocked";
  if (friendSet.has(userId)) return "friend";
  if (graph.pendingOut.has(userId)) return "requested";
  if (graph.pendingIn.has(userId)) return "incoming";
  return "view";
}

type DiscoveryPeopleTrailingProps = {
  userId: string;
  friendSet: Set<string>;
  graph: DiscoverySocialGraph;
  onRespondIncoming?: () => void;
};

/** PWA `peopleTrailingSlot` — read-only status pills (no send from search). */
export function DiscoveryPeopleTrailing({
  userId,
  friendSet,
  graph,
  onRespondIncoming,
}: DiscoveryPeopleTrailingProps) {
  const kind = trailingKind(userId, friendSet, graph);
  const blockedRow = graph.iBlockedThem.has(userId) || graph.theyBlockedMe.has(userId);

  if (kind === "you_blocked") {
    return <MutedPill label="You blocked" dimmed={blockedRow} />;
  }
  if (kind === "they_blocked") {
    return <MutedPill label="Blocked you" dimmed={blockedRow} />;
  }
  if (kind === "friend") {
    return (
      <View style={[styles.pill, styles.friendPill]}>
        <Text style={styles.friendText}>Friend</Text>
      </View>
    );
  }
  if (kind === "requested") {
    return (
      <View style={[styles.pill, styles.requestedPill]}>
        <Text style={styles.requestedText}>Requested</Text>
      </View>
    );
  }
  if (kind === "incoming") {
    return (
      <Pressable
        onPress={onRespondIncoming}
        accessibilityRole="button"
        style={[styles.pill, styles.incomingPill]}
      >
        <Text style={styles.incomingText}>Respond</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.pill, styles.viewPill]}>
      <Text style={styles.viewText}>View</Text>
    </View>
  );
}

function MutedPill({ label, dimmed }: { label: string; dimmed?: boolean }) {
  return (
    <View style={[styles.pill, styles.mutedPill, dimmed && styles.dimmed]}>
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  dimmed: {
    opacity: 0.72,
  },
  mutedPill: {
    borderColor: "rgba(255, 255, 255, 0.07)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  mutedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textWhite42,
  },
  friendPill: {
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  friendText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textWhite65,
  },
  requestedPill: {
    borderColor: "rgba(59, 102, 255, 0.3)",
    backgroundColor: "rgba(59, 102, 255, 0.1)",
  },
  requestedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accentActive,
  },
  incomingPill: {
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  incomingText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textWhite78,
  },
  viewPill: {
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  viewText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textWhite42,
  },
});
