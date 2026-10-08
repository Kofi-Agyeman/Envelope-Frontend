import { initialsFromName, isExpired, parseServerDate } from '@/utils/format';
import { request } from './http';
import type {
  Account,
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
 * Single entry point the UI uses for all backend data. Every function
 * performs the real request against the FastAPI backend -- there is no
 * mock path, so the app cannot silently run on fake data. Screens
 * never import `http` directly, so the base URL lives in exactly one
 * place.
 */

/**
 * `GET /api/users/me` -> the app's user model.
 *
 * This endpoint is authenticated: the access token has to ride along as
 * `Authorization: Bearer <jwt>`. A 401 is retried once with a refreshed token
 * by `request`, and a refresh that also fails ends the session, so an expired
 * token surfaces as a sign-out rather than a stale screen.
 *
 * Exported because it is the one place the wire record is interpreted.
 */
export function accountFromWire(me: MeResponse): Account {
  return {
    id: me.id,
    fullName: me.full_name,
    phone: me.phone_number,
    email: me.email ?? null,
    // Treated as absent rather than verified: an unknown flag must never make
    // the app vouch for an account the backend has not confirmed.
    isVerified: me.is_verified === true,
    initials: initialsFromName(me.full_name),
  };
}

/**
 * The account as the backend currently reports it. The Account screen reads this
 * directly so it always shows server truth rather than a cached profile.
 */
export async function getAccount(token?: string | null): Promise<Account> {
  return accountFromWire(await request<MeResponse>('/users/me', { token }));
}

export async function getProfile(token?: string | null): Promise<Profile> {
  const account = await getAccount(token);
  return {
    id: account.id,
    fullName: account.fullName,
    email: account.email ?? '',
    phone: account.phone,
    initials: account.initials,
    isVerified: account.isVerified,
  };
}

export async function getBalance(token?: string | null): Promise<Balance> {
  // The backend has no /wallet/balance yet, so this request fails and
  // the balance card stays empty. The call is still made -- it is the
  // one thing that has to happen for the card to fill in on its own
  // once the endpoint ships.
  return request<Balance>('/wallet/balance', { token });
}

export async function getEnvelopes(token?: string | null): Promise<Envelope[]> {
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
    // `expiry_at` from this endpoint is the only authority on how long the link
    // stays valid, so it also settles the status: a link that has passed its
    // expiry is expired no matter what the stored transaction state still says.
    status: mapStatus(item.transaction_state, item.expiry_at),
    shareUrl: item.shareUrl,
    createdAt: item.created_at,
    expiresAt: normaliseExpiry(item.expiry_at),
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
 *
 * `expiryAt` is checked last and only for the states that still need a live
 * link: once the server's expiry has passed, an envelope that is still recorded
 * as unclaimed/claimed is dead to the recipient, so the UI must treat it as
 * expired even though the stored state lags. A paid or failed envelope keeps
 * its own status.
 */
function mapStatus(raw: string, expiryAt?: string | null): EnvelopeStatus {
  const value = raw.trim().toLowerCase();
  if (
    value === 'waiting' ||
    value === 'claimed' ||
    value === 'processing' ||
    value === 'completed' ||
    value === 'expired' ||
    value === 'failed'
  ) {
    const mapped = value;
    if ((mapped === 'waiting' || mapped === 'claimed') && isExpired(expiryAt)) {
      return 'expired';
    }
    return mapped;
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
    return isExpired(expiryAt) ? 'expired' : 'waiting';
  }
  if (value === 'cancelled' || value === 'canceled' || value === 'declined') {
    return 'failed';
  }
  return isExpired(expiryAt) ? 'expired' : 'waiting';
}

/** `expiry_at` as a parseable ISO string, or `null` when the server sent none. */
function normaliseExpiry(value: string | null | undefined): string | null {
  const ms = parseServerDate(value);
  return ms === null ? null : new Date(ms).toISOString();
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
    // The claim token is the identity the history endpoint uses, so keying the
    // local copy on it means the server record replaces this one in place as
    // soon as it is fetched, instead of showing up as a second envelope.
    id: linkToken || response.transaction_id,
    code: displayCode(linkToken, response.transaction_id),
    amount: toAmount(response.amount),
    currency: response.currency,
    status: mapStatus(response.status),
    // The recipient claims the cash by opening this link.
    shareUrl: response.link,
    createdAt: new Date().toISOString(),
    // `/payments/send` does not return an expiry, so none is guessed here. The
    // real window is read from `expiry_at` in the envelope history.
    expiresAt: null,
  };

  const expiry = await fetchServerExpiry(envelope.id, token);
  if (expiry) {
    envelope.expiresAt = expiry;
    envelope.status = mapStatus(envelope.status, expiry);
  }

  return envelope;
}

/**
 * Best-effort read of the server's expiry for one envelope.
 *
 * `POST /payments/send` returns no `expiry_at`, so the only place the real
 * window exists is the envelope history. A miss here is not an error: the
 * envelope stays valid with `expiresAt === null` and the detail screen retries
 * the history fetch when it needs the number.
 */
async function fetchServerExpiry(
  envelopeId: string,
  token?: string | null,
): Promise<string | null> {
  if (!envelopeId) return null;
  try {
    const history = await request<EnvelopeHistoryItem[]>('/utilities/envelopes', {
      token,
    });
    const match = history.find(
      (item) =>
        item.envelope_code === envelopeId ||
        (!!item.shareUrl && item.shareUrl.includes(envelopeId)),
    );
    return normaliseExpiry(match?.expiry_at);
  } catch {
    // The envelope was created; only the countdown is missing.
    return null;
  }
}

/**
 * There is no activity endpoint on the backend, so the timeline is derived
 * from the same envelope history the Envelopes tab uses. One row per envelope,
 * reflecting where it currently stands.
 */
export async function getActivity(
  token?: string | null,
): Promise<ActivityEvent[]> {
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
