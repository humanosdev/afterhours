import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type AuthStatusMessageProps = {
  message: string;
  tone?: "neutral" | "error" | "success";
};

/** PWA auth form status boxes — forgot/reset/signup. */
export function AuthStatusMessage({ message, tone = "neutral" }: AuthStatusMessageProps) {
  const isError = tone === "error";
  const isSuccess = tone === "success";

  return (
    <View
      style={[
        styles.box,
        isError && styles.error,
        isSuccess && styles.success,
        !isError && !isSuccess && styles.neutral,
      ]}
    >
      <Text style={[styles.text, isError && styles.errorText, isSuccess && styles.successText]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  neutral: {
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  error: {
    borderColor: "rgba(248, 113, 113, 0.3)",
    backgroundColor: colors.errorMuted,
  },
  success: {
    borderColor: "rgba(52, 211, 153, 0.3)",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.errorText,
  },
  successText: {
    color: "#6ee7b7",
  },
});
