import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Small key-value store for secrets such as the login token.
 * On iOS/Android values are encrypted with expo-secure-store (Keychain / Keystore).
 * SecureStore doesn't support web, so the web build falls back to localStorage.
 */

export async function getItem(key) {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key, value) {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Storage blocked (e.g. private mode): the session just won't survive a reload.
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function removeItem(key) {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Nothing to remove.
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
