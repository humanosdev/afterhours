import { Pressable, StyleSheet, Text } from "react-native";
import { Screen } from "../../src/components/Screen";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { ChatThreadRow } from "../../src/components/ChatThreadRow";
import { GlassSurface } from "../../src/components/GlassSurface";
import { SearchFieldPlaceholder } from "../../src/components/SearchFieldPlaceholder";
import { colors } from "../../src/theme/colors";

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
        trailing={
          <Pressable style={styles.newButton} accessibilityRole="button" accessibilityLabel="New message">
            <Text style={styles.newLabel}>New</Text>
          </Pressable>
        }
      />
      <SearchFieldPlaceholder placeholder="Search by username" />

      <GlassSurface style={styles.list} muted>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  newButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  newLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  list: {
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
