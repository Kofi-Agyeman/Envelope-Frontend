import { USE_MOCKS } from '@/constants/config';
import { request } from './http';
import { mockService } from './mockService';
import type {
  ActivityEvent,
  Balance,
  CreateEnvelopePayload,
  Envelope,
  EnvelopeStatus,
  MeResponse,
  Profile,
  SendMoneyRequestBody,
  TransactionResponse,
} from '@/types';

/**
 * Single entry point the UI uses for all backend data.
 *
 * Every function delegates to the FastAPI backend when EXPO_PUBLIC_API_URL is
 * configured, and to the local mock service otherwise. Screens never import
 * either implementation directly, so swapping in the real backend requires no
 * UI changes.
 */

export async function getProfile(token?: string | null): Promise<Profile> {
  if (USE_MOCKS) return mockService.getProfile();
  const me = await request<MeResponse>('/users/me', { token });
  return {
    id: me.id,
    fullName: me.full_name,
    email: me.email ?? '',
    phone: me.phone_number,
    initials: me.full_name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  };
}

export async function getBalance(token?: string | null): Promise<Balance> {
  if (USE_MOCKS) return mockService.getBalance();
  return request<Balance>('/wallet/balance', { token });
}

export async function getEnvelopes(token?: string | null): Promise<Envelope[]> {
  if (USE_MOCKS) return mockService.getEnvelopes();
  return request<Envelope[]>('/envelopes', { token });
}

export async function getEnvelope(
  id: string,
  token?: string | null,
): Promise<Envelope> {
  if (USE_MOCKS) return mockService.getEnvelope(id);
  return request<Envelope>(`/envelopes/${id}`, { token });
}

/**
 * The backend's `status` is an open string, while the UI works in terms of
 * `EnvelopeStatus`. Anything unrecognised maps to 'waiting' rather than
 * 'failed', because a new backend state is far more likely to be a healthy
 * in-progress envelope than a genuine failure.
 */
function mapStatus(raw: string): EnvelopeStatus {
  const value = raw.trim().toLowerCase();
  if (
    value === 'waiting' ||
    value === 'claimed' ||
    value === 'processing' ||
    value === 'completed' ||
    value === 'expired' ||
    value === 'failed'
  ) {
    return value;
  }
  if (
    value === 'success' ||
    value === 'succeeded' ||
    value === 'successful' ||
    value === 'paid' ||
    value === 'complete'
  ) {
    return 'completed';
  }
  if (value === 'pending' || value === 'created' || value === 'active') {
    return 'waiting';
  }
  if (value === 'cancelled' || value === 'canceled' || value === 'declined') {
    return 'failed';
  }
  return 'waiting';
}

/** Decimal is serialised as a string; tolerate a number in case that changes. */
function toAmount(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The 6-character code the UI shows is derived from the claim link's secret
 * segment. The backend returns a UUID and a full URL, not a short code, so the
 * tail of the link is the closest stable stand-in.
 */
function codeFromLink(link: string, transactionId: string): string {
  const tail = link.split('?')[0].split('/').filter(Boolean).pop() ?? '';
  const cleaned = tail.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length >= 4) return cleaned.slice(-6);
  return transactionId.replace(/-/g, '').slice(0, 6).toUpperCase();
}

export async function createEnvelope(
  payload: CreateEnvelopePayload,
  token?: string | null,
): Promise<Envelope> {
  if (USE_MOCKS) return mockService.createEnvelope(payload);

  // Send the amount as a string to keep Decimal precision exact.
  const body: SendMoneyRequestBody = {
    amount: payload.amount.toFixed(2),
  };

  const response = await request<TransactionResponse>('/payments/send', {
    method: 'POST',
    body,
    token,
  });

  return {
    id: response.transaction_id,
    code: codeFromLink(response.link, response.transaction_id),
    amount: toAmount(response.amount),
    currency: response.currency,
    status: mapStatus(response.status),
    // The recipient claims the cash by opening this link.
    shareUrl: response.link,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 72 * 3_600_000).toISOString(),
  };
}

export async function getActivity(
  token?: string | null,
): Promise<ActivityEvent[]> {
  if (USE_MOCKS) return mockService.getActivity();
  return request<ActivityEvent[]>('/activity', { token });
}

export * from './http';
export { mockService };
