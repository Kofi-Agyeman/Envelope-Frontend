import { USE_MOCKS } from '@/constants/config';
import { request } from './http';
import { mockService } from './mockService';
import type {
  ActivityEvent,
  Balance,
  CreateEnvelopePayload,
  Envelope,
  EnvelopeHistoryItem,
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

  const history = await request<EnvelopeHistoryItem[]>('/utilities/envelopes', {
    token,
  });

  return history.map((item) => ({
    // The link token is the only stable identifier the history exposes, so it
    // doubles as the id. The detail screen matches on id *or* code, and the
    // token also keeps `shareUrl` derivable if the field is ever dropped.
    id: item.envelope_code,
    // The backend returns the full 43-char token; the short code shown in the
    // UI is derived from it here.
    code: displayCode(item.envelope_code),
    amount: toAmount(item.amount),
    currency: 'GHS',
    status: mapStatus(item.transaction_state),
    shareUrl: item.shareUrl,
    createdAt: item.created_at,
    expiresAt: item.expiry_at,
    recipientPhone: null,
    recipientName: null,
    claimedAt: null,
    completedAt: null,
  }));
}

export async function getEnvelope(
  id: string,
  token?: string | null,
): Promise<Envelope> {
  if (USE_MOCKS) return mockService.getEnvelope(id);
  // There is no single-envelope route on the backend, so serve it from the
  // history list the app has already loaded.
  const match = (await getEnvelopes(token)).find(
    (item) => item.id === id || item.code === id,
  );
  if (!match) throw new Error('Envelope not found');
  return match;
}

const ACTIVITY_TYPE: Record<EnvelopeStatus, ActivityEvent['type']> = {
  waiting: 'envelope_created',
  claimed: 'envelope_claimed',
  processing: 'payment_processing',
  completed: 'payment_completed',
  expired: 'envelope_expired',
  failed: 'payment_failed',
};

const ACTIVITY_TITLE: Record<EnvelopeStatus, string> = {
  waiting: 'Envelope created',
  claimed: 'Recipient identified',
  processing: 'Payment processing',
  completed: 'Payment completed',
  expired: 'Envelope expired',
  failed: 'Payment failed',
};

const ACTIVITY_SUBTITLE: Record<EnvelopeStatus, string> = {
  waiting: 'Waiting for recipient',
  claimed: 'Recipient identified',
  processing: 'Payment processing',
  completed: 'Cash delivered',
  expired: 'Never claimed',
  failed: 'Could not be completed',
};

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
 * The backend now returns the full link token (43 URL-safe base64 chars) as
 * `envelope_code` and in the claim URL, so the short 6-character code the UI
 * shows has to be derived here. Taking the leading characters keeps it stable
 * and avoids the `-`/`_` that base64 tokens contain, which read poorly in the
 * spaced-out code style.
 */
export const DISPLAY_CODE_LENGTH = 6;

function displayCode(token: string, fallback = ''): string {
  const cleaned = token.replace(/[^A-Za-z0-9]/g, '');
  if (cleaned.length >= DISPLAY_CODE_LENGTH) {
    return cleaned.slice(0, DISPLAY_CODE_LENGTH).toUpperCase();
  }
  const alt = fallback.replace(/-/g, '');
  return alt.length >= DISPLAY_CODE_LENGTH
    ? alt.slice(0, DISPLAY_CODE_LENGTH).toUpperCase()
    : cleaned.toUpperCase();
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

  const linkToken =
    response.link.split('?')[0].split('/').filter(Boolean).pop() ?? '';

  const envelope: Envelope = {
    id: response.transaction_id,
    code: displayCode(linkToken, response.transaction_id),
    amount: toAmount(response.amount),
    currency: response.currency,
    status: mapStatus(response.status),
    // The recipient claims the cash by opening this link.
    shareUrl: response.link,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 72 * 3_600_000).toISOString(),
  };

  return envelope;
}

/**
 * There is no activity endpoint on the backend, so the timeline is derived
 * from the same envelope history the Envelopes tab uses. One row per envelope,
 * reflecting where it currently stands.
 */
export async function getActivity(
  token?: string | null,
): Promise<ActivityEvent[]> {
  if (USE_MOCKS) return mockService.getActivity();

  const envelopes = await getEnvelopes(token);
  return envelopes.map((envelope) => ({
    id: `hist_${envelope.id}`,
    type: ACTIVITY_TYPE[envelope.status],
    title: ACTIVITY_TITLE[envelope.status],
    subtitle: ACTIVITY_SUBTITLE[envelope.status],
    amount: envelope.amount > 0 ? envelope.amount : null,
    envelopeId: envelope.id,
    createdAt: envelope.createdAt,
  }));
}

export * from './http';
export { mockService };
