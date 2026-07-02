import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AuthViewportLayout } from "./AuthViewportLayout";

type AuthFormLayoutProps = {
  header: ReactNode;
  children: ReactNode;
};

/** Login / signup / password — viewport-fit with keyboard overflow scroll. */
export function AuthFormLayout({ header, children }: AuthFormLayoutProps) {
  return (
    <AuthViewportLayout>
      <View style={styles.stack}>
        <View style={styles.header}>{header}</View>
        <View style={styles.form}>{children}</View>
      </View>
    </AuthViewportLayout>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: "100%",
  },
  header: {
    width: "100%",
  },
  form: {
    width: "100%",
  },
});
