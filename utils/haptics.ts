import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function safe(fn: () => Promise<void>) {
  if (!enabled) return;
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
}

export const haptics = {
  tick() {
    safe(() => Haptics.selectionAsync());
  },
  light() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  medium() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  heavy() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  success() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  warning() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  error() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
