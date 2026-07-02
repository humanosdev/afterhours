import { Send } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

type StoryViewerReplyBarProps = {
  disabled?: boolean;
  sending?: boolean;
  onSend: (text: string) => void;
};

/** IG-style “Send message…” reply strip on story viewer. */
export function StoryViewerReplyBar({ disabled, sending, onSend }: StoryViewerReplyBarProps) {
  const [text, setText] = useState("");

  function submit() {
    const payload = text.trim();
    if (!payload || disabled || sending) return;
    onSend(payload);
    setText("");
  }

  return (
    <View style={styles.row}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Send message…"
        placeholderTextColor="rgba(255,255,255,0.55)"
        style={styles.input}
        editable={!disabled && !sending}
        returnKeyType="send"
        onSubmitEditing={submit}
        accessibilityLabel="Send message"
      />
      <Pressable
        onPress={submit}
        disabled={disabled || sending || !text.trim()}
        style={[styles.sendBtn, (disabled || sending || !text.trim()) && styles.sendBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Send reply"
      >
        {sending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Send size={20} color="#fff" strokeWidth={2} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
});
