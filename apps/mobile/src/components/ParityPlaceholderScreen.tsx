import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppSubpageScreen, subpageStyles } from "./AppSubpageScreen";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export type ParityPlaceholderScreenProps = {
  title: string;
  pwaRoute: string;
  summary: string;
  deferredPhase?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children?: ReactNode;
};

/** Subpage shell for routes not yet wired — no fake grey skeleton rows. */
export function ParityPlaceholderScreen({
  title,
  pwaRoute,
  summary,
  deferredPhase,
  icon = "document-text-outline",
  children,
}: ParityPlaceholderScreenProps) {
  return (
    <AppSubpageScreen title={title}>
      <View style={styles.hero}>
        <View style={styles.iconWell}>
          <Ionicons name={icon} size={26} color={colors.accentActive} />
        </View>
        <Text style={styles.summary}>{summary}</Text>
      </View>

      {children ? <View style={styles.children}>{children}</View> : null}

      <View style={subpageStyles.emptyBlock}>
        <Text style={subpageStyles.emptyTitle}>Coming soon on native</Text>
        <Text style={subpageStyles.emptyBody}>
          This screen mirrors {pwaRoute} on web. Behavior and data wiring land in a later phase.
        </Text>
      </View>

      {__DEV__ && deferredPhase ? (
        <View style={styles.devBlock}>
          <Text style={typography.devRibbon}>Developer</Text>
          <Text style={styles.devRoute}>{pwaRoute}</Text>
          <Text style={styles.devDefer}>{deferredPhase}</Text>
        </View>
      ) : null}
    </AppSubpageScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 14,
    marginBottom: 8,
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(59, 102, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  summary: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textWhite75,
    textAlign: "center",
    maxWidth: 340,
  },
  children: {
    marginBottom: 16,
  },
  devBlock: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    gap: 6,
  },
  devRoute: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentActive,
  },
  devDefer: {
    ...typography.micro,
    color: colors.textMuted,
  },
});
