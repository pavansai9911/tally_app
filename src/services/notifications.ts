// Habit reminder scheduling via notifee (local notifications only — no push, fully offline).
//
// Daily habits get one DAILY repeating trigger; specific-day habits get one WEEKLY trigger
// per selected weekday. We use inexact scheduling (no AlarmManager) so the app needs no
// SCHEDULE_EXACT_ALARM permission — reminders may fire a few minutes off, which is fine.

import notifee, { AndroidImportance, RepeatFrequency, TimestampTrigger, TriggerType } from '@notifee/react-native';
import { Habit, listHabits } from '@/db/habits';

const CHANNEL_ID = 'habit-reminders';

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    // AUTHORIZED (1) or PROVISIONAL (2)
    return settings.authorizationStatus >= 1;
  } catch {
    return false;
  }
}

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Habit reminders',
    description: 'Daily nudges for the habits you are tracking',
    importance: AndroidImportance.HIGH,
    // 'default' = the device's own notification sound. No bundled audio, so nothing
    // copyrighted ships with the app. Vibration accompanies it.
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500],
  });
}

/** Next epoch-ms for a given local hour:minute, optionally constrained to a weekday (0=Mon..6=Sun). */
function nextOccurrence(hour: number, minute: number, weekday?: number): number {
  const now = Date.now();
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (weekday === undefined) {
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  } else {
    const jsTarget = (weekday + 1) % 7; // our Mon=0..Sun=6 -> JS Sun=0..Sat=6
    let add = (jsTarget - d.getDay() + 7) % 7;
    if (add === 0 && d.getTime() <= now) add = 7;
    d.setDate(d.getDate() + add);
  }
  return d.getTime();
}

async function createTrigger(
  id: string,
  title: string,
  body: string,
  timestamp: number,
  frequency: RepeatFrequency,
): Promise<void> {
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp,
    repeatFrequency: frequency,
    // Deliver even when the device is dozing. allowWhileIdle uses
    // setAndAllowWhileIdle (NOT setExact), so no SCHEDULE_EXACT_ALARM permission is
    // needed — reminders may land a few minutes late but they do fire.
    alarmManager: { allowWhileIdle: true },
  };
  await notifee.createTriggerNotification(
    {
      id,
      title,
      body,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
        sound: 'default',
        autoCancel: true,
      },
    },
    trigger,
  );
}

export async function cancelHabitReminder(habitId: string): Promise<void> {
  try {
    const ids = await notifee.getTriggerNotificationIds();
    const toCancel = ids.filter((id) => id === `habit-${habitId}` || id.startsWith(`habit-${habitId}-`));
    for (const id of toCancel) {
      await notifee.cancelTriggerNotification(id);
    }
  } catch {
    // ignore
  }
}

export async function scheduleHabitReminder(habit: Habit): Promise<void> {
  await cancelHabitReminder(habit.id);
  if (!habit.reminder_enabled || !habit.reminder_time) return;
  const [h, m] = habit.reminder_time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return;

  await ensureChannel();
  const title = habit.type === 'quit' ? `Stay strong — ${habit.name}` : `Time for ${habit.name}`;
  const body = habit.type === 'quit' ? 'Keep your streak alive today.' : 'Tap to check in and keep your streak.';

  if (habit.schedule_type === 'specific_days' && habit.schedule_days) {
    let days: number[] = [];
    try {
      days = JSON.parse(habit.schedule_days);
    } catch {
      days = [];
    }
    for (const wd of days) {
      await createTrigger(`habit-${habit.id}-${wd}`, title, body, nextOccurrence(h, m, wd), RepeatFrequency.WEEKLY);
    }
  } else {
    await createTrigger(`habit-${habit.id}`, title, body, nextOccurrence(h, m), RepeatFrequency.DAILY);
  }
}

/**
 * Cancel and re-create all habit reminders from the DB.
 *
 * Run at every app start: notifee's trigger notifications do NOT survive a device reboot,
 * so rebuilding them on launch is what makes reminders persist across restarts.
 */
export async function rescheduleAllHabitReminders(): Promise<void> {
  try {
    const habits = await listHabits();
    const wantsReminders = habits.some((h) => h.reminder_enabled && h.reminder_time);
    // Without POST_NOTIFICATIONS (Android 13+) nothing would ever be shown, so ask as soon
    // as we know the user actually has reminders configured.
    if (wantsReminders) await requestNotificationPermission();

    const ids = await notifee.getTriggerNotificationIds();
    for (const id of ids.filter((i) => i.startsWith('habit-'))) {
      await notifee.cancelTriggerNotification(id);
    }
    for (const h of habits) {
      await scheduleHabitReminder(h);
    }
  } catch {
    // notifications are best-effort; never block app startup on them
  }
}

/** How many habit reminders are currently scheduled (used by the Settings diagnostics). */
export async function scheduledReminderCount(): Promise<number> {
  try {
    const ids = await notifee.getTriggerNotificationIds();
    return ids.filter((i) => i.startsWith('habit-')).length;
  } catch {
    return 0;
  }
}

/**
 * Fire a notification a few seconds from now so testers can confirm the whole pipeline
 * (permission -> channel -> sound -> delivery) without waiting for a real reminder time.
 */
export async function sendTestReminder(): Promise<boolean> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
    await ensureChannel();
    await createTrigger(
      'habit-test-reminder',
      'Tally test reminder',
      'If you can see (and hear) this, reminders are working.',
      Date.now() + 5000,
      RepeatFrequency.NONE,
    );
    return true;
  } catch {
    return false;
  }
}
