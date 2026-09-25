import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Hide Android's system back/home/recent buttons (swipe up from the bottom edge to show them). */}
      <NavigationBar hidden />
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
