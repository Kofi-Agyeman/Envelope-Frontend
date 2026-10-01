import { delay } from '@/utils/async';
import { generateEnvelopeCode, mockActivity, mockBalance, mockEnvelopes, mockProfile } from './mockData';
import type {
  ActivityEvent,
  Balance,
  CreateEnvelopePayload,
  Envelope,
  Profile,
} from '@/types';

let envelopes: Envelope[] = [...mockEnvelopes];
let activity: ActivityEvent[] = [...mockActivity];

export const mockService = {
  async getProfile(): Promise<Profile> {
    await delay(320);
    return mockProfile;
  },

  async getBalance(): Promise<Balance> {
    await delay(420);
    return mockBalance;
  },

  async getEnvelopes(): Promise<Envelope[]> {
    await delay(480);
    return [...envelopes].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async getEnvelope(id: string): Promise<Envelope> {
    await delay(360);
    const found = envelopes.find((e) => e.id === id || e.code === id);
    if (!found) throw new Error('Envelope not found');
    return found;
  },

  async createEnvelope(payload: CreateEnvelopePayload): Promise<Envelope> {
    await delay(1500);
    const code = generateEnvelopeCode();
    const envelope: Envelope = {
      id: `env_${code}`,
      code,
      amount: payload.amount,
      currency: payload.currency ?? 'GHS',
      status: 'waiting',
      shareUrl: `https://pingpay.app/e/${code}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 72 * 3_600_000).toISOString(),
    };
    envelopes = [envelope, ...envelopes];
    activity = [
      {
        id: `act_${Date.now()}`,
        type: 'envelope_created',
        title: 'Envelope created',
        subtitle: 'Waiting for recipient',
        amount: envelope.amount,
        envelopeId: envelope.id,
        createdAt: envelope.createdAt,
      },
      ...activity,
    ];
    return envelope;
  },

  async getActivity(): Promise<ActivityEvent[]> {
    await delay(520);
    return [...activity].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  /** Test seam: restores the initial fixture state. */
  reset() {
    envelopes = [...mockEnvelopes];
    activity = [...mockActivity];
  },
};
