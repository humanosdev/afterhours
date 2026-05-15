import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Redirect, Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppLoadingScreen } from "../../src/components/AppLoadingScreen";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";

const TAB_ICON_SIZE = 24;
const CREATE_ICON_SIZE = 28;
/**
 * Phase 2H — web-parity tab bar (Hub / Map / Create / Chat / Profile).
 * Placeholder screens only; production UX and data remain on web/PWA.
 * See docs/NATIVE_ARCHITECTURE.md § UX source of truth.
 */
const TAB_BAR_CONTENT_HEIGHT = 52;

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, color, focused }: { name: IoniconName; color: string; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? (name.replace("-outline", "") as IoniconName) : name}
      size={TAB_ICON_SIZE}
      color={color}
    />
  );
}

function CreateTabIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={[styles.createButton, focused && styles.createButtonFocused]}>
      <Ionicons
        name={focused ? "add" : "add-outline"}
        size={CREATE_ICON_SIZE}
        color={focused ? colors.bgPrimary : color}
      />
    </View>
  );
}

export default function AppTabLayout() {
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0);

  if (loading) {
    return <AppLoadingScreen message="Checking session…" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingTop: 10,
          paddingBottom: bottomInset,
        },
        tabBarItemStyle: {
          height: TAB_BAR_CONTENT_HEIGHT - 10,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        sceneStyle: {
          backgroundColor: colors.bgPrimary,
        },
      }}
    >
      <Tabs.Screen
        name="hub"
        options={{
          title: "Hub",
          tabBarAccessibilityLabel: "Hub",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="grid-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarAccessibilityLabel: "Map",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="map-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarAccessibilityLabel: "Create",
          tabBarIcon: ({ color, focused }) => <CreateTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarAccessibilityLabel: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chatbubbles-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarAccessibilityLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceHover,
  },
  createButtonFocused: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
