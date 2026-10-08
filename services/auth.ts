import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './http';
import {
  clearTokens,
  loadTokens,
  saveTokens,
} from './tokenManager';
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
    // A fallback built from the sign-up form has nothing to say about
    // verification, so it stays false until `/users/me` confirms otherwise.
    isVerified: false,
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
    isVerified: me.is_verified === true,
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
      const stored = JSON.parse(profileRaw) as Profile;
      // Profiles persisted before `is_verified` existed have no such field, so
      // it is filled in here rather than read as `undefined` all over the app.
      const profile: Profile = { ...stored, isVerified: stored.isVerified === true };
      return { tokens, profile };
    } catch {
      return null;
    }
  },

  async login(payload: LoginPayload): Promise<AuthSession> {
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
