import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type AppTextFieldProps = TextInputProps;

/** PWA auth input — `rounded-xl bg-white/5 border-white/10 p-3`. */
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
    borderColor: colors.inputBorder,
    borderRadius: layout.inputRadius,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.inputBg,
  },
});
