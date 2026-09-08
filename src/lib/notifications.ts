import type { DailyStats } from "./daily";
import { DAILY_RELEASE_HOUR_UTC } from "./daily";
import strings from "../constants/strings";

export type ReminderPeriod = "AM" | "PM";

export type NotificationSettings = {
  dailyStreakRemindersEnabled: boolean;
  streakResetWarningHours: number;
  customReminderTimeEnabled: boolean;
  customReminderHour: number;
  customReminderMinute: number;
  customReminderPeriod: ReminderPeriod;
  inactivityReminderEnabled: boolean;
  inactivityReminderDays: number;
};

export const STREAK_RESET_WARNING_NOTIFICATION_ID = 19821;
export const CUSTOM_TIME_REMINDER_NOTIFICATION_ID = 19823;
export const INACTIVITY_REMINDER_NOTIFICATION_ID = 19822;
export const REMINDER_NOTIFICATION_CHANNEL_ID = "vagudle-reminders";
export const REMINDER_NOTIFICATION_LARGE_ICON = "ic_notification_large";
export const REMINDER_NOTIFICATION_ACTION_TYPE_ID = "vagudle-reminder-actions";
export const PLAY_NOW_ACTION_ID = "PLAY_NOW";
export const STREAK_WARNING_ACTION_TYPE_ID = "vagudle-streak-warning-actions";
export const PLAY_DAILY_ACTION_ID = "PLAY_DAILY";

export const DEFAULT_DAILY_REMINDER_HOUR = 20;

const REMINDER_NOTIFICATION_IDS = new Set([
  STREAK_RESET_WARNING_NOTIFICATION_ID,
  CUSTOM_TIME_REMINDER_NOTIFICATION_ID,
  INACTIVITY_REMINDER_NOTIFICATION_ID,
]);

const getNotificationPrimerPlugin =
  (): CapacitorNotificationPrimerPlugin | null => {
    if (typeof window === "undefined") return null;
    if (!window.Capacitor?.isNativePlatform?.()) return null;
    return window.Capacitor.Plugins?.NotificationPrimer ?? null;
  };

const getLocalNotificationsPlugin =
  (): CapacitorLocalNotificationsPlugin | null => {
    if (typeof window === "undefined") return null;
    if (!window.Capacitor?.isNativePlatform?.()) return null;
    return window.Capacitor.Plugins?.LocalNotifications ?? null;
  };

export const to24Hour = (hour12: number, period: ReminderPeriod): number => {
  const normalizedHour = hour12 % 12;
  return period === "PM" ? normalizedHour + 12 : normalizedHour;
};

export const getCustomReminderTime = (
  settings: Pick<
    NotificationSettings,
    "customReminderHour" | "customReminderMinute" | "customReminderPeriod"
  >
): { hour: number; minute: number } => ({
  hour: to24Hour(settings.customReminderHour, settings.customReminderPeriod),
  minute: settings.customReminderMinute,
});

export const getStreakResetWarningFireDate = (
  currentDailyDate: string | null,
  lastCompletedDate: DailyStats["lastCompletedDate"],
  streakResetWarningHours: number,
  now: Date = new Date()
): Date | null => {
  if (!currentDailyDate) return null;
  if (lastCompletedDate === currentDailyDate) return null;

  const [year, month, day] = currentDailyDate.split("-").map(Number);
  if (!year || !month || !day) return null;

  const releaseTime = Date.UTC(year, month - 1, day, DAILY_RELEASE_HOUR_UTC);
  const resetTime = releaseTime + 24 * 60 * 60 * 1000;
  const fireDate = new Date(
    resetTime - streakResetWarningHours * 60 * 60 * 1000
  );

  return fireDate.getTime() > now.getTime() ? fireDate : null;
};

export const getInactivityReminderFireDate = (
  lastCompletedDate: DailyStats["lastCompletedDate"],
  inactivityReminderDays: number,
  now: Date = new Date()
): Date | null => {
  if (!lastCompletedDate) return null;
  const lastPlayed = new Date(`${lastCompletedDate}T00:00:00Z`);
  if (Number.isNaN(lastPlayed.getTime())) return null;

  const fireDate = new Date(lastPlayed);
  fireDate.setUTCDate(fireDate.getUTCDate() + inactivityReminderDays);
  fireDate.setUTCHours(DEFAULT_DAILY_REMINDER_HOUR, 0, 0, 0);

  return fireDate.getTime() > now.getTime() ? fireDate : null;
};

const ensureChannel = async (
  plugin: CapacitorLocalNotificationsPlugin
): Promise<void> => {
  try {
    await plugin.createChannel({
      id: REMINDER_NOTIFICATION_CHANNEL_ID,
      name: strings.NOTIFICATION_CHANNEL_NAME,
      description: strings.NOTIFICATION_CHANNEL_DESCRIPTION,
      importance: 3,
    });
  } catch {}
};

const ensureActionTypesRegistered = async (
  plugin: CapacitorLocalNotificationsPlugin
): Promise<void> => {
  try {
    await plugin.registerActionTypes({
      types: [
        {
          id: REMINDER_NOTIFICATION_ACTION_TYPE_ID,
          actions: [
            {
              id: PLAY_NOW_ACTION_ID,
              title: strings.NOTIFICATION_ACTION_PLAY_NOW,
            },
          ],
        },
        {
          id: STREAK_WARNING_ACTION_TYPE_ID,
          actions: [
            {
              id: PLAY_DAILY_ACTION_ID,
              title: strings.NOTIFICATION_ACTION_PLAY_DAILY,
            },
          ],
        },
      ],
    });
  } catch {}
};

const ensurePermission = async (
  plugin: CapacitorLocalNotificationsPlugin
): Promise<boolean> => {
  try {
    const current = await plugin.checkPermissions();
    if (current.display === "granted") return true;
    const requested = await plugin.requestPermissions();
    return requested.display === "granted";
  } catch {
    return false;
  }
};

export const syncNotificationSchedule = async (
  settings: NotificationSettings,
  lastCompletedDate: DailyStats["lastCompletedDate"],
  currentDailyDate: string | null
): Promise<void> => {
  const plugin = getLocalNotificationsPlugin();
  if (!plugin) return;

  const anyReminderEnabled =
    settings.dailyStreakRemindersEnabled ||
    settings.customReminderTimeEnabled ||
    settings.inactivityReminderEnabled;

  if (!anyReminderEnabled) {
    await plugin.cancel({
      notifications: [
        { id: STREAK_RESET_WARNING_NOTIFICATION_ID },
        { id: CUSTOM_TIME_REMINDER_NOTIFICATION_ID },
        { id: INACTIVITY_REMINDER_NOTIFICATION_ID },
      ],
    });
    return;
  }

  const granted = await ensurePermission(plugin);
  if (!granted) return;

  await ensureChannel(plugin);
  await ensureActionTypesRegistered(plugin);

  try {
    await plugin.cancel({
      notifications: [
        { id: STREAK_RESET_WARNING_NOTIFICATION_ID },
        { id: CUSTOM_TIME_REMINDER_NOTIFICATION_ID },
        { id: INACTIVITY_REMINDER_NOTIFICATION_ID },
      ],
    });
  } catch {}

  const notificationsToSchedule: CapacitorLocalNotification[] = [];

  if (settings.dailyStreakRemindersEnabled) {
    const fireDate = getStreakResetWarningFireDate(
      currentDailyDate,
      lastCompletedDate,
      settings.streakResetWarningHours
    );
    if (fireDate) {
      notificationsToSchedule.push({
        id: STREAK_RESET_WARNING_NOTIFICATION_ID,
        title: strings.NOTIFICATION_STREAK_WARNING_TITLE,
        body: strings.NOTIFICATION_STREAK_WARNING_BODY,
        channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        actionTypeId: STREAK_WARNING_ACTION_TYPE_ID,
        schedule: {
          at: fireDate,
          allowWhileIdle: true,
        },
      });
    }
  }

  if (settings.customReminderTimeEnabled) {
    const { hour, minute } = getCustomReminderTime(settings);
    notificationsToSchedule.push({
      id: CUSTOM_TIME_REMINDER_NOTIFICATION_ID,
      title: strings.NOTIFICATION_CUSTOM_REMINDER_TITLE,
      body: strings.NOTIFICATION_CUSTOM_REMINDER_BODY,
      channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
      largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
      actionTypeId: REMINDER_NOTIFICATION_ACTION_TYPE_ID,
      schedule: {
        on: { hour, minute },
        allowWhileIdle: true,
      },
    });
  }

  if (settings.inactivityReminderEnabled) {
    const fireDate = getInactivityReminderFireDate(
      lastCompletedDate,
      settings.inactivityReminderDays
    );
    if (fireDate) {
      notificationsToSchedule.push({
        id: INACTIVITY_REMINDER_NOTIFICATION_ID,
        title: strings.NOTIFICATION_INACTIVITY_TITLE,
        body: strings.NOTIFICATION_INACTIVITY_BODY,
        channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        actionTypeId: REMINDER_NOTIFICATION_ACTION_TYPE_ID,
        schedule: {
          at: fireDate,
          allowWhileIdle: true,
        },
      });
    }
  }

  if (notificationsToSchedule.length > 0) {
    await plugin.schedule({ notifications: notificationsToSchedule });
  }
};

export const runNotificationPrimerFlow = async (
  settings: NotificationSettings,
  lastCompletedDate: DailyStats["lastCompletedDate"],
  currentDailyDate: string | null
): Promise<void> => {
  const primerPlugin = getNotificationPrimerPlugin();
  if (!primerPlugin) {
    await syncNotificationSchedule(
      settings,
      lastCompletedDate,
      currentDailyDate
    );
    return;
  }

  const result = await primerPlugin.showPrimer();
  if (result.alreadyShown || !result.accepted) return;

  await syncNotificationSchedule(settings, lastCompletedDate, currentDailyDate);
};

export const listenForReminderNotificationTaps = (
  onOpenDaily: () => void
): void => {
  const plugin = getLocalNotificationsPlugin();
  if (!plugin) return;

  void plugin.addListener("localNotificationActionPerformed", (event) => {
    if (!REMINDER_NOTIFICATION_IDS.has(event.notification.id)) return;
    onOpenDaily();
  });
};
