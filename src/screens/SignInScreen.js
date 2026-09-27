import React, { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';

import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { COLORS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { compactErrors, validateEmail } from '../utils/validation';

/**
 * Log in with email and password. On success the root layout's route guard
 * switches to the app automatically — no manual navigation needed.
 */
export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef(null);

  // Typing in a field clears its stale error.
  const edit = (setter, field) => (text) => {
    setter(text);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    if (formError) setFormError('');
  };

  const submit = async () => {
    const found = compactErrors({
      email: validateEmail(email),
      password: password ? undefined : 'Password is required',
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (error) {
      if (Object.keys(error.fieldErrors ?? {}).length > 0) setErrors(error.fieldErrors);
      else setFormError(error.message); // e.g. "Invalid email or password"
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to calculate fares and see your trips"
      error={formError}
      submitLabel="Log in"
      onSubmit={submit}
      submitting={submitting}
      footer={
        <>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Link href="/sign-up" replace style={styles.link}>Sign up</Link>
        </>
      }
    >
      <FormField
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={edit(setEmail, 'email')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <FormField
        ref={passwordRef}
        label="Password"
        placeholder="Your password"
        value={password}
        onChangeText={edit(setPassword, 'password')}
        error={errors.password}
        password
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerText: { color: COLORS.muted, fontSize: 14 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
