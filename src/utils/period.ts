import { monthKey } from './format';

/** Selectable reporting window used by the Home hero and Reports. */
export type PeriodKey = 'month' | '3m' | '6m' | 'all';

export const PERIOD_OPTIONS: { key: PeriodKey; label: string; short: string }[] = [
  { key: 'month', label: 'This month', short: 'This month' },
  { key: '3m', label: 'Last 3 months', short: '3 months' },
  { key: '6m', label: 'Last 6 months', short: '6 months' },
  { key: 'all', label: 'All time', short: 'All time' },
];

export function periodLabel(period: PeriodKey): string {
  return PERIOD_OPTIONS.find(p => p.key === period)?.short ?? 'This month';
}

/**
 * Inclusive start month key ('YYYY-MM') for a period, or null for all-time.
 * `month` returns the current month so callers can prefix-match a single month exactly.
 */
export function periodStartKey(period: PeriodKey, from: Date = new Date()): string | null {
  if (period === 'all') return null;
  const back = period === 'month' ? 0 : period === '3m' ? 2 : 5;
  return monthKey(new Date(from.getFullYear(), from.getMonth() - back, 1));
}

/**
 * Does a stored `occurred_at` ('YYYY-MM-DD HH:MM') fall inside a period? Mirrors the breakdown
 * queries: `month` is the exact current month (prefix), ranges are `>= start`, `all` is always.
 */
export function matchesPeriod(occurredAt: string, period: PeriodKey): boolean {
  if (period === 'month') return occurredAt.startsWith(monthKey());
  const start = periodStartKey(period);
  return !start || occurredAt >= start;
}
