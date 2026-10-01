import AsyncStorage from '@react-native-async-storage/async-storage';
import { USE_MOCKS } from '@/constants/config';
import { delay } from '@/utils/async';
import { request } from './http';
import { mockProfile } from './mockData';
import {
  clearTokens,
  loadTokens,
  saveTokens,
} from './tokenManager';
import { maskPhone } from '@/utils/format';
import type {
  AuthTokens,
  LoginPayload,
  LoginRequestBody,
  MeResponse,
  Profile,
  RegisterPayload,
  RegisterRequestBody,
  RegisterResponse,
  TokenPairResponse,
} from '@/types';

const PROFILE_KEY = 'envelope.auth.profile';

export type AuthSession = {
  tokens: AuthTokens;
  profile: Profile;
};

/**
 * Local demo credentials accepted while the backend is not connected.
 * In production these are validated by FastAPI.
 */
const DEMO_PHONE = '0245634567';
const DEMO_PASSWORD = 'envelope';

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

function initialsFrom(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Maps the snake_case token pair onto the app's camelCase model. */
function tokensFromWire(response: TokenPairResponse): AuthTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenType: response.token_type || 'bearer',
  };
}

function profileFrom(
  fullName: string,
  email: string,
  phone: string,
  id?: string,
): Profile {
  return {
    id: id ?? `usr_${phone.replace(/\D/g, '')}`,
    fullName,
    email,
    phone,
    initials: initialsFrom(fullName),
  };
}

/** Maps the backend's snake_case user record onto the app's Profile model. */
function profileFromWire(me: MeResponse): Profile {
  return {
    id: me.id,
    fullName: me.full_name,
    email: me.email ?? '',
    phone: me.phone_number,
    initials: initialsFrom(me.full_name),
  };
}

/**
 * The auth endpoints return tokens only, not a user record, so the profile is
 * read from `/users/me` after the token exists. If that call fails the
 * sign-up form's own values are used, which keeps the flow usable against a
 * backend that has not exposed the endpoint yet.
 */
async function resolveProfile(
  accessToken: string,
  fallback: Profile,
): Promise<Profile> {
  try {
    const me = await request<MeResponse>('/users/me', { token: accessToken });
    return profileFromWire(me);
  } catch {
    return fallback;
  }
}

export const authService = {
  async restoreSession(): Promise<AuthSession | null> {
    try {
      const [tokens, profileRaw] = await Promise.all([
        loadTokens(),
        AsyncStorage.getItem(PROFILE_KEY),
      ]);
      if (!tokens || !profileRaw) return null;
      const profile = JSON.parse(profileRaw) as Profile;
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

    const body: LoginRequestBody = {
      phone_number: payload.phone,
      password: payload.password,
    };

    const response = await request<TokenPairResponse>('/auth/login', {
      method: 'POST',
      body,
      // The login call carries no token, so a 401 here means bad credentials
      // and must never trigger a refresh.
      retryOnUnauthorized: false,
    });

    const tokens = tokensFromWire(response);
    // Login carries no name, so the fallback derives initials from the number
    // until `/users/me` supplies the real record.
    const profile = await resolveProfile(
      tokens.accessToken,
      profileFrom('', '', payload.phone.trim()),
    );

    const session: AuthSession = { tokens, profile };
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
      const session: AuthSession = {
        tokens: tokensFor(payload.phone),
        profile: profileFrom(
          payload.fullName.trim(),
          payload.email.trim(),
          payload.phone,
        ),
      };
      await authService.persist(session);
      return session;
    }

    const email = payload.email.trim();

    const body: RegisterRequestBody = {
      full_name: payload.fullName.trim(),
      phone_number: payload.phone.trim(),
      // `EmailStr | None` -- an empty string would fail validation, so a blank
      // field is sent as an explicit null.
      email: email.length > 0 ? email : null,
      password: payload.password,
    };

    const response = await request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body,
      retryOnUnauthorized: false,
    });

    // The backend confirms the account but issues no tokens, so sign in
    // straight away with the same credentials to get a usable session.
    const loginResponse = await request<TokenPairResponse>('/auth/login', {
      method: 'POST',
      body: { phone_number: body.phone_number, password: body.password },
      retryOnUnauthorized: false,
    });

    const tokens = tokensFromWire(loginResponse);
    const profile = await resolveProfile(
      tokens.accessToken,
      profileFrom(
        payload.fullName.trim(),
        email,
        payload.phone.trim(),
        response.user_id,
      ),
    );

    const session: AuthSession = { tokens, profile };
    await authService.persist(session);
    return session;
  },

  async persist(session: AuthSession): Promise<void> {
    await saveTokens(session.tokens);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(session.profile));
  },

  async updateProfile(profile: Profile): Promise<void> {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },

  async logout(): Promise<void> {
    await clearTokens();
    await AsyncStorage.removeItem(PROFILE_KEY);
  },
};

export const demoCredentials = {
  phone: DEMO_PHONE,
  password: DEMO_PASSWORD,
  masked: maskPhone(DEMO_PHONE),
};
