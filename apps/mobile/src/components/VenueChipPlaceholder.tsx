import { StyleSheet, Text, View } from "react-native";
import { GlassSurface } from "./GlassSurface";
import { colors } from "../theme/colors";

type VenueChipPlaceholderProps = {
  name: string;
  meta: string;
};

export function VenueChipPlaceholder({ name, meta }: VenueChipPlaceholderProps) {
  return (
    <GlassSurface style={styles.chip} muted>
      <View style={styles.dot} />
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.meta}>{meta}</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 132,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentMint,
    opacity: 0.7,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
