// Client-side checks that mirror the backend's rules, so users see mistakes
// immediately instead of after a round trip. The backend still validates everything.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @returns {string | undefined} Error message, or undefined if valid. */
export function validateEmail(email) {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address';
  if (email.trim().length > 255) return 'Email must be at most 255 characters';
  return undefined;
}

/** @returns {string | undefined} */
export function validateName(name) {
  if (!name.trim()) return 'Name is required';
  if (name.trim().length > 100) return 'Name must be at most 100 characters';
  return undefined;
}

/** Strength rules for a new password (login only checks it isn't empty). @returns {string | undefined} */
export function validateNewPassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  if (password.length > 72) return 'Password must be at most 72 characters';
  return undefined;
}

/** Removes undefined entries, so `Object.keys(errors).length === 0` means the form is valid. */
export function compactErrors(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}
