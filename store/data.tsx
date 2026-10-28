import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {
  notifyEnvelopeCompleted,
  requestNotificationPermission,
} from '@/utils/notifications';
import type { ActivityEvent, Balance, Envelope } from '@/types';

/** Per-account list of envelope ids that have already been announced. */
const NOTIFIED_KEY = 'envelope.notified.v1:';
/** Enough history to never re-announce, without growing forever. */
const NOTIFIED_LIMIT = 500;

const ACTIVE_STATUSES: Envelope['status'][] = ['waiting', 'claimed', 'processing'];
const FAST_POLL_MS = 10_000;
const SLOW_POLL_MS = 30_000;

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
  const { token, status, profile, preferences } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingEnvelopes, setLoadingEnvelopes] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const inFlight = useRef(false);
  const appState = useRef(AppState.currentState);
  const hasActive = useRef(false);

  // Notification bookkeeping, loaded once per signed-in account.
  const notifiedFor = useRef<string | null>(null);
  const notified = useRef<Set<string>>(new Set());
  const isFirstSync = useRef(false);
  const notificationsOn = useRef(preferences.pushNotifications);
  notificationsOn.current = preferences.pushNotifications;

  /**
   * Announces envelopes that became completed since the last time this device
   * looked. The announced ids are stored per account, so reopening the app
   * does not replay the whole history. The very first sync on a device only
   * records what is already there, without notifying.
   */
  const announceCompleted = useCallback(
    async (list: Envelope[]) => {
      if (!profile?.id) return;
      const key = NOTIFIED_KEY + profile.id;

      if (notifiedFor.current !== key) {
        const raw = await AsyncStorage.getItem(key).catch(() => null);
        let ids: string[] = [];
        try {
          ids = raw ? (JSON.parse(raw) as string[]) : [];
        } catch {
          ids = [];
        }
        notified.current = new Set(ids);
        isFirstSync.current = raw === null;
        notifiedFor.current = key;
      }

      const fresh = list.filter(
        (envelope) => envelope.status === 'completed' && !notified.current.has(envelope.id),
      );
      const firstSync = isFirstSync.current;
      isFirstSync.current = false;
      if (fresh.length === 0 && !firstSync) return;

      for (const envelope of fresh) notified.current.add(envelope.id);
      await AsyncStorage.setItem(
        key,
        JSON.stringify(Array.from(notified.current).slice(-NOTIFIED_LIMIT)),
      ).catch(() => undefined);

      if (firstSync || !notificationsOn.current) return;
      for (const envelope of fresh) void notifyEnvelopeCompleted(envelope);
    },
    [profile?.id],
  );

  useEffect(() => {
    hasActive.current = envelopes.some((e) => ACTIVE_STATUSES.includes(e.status));
  }, [envelopes]);

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
      void announceCompleted(server);
    } catch {
      // Keep previously loaded list.
    } finally {
      setLoadingEnvelopes(false);
    }
  }, [announceCompleted, token]);

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
    }
  }, [refreshBalance, refreshEnvelopes, refreshActivity]);

  // The polling loop reads this ref, so a new token does not restart it.
  const refreshAllRef = useRef(refreshAll);
  refreshAllRef.current = refreshAll;

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

  /**
   * One polling loop per signed-in session. It used to depend on `envelopes`,
   * so every refresh (which replaces that array) restarted it and fired another
   * refresh straight away -- a loop that hit the API non-stop. Now it polls
   * every 10 s while an envelope is still in flight and every 30 s otherwise,
   * only while the app is in the foreground, and once more on returning to it.
   */
  useEffect(() => {
    // Wait for the session to resolve so the first load is not unauthenticated.
    if (status !== 'signed-in') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      timer = setTimeout(async () => {
        if (cancelled) return;
        if (AppState.currentState === 'active') {
          await refreshAllRef.current();
        }
        if (!cancelled) schedule();
      }, hasActive.current ? FAST_POLL_MS : SLOW_POLL_MS);
    };

    void refreshAllRef.current();
    schedule();
    if (notificationsOn.current) void requestNotificationPermission();

    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        void refreshAllRef.current();
      }
      appState.current = nextAppState;
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [status]);

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
