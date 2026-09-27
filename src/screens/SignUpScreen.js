import React, { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';

import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { COLORS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { compactErrors, validateEmail, validateName, validateNewPassword } from '../utils/validation';

/**
 * Create an account. The backend returns a token on signup, so the user is
 * logged in straight away and taken to the app.
 */
export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  // Typing in a field clears its stale error.
  const edit = (field) => (text) => {
    setForm((f) => ({ ...f, [field]: text }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    if (formError) setFormError('');
  };

  const submit = async () => {
    const found = compactErrors({
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validateNewPassword(form.password),
      confirmPassword: form.confirmPassword !== form.password ? 'Passwords do not match' : undefined,
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signUp(form.name.trim(), form.email.trim().toLowerCase(), form.password);
    } catch (error) {
      if (error.status === 409) setErrors({ email: 'An account with this email already exists. Try logging in.' });
      else if (Object.keys(error.fieldErrors ?? {}).length > 0) setErrors(error.fieldErrors);
      else setFormError(error.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Save your trips and view them any time"
      error={formError}
      submitLabel="Sign up"
      onSubmit={submit}
      submitting={submitting}
      footer={
        <>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/sign-in" replace style={styles.link}>Log in</Link>
        </>
      }
    >
      <FormField
        label="Full name"
        placeholder="e.g. Kamal Perera"
        value={form.name}
        onChangeText={edit('name')}
        error={errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
      />
      <FormField
        ref={emailRef}
        label="Email"
        placeholder="you@example.com"
        value={form.email}
        onChangeText={edit('email')}
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
        placeholder="At least 6 characters"
        value={form.password}
        onChangeText={edit('password')}
        error={errors.password}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        submitBehavior="submit"
      />
      <FormField
        ref={confirmRef}
        label="Confirm password"
        placeholder="Re-enter your password"
        value={form.confirmPassword}
        onChangeText={edit('confirmPassword')}
        error={errors.confirmPassword}
        password
        autoComplete="new-password"
        textContentType="newPassword"
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
