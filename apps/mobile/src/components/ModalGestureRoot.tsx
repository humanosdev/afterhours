import { Modal, StyleSheet, type ModalProps } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

/** RN `Modal` renders in a separate native window — wrap gesture-handler descendants. */
export function ModalGestureRoot({ children, ...rest }: ModalProps) {
  return (
    <Modal {...rest}>
      <GestureHandlerRootView style={styles.root}>{children}</GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
