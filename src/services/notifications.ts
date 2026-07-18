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
    importance: AndroidImportance.HIGH,
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

/** Cancel and re-create all habit reminders from the DB (run at startup and after edits). */
export async function rescheduleAllHabitReminders(): Promise<void> {
  try {
    const ids = await notifee.getTriggerNotificationIds();
    for (const id of ids.filter((i) => i.startsWith('habit-'))) {
      await notifee.cancelTriggerNotification(id);
    }
    const habits = await listHabits();
    for (const h of habits) {
      await scheduleHabitReminder(h);
    }
  } catch {
    // notifications are best-effort; never block app startup on them
  }
}
