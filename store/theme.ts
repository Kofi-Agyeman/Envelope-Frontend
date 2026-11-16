import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import {
  darkColors,
  lightColors,
  makeShadows,
  makeStatusColors,
  makeTelcoPalette,
  type Palette,
  type TelcoSupport,
  type ThemeMode,
} from '@/constants/theme';

const THEME_KEY = 'envelope.theme.mode';

export type ResolvedScheme = 'light' | 'dark';

type ThemeState = {
  mode: ThemeMode;
  scheme: ResolvedScheme;
  colors: Palette;
  telco: TelcoSupport | null;
  shadows: ReturnType<typeof makeShadows>;
  statusColors: ReturnType<typeof makeStatusColors>;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
  setTelco: (telco: TelcoSupport | null) => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

const MODES: ThemeMode[] = ['light', 'dark', 'system'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);
  const [telco, setTelcoState] = useState<TelcoSupport | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => undefined);
  }, []);

  const cycleMode = useCallback(() => {
    setModeState((current) => {
      const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
      AsyncStorage.setItem(THEME_KEY, next).catch(() => undefined);
      return next;
    });
  }, []);

  

  const value = useMemo<ThemeState>(() => {
    const effectiveMode: ThemeMode = ready ? mode : 'dark';
    const effectiveScheme: ResolvedScheme =
      effectiveMode === 'system'
        ? (systemScheme === 'light' ? 'light' : 'dark')
        : effectiveMode;
    let colors: Palette =
      effectiveScheme === 'dark' ? darkColors : lightColors;
    if (telco) {
      colors = makeTelcoPalette(colors, telco);
    }

    return {
      mode: effectiveMode,
      scheme: effectiveScheme,
      colors,
      telco,
      shadows: makeShadows(effectiveScheme),
      statusColors: makeStatusColors(colors),
      setMode,
      cycleMode,
      setTelco: setTelcoState,
    };
  }, [mode, ready, systemScheme, telco, setMode, cycleMode]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export const useThemeColors = (): Palette => useTheme().colors;

/**
 * Builds a stylesheet from the active palette and caches it per scheme so a
 * theme switch recomputes styles exactly once.
 */
export function useThemedStyles<T extends Record<string, object>>(
  factory: (colors: Palette, scheme: ResolvedScheme) => T,
): T {
  const { colors, scheme } = useTheme();
  return useMemo(
    () => StyleSheet.create(factory(colors, scheme)) as unknown as T,
    [colors, scheme, factory],
  );
}