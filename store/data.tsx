import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import * as api from '@/services/api';
import { useAuth } from './auth';
import type { ActivityEvent, Balance, Envelope } from '@/types';

type DataState = {
  balance: Balance | null;
  envelopes: Envelope[];
  activity: ActivityEvent[];
  loadingBalance: boolean;
  loadingEnvelopes: boolean;
  loadingActivity: boolean;
  refreshBalance: () => Promise<void>;
  refreshEnvelopes: () => Promise<void>;
  refreshActivity: () => Promise<void>;
  refreshAll: () => Promise<void>;
  addEnvelope: (envelope: Envelope) => void;
};

const DataContext = createContext<DataState | null>(null);

/** Two records are the same envelope if any stable identifier agrees. */
function sameEnvelope(a: Envelope, b: Envelope): boolean {
  return (
    a.id === b.id ||
    a.code === b.code ||
    (!!a.shareUrl && a.shareUrl === b.shareUrl)
  );
}

/**
 * The server list wins, but an envelope created in this session is kept until
 * the history catches up. Without this the just-created envelope would blink
 * out of the list the moment the first refresh landed before it was indexed.
 * Only unsynced envelopes (`expiresAt === null`) are kept, so this window
 * closes on its own once the server publishes the real `expiry_at`.
 */
function mergeEnvelopes(server: Envelope[], local: Envelope[]): Envelope[] {
  const pending = local.filter(
    (envelope) =>
      envelope.expiresAt === null &&
      !server.some((item) => sameEnvelope(item, envelope)),
  );
  return pending.length > 0 ? [...server, ...pending] : server;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { token, status } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingEnvelopes, setLoadingEnvelopes] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const inFlight = useRef(false);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);
  const lastRefresh = useRef<number>(0);

  const ACTIVE_STATUSES: Envelope['status'][] = ['waiting', 'claimed', 'processing'];

  // Adapt polling interval when envelope statuses change
  useEffect(() => {
    if (status !== 'signed-in') return;
    if (!refreshInterval.current) return;
    const intervalMs = envelopes.some((e) => ACTIVE_STATUSES.includes(e.status)) ? 10000 : 30000;
    // clear and recreate to adjust interval
    clearInterval(refreshInterval.current);
    refreshInterval.current = setInterval(() => {
      void (async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        try {
          await Promise.all([refreshBalance(), refreshEnvelopes(), refreshActivity()]);
        } finally {
          inFlight.current = false;
          lastRefresh.current = Date.now();
        }
      })();
    }, intervalMs);
  }, [envelopes, status]);

  const refreshBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      setBalance(await api.getBalance(token));
    } catch {
      // Balance is non-critical; keep the previous value on failure.
    } finally {
      setLoadingBalance(false);
    }
  }, [token]);

  const refreshEnvelopes = useCallback(async () => {
    setLoadingEnvelopes(true);
    try {
      const server = await api.getEnvelopes(token);
      setEnvelopes((prev) => mergeEnvelopes(server, prev));
    } catch {
      // Keep previously loaded list.
    } finally {
      setLoadingEnvelopes(false);
    }
  }, [token]);

  const refreshActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      setActivity(await api.getActivity(token));
    } catch {
      // Keep previously loaded list.
    } finally {
      setLoadingActivity(false);
    }
  }, [token]);

  const refreshAll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await Promise.all([refreshBalance(), refreshEnvelopes(), refreshActivity()]);
    } finally {
      inFlight.current = false;
      lastRefresh.current = Date.now();
    }
  }, [refreshBalance, refreshEnvelopes, refreshActivity]);

  const addEnvelope = useCallback((envelope: Envelope) => {
    setEnvelopes((prev) =>
      prev.some((item) => sameEnvelope(item, envelope))
        ? prev.map((item) => (sameEnvelope(item, envelope) ? envelope : item))
        : [envelope, ...prev],
    );
    setActivity((prev) => [
      {
        id: `local_${envelope.id}`,
        type: 'envelope_created',
        title: 'Envelope created',
        subtitle: 'Waiting for recipient',
        amount: envelope.amount,
        envelopeId: envelope.id,
        createdAt: envelope.createdAt,
      },
      ...prev,
    ]);
  }, []);

  useEffect(() => {
    // Wait for the session to resolve so the first load is not unauthenticated.
    if (status !== 'signed-in') {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
      return;
    }
    void refreshAll();

    const intervalMs = envelopes.some((e) => ACTIVE_STATUSES.includes(e.status)) ? 10000 : 30000;

    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }

    refreshInterval.current = setInterval(() => {
      void refreshAll();
    }, intervalMs);

    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        void refreshAll();
      }
      appState.current = nextAppState;
    });

    return () => {
      sub.remove();
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    };
  }, [refreshAll, status, envelopes]);

  const value = useMemo<DataState>(
    () => ({
      balance,
      envelopes,
      activity,
      loadingBalance,
      loadingEnvelopes,
      loadingActivity,
      refreshBalance,
      refreshEnvelopes,
      refreshActivity,
      refreshAll,
      addEnvelope,
    }),
    [
      balance,
      envelopes,
      activity,
      loadingBalance,
      loadingEnvelopes,
      loadingActivity,
      refreshBalance,
      refreshEnvelopes,
      refreshActivity,
      refreshAll,
      addEnvelope,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

export function useEnvelope(id: string): Envelope | null {
  const { envelopes } = useData();
  return useMemo(
    () => envelopes.find((e) => e.id === id || e.code === id) ?? null,
    [envelopes, id],
  );
}
