import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/context/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

/**
 * Shows the app when logged in and the Log in / Sign up screens otherwise.
 * Logging in or out flips the guards and Expo Router moves to the first
 * screen that is allowed, so screens never need to redirect by hand.
 */
function RootNavigator() {
  const colorScheme = useColorScheme();
  const { session, isLoading } = useAuth();

  // Keep the native splash screen up until we know whether a saved session exists.
  if (isLoading) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Hide Android's system back/home/recent buttons (swipe up from the bottom edge to show them). */}
      <NavigationBar hidden />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
          <Stack.Screen name="sign-up" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
