import { API_BASE_URL } from '@/constants/config';
import { USE_MOCKS } from '@/constants/config';
import { refreshTokens } from './tokenManager';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly isNetworkError: boolean;

  constructor(
    message: string,
    options: { status?: number; code?: string; isNetworkError?: boolean } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.code = options.code;
    this.isNetworkError = options.isNetworkError ?? false;
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined>;
  /** Set to false on the replay so a 401 can only be retried once. */
  retryOnUnauthorized?: boolean;
};

/**
 * FastAPI reports errors inconsistently: a plain `detail` string for handled
 * cases, an array of field errors for 422 validation, and `message` for some
 * handlers. Normalise all three into one readable sentence.
 */
function extractDetail(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'Something went wrong.';
  const body = payload as { detail?: unknown; message?: unknown };

  if (typeof body.detail === 'string') return body.detail;
  if (typeof body.message === 'string') return body.message;

  if (Array.isArray(body.detail)) {
    const first = body.detail[0] as { msg?: unknown } | undefined;
    const msg = typeof first?.msg === 'string' ? first.msg : null;
    // FastAPI prefixes validation messages with "Value error, ".
    if (msg) return msg.replace(/^Value error,\s*/, '');
  }

  return 'Something went wrong.';
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    );
  if (params.length === 0) return url;
  return `${url}?${params.join('&')}`;
}

/**
 * Thin fetch wrapper around the FastAPI backend.
 *
 * The mobile app only ever holds a short-lived user access token. No MTN
 * credentials, signing secrets or backend secrets ever reach this layer.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, token, signal, query, retryOnUnauthorized = true } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    throw new ApiError('We could not reach Envelope. Check your connection.', {
      isNetworkError: true,
    });
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  // An expired access token is recoverable: swap the pair and replay the
  // original call once. A single retry guards against a refresh loop.
  if (response.status === 401 && token && retryOnUnauthorized) {
    try {
      const refreshed = await refreshTokens();
      return await request<T>(path, {
        ...options,
        token: refreshed.accessToken,
        retryOnUnauthorized: false,
      });
    } catch {
      // Refresh failed, so the session is genuinely over. Fall through and
      // surface the original 401 rather than the refresh error.
    }
  }

  if (!response.ok) {
    throw new ApiError(extractDetail(payload), {
      status: response.status,
      code: (payload as { code?: string } | null)?.code,
    });
  }

  return payload as T;
}

export const apiConfig = {
  baseUrl: API_BASE_URL,
  usingMocks: USE_MOCKS,
} as const;
