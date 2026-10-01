import { USE_MOCKS } from '@/constants/config';
import { request } from './http';
import { mockService } from './mockService';
import type {
  ActivityEvent,
  Balance,
  CreateEnvelopePayload,
  Envelope,
  Profile,
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
  return request<Profile>('/me', { token });
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

export async function createEnvelope(
  payload: CreateEnvelopePayload,
  token?: string | null,
): Promise<Envelope> {
  if (USE_MOCKS) return mockService.createEnvelope(payload);
  return request<Envelope>('/envelopes', {
    method: 'POST',
    body: payload,
    token,
  });
}

export async function getActivity(
  token?: string | null,
): Promise<ActivityEvent[]> {
  if (USE_MOCKS) return mockService.getActivity();
  return request<ActivityEvent[]>('/activity', { token });
}

export * from './http';
export { mockService };
