import React, { useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../constants/config';
import useLocationSuggestions from '../hooks/useLocationSuggestions';

/**
 * Labelled location search field with a coloured marker dot, a Set/Update
 * button, and a search-as-you-type suggestion list shown while focused.
 *
 * @param {object} props
 * @param {string} props.label Field label, e.g. "Start Location".
 * @param {string} props.color Marker dot colour.
 * @param {string} props.value Current text.
 * @param {(text: string) => void} props.onChangeText Called on every keystroke.
 * @param {() => void} props.onSubmit Called from the button or keyboard "search" key.
 * @param {(suggestion: import('../hooks/useLocationSuggestions').Suggestion) => void} props.onSelectSuggestion
 *   Called when the user taps a suggestion.
 * @param {boolean} props.loading Shows a spinner and disables the button.
 * @param {{ name: string } | null} props.resolved Found location; its name is shown below the field.
 * @param {string} [props.placeholder]
 */
export default function LocationInput({
  label,
  color,
  value,
  onChangeText,
  onSubmit,
  onSelectSuggestion,
  loading,
  resolved,
  placeholder,
}) {
  const [focused, setFocused] = useState(false);
  // Only suggest while typing a new place, not after one has been chosen.
  const { suggestions, loading: suggesting, error, empty } = useLocationSuggestions(value, focused && !resolved);

  const showList = suggesting || error || empty || suggestions.length > 0;

  const select = (suggestion) => {
    Keyboard.dismiss();
    onSelectSuggestion(suggestion);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.disabled}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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

      {showList ? (
        <View style={styles.suggestionBox}>
          {suggesting ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.statusText}>Searching…</Text>
            </View>
          ) : error ? (
            <Text style={[styles.statusRow, styles.statusText]}>
              {"Couldn't load suggestions. Tap Set to search instead."}
            </Text>
          ) : empty ? (
            <Text style={[styles.statusRow, styles.statusText]}>No matches. Try another spelling or tap Set.</Text>
          ) : (
            suggestions.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.suggestion, index > 0 && styles.suggestionDivider]}
                onPress={() => select(item)}
                activeOpacity={0.6}
              >
                <Text style={styles.suggestionIcon}>📍</Text>
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>{item.title}</Text>
                  {item.subtitle ? (
                    <Text style={styles.suggestionSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : null}

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
  inputRowFocused: { borderColor: COLORS.primary },
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

  suggestionBox: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  suggestionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  suggestionIcon: { fontSize: 14, marginRight: 10 },
  suggestionTextWrap: { flex: 1 },
  suggestionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  suggestionSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  statusText: { fontSize: 13, color: COLORS.muted, marginLeft: 8 },
});
