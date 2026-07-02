import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileAvatar } from "../ProfileAvatar";
import { colors } from "../../theme/colors";
import type { LiveMessageToast } from "../../providers/NotificationDeliveryProvider";

type InAppMessageToastHostProps = {
  toasts: LiveMessageToast[];
  onDismiss: (id: string) => void;
  onPress: (toast: LiveMessageToast) => void;
};

/** PWA `AppShell` live message toasts — top safe area, glass card. */
export function InAppMessageToastHost({ toasts, onDismiss, onPress }: InAppMessageToastHostProps) {
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.host, { top: insets.top + 10 }]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <Pressable
          key={toast.id}
          onPress={() => onPress(toast)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <ProfileAvatar
            avatarUrl={toast.actorAvatarUrl}
            label={toast.title}
            size={36}
          />
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {toast.title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {toast.body}
            </Text>
          </View>
          <Pressable
            onPress={() => onDismiss(toast.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={styles.dismiss}
          >
            <Text style={styles.dismissLabel}>×</Text>
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 12000,
    gap: 8,
    elevation: 12000,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 102, 255, 0.35)",
    backgroundColor: "rgba(24, 28, 35, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "rgba(59, 102, 255, 0.2)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  cardPressed: {
    opacity: 0.92,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textWhite65,
  },
  dismiss: {
    paddingHorizontal: 4,
  },
  dismissLabel: {
    fontSize: 20,
    lineHeight: 22,
    color: colors.textWhite50,
  },
});
