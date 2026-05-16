import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { SectionHeader } from "../../src/components/SectionHeader";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { GlassSurface } from "../../src/components/GlassSurface";
import { useVenuesPreview } from "../../src/hooks/useVenuesPreview";
import { formatVenueCategoryLabel } from "../../src/lib/venueDisplay";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";
import { layout } from "../../src/theme/layout";

const MAP_DOTS = [
  { top: "22%", left: "28%" },
  { top: "38%", left: "62%" },
  { top: "55%", left: "44%" },
  { top: "68%", left: "72%" },
];

const PREVIEW_ROW_CAP = 14;

export default function MapTabScreen() {
  const { user } = useAuth();
  const { venues, loading, error } = useVenuesPreview(Boolean(user?.id));
  const previewRows = venues.slice(0, PREVIEW_ROW_CAP);
  const overflow = venues.length - previewRows.length;

  return (
    <Screen scroll edges={["top", "left", "right"]} tabBarInset style={styles.screen}>
      <ScreenHeader title="Map" subtitle="Going-out surface — preview without GPS" />

      <GlassSurface style={styles.notice} muted>
        <Text style={styles.noticeTitle}>Static venue preview</Text>
        <Text style={styles.noticeBody}>
          Mapbox, live map tiles, and device location are a later phase. Below is the same read-only venue
          list as Hub — not your current position.
        </Text>
      </GlassSurface>

      <View style={styles.canvas}>
        <View style={styles.grid} />
        {MAP_DOTS.map((dot, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === 0 && styles.dotLive,
              { top: dot.top as `${number}%`, left: dot.left as `${number}%` },
            ]}
          />
        ))}
        <GlassSurface style={styles.chipTop} muted>
          <Text style={styles.chipText}>Venues · friends · heat</Text>
        </GlassSurface>
        <GlassSurface style={styles.chipBottom} muted>
          <Text style={styles.chipHint}>Full map runs on web/PWA today</Text>
        </GlassSurface>
      </View>

      <SectionHeader
        title="Places in app"
        actionLabel={loading ? undefined : error ? undefined : `${venues.length} venues`}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingCaption}>Loading venue names…</Text>
        </View>
      ) : null}

      {!loading && !error && venues.length === 0 ? (
        <Text style={styles.empty}>No venues to show. Production map data stays on web.</Text>
      ) : null}

      {!loading && previewRows.length > 0 ? (
        <ShellCard>
          {previewRows.map((v, index) => (
            <ShellListRow
              key={v.id}
              title={v.name}
              subtitle={formatVenueCategoryLabel(v.category)}
              isLast={index === previewRows.length - 1 && overflow <= 0}
            />
          ))}
        </ShellCard>
      ) : null}

      {overflow > 0 ? (
        <Text style={styles.more}>+{overflow} more venues — open Map on web for the full list.</Text>
      ) : null}

      <View style={styles.footerSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  notice: {
    borderRadius: layout.cardRadius,
    padding: 14,
    marginBottom: layout.sectionGap,
    gap: 6,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  canvas: {
    height: 240,
    borderRadius: layout.cardRadius,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#0d1019",
    marginBottom: layout.sectionGap,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    backgroundColor: "transparent",
  },
  dot: {
    position: "absolute",
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  dotLive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentActive,
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
    borderRadius: 6,
  },
  chipTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipBottom: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    left: "18%",
    right: "18%",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  chipHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 8,
  },
  loadingBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  loadingCaption: {
    fontSize: 12,
    color: colors.textMuted,
  },
  empty: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  more: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 15,
  },
  footerSpacer: {
    height: 8,
  },
});
