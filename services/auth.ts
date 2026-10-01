import AsyncStorage from '@react-native-async-storage/async-storage';
import { USE_MOCKS } from '@/constants/config';
import { delay } from '@/utils/async';
import { request } from './http';
import { mockProfile } from './mockData';
import { maskPhone } from '@/utils/format';
import type { AuthTokens, LoginPayload, Profile, RegisterPayload } from '@/types';

const TOKEN_KEY = 'pingpay.auth.tokens';
const PROFILE_KEY = 'pingpay.auth.profile';

export type AuthSession = {
  tokens: AuthTokens;
  profile: Profile;
};

/**
 * Local demo credentials accepted while the backend is not connected.
 * In production these are validated by FastAPI.
 */
const DEMO_PHONE = '0245634567';
const DEMO_PASSWORD = 'pingpay';

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function tokensFor(phone: string): AuthTokens {
  const digits = phone.replace(/\D/g, '');
  return {
    accessToken: `demo-access-token.${digits}.${Date.now()}`,
    refreshToken: null,
    tokenType: 'Bearer',
  };
}

export const authService = {
  async restoreSession(): Promise<AuthSession | null> {
    try {
      const [tokensRaw, profileRaw] = await AsyncStorage.multiGet([
        TOKEN_KEY,
        PROFILE_KEY,
      ]);
      const tokens = tokensRaw[1] ? (JSON.parse(tokensRaw[1]) as AuthTokens) : null;
      const profile = profileRaw[1]
        ? (JSON.parse(profileRaw[1]) as Profile)
        : null;
      if (!tokens || !profile) return null;
      return { tokens, profile };
    } catch {
      return null;
    }
  },

  async login(payload: LoginPayload): Promise<AuthSession> {
    if (USE_MOCKS) {
      await delay(900);
      if (!isValidPhone(payload.phone)) {
        throw new Error('Enter a valid MTN MoMo number.');
      }
      // Any well-formed number is accepted in demo mode; the seeded profile
      // stands in for the real MTN MoMo account.
      const session: AuthSession = {
        tokens: tokensFor(payload.phone),
        profile: mockProfile,
      };
      await authService.persist(session);
      return session;
    }

    const tokens = await request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: { phone: payload.phone, password: payload.password },
    });
    const profile = await request<Profile>('/me', {
      token: tokens.accessToken,
    });
    const session = { tokens, profile };
    await authService.persist(session);
    return session;
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    if (USE_MOCKS) {
      await delay(1100);
      if (!isValidPhone(payload.phone)) {
        throw new Error('Enter a valid MTN MoMo number.');
      }
      if (payload.password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      if (payload.password !== payload.confirmPassword) {
        throw new Error('Passwords do not match.');
      }
      const parts = payload.fullName.trim().split(/\s+/);
      const profile: Profile = {
        id: `usr_${Date.now()}`,
        fullName: payload.fullName.trim(),
        email: payload.email.trim(),
        phone: payload.phone,
        initials: parts
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? '')
          .join(''),
      };
      const session: AuthSession = { tokens: tokensFor(payload.phone), profile };
      await authService.persist(session);
      return session;
    }

    const tokens = await request<AuthTokens>('/auth/register', {
      method: 'POST',
      body: {
        full_name: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        password: payload.password,
      },
    });
    const profile = await request<Profile>('/me', {
      token: tokens.accessToken,
    });
    const session = { tokens, profile };
    await authService.persist(session);
    return session;
  },

  async persist(session: AuthSession): Promise<void> {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, JSON.stringify(session.tokens)],
      [PROFILE_KEY, JSON.stringify(session.profile)],
    ]);
  },

  async updateProfile(profile: Profile): Promise<void> {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY]);
  },
};

export const demoCredentials = {
  phone: DEMO_PHONE,
  password: DEMO_PASSWORD,
  masked: maskPhone(DEMO_PHONE),
};