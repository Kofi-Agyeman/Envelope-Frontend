declare module 'expo-notifications' {
  export type NotificationContent = {
    title?: string;
    body?: string;
    sound?: boolean | string;
    data?: Record<string, unknown>;
  };
  export type NotificationTrigger = null | { seconds?: number; repeats?: boolean };
  export type NotificationRequest = {
    content: NotificationContent;
    trigger: NotificationTrigger;
  };
  export type NotificationPermissionsStatus = { granted: boolean; status: string };
  export function setNotificationHandler(handler: {
    handleNotification: (notification: unknown) => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
    }>;
  }): void;
  export function setNotificationChannelAsync(
    channelId: string,
    channel: {
      name: string;
      importance?: number;
      vibrationPattern?: number[];
      lightColor?: string;
    },
  ): Promise<unknown>;
  export function getPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function requestPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function scheduleNotificationAsync(request: NotificationRequest): Promise<string>;
}
