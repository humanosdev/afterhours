import { Pressable, StyleSheet, Text } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { ChatThreadRow } from "../../src/components/ChatThreadRow";
import { GlassSurface } from "../../src/components/GlassSurface";
import { SearchFieldPlaceholder } from "../../src/components/SearchFieldPlaceholder";
import { colors } from "../../src/theme/colors";
import { glass } from "../../src/theme/glass";
import { layout } from "../../src/theme/layout";

const THREADS = [
  { name: "Maya Chen", preview: "See you at the bar?", time: "9:41 PM", unread: true },
  { name: "Jordan Lee", preview: "On my way", time: "8:12 PM" },
  { name: "Alex Rivera", preview: "This place is packed 🔥", time: "Yesterday" },
  { name: "Sam Ortiz", preview: "You still out?", time: "Mon" },
];

export default function ChatTabScreen() {
  return (
    <Screen scroll edges={["top", "left", "right"]} tabBarInset>
      <ScreenHeader
        title="Messages"
        subtitle="Chats sync on web/PWA — preview only here"
        trailing={
          <Pressable
            style={styles.newButton}
            accessibilityRole="button"
            accessibilityLabel="New message"
            accessibilityState={{ disabled: true }}
            disabled
          >
            <Text style={styles.newLabel}>New</Text>
          </Pressable>
        }
      />

      <SearchFieldPlaceholder placeholder="Search by username" />

      <GlassSurface style={styles.listWrap} muted>
        {THREADS.map((thread, index) => (
          <ChatThreadRow
            key={thread.name}
            name={thread.name}
            preview={thread.preview}
            time={thread.time}
            unread={thread.unread}
            isLast={index === THREADS.length - 1}
          />
        ))}
      </GlassSurface>

      <Text style={styles.footnote}>Real threads and realtime live on web/PWA.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  newButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    ...glass.iconWell,
    opacity: 0.92,
  },
  newLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textWhite78,
  },
  listWrap: {
    borderRadius: layout.cardRadius,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 2,
  },
  footnote: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textWhite42,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
