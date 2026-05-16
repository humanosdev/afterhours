import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { colors } from "../theme/colors";

type AppTextFieldProps = TextInputProps;

export function AppTextField(props: AppTextFieldProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.textMuted}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
});
