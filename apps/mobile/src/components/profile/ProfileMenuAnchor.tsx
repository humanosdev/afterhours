import { useCallback } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Menu } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconHitTarget } from "../IconHitTarget";
import { colors } from "../../theme/colors";
import { chrome } from "../../theme/chrome";
import { profileLayout } from "../../theme/profileLayout";
import { surfaces } from "../../theme/surfaces";

export type ProfileMenuExtraItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type ProfileMenuAnchorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountLabel: string;
  onSignOut?: () => void | Promise<void>;
  extraItems?: ProfileMenuExtraItem[];
};

const MENU_ITEMS = [
  { label: "Settings", path: "/settings" },
  { label: "Edit profile", path: "/profile-edit" },
  { label: "Hidden shares", path: "/archive-hidden" },
] as const;

export function ProfileMenuAnchor({
  open,
  onOpenChange,
  onSignOut,
  accountLabel,
  extraItems,
}: ProfileMenuAnchorProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  function toggle() {
    onOpenChange(!open);
  }

  function confirmSignOut() {
    if (!onSignOut) return;
    close();
    Alert.alert(
      "Sign out",
      `Are you sure you want to sign out of "${accountLabel}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: () => void onSignOut() },
      ]
    );
  }

  const dropdownTop = insets.top + 52;

  return (
    <View style={styles.anchor}>
      <IconHitTarget onPress={toggle} accessibilityLabel="Open menu" size={40}>
        <Menu size={22} strokeWidth={2} color={colors.textWhite78} />
      </IconHitTarget>

      {open ? (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={close}
          statusBarTranslucent
        >
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close menu" />
            <View
              style={[
                styles.dropdown,
                {
                  top: dropdownTop,
                  right: 12,
                  width: profileLayout.menuWidth,
                },
              ]}
            >
              {onSignOut
                ? MENU_ITEMS.map((item) => (
                    <Pressable
                      key={item.path}
                      onPress={() => {
                        close();
                        router.push(item.path);
                      }}
                      accessibilityRole="menuitem"
                      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                    >
                      <Text style={styles.itemLabel}>{item.label}</Text>
                    </Pressable>
                  ))
                : null}
              {extraItems?.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    close();
                    item.onPress();
                  }}
                  accessibilityRole="menuitem"
                  style={({ pressed }) => [
                    styles.item,
                    pressed && (item.destructive ? styles.itemDestructivePressed : styles.itemPressed),
                  ]}
                >
                  <Text style={item.destructive ? styles.itemDestructive : styles.itemLabel}>{item.label}</Text>
                </Pressable>
              ))}
              {onSignOut ? (
                <>
                  <View style={styles.divider} />
                  <Pressable
                    onPress={confirmSignOut}
                    accessibilityRole="menuitem"
                    style={({ pressed }) => [styles.item, pressed && styles.itemDestructivePressed]}
                  >
                    <Text style={styles.itemDestructive}>Sign out</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "relative",
    zIndex: 30,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  dropdown: {
    position: "absolute",
    borderRadius: profileLayout.menuRadius,
    borderWidth: 1,
    borderColor: surfaces.border,
    backgroundColor: surfaces.surfaceElevated,
    overflow: "hidden",
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  itemDestructivePressed: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  itemLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  itemDestructive: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.errorText,
  },
  divider: {
    height: chrome.hairlineWidth,
    backgroundColor: chrome.pageHeaderBorder,
  },
});
