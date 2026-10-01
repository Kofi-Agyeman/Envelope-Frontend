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

export type LoginPayload = {
  phone: string;
  password: string;
};

export type RegisterPayload = {
  fullName: string;
  phone: string;
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
