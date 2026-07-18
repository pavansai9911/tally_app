// Date + currency helpers.
//
// IMPORTANT: all date keys are computed in the device's LOCAL timezone.
// The original app used `new Date().toISOString()` (UTC), which in IST (UTC+5:30)
// rolled the date back to "yesterday" between 00:00 and 05:30 local time,
// corrupting habit logs, streaks and monthly summaries. Never use toISOString here.

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 'YYYY-MM-DD' for the given date in LOCAL time (default: now). */
export function toDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 'YYYY-MM' for the given date in LOCAL time (default: now). */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** Today's 'YYYY-MM-DD' in LOCAL time. */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** Parse a 'YYYY-MM-DD' key into a LOCAL Date at midnight (avoids UTC parsing pitfalls). */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Add `n` days to a 'YYYY-MM-DD' key, returning a new key (local time, DST-safe). */
export function addDaysKey(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DEFAULT_CURRENCY_SYMBOL = '₹';

/**
 * Indian-grouping currency formatter that does NOT depend on Intl/Hermes locale data
 * (which is not guaranteed on every Android build). e.g. 1234567 -> "₹12,34,567".
 */
export function formatCurrency(amount: number, symbol: string = DEFAULT_CURRENCY_SYMBOL): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const s = String(Math.abs(rounded));
  let grouped: string;
  if (s.length <= 3) {
    grouped = s;
  } else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3);
    grouped = `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
  }
  return `${sign}${symbol}${grouped}`;
}

/** "Today" / "Yesterday" / "5 Jan" from a date key or timestamp. */
export function formatDateLabel(dateStr: string): string {
  const key = dateStr.slice(0, 10);
  if (key === todayKey()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === toDateKey(yesterday)) return 'Yesterday';
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** e.g. "Saturday, 18 July" — used for the dashboard header (no Intl dependency). */
export function formatWeekdayLong(d: Date = new Date()): string {
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

/** e.g. "July 2026" from a Date (no Intl dependency). */
export function formatMonthYear(d: Date = new Date()): string {
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** e.g. "Jul" short month from a month key 'YYYY-MM'. */
export function shortMonthFromKey(mk: string): string {
  const m = Number(mk.slice(5, 7));
  return MONTHS_SHORT[(m || 1) - 1];
}

/** Full label for a specific date key, e.g. "18 July 2026". */
export function formatFullDate(dateStr: string): string {
  const d = parseDateKey(dateStr);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}
