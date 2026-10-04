export type EnvelopeStatus =
  | 'waiting'
  | 'claimed'
  | 'processing'
  | 'completed'
  | 'expired'
  | 'failed';

export type Envelope = {
  id: string;
  code: string;
  amount: number;
  currency: string;
  status: EnvelopeStatus;
  shareUrl: string;
  recipientPhone?: string | null;
  recipientName?: string | null;
  createdAt: string;
  claimedAt?: string | null;
  completedAt?: string | null;
  expiresAt: string;
};

export type Balance = {
  available: number;
  currency: string;
  walletLabel: string;
  maskedPhone: string;
};

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  initials: string;
};

export type ActivityEventType =
  | 'envelope_created'
  | 'envelope_claimed'
  | 'payment_processing'
  | 'payment_completed'
  | 'envelope_expired'
  | 'payment_failed';

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  title: string;
  subtitle: string;
  amount: number | null;
  envelopeId: string | null;
  createdAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string | null;
  tokenType: string;
};

/**
 * Wire shapes for the FastAPI auth endpoints. These are snake_case and stay
 * separate from the camelCase app models above, so a backend rename surfaces
 * as a type error at the boundary instead of drifting through the UI.
 */

/** `POST /api/auth/register` -> RegisterRequest */
export type RegisterRequestBody = {
  full_name: string;
  phone_number: string;
  email?: string | null;
  password: string;
};

/** `POST /api/auth/login` -> LoginRequest */
export type LoginRequestBody = {
  phone_number: string;
  password: string;
};

/** Returned by login, register and refresh. */
export type TokenPairResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

/**
 * `POST /api/auth/register` returns only a confirmation and the new user id --
 * no tokens. The app signs in immediately afterwards to obtain a pair.
 */
export type RegisterResponse = {
  message: string;
  user_id: string;
};

/** `GET /api/users/me` */
export type MeResponse = {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string | null;
  is_verified?: boolean;
};

/**
 * `POST /api/payments/send` -> SendMoneyRequest.
 *
 * The amount is a Decimal with `gt=0, max_digits=12, decimal_places=2`. The
 * backend accepts a JSON number or a numeric string, but a float can carry
 * binary rounding (0.1 + 0.2), so the wire value is sent as a string.
 */
export type SendMoneyRequestBody = {
  amount: string;
};

/** `POST /api/payments/send` -> TransactionResponse. */
export type TransactionResponse = {
  transaction_id: string;
  /** Free-form string on the backend; normalised by `mapStatus`. */
  status: string;
  /** Serialised Decimal -- arrives as a JSON string. */
  amount: string | number;
  currency: string;
  /** The claim link the recipient opens. */
  link: string;
};

/**
 * `GET /api/utilities/envelopes` ("Get Envelope History"), newest first.
 *
 * `envelope_code` is the **full** link token, not a short code, so the
 * 6-character code shown in the UI is derived from it by the frontend.
 *
 * `amount` arrives as a JSON number here (Decimal is coerced), unlike
 * `/payments/send` where it is serialised as a string.
 */
export type EnvelopeHistoryItem = {
  envelope_code: string;
  created_at: string;
  expiry_at: string;
  transaction_state: string;
  amount: number | string;
  shareUrl: string;
};

export type LoginPayload = {
  phone: string;
  password: string;
};

export type RegisterPayload = {
  fullName: string;
  phone: string;
  /** Optional on the wire; sent as `null` when blank. */
  email: string;
  password: string;
  confirmPassword: string;
};

export type CreateEnvelopePayload = {
  amount: number;
  currency?: string;
};

export type UserPreferences = {
  hideBalance: boolean;
  biometricsEnabled: boolean;
  pushNotifications: boolean;
  hapticFeedback: boolean;
  hasSeenOnboarding: boolean;
};
