import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Image, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

// Height of the tab bar itself, not counting any bottom safe-area inset.
const TAB_BAR_HEIGHT = 56;

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/home.png')}
              style={{ width: 22, height: 22, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
