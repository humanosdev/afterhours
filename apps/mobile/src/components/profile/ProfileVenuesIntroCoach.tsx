import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";

type ProfileVenuesIntroCoachProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function ProfileVenuesIntroCoach({ visible, onDismiss }: ProfileVenuesIntroCoachProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Dismiss venues intro" />
        <View style={styles.card} accessibilityViewIsModal>
          <LinearGradient
            colors={["rgba(22, 27, 46, 0.98)", "rgba(11, 14, 23, 0.98)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardInner}>
            <View style={styles.iconWrap}>
              <MapPin size={22} color={colors.accentActive} />
            </View>
            <Text style={styles.kicker}>Profile venues</Text>
            <Text style={styles.title}>Your Venues tab</Text>
            <Text style={styles.body}>
              Stay at a spot for 15+ minutes and it unlocks here permanently — your nightlife passport on Intencity.
            </Text>
            <Text style={styles.body}>
              Open the Venues tab anytime to see every place you&apos;ve earned. Tap a venue to jump to it on the map.
            </Text>
            <Pressable onPress={onDismiss} style={styles.primaryBtn} accessibilityRole="button">
              <Text style={styles.primaryLabel}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
    justifyContent: "center",
    paddingHorizontal: layout.screenPaddingX,
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardInner: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 102, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 102, 255, 0.28)",
    marginBottom: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  primaryBtn: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
});
