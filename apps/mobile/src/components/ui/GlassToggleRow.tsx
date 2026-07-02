import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";
import { surfaces } from "../../theme/surfaces";

type GlassToggleRowProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

/** PWA notification settings row — `rounded-xl border-white/[0.08] bg-white/[0.04] p-4` + violet track. */
export function GlassToggleRow({ title, description, value, onValueChange, disabled }: GlassToggleRowProps) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={title}
      style={({ pressed }) => [styles.shell, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <View style={styles.inner}>
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
          <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]} />
        </View>
      </View>
    </Pressable>
  );
}

const TRACK_W = 44;
const THUMB = 20;

const styles = StyleSheet.create({
  shell: {
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: surfaces.border,
    backgroundColor: surfaces.surface,
    padding: 16,
  },
  pressed: {
    backgroundColor: surfaces.surfaceElevated,
  },
  disabled: {
    opacity: 0.55,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textWhite50,
  },
  track: {
    width: TRACK_W,
    height: 24,
    borderRadius: 999,
    justifyContent: "center",
  },
  trackOn: {
    backgroundColor: colors.accent,
  },
  trackOff: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: "#ffffff",
  },
  thumbOn: {
    alignSelf: "flex-end",
    marginRight: 2,
  },
  thumbOff: {
    alignSelf: "flex-start",
    marginLeft: 2,
  },
});
