import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { ShellCard } from "../../src/components/ShellCard";
import { ShellListRow } from "../../src/components/ShellListRow";
import { glass } from "../../src/theme/glass";
import { colors } from "../../src/theme/colors";

const ACTIONS = [
  { title: "New moment", subtitle: "Photo or video story" },
  { title: "Share where you are", subtitle: "Venue check-in" },
  { title: "Invite friends", subtitle: "Start a thread" },
];

export default function CreateTabScreen() {
  return (
    <Screen scroll edges={["top", "left", "right"]} tabBarInset>
      <View style={styles.hero}>
        <View style={[styles.orb, glass.createButton]}>
          <Ionicons name="add" size={32} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Share the night</Text>
        <Text style={styles.heroSub}>Capture and post on web today</Text>
      </View>

      <ShellCard>
        {ACTIONS.map((row, index) => (
          <ShellListRow
            key={row.title}
            title={row.title}
            subtitle={row.subtitle}
            isLast={index === ACTIONS.length - 1}
          />
        ))}
      </ShellCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
    marginBottom: 8,
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
