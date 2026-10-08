export const APP_NAME = 'Envelope';
export const APP_TAGLINE = 'Send money. Let them choose where it lands.';
export const APP_WORDMARK = 'ENVELOPE';

/**
 * Base URL of the FastAPI backend, including the `/api` prefix that every
 * route lives under (`/api/auth/login`, `/api/payments/send`,
 * `/api/utilities/envelopes`, ...).
 *
 * Override per environment with EXPO_PUBLIC_API_URL. The default points at the
 * deployed service. For local backend development set it to
 * `http://127.0.0.1:8000/api`, or `http://10.0.2.2:8000/api` from an Android
 * emulator.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://envlope.onrender.com/api';

export const currency = {
  code: 'GH₵',
  name: 'Ghana Cedi',
  locale: 'en-GH',
} as const;

export const AMOUNT = {
  min: 5,
  max: 500,
  step: 5,
  presets: [20, 50, 100, 200, 500],
} as const;
