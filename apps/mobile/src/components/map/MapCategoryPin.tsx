import { StyleSheet, View } from "react-native";
import { MapVenueCategoryGlyph } from "./MapCategoryGlyph";

type MapCategoryPinProps = {
  category: string | null | undefined;
  name: string | null | undefined;
  selected?: boolean;
  /** PWA `icon-opacity` at current zoom × activity. */
  opacity?: number;
  /** PWA `icon-size` at current zoom. */
  iconSize?: number;
};

/** Category glyph only — venue **heat** glow comes from Mapbox circle layers, not icon color. */
export function MapCategoryPin({
  category,
  name,
  selected = false,
  opacity = 1,
  iconSize = 22,
}: MapCategoryPinProps) {
  return (
    <View style={[styles.wrap, { opacity }, selected && styles.wrapSelected]}>
      <MapVenueCategoryGlyph category={category} name={name} size={iconSize} selected={selected} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  wrapSelected: {
    transform: [{ scale: 1.06 }],
  },
});
