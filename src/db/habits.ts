import { getDb, genId, buildUpdate } from './database';
import { addDaysKey, parseDateKey } from '@/utils/format';

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
  created_at?: string;
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
  return db.getAllAsync<Habit>('SELECT * FROM habits WHERE archived = 0 ORDER BY sort_order ASC, created_at ASC');
}

export async function getHabit(id: string): Promise<Habit | null> {
  const db = await getDb();
  return db.getFirstAsync<Habit>('SELECT * FROM habits WHERE id = ?', [id]);
}

export async function createHabit(input: Omit<Habit, 'id' | 'archived' | 'sort_order' | 'created_at'>): Promise<string> {
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
  const { clause, values } = buildUpdate<Habit>(input, [
    'name', 'type', 'goal_type', 'goal_value', 'goal_unit', 'schedule_type', 'schedule_days',
    'schedule_target', 'icon', 'color', 'reminder_enabled', 'reminder_time', 'archived', 'sort_order',
  ]);
  if (!clause) return;
  await db.runAsync(`UPDATE habits SET ${clause} WHERE id = ?`, [...values, id]);
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

export function isHabitDueOn(habit: Habit, date: Date): boolean {
  if (habit.schedule_type === 'daily') return true;
  if (habit.schedule_type === 'specific_days') {
    const days: number[] = habit.schedule_days ? JSON.parse(habit.schedule_days) : [];
    const weekday = (date.getDay() + 6) % 7; // convert Sun=0 -> Mon=0 indexing
    return days.includes(weekday);
  }
  // per_week / per_month targets: always listed in the Today view (UI shows period progress).
  return true;
}

export async function getLogForDate(habitId: string, date: string): Promise<HabitLog | null> {
  const db = await getDb();
  return db.getFirstAsync<HabitLog>('SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?', [habitId, date]);
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

// Absolute floor for streak walks so a "quit" habit with no relapse logs can't loop forever.
const MAX_STREAK_DAYS = 3660; // ~10 years

/**
 * Streak calculation (all date math in local time via YYYY-MM-DD keys — no UTC drift):
 * - "build": a done/partial/skipped log on a day continues the streak; an unlogged past day breaks it.
 *   Today being unlogged does NOT break the streak (it is still "pending" until end of day).
 * - "quit": every day without a 'skipped' (relapse) log counts as success; a relapse breaks it.
 * The backward/forward walks are floored at the habit's creation date (or MAX_STREAK_DAYS).
 */
export async function calculateStreaks(
  habit: Habit,
  todayStr: string,
): Promise<{ current: number; longest: number; totalCompletions: number; rate30d: number }> {
  const db = await getDb();
  const logs = await db.getAllAsync<HabitLog>(
    'SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY log_date DESC',
    [habit.id]
  );
  const logMap = new Map(logs.map((l) => [l.log_date, l]));

  const createdKey = habit.created_at ? habit.created_at.slice(0, 10) : addDaysKey(todayStr, -MAX_STREAK_DAYS);
  const earliestLogKey = logs.length > 0 ? logs[logs.length - 1].log_date : todayStr;
  const floorKey = createdKey < earliestLogKey ? createdKey : earliestLogKey;

  function isSuccessDay(dateStr: string): boolean {
    const log = logMap.get(dateStr);
    if (habit.type === 'quit') {
      return !log || log.status !== 'skipped';
    }
    if (!log) return false;
    return log.status === 'done' || log.status === 'partial' || log.status === 'skipped';
  }

  // Current streak: walk backward from today (skip an unlogged "pending" today), floored at creation.
  let cursorKey = todayStr;
  if (!isSuccessDay(cursorKey)) cursorKey = addDaysKey(cursorKey, -1);
  let current = 0;
  while (cursorKey >= floorKey && isSuccessDay(cursorKey)) {
    current++;
    cursorKey = addDaysKey(cursorKey, -1);
  }

  // Longest streak: scan floor..today forward.
  let longest = current;
  let running = 0;
  let k = floorKey;
  let guard = 0;
  while (k <= todayStr && guard < MAX_STREAK_DAYS + 2) {
    if (isSuccessDay(k)) {
      running++;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
    k = addDaysKey(k, 1);
    guard++;
  }

  const totalCompletions = logs.filter((l) => l.status === 'done').length;

  // 30-day success rate, denominator = days actually observable (avoids understating new habits).
  const windowStart = addDaysKey(todayStr, -29);
  const observedDays = createdKey > windowStart ? daysBetween(createdKey, todayStr) + 1 : 30;
  const last30 = logs.filter((l) => l.log_date >= windowStart && l.log_date <= todayStr);
  const successIn30 = last30.filter((l) => l.status === 'done' || l.status === 'partial').length;
  const rate30d = observedDays > 0 ? Math.round((successIn30 / observedDays) * 100) : 0;

  return { current, longest, totalCompletions, rate30d: Math.min(100, rate30d) };
}

function daysBetween(startKey: string, endKey: string): number {
  const a = parseDateKey(startKey).getTime();
  const b = parseDateKey(endKey).getTime();
  return Math.round((b - a) / 86400000);
}

export async function getTodayHabitsWithStatus(
  todayStr: string,
): Promise<Array<Habit & { log: HabitLog | null; streak: number }>> {
  const habits = await listHabits();
  const today = parseDateKey(todayStr);
  const result: Array<Habit & { log: HabitLog | null; streak: number }> = [];
  for (const habit of habits) {
    if (!isHabitDueOn(habit, today)) continue;
    const log = await getLogForDate(habit.id, todayStr);
    const { current } = await calculateStreaks(habit, todayStr);
    result.push({ ...habit, log, streak: current });
  }
  return result;
}
