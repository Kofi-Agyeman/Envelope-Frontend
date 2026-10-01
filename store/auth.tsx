import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authService, type AuthSession } from '@/services/auth';
import {
  onSessionExpired,
  onTokensChanged,
} from '@/services/tokenManager';
import type { LoginPayload, Profile, RegisterPayload } from '@/types';
import type { UserPreferences } from '@/types';

const PREFS_KEY = 'envelope.preferences';

export const defaultPreferences: UserPreferences = {
  hideBalance: false,
  biometricsEnabled: true,
  pushNotifications: true,
  hapticFeedback: true,
  hasSeenOnboarding: false,
};

type AuthState = {
  status: 'loading' | 'signed-out' | 'signed-in';
  profile: Profile | null;
  token: string | null;
  preferences: UserPreferences;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => void;
  setPreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences);

  // The boot restore below is async. If the user signs in or signs up while it
  // is still awaiting storage, its result is stale and must not overwrite the
  // session that has just been established.
  const settled = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [session, prefsRaw] = await Promise.all([
          authService.restoreSession(),
          AsyncStorage.getItem(PREFS_KEY),
        ]);
        if (!active) return;
        if (prefsRaw) {
          try {
            setPreferences({ ...defaultPreferences, ...JSON.parse(prefsRaw) });
          } catch {
            // Ignore malformed preference storage.
          }
        }
        if (settled.current) return;
        if (session) {
          setProfile(session.profile);
          setToken(session.tokens.accessToken);
          setStatus('signed-in');
        } else {
          setStatus('signed-out');
        }
      } catch {
        if (active && !settled.current) setStatus('signed-out');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const applySession = useCallback((session: AuthSession) => {
    settled.current = true;
    setProfile(session.profile);
    setToken(session.tokens.accessToken);
    setStatus('signed-in');
  }, []);

  // A background refresh swaps the access token underneath us; keep the store
  // in step so later requests use the fresh one. A failed refresh means the
  // session is unrecoverable, so drop straight back to signed-out.
  useEffect(
    () =>
      onSessionExpired(() => {
        void authService.logout().finally(() => {
          setProfile(null);
          setToken(null);
          setStatus('signed-out');
        });
      }),
    [],
  );

  useEffect(
    () =>
      onTokensChanged((next) => {
        setToken(next.accessToken);
      }),
    [],
  );

  const signIn = useCallback(
    async (payload: LoginPayload) => {
      const session = await authService.login(payload);
      applySession(session);
    },
    [applySession],
  );

  const signUp = useCallback(
    async (payload: RegisterPayload) => {
      const session = await authService.register(payload);
      applySession(session);
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    await authService.logout();
    setProfile(null);
    setToken(null);
    setStatus('signed-out');
  }, []);

  const setPreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value };
        AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const completeOnboarding = useCallback(() => {
    setPreference('hasSeenOnboarding', true);
  }, [setPreference]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      profile,
      token,
      preferences,
      signIn,
      signUp,
      signOut,
      completeOnboarding,
      setPreference,
    }),
    [
      status,
      profile,
      token,
      preferences,
      signIn,
      signUp,
      signOut,
      completeOnboarding,
      setPreference,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
