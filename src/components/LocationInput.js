import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../constants/config';

/**
 * Labelled location search field with a coloured marker dot and a Set/Update button.
 *
 * @param {object} props
 * @param {string} props.label Field label, e.g. "Start Location".
 * @param {string} props.color Marker dot colour.
 * @param {string} props.value Current text.
 * @param {(text: string) => void} props.onChangeText Called on every keystroke.
 * @param {() => void} props.onSubmit Called from the button or keyboard "search" key.
 * @param {boolean} props.loading Shows a spinner and disables the button.
 * @param {{ name: string } | null} props.resolved Found location; its name is shown below the field.
 * @param {string} [props.placeholder]
 */
export default function LocationInput({ label, color, value, onChangeText, onSubmit, loading, resolved, placeholder }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.disabled}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.setButton, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.setButtonText}>{resolved ? 'Update' : 'Set'}</Text>
          )}
        </TouchableOpacity>
      </View>
      {resolved ? (
        <Text style={styles.resolvedText} numberOfLines={2}>
          ✓ {resolved.name}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.muted, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#FAFBFC',
    paddingLeft: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  setButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    minWidth: 76,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 11,
    borderBottomRightRadius: 11,
  },
  buttonDisabled: { backgroundColor: COLORS.disabled },
  setButtonText: { color: '#fff', fontWeight: '700' },
  resolvedText: { fontSize: 12, color: COLORS.start, marginTop: 6 },
});
