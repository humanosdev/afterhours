import { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { SectionHeader } from "../../src/components/SectionHeader";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { GlassSurface } from "../../src/components/GlassSurface";
import { SearchFieldPlaceholder } from "../../src/components/SearchFieldPlaceholder";
import { useVenuesPreview } from "../../src/hooks/useVenuesPreview";
import { useLocalSearchQuery } from "../../src/hooks/useLocalSearchQuery";
import { matchesLocalSearch, normalizeLocalSearchQuery } from "../../src/lib/localSearch";
import { formatVenueCategoryLabel } from "../../src/lib/venueDisplay";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";
import { layout } from "../../src/theme/layout";

const MAP_DOTS = [
  { top: "24%", left: "30%" },
  { top: "40%", left: "64%" },
  { top: "54%", left: "46%" },
  { top: "70%", left: "74%" },
];

const FILTER_CHIPS = ["All", "Open", "Quiet", "Buzzing"];

const PREVIEW_ROW_CAP = 14;

export default function MapTabScreen() {
  const { user } = useAuth();
  const { query, setQuery, debouncedQuery } = useLocalSearchQuery();
  const { venues, loading, error } = useVenuesPreview(Boolean(user?.id));

  const filteredVenues = useMemo(() => {
    if (!normalizeLocalSearchQuery(debouncedQuery)) return venues;
    return venues.filter((v) =>
      matchesLocalSearch(debouncedQuery, v.name, v.category, formatVenueCategoryLabel(v.category))
    );
  }, [venues, debouncedQuery]);

  const previewRows = filteredVenues.slice(0, PREVIEW_ROW_CAP);
  const overflow = filteredVenues.length - previewRows.length;
  const firstVenue = filteredVenues[0];

  const filterEmptyButHasVenues =
    !loading &&
    !error &&
    venues.length > 0 &&
    normalizeLocalSearchQuery(debouncedQuery).length > 0 &&
    filteredVenues.length === 0;

  return (
    <Screen scroll edges={["top", "left", "right"]} tabBarInset style={styles.screen}>
      <ScreenHeader title="Map" subtitle="Live surface — preview without GPS" />

      <GlassSurface style={styles.notice} muted>
        <Text style={styles.noticeTitle}>Static preview</Text>
        <Text style={styles.noticeBody}>
          Mapbox and device location come in a later phase. Filters and the card below mimic web layout; data is
          read-only venue names.
        </Text>
      </GlassSurface>

      <View style={styles.canvas}>
        <View style={styles.mapGradientTop} />
        <View style={styles.mapGrid} />
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterStrip}
          contentContainerStyle={styles.filterContent}
        >
          {FILTER_CHIPS.map((label, i) => (
            <GlassSurface key={label} style={[styles.filterChip, i === 0 && styles.filterChipOn]} muted>
              <Text style={[styles.filterLabel, i === 0 && styles.filterLabelOn]}>{label}</Text>
            </GlassSurface>
          ))}
        </ScrollView>

        <GlassSurface style={styles.chipBottom} muted>
          <Text style={styles.chipHint}>Full interactive map · web/PWA</Text>
        </GlassSurface>

        {firstVenue ? (
          <View style={styles.venuePeekWrap} pointerEvents="none">
            <GlassSurface style={styles.venuePeek} muted>
              <Text style={styles.peekName} numberOfLines={1}>
                {firstVenue.name}
              </Text>
              <Text style={styles.peekMeta} numberOfLines={1}>
                {formatVenueCategoryLabel(firstVenue.category)} · preview
              </Text>
            </GlassSurface>
          </View>
        ) : null}
      </View>

      <SectionHeader title="Places in app" actionLabel={loading ? undefined : error ? undefined : `${venues.length} venues`} />
      <SearchFieldPlaceholder
        placeholder="Filter loaded places…"
        value={query}
        onChangeText={setQuery}
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

      {filterEmptyButHasVenues ? (
        <Text style={styles.filterEmpty}>No matches in loaded places — adjust the filter.</Text>
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
    color: colors.textWhite42,
  },
  canvas: {
    height: 280,
    borderRadius: layout.cardRadius,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgLift,
    marginBottom: layout.sectionGap,
    position: "relative",
  },
  mapGradientTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(59,102,255,0.06)",
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    backgroundColor: "transparent",
  },
  dot: {
    position: "absolute",
    width: 8,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  dotLive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentActive,
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
    borderRadius: 6,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  filterStrip: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    maxHeight: 40,
  },
  filterContent: {
    gap: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(10,12,24,0.72)",
    borderColor: colors.glassBorder,
  },
  filterChipOn: {
    borderColor: colors.borderFocus,
    backgroundColor: "rgba(59,102,255,0.28)",
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textWhite78,
  },
  filterLabelOn: {
    color: colors.textPrimary,
  },
  chipBottom: {
    position: "absolute",
    bottom: 72,
    alignSelf: "center",
    left: "14%",
    right: "14%",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  chipHint: {
    fontSize: 12,
    color: colors.textWhite55,
    textAlign: "center",
  },
  venuePeekWrap: {
    position: "absolute",
    bottom: 10,
    left: 12,
    right: 12,
  },
  venuePeek: {
    borderRadius: layout.cardRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderColor: colors.glassBorder,
  },
  peekName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  peekMeta: {
    fontSize: 12,
    marginTop: 3,
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
  filterEmpty: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
    lineHeight: 17,
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
