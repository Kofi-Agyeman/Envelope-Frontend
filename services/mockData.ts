import type { ActivityEvent, Balance, Envelope, Profile } from '@/types';

const now = Date.now();
const minutes = (m: number) => new Date(now - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const hoursAhead = (h: number) => new Date(now + h * 3_600_000).toISOString();

export const mockProfile: Profile = {
  id: 'usr_kofi_01',
  fullName: 'Kofi Agyeman',
  email: 'kofi.agyeman@gmail.com',
  phone: '+233245634567',
  initials: 'KA',
};

export const mockBalance: Balance = {
  available: 1250.0,
  currency: 'GHS',
  walletLabel: 'MTN MoMo',
  maskedPhone: '•••• 4567',
};

export const mockEnvelopes: Envelope[] = [
  {
    id: 'env_8X7K29',
    code: '8X7K29',
    amount: 100,
    currency: 'GHS',
    status: 'waiting',
    shareUrl: 'https://envelope.app/e/8X7K29',
    createdAt: minutes(12),
    expiresAt: hoursAhead(60),
  },
  {
    id: 'env_4M2P81',
    code: '4M2P81',
    amount: 50,
    currency: 'GHS',
    status: 'completed',
    shareUrl: 'https://envelope.app/e/4M2P81',
    recipientPhone: '+233201122334',
    recipientName: 'Ama Owusu',
    createdAt: hoursAgo(20),
    claimedAt: hoursAgo(19),
    completedAt: hoursAgo(19),
    expiresAt: hoursAgo(20 + 72),
  },
  {
    id: 'env_9T3Q55',
    code: '9T3Q55',
    amount: 200,
    currency: 'GHS',
    status: 'processing',
    shareUrl: 'https://envelope.app/e/9T3Q55',
    recipientPhone: '+233557788990',
    createdAt: hoursAgo(6),
    claimedAt: hoursAgo(2),
    expiresAt: hoursAhead(66),
  },
  {
    id: 'env_2L8C40',
    code: '2L8C40',
    amount: 20,
    currency: 'GHS',
    status: 'waiting',
    shareUrl: 'https://envelope.app/e/2L8C40',
    createdAt: hoursAgo(30),
    expiresAt: hoursAhead(42),
  },
  {
    id: 'env_6H1D73',
    code: '6H1D73',
    amount: 500,
    currency: 'GHS',
    status: 'completed',
    shareUrl: 'https://envelope.app/e/6H1D73',
    recipientPhone: '+233246677889',
    recipientName: 'Kwame Mensah',
    createdAt: hoursAgo(52),
    claimedAt: hoursAgo(50),
    completedAt: hoursAgo(50),
    expiresAt: hoursAgo(-20),
  },
  {
    id: 'env_1W6R18',
    code: '1W6R18',
    amount: 75,
    currency: 'GHS',
    status: 'expired',
    shareUrl: 'https://envelope.app/e/1W6R18',
    createdAt: hoursAgo(120),
    expiresAt: hoursAgo(48),
  },
  {
    id: 'env_7J4X92',
    code: '7J4X92',
    amount: 150,
    currency: 'GHS',
    status: 'failed',
    shareUrl: 'https://envelope.app/e/7J4X92',
    recipientPhone: '+233201199887',
    createdAt: hoursAgo(74),
    claimedAt: hoursAgo(72),
    expiresAt: hoursAgo(2),
  },
];

export const mockActivity: ActivityEvent[] = [
  {
    id: 'act_1',
    type: 'envelope_created',
    title: 'Envelope created',
    subtitle: 'Waiting for recipient',
    amount: 100,
    envelopeId: 'env_8X7K29',
    createdAt: minutes(12),
  },
  {
    id: 'act_2',
    type: 'envelope_created',
    title: 'Envelope created',
    subtitle: 'Waiting for recipient',
    amount: 20,
    envelopeId: 'env_2L8C40',
    createdAt: hoursAgo(2),
  },
  {
    id: 'act_3',
    type: 'payment_processing',
    title: 'Payment processing',
    subtitle: 'Recipient identified',
    amount: 200,
    envelopeId: 'env_9T3Q55',
    createdAt: hoursAgo(3),
  },
  {
    id: 'act_4',
    type: 'payment_completed',
    title: 'Payment completed',
    subtitle: 'Ama Owusu received GH₵50.00',
    amount: 50,
    envelopeId: 'env_4M2P81',
    createdAt: hoursAgo(20),
  },
  {
    id: 'act_5',
    type: 'envelope_created',
    title: 'Envelope created',
    subtitle: 'Waiting for recipient',
    amount: 500,
    envelopeId: 'env_6H1D73',
    createdAt: hoursAgo(52),
  },
  {
    id: 'act_6',
    type: 'payment_failed',
    title: 'Payment could not be completed',
    subtitle: 'The envelope was not claimed',
    amount: 150,
    envelopeId: 'env_7J4X92',
    createdAt: hoursAgo(74),
  },
  {
    id: 'act_7',
    type: 'envelope_expired',
    title: 'Envelope expired',
    subtitle: 'Unclaimed after 72 hours',
    amount: 75,
    envelopeId: 'env_1W6R18',
    createdAt: hoursAgo(120),
  },
  {
    id: 'act_8',
    type: 'payment_completed',
    title: 'Payment completed',
    subtitle: 'Kwame Mensah received GH₵500.00',
    amount: 500,
    envelopeId: 'env_6H1D73',
    createdAt: hoursAgo(148),
  },
];

export function generateEnvelopeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
