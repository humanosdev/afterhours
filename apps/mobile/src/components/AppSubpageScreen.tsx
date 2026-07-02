import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "./Screen";
import { StackScreenHeader } from "./StackScreenHeader";
import type { PullRefreshVariant } from "./ui/IntencityRefreshControl";
import { colors } from "../theme/colors";
import { chrome } from "../theme/chrome";
import { layout } from "../theme/layout";

type AppSubpageScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  tabBarInset?: boolean;
  headerRight?: ReactNode;
  /** Gap below stack header — default 12; use 0 for profile-style identity flush to divider. */
  contentGap?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  refreshVariant?: PullRefreshVariant;
};

/**
 * Unified stack/subpage shell — matches PWA `AppSubpageHeader` + charcoal canvas (no grey cards).
 */
export function AppSubpageScreen({
  title,
  subtitle,
  children,
  tabBarInset = false,
  headerRight,
  contentGap = 12,
  refreshing,
  onRefresh,
  refreshVariant = "activity",
}: AppSubpageScreenProps) {
  return (
    <Screen
      scroll
      edges={["top", "left", "right"]}
      tabBarInset={tabBarInset}
      refreshing={refreshing}
      onRefresh={onRefresh}
      refreshVariant={refreshVariant}
    >
      <StackScreenHeader title={title} subtitle={subtitle} rightSlot={headerRight} />
      <View style={[styles.content, contentGap > 0 && { marginTop: contentGap }]}>{children}</View>
    </Screen>
  );
}

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export const subpageStyles = StyleSheet.create({
  lead: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: layout.sectionGap,
    paddingHorizontal: 2,
  },
  emptyBlock: {
    paddingVertical: 32,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
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

const styles = StyleSheet.create({
  content: {},
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionBody: {
    gap: 0,
  },
});
