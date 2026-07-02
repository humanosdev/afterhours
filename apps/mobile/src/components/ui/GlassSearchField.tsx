import type { ReactNode } from "react";
import { StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../../theme/colors";

type GlassSearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  inputRef?: React.RefObject<TextInput | null>;
  /** Leading icon slot (e.g. Search from lucide). */
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Single-border search field — matches PWA sticky search + bottom-nav glass.
 * Parent supplies flat `Surface variant="field"` wrapper.
 */
export function GlassSearchField({
  value,
  onChangeText,
  placeholder = "Search friends, people, venues...",
  inputRef,
  leading,
  style,
}: GlassSearchFieldProps) {
  return (
    <View style={[styles.host, style]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.38)"
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        accessibilityLabel={placeholder}
      />
      {!value ? null : (
        <Text style={styles.srOnly} accessibilityElementsHidden>
          {placeholder}
        </Text>
      )}
    </View>
  );
}

const SEARCH_FIELD_HEIGHT = 48;

const styles = StyleSheet.create({
  host: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: SEARCH_FIELD_HEIGHT,
    minHeight: SEARCH_FIELD_HEIGHT,
    paddingLeft: 40,
    paddingRight: 12,
  },
  leading: {
    position: "absolute",
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
    height: SEARCH_FIELD_HEIGHT,
    textAlignVertical: "center",
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
