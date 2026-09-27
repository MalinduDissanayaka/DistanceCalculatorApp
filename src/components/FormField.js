import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../constants/config';

/**
 * Labelled text input with an inline error message. Password fields get a
 * Show/Hide toggle. Any other TextInput props are passed through.
 *
 * @param {object} props
 * @param {string} props.label Field label, e.g. "Email".
 * @param {string} [props.error] Error shown under the field (also turns the border red).
 * @param {boolean} [props.password] Hides the text and shows a Show/Hide toggle.
 * @param {import('react').Ref<TextInput>} [props.ref] Lets the parent focus this field.
 */
export default function FormField({ label, error, password = false, ref, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused, error && styles.inputRowError]}>
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={COLORS.disabled}
          secureTextEntry={password && hidden}
          autoCapitalize={password ? 'none' : inputProps.autoCapitalize}
          autoCorrect={false}
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
        {password ? (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityRole="button">
            <Text style={styles.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
  },
  inputRowFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.card },
  inputRowError: { borderColor: COLORS.danger },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  toggle: { color: COLORS.primary, fontWeight: '600', fontSize: 13, marginLeft: 8 },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 5 },
});
