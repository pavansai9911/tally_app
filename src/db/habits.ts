import { getDb, genId } from './database';

export interface Habit {
  id: string;
  name: string;
  type: 'build' | 'quit';
  goal_type: 'boolean' | 'count' | 'duration';
  goal_value: number | null;
  goal_unit: string | null;
  schedule_type: 'daily' | 'specific_days' | 'per_week' | 'per_month';
  schedule_days: string | null; // JSON array of weekday ints, 0=Mon per design
  schedule_target: number | null;
  icon: string;
  color: string;
  reminder_enabled: number;
  reminder_time: string | null;
  archived: number;
  sort_order: number;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string; // YYYY-MM-DD
  status: 'done' | 'partial' | 'skipped';
  value: number | null;
  note: string | null;
}

export async function listHabits(): Promise<Habit[]> {
  const db = await getDb();
  return db.getAllAsync<Habit>('SELECT * FROM habits WHERE archived = 0 ORDER BY sort_order ASC');
}

export async function getHabit(id: string): Promise<Habit | null> {
  const db = await getDb();
  return db.getFirstAsync<Habit>('SELECT * FROM habits WHERE id = ?', [id]);
}

export async function createHabit(input: Omit<Habit, 'id' | 'archived' | 'sort_order'>): Promise<string> {
  const db = await getDb();
  const id = genId('hab');
  await db.runAsync(
    `INSERT INTO habits (id, name, type, goal_type, goal_value, goal_unit, schedule_type, schedule_days, schedule_target, icon, color, reminder_enabled, reminder_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.type, input.goal_type, input.goal_value, input.goal_unit,
     input.schedule_type, input.schedule_days, input.schedule_target, input.icon, input.color,
     input.reminder_enabled, input.reminder_time]
  );
  return id;
}

export async function updateHabit(id: string, input: Partial<Habit>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(input);
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  await db.runAsync(`UPDATE habits SET ${setClause} WHERE id = ?`, [...fields.map(f => (input as any)[f]), id]);
}

export async function archiveHabit(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE habits SET archived = 1 WHERE id = ?', [id]);
}

export async function deleteHabitPermanently(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ?', [id]);
  await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
}

export async function isHabitDueOn(habit: Habit, date: Date): Promise<boolean> {
  if (habit.schedule_type === 'daily') return true;
  if (habit.schedule_type === 'specific_days') {
    const days: number[] = habit.schedule_days ? JSON.parse(habit.schedule_days) : [];
    const weekday = (date.getDay() + 6) % 7; // convert Sun=0 -> Mon=0 indexing
    return days.includes(weekday);
  }
  // per_week / per_month targets are evaluated as "still due" if under target for the period;
  // for simplicity in the Today view, treat as always-listed (UI shows progress toward period target).
  return true;
}

export async function getLogForDate(habitId: string, date: string): Promise<HabitLog | null> {
  const db = await getDb();
  return db.getFirstAsync<HabitLog>(
    'SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?',
    [habitId, date]
  );
}

export async function upsertLog(habitId: string, date: string, status: HabitLog['status'], value?: number, note?: string): Promise<void> {
  const db = await getDb();
  const id = genId('log');
  await db.runAsync(
    `INSERT INTO habit_logs (id, habit_id, log_date, status, value, note)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(habit_id, log_date) DO UPDATE SET status = excluded.status, value = excluded.value, note = excluded.note`,
    [id, habitId, date, status, value ?? null, note ?? null]
  );
}

export async function deleteLog(habitId: string, date: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?', [habitId, date]);
}

export async function getLogsInRange(habitId: string, startDate: string, endDate: string): Promise<HabitLog[]> {
  const db = await getDb();
  return db.getAllAsync<HabitLog>(
    'SELECT * FROM habit_logs WHERE habit_id = ? AND log_date BETWEEN ? AND ? ORDER BY log_date ASC',
    [habitId, startDate, endDate]
  );
}

/**
 * Streak calculation rules (per spec):
 * - For "build" habits: a "done" or "partial" day continues the streak; a "skipped" day on a due date
 *   does NOT break the streak (skip is treated as a neutral pass, not a failure); an unmarked due day
 *   in the past breaks the streak.
 * - For "quit" habits: streak counts consecutive days where the habit was NOT marked as a relapse.
 *   Absence of a log (no relapse recorded) counts as a successful day.
 */
export async function calculateStreaks(habit: Habit, todayStr: string): Promise<{ current: number; longest: number; totalCompletions: number; rate30d: number }> {
  const db = await getDb();
  const logs = await db.getAllAsync<HabitLog>(
    'SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY log_date DESC',
    [habit.id]
  );
  const logMap = new Map(logs.map(l => [l.log_date, l]));

  function isSuccessDay(dateStr: string): boolean {
    const log = logMap.get(dateStr);
    if (habit.type === 'quit') {
      // success = no relapse logged (absence of a 'skipped'/failure entry counts as success)
      return !log || log.status !== 'skipped';
    }
    if (!log) return false;
    return log.status === 'done' || log.status === 'partial' || log.status === 'skipped';
  }

  // Current streak: walk backward from today
  let current = 0;
  let cursor = new Date(todayStr);
  while (true) {
    const dStr = cursor.toISOString().slice(0, 10);
    if (isSuccessDay(dStr)) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest streak: scan all log history plus today backward 365 days
  let longest = current;
  let running = 0;
  const scanStart = new Date(todayStr);
  scanStart.setDate(scanStart.getDate() - 365);
  for (let d = new Date(scanStart); d <= new Date(todayStr); d.setDate(d.getDate() + 1)) {
    const dStr = d.toISOString().slice(0, 10);
    if (isSuccessDay(dStr)) {
      running++;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  const totalCompletions = logs.filter(l => l.status === 'done').length;

  const last30 = logs.filter(l => {
    const diffDays = (new Date(todayStr).getTime() - new Date(l.log_date).getTime()) / 86400000;
    return diffDays >= 0 && diffDays < 30;
  });
  const successIn30 = last30.filter(l => l.status === 'done' || l.status === 'partial').length;
  const rate30d = last30.length > 0 ? Math.round((successIn30 / 30) * 100) : 0;

  return { current, longest, totalCompletions, rate30d };
}

export async function getTodayHabitsWithStatus(todayStr: string): Promise<Array<Habit & { log: HabitLog | null; streak: number }>> {
  const habits = await listHabits();
  const result = [];
  for (const habit of habits) {
    const due = await isHabitDueOn(habit, new Date(todayStr));
    if (!due) continue;
    const log = await getLogForDate(habit.id, todayStr);
    const { current } = await calculateStreaks(habit, todayStr);
    result.push({ ...habit, log, streak: current });
  }
  return result;
}
