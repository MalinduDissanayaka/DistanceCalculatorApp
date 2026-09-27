import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, SHADOW } from '../constants/config';

/**
 * Shared frame for the Log in and Sign up screens: app title, a card holding
 * the form, an error banner, the submit button and a footer (e.g. a link to
 * the other screen).
 *
 * @param {object} props
 * @param {string} props.title Card title, e.g. "Welcome back".
 * @param {string} props.subtitle Line under the title.
 * @param {string} [props.error] Form-level error shown above the fields.
 * @param {string} props.submitLabel Submit button text.
 * @param {() => void} props.onSubmit
 * @param {boolean} props.submitting Shows a spinner and disables the button.
 * @param {import('react').ReactNode} props.children Form fields.
 * @param {import('react').ReactNode} props.footer Content under the card.
 */
export default function AuthLayout({ title, subtitle, error, submitLabel, onSubmit, submitting, children, footer }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>🚕</Text>
            </View>
            <Text style={styles.appName}>Ride Fare Calculator</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {error ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {children}

            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={submitting}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{submitLabel}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: 16, paddingVertical: 32 },

  brand: { alignItems: 'center', marginBottom: 24 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoText: { fontSize: 32 },
  appName: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 20, ...SHADOW },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 4 },

  errorBanner: { backgroundColor: COLORS.dangerSoft, borderRadius: 10, padding: 12, marginTop: 14 },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 22,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonDisabled: { backgroundColor: COLORS.disabled },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
});
