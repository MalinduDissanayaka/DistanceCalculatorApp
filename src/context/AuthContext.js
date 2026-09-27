import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import * as api from '../utils/api';
import * as storage from '../utils/secureStorage';

const SESSION_KEY = 'auth.session';

/**
 * @typedef {object} Session
 * @property {string} token JWT sent as a Bearer token.
 * @property {number} expiresAt Epoch milliseconds when the token stops working.
 * @property {{ id: number, name: string, email: string }} user
 */

const AuthContext = createContext(null);

/** Converts a signup/login response into the session we keep. */
function toSession(response) {
  return {
    token: response.token,
    expiresAt: Date.now() + response.expiresIn,
    user: { id: response.userId, name: response.name, email: response.email },
  };
}

/**
 * Keeps the logged-in user's session, persisted in secure storage so the
 * user stays logged in between app launches until the token expires.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(/** @type {Session | null} */ (null));
  const [isLoading, setIsLoading] = useState(true);

  // Restore a saved session on startup, dropping it if the token has expired.
  useEffect(() => {
    (async () => {
      try {
        const saved = JSON.parse((await storage.getItem(SESSION_KEY)) ?? 'null');
        if (saved?.token && saved.expiresAt > Date.now()) {
          setSession(saved);
        } else if (saved) {
          await storage.removeItem(SESSION_KEY);
        }
      } catch {
        // Unreadable session: start logged out.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const startSession = useCallback(async (response) => {
    const next = toSession(response);
    await storage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const signIn = useCallback(
    async (email, password) => startSession(await api.login(email, password)),
    [startSession],
  );

  const signUp = useCallback(
    async (name, email, password) => startSession(await api.signUp(name, email, password)),
    [startSession],
  );

  const signOut = useCallback(async () => {
    setSession(null);
    await storage.removeItem(SESSION_KEY);
  }, []);

  /** Logs out and tells the user why. The router then shows the login screen. */
  const expireSession = useCallback(async () => {
    await signOut();
    Alert.alert('Session expired', 'Please log in again to continue.');
  }, [signOut]);

  /**
   * Runs an API call that needs the token, e.g. `withToken((t) => api.saveTrip(t, trip))`.
   * An expired or rejected token (401) logs the user out; the error is still
   * thrown, so callers should skip their own alert when `error.status === 401`.
   */
  const withToken = useCallback(async (apiCall) => {
    if (!session || session.expiresAt <= Date.now()) {
      await expireSession();
      throw new api.ApiError('Your session has expired. Please log in again.', 401);
    }
    try {
      return await apiCall(session.token);
    } catch (error) {
      if (error?.status === 401) await expireSession();
      throw error;
    }
  }, [session, expireSession]);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, isLoading, signIn, signUp, signOut, withToken }),
    [session, isLoading, signIn, signUp, signOut, withToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the auth session and actions. Must be used inside <AuthProvider>. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
