import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "./Screen";
import { StackScreenHeader } from "./StackScreenHeader";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

export type LegalSection = {
  heading?: string;
  paragraphs: string[];
};

type LegalDocumentScreenProps = {
  title: string;
  subtitle?: string;
  sections: LegalSection[];
};

/** Mirrors PWA legal pages (`/privacy`, `/terms`, `/guidelines`) typography and structure. */
export function LegalDocumentScreen({ title, subtitle, sections }: LegalDocumentScreenProps) {
  const lastUpdated = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Screen edges={["top", "left", "right"]}>
      <StackScreenHeader title={title} />
      <View style={styles.headerRule} />
      <Text style={styles.updated}>Last updated: {lastUpdated}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        style={styles.scroll}
      >
        {sections.map((section, i) => (
          <View key={i} style={styles.section}>
            {section.heading ? <Text style={styles.sectionHeading}>{section.heading}</Text> : null}
            {section.paragraphs.map((p, j) => (
              <Text key={j} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginTop: -8,
    marginBottom: 12,
  },
  updated: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite55,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textWhite55,
    marginBottom: 4,
  },
  scroll: {
    flex: 1,
  },
  body: {
    paddingTop: 20,
    paddingBottom: 40,
    gap: 24,
    maxWidth: layout.contentMaxWidth,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textWhite85,
  },
});
