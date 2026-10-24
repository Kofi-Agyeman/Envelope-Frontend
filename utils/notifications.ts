import { Platform } from 'react-native';
import type { Envelope } from '@/types';
import { formatMoney, formatTime } from '@/utils/format';

// expo-notifications pulls in a native module that is not shipped with Expo Go
// on Android (SDK 53+). Load it lazily so the rest of the app keeps working
// there; notification features simply no-op when the module is unavailable.
type NotificationsModule = typeof import('expo-notifications');

let notifications: NotificationsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  notifications = require('expo-notifications');
} catch {
  notifications = null;
}

if (notifications) {
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Android requires a notification channel for local notifications to appear.
  if (Platform.OS === 'android') {
    void notifications.setNotificationChannelAsync('default', {
      name: 'Envelope updates',
      importance: 4,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFC107',
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || !notifications) return false;
  const existing = await notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function notifyEnvelopeCompleted(envelope: Envelope): Promise<void> {
  if (!notifications) return;
  const when = envelope.completedAt ?? new Date().toISOString();
  await notifications.scheduleNotificationAsync({
    content: {
      title: 'Payment successful',
      body: `An envelope of ${formatMoney(envelope.amount)} was claimed and paid. Time: ${formatTime(when)}.`,
      sound: true,
    },
    trigger: null,
  });
}