import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Grid3X3, GraduationCap, Sparkles, UtensilsCrossed } from "lucide-react-native";
import { GlassSurface } from "../GlassSurface";
import { MAP_CATEGORY_FILTERS, type VenueCategoryAccentKey } from "../../lib/venueCategoryAccent";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";
import { NightlifeDrinkGlyph } from "./MapCategoryGlyph";

/** PWA `categoryFilters` icons — lucide chips; nightlife uses custom drink SVG. */
const FILTER_ICONS = {
  all: Grid3X3,
  campus: GraduationCap,
  food: UtensilsCrossed,
  events: Sparkles,
} as const;

type MapCategoryFilterTrayProps = {
  active: VenueCategoryAccentKey;
  onChange: (key: VenueCategoryAccentKey) => void;
  width: number;
};

export function MapCategoryFilterTray({ active, onChange, width }: MapCategoryFilterTrayProps) {
  return (
    <GlassSurface preset="control" style={[styles.tray, { width }]} sheen>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {MAP_CATEGORY_FILTERS.map((filter) => {
          const on = active === filter.key;
          const tint = on ? filter.accent : colors.textWhite85;
          const sw = on ? 2.25 : 1.85;
          return (
            <Pressable
              key={filter.key}
              onPress={() => onChange(filter.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[
                styles.chip,
                {
                  borderColor: on ? `${filter.accent}99` : "rgba(255, 255, 255, 0.08)",
                  backgroundColor: on ? `${filter.accent}28` : "rgba(255, 255, 255, 0.015)",
                },
              ]}
            >
              {filter.key === "nightlife" ? (
                <NightlifeDrinkGlyph size={11} color={tint} strokeWidth={sw} />
              ) : (
                (() => {
                  const Icon = FILTER_ICONS[filter.key];
                  return <Icon size={11} color={tint} strokeWidth={sw} />;
                })()
              )}
              <Text style={[styles.chipLabel, { color: tint }]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  tray: {
    borderRadius: layout.cardRadius,
    padding: 8,
  },
  row: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
});
