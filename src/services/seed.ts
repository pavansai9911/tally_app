// Sample data generator — TESTING / DEVELOPER UTILITY ONLY.
//
// Produces realistic long-term usage (accounts, categories, income/expense/transfers with
// varied amounts and times, habits and their check-in history) so testers can evaluate
// reports, charts, filters and performance without hand-entering hundreds of records.
//
// Everything created here is tagged with SEED_TAG in the settings table, so it can be
// detected and cleanly removed instead of silently duplicating.

import { getDb, genId } from '@/db/database';
import { addDaysKey, toDateKey, todayKey } from '@/utils/format';
import { rescheduleAllHabitReminders } from './notifications';

export const SEED_FLAG_KEY = 'sample_data_seeded';

export type SeedRange = '3m' | '6m' | '12m' | 'large';

export const SEED_RANGES: Array<{ key: SeedRange; label: string; months: number; perDay: number }> = [
  { key: '3m', label: 'Last 3 months', months: 3, perDay: 2 },
  { key: '6m', label: 'Last 6 months', months: 6, perDay: 2 },
  { key: '12m', label: 'Last 12 months', months: 12, perDay: 2 },
  { key: 'large', label: 'Large dataset (12 months, heavy)', months: 12, perDay: 6 },
];

const SEED_ACCOUNTS = [
  { name: 'HDFC Savings', type: 'bank' as const, icon: 'ti-building-bank', color: '#3D5AFE', starting: 85000 },
  { name: 'Cash Wallet', type: 'cash' as const, icon: 'ti-cash', color: '#1A9E6B', starting: 4000 },
  { name: 'ICICI Credit Card', type: 'card' as const, icon: 'ti-credit-card', color: '#E0473F', starting: 0 },
];

const SEED_EXPENSE_CATEGORIES = [
  { name: 'Groceries', icon: 'ti-tools-kitchen-2', color: '#E0473F', min: 250, max: 2400, weight: 5 },
  { name: 'Eating out', icon: 'ti-tools-kitchen-2', color: '#F2711C', min: 150, max: 1600, weight: 4 },
  { name: 'Transport', icon: 'ti-car', color: '#3D5AFE', min: 40, max: 900, weight: 5 },
  { name: 'Shopping', icon: 'ti-shopping-bag', color: '#7C4DFF', min: 400, max: 6500, weight: 2 },
  { name: 'Utilities', icon: 'ti-bolt', color: '#C98A1B', min: 500, max: 3200, weight: 1 },
  { name: 'Health', icon: 'ti-medical-cross', color: '#149C8E', min: 200, max: 4000, weight: 1 },
  { name: 'Entertainment', icon: 'ti-device-tv', color: '#D6336C', min: 150, max: 1200, weight: 2 },
  { name: 'Rent', icon: 'ti-home', color: '#4B5159', min: 18000, max: 18000, weight: 0 },
];

const SEED_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'ti-briefcase', color: '#1A9E6B' },
  { name: 'Freelance', icon: 'ti-briefcase', color: '#34C28A' },
];

const SEED_HABITS = [
  { name: 'Morning run', icon: 'ti-run', color: '#1A9E6B', type: 'build' as const, rate: 0.62 },
  { name: 'Read 20 pages', icon: 'ti-book', color: '#3D5AFE', type: 'build' as const, rate: 0.7 },
  { name: 'Drink 3L water', icon: 'ti-glass-full', color: '#149C8E', type: 'build' as const, rate: 0.8 },
  { name: 'Sleep by 11pm', icon: 'ti-moon', color: '#7C4DFF', type: 'build' as const, rate: 0.55 },
  { name: 'No smoking', icon: 'ti-smoking-no', color: '#E0473F', type: 'quit' as const, rate: 0.9 },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const pool = items.filter((i) => i.weight > 0);
  const total = pool.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1];
}

function randomTime(): string {
  const h = randInt(7, 22);
  const m = randInt(0, 59);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export async function hasSampleData(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [SEED_FLAG_KEY]);
  return !!row;
}

/** Remove everything a previous seed created (identified by the recorded ids). */
export async function clearSampleData(): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [SEED_FLAG_KEY]);
  if (!row) return;
  let ids: { accounts: string[]; categories: string[]; habits: string[] };
  try {
    ids = JSON.parse(row.value);
  } catch {
    await db.runAsync('DELETE FROM settings WHERE key = ?', [SEED_FLAG_KEY]);
    return;
  }
  const list = (arr: string[]) => arr.map(() => '?').join(',');

  if (ids.accounts?.length) {
    await db.runAsync(`DELETE FROM transactions WHERE account_id IN (${list(ids.accounts)})`, ids.accounts);
  }
  if (ids.habits?.length) {
    await db.runAsync(`DELETE FROM habit_logs WHERE habit_id IN (${list(ids.habits)})`, ids.habits);
    await db.runAsync(`DELETE FROM habits WHERE id IN (${list(ids.habits)})`, ids.habits);
  }
  if (ids.categories?.length) {
    await db.runAsync(`DELETE FROM budgets WHERE category_id IN (${list(ids.categories)})`, ids.categories);
    await db.runAsync(`DELETE FROM transactions WHERE category_id IN (${list(ids.categories)})`, ids.categories);
    await db.runAsync(`DELETE FROM categories WHERE id IN (${list(ids.categories)})`, ids.categories);
  }
  if (ids.accounts?.length) {
    await db.runAsync(`DELETE FROM accounts WHERE id IN (${list(ids.accounts)})`, ids.accounts);
  }
  await db.runAsync('DELETE FROM settings WHERE key = ?', [SEED_FLAG_KEY]);
}

export interface SeedResult {
  transactions: number;
  habitLogs: number;
  accounts: number;
  categories: number;
  habits: number;
}

/**
 * Generate sample data for the requested range. Any previously seeded data is removed
 * first so repeated runs never pile up duplicates.
 */
export async function seedSampleData(range: SeedRange): Promise<SeedResult> {
  const config = SEED_RANGES.find((r) => r.key === range) ?? SEED_RANGES[0];
  await clearSampleData();

  const db = await getDb();
  const accountIds: string[] = [];
  const categoryIds: string[] = [];
  const habitIds: string[] = [];
  const result: SeedResult = { transactions: 0, habitLogs: 0, accounts: 0, categories: 0, habits: 0 };

  await db.runAsync('BEGIN');
  try {
    // Accounts
    const accounts: Array<{ id: string; name: string }> = [];
    for (const a of SEED_ACCOUNTS) {
      const id = genId('acc');
      await db.runAsync(
        `INSERT INTO accounts (id, name, type, icon, color, starting_balance, include_in_total)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [id, a.name, a.type, a.icon, a.color, a.starting],
      );
      accounts.push({ id, name: a.name });
      accountIds.push(id);
      result.accounts++;
    }

    // Categories
    const expenseCats: Array<{ id: string; min: number; max: number; weight: number; name: string }> = [];
    for (const c of SEED_EXPENSE_CATEGORIES) {
      const id = genId('cat');
      await db.runAsync('INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)', [
        id, c.name, 'expense', c.icon, c.color,
      ]);
      expenseCats.push({ id, min: c.min, max: c.max, weight: c.weight, name: c.name });
      categoryIds.push(id);
      result.categories++;
    }
    const incomeCats: string[] = [];
    for (const c of SEED_INCOME_CATEGORIES) {
      const id = genId('cat');
      await db.runAsync('INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)', [
        id, c.name, 'income', c.icon, c.color,
      ]);
      incomeCats.push(id);
      categoryIds.push(id);
      result.categories++;
    }
    const rentCat = expenseCats.find((c) => c.name === 'Rent')!;

    // Transactions across the window
    const today = todayKey();
    const totalDays = config.months * 30;
    const startKey = addDaysKey(today, -totalDays);

    let dayKey = startKey;
    let guard = 0;
    while (dayKey <= today && guard < 4000) {
      const dayOfMonth = Number(dayKey.slice(8, 10));

      // Monthly salary on the 1st, rent on the 3rd.
      if (dayOfMonth === 1) {
        await db.runAsync(
          `INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, note, occurred_at)
           VALUES (?, 'income', ?, ?, NULL, ?, ?, ?)`,
          [genId('tx'), 92000 + randInt(-3000, 6000), accounts[0].id, incomeCats[0], 'Monthly salary', `${dayKey} 10:${String(randInt(10, 59)).padStart(2, '0')}`],
        );
        result.transactions++;
      }
      if (dayOfMonth === 3) {
        await db.runAsync(
          `INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, note, occurred_at)
           VALUES (?, 'expense', ?, ?, NULL, ?, ?, ?)`,
          [genId('tx'), rentCat.min, accounts[0].id, rentCat.id, 'House rent', `${dayKey} 09:${String(randInt(10, 59)).padStart(2, '0')}`],
        );
        result.transactions++;
      }
      // Occasional freelance income.
      if (dayOfMonth === 18 && Math.random() < 0.5) {
        await db.runAsync(
          `INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, note, occurred_at)
           VALUES (?, 'income', ?, ?, NULL, ?, ?, ?)`,
          [genId('tx'), randInt(6000, 24000), accounts[0].id, incomeCats[1], 'Freelance project', `${dayKey} ${randomTime()}`],
        );
        result.transactions++;
      }
      // Monthly transfer to the cash wallet.
      if (dayOfMonth === 5) {
        await db.runAsync(
          `INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, note, occurred_at)
           VALUES (?, 'transfer', ?, ?, ?, NULL, ?, ?)`,
          [genId('tx'), randInt(3000, 8000), accounts[0].id, accounts[1].id, 'ATM withdrawal', `${dayKey} ${randomTime()}`],
        );
        result.transactions++;
      }

      // Everyday spending.
      const count = randInt(Math.max(0, config.perDay - 2), config.perDay + 1);
      for (let i = 0; i < count; i++) {
        const cat = pickWeighted(expenseCats);
        const account = accounts[randInt(0, accounts.length - 1)];
        await db.runAsync(
          `INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, note, occurred_at)
           VALUES (?, 'expense', ?, ?, NULL, ?, ?, ?)`,
          [genId('tx'), randInt(cat.min, cat.max), account.id, cat.id, cat.name, `${dayKey} ${randomTime()}`],
        );
        result.transactions++;
      }

      dayKey = addDaysKey(dayKey, 1);
      guard++;
    }

    // Budgets on the busiest categories so the budget screens have content.
    for (const c of expenseCats.slice(0, 4)) {
      await db.runAsync(
        `INSERT INTO budgets (id, category_id, monthly_limit, recurrence, alert_near_limit, alert_threshold_pct)
         VALUES (?, ?, ?, 'monthly', 1, 90)`,
        [genId('bud'), c.id, Math.max(3000, c.max * 4)],
      );
    }

    // Habits + their check-in history.
    for (const h of SEED_HABITS) {
      const id = genId('hab');
      await db.runAsync(
        `INSERT INTO habits (id, name, type, goal_type, goal_value, goal_unit, schedule_type, schedule_days, schedule_target, icon, color, reminder_enabled, reminder_time)
         VALUES (?, ?, ?, 'boolean', NULL, NULL, 'daily', NULL, NULL, ?, ?, 0, NULL)`,
        [id, h.name, h.type, h.icon, h.color],
      );
      habitIds.push(id);
      result.habits++;

      let d = startKey;
      let g = 0;
      while (d <= today && g < 4000) {
        if (h.type === 'quit') {
          // Quit habits only record relapses (a 'skipped' day).
          if (Math.random() > h.rate) {
            await db.runAsync(
              'INSERT INTO habit_logs (id, habit_id, log_date, status, value) VALUES (?, ?, ?, ?, NULL)',
              [genId('log'), id, d, 'skipped'],
            );
            result.habitLogs++;
          }
        } else if (Math.random() < h.rate) {
          await db.runAsync(
            'INSERT INTO habit_logs (id, habit_id, log_date, status, value) VALUES (?, ?, ?, ?, 1)',
            [genId('log'), id, d, 'done'],
          );
          result.habitLogs++;
        }
        d = addDaysKey(d, 1);
        g++;
      }
    }

    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [SEED_FLAG_KEY, JSON.stringify({ accounts: accountIds, categories: categoryIds, habits: habitIds, range, at: toDateKey() })],
    );
    await db.runAsync('COMMIT');
  } catch (e) {
    try {
      await db.runAsync('ROLLBACK');
    } catch {
      // ignore
    }
    throw e;
  }

  // Seeded habits have reminders off, but keep scheduled notifications consistent.
  rescheduleAllHabitReminders().catch(() => {});
  return result;
}
