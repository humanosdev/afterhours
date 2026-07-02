import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from "react-native";
import { colors } from "../../theme/colors";

export type AnchorMenuItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type AnchorActionMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AnchorMenuItem[];
  children: ReactNode;
  accessibilityLabel?: string;
  minWidth?: number;
};

/** Dropdown anchored to its trigger — fixes hub/detail menus stuck at screen top. */
export function AnchorActionMenu({
  open,
  onOpenChange,
  items,
  children,
  accessibilityLabel = "Open menu",
  minWidth = 200,
}: AnchorActionMenuProps) {
  const anchorRef = useRef<View>(null);
  const mountedRef = useRef(true);
  const [anchorRect, setAnchorRect] = useState<LayoutRectangle | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const measureAnchor = useCallback((thenOpen?: () => void) => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      if (!mountedRef.current) return;
      setAnchorRect({ x, y, width, height });
      thenOpen?.();
    });
  }, []);

  const openMenu = () => {
    measureAnchor(() => {
      if (mountedRef.current) onOpenChange(true);
    });
  };

  const close = () => onOpenChange(false);

  const toggleMenu = () => {
    if (open) close();
    else openMenu();
  };

  const windowWidth = Dimensions.get("window").width;
  const dropdownTop = anchorRect ? anchorRect.y + anchorRect.height + 6 : 0;
  const dropdownRight = anchorRect ? Math.max(8, windowWidth - anchorRect.x - anchorRect.width) : 16;

  return (
    <View ref={anchorRef} collapsable={false} style={styles.anchor}>
      <Pressable onPress={toggleMenu} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        {children}
      </Pressable>

      {open ? (
        <Modal transparent visible animationType="fade" onRequestClose={close}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close menu" />
            {anchorRect ? (
              <View
                style={[
                  styles.dropdown,
                  {
                    position: "absolute",
                    top: dropdownTop,
                    right: dropdownRight,
                    minWidth,
                  },
                ]}
              >
                {items.map((item, index) => (
                  <View key={`${item.label}-${index}`}>
                    {index > 0 && item.destructive && !items[index - 1]?.destructive ? (
                      <View style={styles.rule} />
                    ) : null}
                    <Pressable
                      onPress={() => {
                        close();
                        item.onPress();
                      }}
                      style={({ pressed }) => [
                        styles.item,
                        pressed && (item.destructive ? styles.itemDestructivePressed : styles.itemPressed),
                      ]}
                      accessibilityRole="menuitem"
                    >
                      <Text style={item.destructive ? styles.itemDestructive : styles.itemLabel}>{item.label}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
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
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(16, 16, 21, 0.98)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 11,
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
    color: "#fca5a5",
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
