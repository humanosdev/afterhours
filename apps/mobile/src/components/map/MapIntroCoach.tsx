import { useMemo, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Sparkles, Users } from "lucide-react-native";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/layout";

type MapIntroCoachProps = {
  visible: boolean;
  onDismiss: () => void;
};

const STEPS = [
  {
    title: "The map is live",
    body: "Venues glow when people are out. Brighter color means more energy. Friends can show up on the map when they're active too.",
  },
  {
    title: "Read the glow",
    body: "Tap a color to see what it means. The halo around a pin updates as a spot gets busier.",
  },
  {
    title: "Start exploring",
    body: "Tap a venue for details, swipe the bar at the bottom to jump between spots, and hit locate to find yourself.",
  },
] as const;

const HEAT_LADDER = [
  { hex: "#5c6578", label: "Quiet", hint: "Calm — not much happening yet" },
  { hex: "#2F5EFF", label: "Warming up", hint: "A few people around" },
  { hex: "#7A00FF", label: "Building", hint: "Energy is picking up" },
  { hex: "#FF2DBE", label: "Buzzing", hint: "A go-to spot tonight" },
  { hex: "#FF6B00", label: "Packed", hint: "Lots of people here" },
  { hex: "#FF3300", label: "Peak", hint: "One of the hottest spots right now" },
] as const;

export function MapIntroCoach({ visible, onDismiss }: MapIntroCoachProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [selectedTier, setSelectedTier] = useState(0);

  const isLastStep = step >= STEPS.length - 1;
  const isHeatStep = step === 1;
  const activeTier = HEAT_LADDER[selectedTier] ?? HEAT_LADDER[0];

  const stepMeta = useMemo(() => STEPS[step] ?? STEPS[0], [step]);

  const handleClose = () => {
    setStep(0);
    setSelectedTier(0);
    onDismiss();
  };

  const handlePrimary = () => {
    if (isLastStep) {
      handleClose();
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Dismiss map intro" />
        <View style={styles.card} accessibilityViewIsModal>
          <LinearGradient
            colors={["rgba(22, 27, 46, 0.98)", "rgba(11, 14, 23, 0.98)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardInner}>
            <Text style={styles.kicker}>Map guide</Text>
            <Text style={styles.title}>{stepMeta.title}</Text>
            <Text style={styles.body}>{stepMeta.body}</Text>

            {isHeatStep ? (
              <View style={styles.heatBlock}>
                <View style={styles.heatPreview}>
                  <View
                    style={[
                      styles.heatOrbOuter,
                      { shadowColor: activeTier.hex, backgroundColor: `${activeTier.hex}33` },
                    ]}
                  >
                    <View style={[styles.heatOrbInner, { backgroundColor: activeTier.hex }]} />
                  </View>
                  <Text style={styles.heatPreviewLabel}>{activeTier.label}</Text>
                  <Text style={styles.heatPreviewHint}>{activeTier.hint}</Text>
                </View>
                <View style={styles.tierRow}>
                  {HEAT_LADDER.map((tier, index) => {
                    const active = index === selectedTier;
                    return (
                      <Pressable
                        key={tier.label}
                        onPress={() => setSelectedTier(index)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[styles.tierChip, active && styles.tierChipActive]}
                      >
                        <View style={[styles.tierDot, { backgroundColor: tier.hex }]} />
                        <Text style={[styles.tierChipLabel, active && styles.tierChipLabelActive]} numberOfLines={1}>
                          {tier.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.iconRow}>
                <MiniHint icon={<MapPin size={18} color={colors.textWhite80} strokeWidth={2} />} label="Venue pins" />
                <MiniHint icon={<Sparkles size={18} color={colors.textWhite80} strokeWidth={2} />} label="Live glow" />
                <MiniHint icon={<Users size={18} color={colors.textWhite80} strokeWidth={2} />} label="Friends out" />
              </View>
            )}

            <View style={styles.dots}>
              {STEPS.map((_, index) => (
                <View key={index} style={[styles.dot, index === step && styles.dotActive]} />
              ))}
            </View>

            <View style={styles.actions}>
              <Pressable onPress={handleClose} style={styles.secondaryBtn} accessibilityRole="button">
                <Text style={styles.secondaryLabel}>Skip</Text>
              </Pressable>
              <Pressable onPress={handlePrimary} style={styles.primaryBtn} accessibilityRole="button">
                <Text style={styles.primaryLabel}>{isLastStep ? "Got it" : "Next"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MiniHint({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.miniHint}>
      {icon}
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
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
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  miniHint: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textWhite75,
    textAlign: "center",
  },
  heatBlock: {
    marginTop: 6,
    gap: 12,
  },
  heatPreview: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heatOrbOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  heatOrbInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  heatPreviewLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  heatPreviewHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  tierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  tierChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tierChipActive: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tierChipLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tierChipLabelActive: {
    color: colors.textPrimary,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.textPrimary,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textWhite80,
  },
  primaryBtn: {
    flex: 1.4,
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
