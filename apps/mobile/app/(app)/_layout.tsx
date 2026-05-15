import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Redirect, Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppLoadingScreen } from "../../src/components/AppLoadingScreen";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";

const TAB_ICON_SIZE = 24;
/**
 * Temporary Phase 2E tab bar (Home / Search / Activity / Profile).
 * NOT long-term IA — production web uses hub / map / create / chat / profile.
 * See docs/NATIVE_ARCHITECTURE.md § UX source of truth.
 */
const TAB_BAR_CONTENT_HEIGHT = 52;

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, color, focused }: { name: IoniconName; color: string; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name.replace("-outline", "") as IoniconName : name}
      size={TAB_ICON_SIZE}
      color={color}
    />
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
        name="home"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarAccessibilityLabel: "Search",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="search-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarAccessibilityLabel: "Activity",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="notifications-outline" color={color} focused={focused} />
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
