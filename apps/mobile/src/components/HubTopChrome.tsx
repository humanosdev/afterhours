import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Heart } from "lucide-react-native";
import { useNotificationDelivery } from "../providers/NotificationDeliveryProvider";
import { UnreadBadge } from "./ui/UnreadBadge";
import { TabScreenHeader } from "./TabScreenHeader";
import { colors } from "../theme/colors";

const HUB_LOGO = require("../../assets/hub-logo.png");
const HEART_SIZE = 24;
const HEART_STROKE = 2.25;

/** Hub tab header — title left, logo center, notifications right. */
export function HubTopChrome() {
  const router = useRouter();
  const { hubActivityUnread } = useNotificationDelivery();

  return (
    <TabScreenHeader
      title="Hub"
      centerSlot={
        <Image
          source={HUB_LOGO}
          style={styles.hubLogo}
          contentFit="contain"
          contentPosition="center"
          cachePolicy="memory-disk"
          accessibilityLabel="Intencity"
        />
      }
      rightSlot={
        <View style={styles.heartWrap}>
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel={
              hubActivityUnread > 0
                ? `Notifications, ${hubActivityUnread} unread`
                : "Notifications"
            }
            hitSlop={6}
            style={({ pressed }) => [styles.heartHit, pressed && styles.heartPressed]}
          >
            <Heart
              size={HEART_SIZE}
              strokeWidth={HEART_STROKE}
              color={hubActivityUnread > 0 ? colors.accentActive : colors.textWhite85}
              fill={hubActivityUnread > 0 ? "rgba(59, 102, 255, 0.22)" : "transparent"}
            />
          </Pressable>
          <UnreadBadge count={hubActivityUnread} style={styles.heartBadge} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  hubLogo: {
    width: 36,
    height: 36,
  },
  heartWrap: {
    position: "relative",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  heartHit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  heartBadge: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  heartPressed: {
    opacity: 0.72,
  },
});
