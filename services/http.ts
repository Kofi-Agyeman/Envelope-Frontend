import { API_BASE_URL } from '@/constants/config';
import { USE_MOCKS } from '@/constants/config';

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
};

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
  const { method = 'GET', body, token, signal, query } = options;

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
    throw new ApiError('We could not reach PingPay. Check your connection.', {
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

  if (!response.ok) {
    const detail =
      (payload as { detail?: string } | null)?.detail ??
      (payload as { message?: string } | null)?.message ??
      'Something went wrong.';
    throw new ApiError(detail, {
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
