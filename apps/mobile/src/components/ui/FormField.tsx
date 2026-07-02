import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppTextField } from "../AppTextField";
import { colors } from "../../theme/colors";

type FormFieldProps = {
  label: string;
  hint?: string;
  children?: ReactNode;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

/** PWA edit-profile field: `text-sm text-white/60` label + `rounded-xl bg-primary/40 border-white/10`. */
export function FormField({
  label,
  hint,
  children,
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline,
  rows = 4,
  autoCapitalize,
}: FormFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {children ?? (
        <AppTextField
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? rows : 1}
          autoCapitalize={autoCapitalize}
          style={multiline ? [styles.input, styles.textArea, { minHeight: rows * 22 }] : styles.input}
        />
      )}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: colors.textWhite65,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "rgba(10, 12, 24, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  textArea: {
    textAlignVertical: "top",
    paddingTop: 12,
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textWhite42,
  },
});
