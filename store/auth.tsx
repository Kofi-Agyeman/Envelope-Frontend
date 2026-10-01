import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService, type AuthSession } from '@/services/auth';
import type { LoginPayload, Profile, RegisterPayload } from '@/types';
import type { UserPreferences } from '@/types';

const PREFS_KEY = 'pingpay.preferences';

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
        if (session) {
          setProfile(session.profile);
          setToken(session.tokens.accessToken);
          setStatus('signed-in');
        } else {
          setStatus('signed-out');
        }
      } catch {
        if (active) setStatus('signed-out');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const applySession = useCallback((session: AuthSession) => {
    setProfile(session.profile);
    setToken(session.tokens.accessToken);
    setStatus('signed-in');
  }, []);

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
