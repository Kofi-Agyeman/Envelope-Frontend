import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import { Redirect, useSegments } from 'expo-router';
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
import { ThemeProvider, useTheme } from '@/store/theme';
import { AuthProvider, useAuth } from '@/store/auth';
import { DataProvider } from '@/store/data';
import { setHapticsEnabled } from '@/utils/haptics';

const animations = {
  headerShown: false,
  animation: 'slide_from_right',
} as const;

/**
 * Only the signed-in tree lives in this navigator. `(tabs)/index` owns the `/`
 * path, which is why there is no `app/index.tsx` — two files claiming `/`
 * would make expo-router silently pick one.
 */
function AppNavigator() {
  const { preferences } = useAuth();
  const { colors } = useTheme();

  return (
    <Stack
      initialRouteName={preferences.hasSeenOnboarding ? '(tabs)' : 'onboarding'}
      screenOptions={{ ...animations, contentStyle: { backgroundColor: colors.background } }}
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
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        ...animations,
        animation: 'fade',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

function RootNavigator() {
  const { status, preferences } = useAuth();
  const { colors, scheme } = useTheme();
  const segments = useSegments();
  const isDark = scheme === 'dark';

  React.useEffect(() => {
    setHapticsEnabled(preferences.hapticFeedback);
  }, [preferences.hapticFeedback]);

  const navigationTheme = React.useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
      },
    };
  }, [isDark, colors]);

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  // Signing in must actively move the URL, not just swap the tree below it.
  // Both navigators render a <Stack> in the same position, so React reuses the
  // existing one and the router stays parked on /login, which the signed-in
  // stack does not own. Redirecting first is what makes the transition
  // immediate instead of requiring an app restart.
  if (status === 'signed-in' && segments[0] === '(auth)') {
    return (
      <Redirect
        href={preferences.hasSeenOnboarding ? '/(tabs)' : '/onboarding'}
      />
    );
  }

  // The mirror case: a session that has ended must not leave the user sitting
  // on a protected screen. Sign-out navigates explicitly, so this only covers
  // a session that expires mid-use.
  if (status === 'signed-out' && segments[0] !== '(auth)') {
    return <Redirect href="/(auth)/login" />;
  }

  // A key tied to the auth state forces React to discard the outgoing
  // navigator and build the incoming one. Without it the two <Stack>s are
  // reconciled as the same component and the stale route tree survives.
  const navigatorKey = status;

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {status === 'signed-out' ? (
          <AuthNavigator key={navigatorKey} />
        ) : (
          <AppNavigator key={navigatorKey} />
        )}
      </View>
    </NavigationThemeProvider>
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
        <ThemeProvider>
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