import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/config';
import type { AuthTokens, TokenPairResponse } from '@/types';

const TOKEN_KEY = 'envelope.auth.tokens';

/**
 * Owns the token pair for the whole app.
 *
 * `http.ts` depends on this module to refresh on a 401, so this file must not
 * import `request` -- the refresh call below uses `fetch` directly to keep the
 * dependency one-directional.
 */

let inMemory: AuthTokens | null = null;

/** Lets the auth store mirror refreshed tokens back into its own state. */
let notify: ((tokens: AuthTokens) => void) | null = null;

/** Fired when a refresh fails, so the app can drop the dead session. */
let expire: (() => void) | null = null;

export function onTokensChanged(listener: (tokens: AuthTokens) => void): void {
  notify = listener;
}

export function onSessionExpired(listener: () => void): void {
  expire = listener;
}

function fromWire(response: TokenPairResponse): AuthTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenType: response.token_type || 'bearer',
  };
}

export async function loadTokens(): Promise<AuthTokens | null> {
  if (inMemory) return inMemory;
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const tokens = JSON.parse(raw) as AuthTokens;
    if (!tokens?.accessToken) return null;
    inMemory = tokens;
    return tokens;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return inMemory?.accessToken ?? null;
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  inMemory = tokens;
  try {
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } catch {
    // Persistence is best-effort; the in-memory copy still serves this session.
  }
  notify?.(tokens);
}

export async function clearTokens(): Promise<void> {
  inMemory = null;
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore -- the caller is already tearing the session down.
  }
}

/**
 * A refresh already in flight, shared by every caller that hits a 401 while it
 * runs. Without this, a screen firing several requests at once would send N
 * refreshes and N of them would race on the rotating refresh token.
 */
let inFlight: Promise<AuthTokens> | null = null;

async function performRefresh(
  refreshToken: string,
): Promise<AuthTokens> {
  // The backend takes the refresh token as a required *query* parameter, not
  // a JSON body -- verified against its OpenAPI schema.
  const url = `${API_BASE_URL.replace(/\/+$/, '')}/auth/refresh?refresh_token=${encodeURIComponent(
    refreshToken,
  )}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Session expired. Please sign in again.');
  }

  const payload = (await response.json()) as TokenPairResponse;
  const tokens = fromWire(payload);
  await saveTokens(tokens);
  return tokens;
}

/**
 * Exchanges the refresh token for a new pair. Concurrent callers share one
 * request. Throws when there is no usable refresh token, which the caller
 * should treat as "this session is over".
 */
export async function refreshTokens(): Promise<AuthTokens> {
  if (inFlight) return inFlight;

  const current = inMemory ?? (await loadTokens());
  const refreshToken = current?.refreshToken;
  if (!refreshToken) {
    throw new Error('No refresh token available.');
  }

  inFlight = performRefresh(refreshToken)
    .catch((error) => {
      // The refresh token is spent or revoked, so the session cannot be
      // recovered. Tell the app before rethrowing.
      expire?.();
      throw error;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function hasSession(): boolean {
  return inMemory !== null;
}
