import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { colors } from '@/constants/colors';
import { AuthProvider, useAuth } from '@/store/auth';
import { DataProvider } from '@/store/data';
import { setHapticsEnabled } from '@/utils/haptics';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
  animation: 'slide_from_right',
} as const;

/**
 * Only the signed-in tree lives in this navigator. `(tabs)/index` owns the `/`
 * path, which is why there is no `app/index.tsx` — two files claiming `/`
 * would make expo-router silently pick one.
 */
function AppNavigator() {
  const { preferences } = useAuth();

  return (
    <Stack
      initialRouteName={preferences.hasSeenOnboarding ? '(tabs)' : 'onboarding'}
      screenOptions={screenOptions}
    >
      <Stack.Screen
        name="onboarding"
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="envelope/created"
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
      <Stack.Screen
        name="envelope/[id]"
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

function AuthNavigator() {
  return (
    <Stack screenOptions={{ ...screenOptions, animation: 'fade' }}>
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

function RootNavigator() {
  const { status, preferences } = useAuth();

  React.useEffect(() => {
    setHapticsEnabled(preferences.hapticFeedback);
  }, [preferences.hapticFeedback]);

  if (status === 'loading') return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      {status === 'signed-out' ? <AuthNavigator /> : <AppNavigator />}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <AuthProvider>
            <DataProvider>
              <RootNavigator />
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
