import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, Map, MessageCircle, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyAvatar } from "../hooks/useMyAvatar";
import { useCreateComposerOptional } from "../providers/CreateComposerProvider";
import { useNotificationDeliveryOptional } from "../providers/NotificationDeliveryProvider";
import { UnreadBadge } from "./ui/UnreadBadge";
import { tabBarBarWidth, tabBarBottomOffset, tabBarMetrics } from "../shell/tabBarMetrics";
import { emitTabScrollToTop, type TabScrollTarget } from "../lib/tabScrollToTop";
import { GlassSurface } from "./GlassSurface";
import { TabBarProfileAvatar } from "./TabBarProfileAvatar";
import { colors } from "../theme/colors";
import { glass } from "../theme/glass";

const STROKE_ACTIVE = 2.25;
const STROKE_INACTIVE = 2;
const ICON_SIZE = 20;
const PLUS_SIZE = 21;

const TAB_CONFIG: Record<
  string,
  { label: string; isCreate?: boolean; isProfile?: boolean; Icon?: typeof Home }
> = {
  hub: { label: "Hub", Icon: Home },
  map: { label: "Map", Icon: Map },
  create: { label: "New moment", isCreate: true },
  chat: { label: "Chat", Icon: MessageCircle },
  profile: { label: "Profile", isProfile: true },
};

/** Strip RN default tab-bar chrome that causes the hairline under the floater. */
export const TAB_BAR_SCREEN_STYLE: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "transparent",
  borderTopWidth: 0,
  borderTopColor: "transparent",
  borderWidth: 0,
  elevation: 0,
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
  paddingTop: 0,
  paddingBottom: 0,
  height: undefined,
};

type FloatingTabBarProps = BottomTabBarProps;

/**
 * PWA `BottomNav.tsx` — glass pill, clustered side tabs, center create anchor.
 */
export function FloatingTabBar({ state, navigation, descriptors }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { avatarUrl, label } = useMyAvatar();
  const composer = useCreateComposerOptional();
  const delivery = useNotificationDeliveryOptional();
  const chatUnread = delivery?.chatMessageUnread ?? 0;
  const floatBottom = tabBarBottomOffset(insets);
  const barWidth = tabBarBarWidth(screenWidth);
  const focusedRoute = state.routes[state.index];
  const tabBarStyle = descriptors[focusedRoute.key].options.tabBarStyle as ViewStyle | undefined;

  if (tabBarStyle?.display === "none" || composer?.overlayOpen) {
    return null;
  }

  return (
    <View style={styles.host} pointerEvents="box-none">
      <GlassSurface
        preset="bar"
        style={[
          styles.bar,
          { width: barWidth, marginBottom: floatBottom, borderRadius: tabBarMetrics.barRadius },
        ]}
        sheen
      >
        <View style={styles.row}>
          <View style={styles.sideLeft}>
            {state.routes.slice(0, 2).map((route, index) => renderTab(route, index))}
          </View>
          {renderTab(state.routes[2], 2)}
          <View style={styles.sideRight}>
            {state.routes.slice(3).map((route, index) => renderTab(route, index + 3))}
          </View>
        </View>
      </GlassSurface>
    </View>
  );

  function renderTab(route: (typeof state.routes)[number] | undefined, index: number) {
    if (!route) return null;
    const config = TAB_CONFIG[route.name];
    if (!config) return null;

    const focused = state.index === index;
    const iconColor = focused ? colors.accentActive : colors.textWhite65;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (focused && !event.defaultPrevented) {
        if (route.name === "hub" || route.name === "chat" || route.name === "profile") {
          emitTabScrollToTop(route.name as TabScrollTarget);
        }
        return;
      }
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    if (config.isCreate) {
      return (
        <Pressable
          key={route.key}
          onPress={() => composer?.openCreateComposer({ mode: "both", tab: "moments" })}
          accessibilityRole="button"
          accessibilityLabel={config.label}
          accessibilityState={{ selected: focused }}
          style={({ pressed }) => [styles.createHit, pressed && styles.pressed]}
        >
          <View style={[styles.createOrb, glass.createButton]}>
            <Plus size={PLUS_SIZE} color="#fff" strokeWidth={2.5} />
          </View>
        </Pressable>
      );
    }

    if (config.isProfile) {
      return (
        <Pressable
          key={route.key}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={config.label}
          accessibilityState={{ selected: focused }}
          style={styles.tabHit}
        >
          <TabBarProfileAvatar avatarUrl={avatarUrl} label={label} active={focused} />
        </Pressable>
      );
    }

    const Icon = config.Icon!;
    const isChat = route.name === "chat";

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          isChat && chatUnread > 0 ? `${config.label}, ${chatUnread} unread` : config.label
        }
        accessibilityState={{ selected: focused }}
        style={styles.tabHit}
      >
        <View style={[styles.iconWell, !focused && styles.iconWellIdle, focused && styles.iconWellActive]}>
          <Icon
            size={ICON_SIZE}
            color={iconColor}
            strokeWidth={focused ? STROKE_ACTIVE : STROKE_INACTIVE}
          />
          {isChat ? <UnreadBadge count={chatUnread} style={styles.tabBadge} /> : null}
        </View>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: tabBarMetrics.hostPaddingX,
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "transparent",
    zIndex: tabBarMetrics.zIndex,
    elevation: 0,
  },
  bar: {
    paddingHorizontal: tabBarMetrics.barPaddingX,
    paddingVertical: tabBarMetrics.barPaddingY,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tabBarMetrics.rowGap,
  },
  sideLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tabBarMetrics.sideTabGap,
    paddingRight: tabBarMetrics.sideInsetTowardCenter,
  },
  sideRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: tabBarMetrics.sideTabGap,
    paddingLeft: tabBarMetrics.sideInsetTowardCenter,
  },
  tabHit: {
    width: tabBarMetrics.iconWellSize,
    height: tabBarMetrics.iconWellSize,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  iconWell: {
    width: tabBarMetrics.iconWellSize,
    height: tabBarMetrics.iconWellSize,
    borderRadius: tabBarMetrics.iconWellRadius,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconWellIdle: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "transparent",
  },
  iconWellActive: {
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  tabBadge: {
    position: "absolute",
    top: -2,
    right: -2,
  },
  createHit: {
    width: tabBarMetrics.createSize,
    height: tabBarMetrics.createSize,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  createOrb: {
    width: tabBarMetrics.createSize,
    height: tabBarMetrics.createSize,
    borderRadius: tabBarMetrics.createRadius,
    alignItems: "center",
    justifyContent: "center",
  },
});
