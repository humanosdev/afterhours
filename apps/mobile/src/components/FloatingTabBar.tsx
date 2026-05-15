import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "./GlassSurface";
import { colors } from "../theme/colors";
import { glass } from "../theme/glass";
import { layout } from "../theme/layout";

const ICON_SIZE = 20;
const CREATE_SIZE = 22;

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const TAB_CONFIG: Record<
  string,
  { label: string; outline: IoniconName; filled: IoniconName; isCreate?: boolean }
> = {
  hub: { label: "Hub", outline: "home-outline", filled: "home" },
  map: { label: "Map", outline: "map-outline", filled: "map" },
  create: { label: "Create", outline: "add-outline", filled: "add", isCreate: true },
  chat: { label: "Chat", outline: "chatbubbles-outline", filled: "chatbubbles" },
  profile: { label: "Profile", outline: "person-outline", filled: "person" },
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 4);

  return (
    <View style={[styles.host, { paddingBottom: bottom }]} pointerEvents="box-none">
      <GlassSurface style={styles.bar}>
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const config = TAB_CONFIG[route.name];
            if (!config) return null;

            const focused = state.index === index;
            const color = focused ? colors.accentActive : "rgba(255, 255, 255, 0.62)";

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            if (config.isCreate) {
              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  accessibilityRole="button"
                  accessibilityLabel={config.label}
                  accessibilityState={{ selected: focused }}
                  style={styles.createHit}
                >
                  <View style={[styles.createOrb, glass.createButton, focused && styles.createOrbFocused]}>
                    <Ionicons name={focused ? config.filled : config.outline} size={CREATE_SIZE} color="#fff" />
                  </View>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={config.label}
                accessibilityState={{ selected: focused }}
                style={styles.tabHit}
              >
                <View style={[styles.iconWell, focused && glass.iconWellActive]}>
                  <Ionicons
                    name={focused ? config.filled : config.outline}
                    size={ICON_SIZE}
                    color={color}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.screenPaddingX,
    alignItems: "center",
  },
  bar: {
    width: "100%",
    maxWidth: 360,
    borderRadius: layout.glassRadius,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabHit: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    ...glass.iconWell,
  },
  createHit: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  createOrb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  createOrbFocused: {
    backgroundColor: "rgba(59, 102, 255, 0.5)",
  },
});
