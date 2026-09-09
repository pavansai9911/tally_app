// Date-range resolution for the export sheet. Distinct from utils/period.ts (Reports' coarse,
// month-aligned presets used for on-screen filtering) because export needs an actual day-precision
// [start, end] window — both for a real custom range and so "This month" exports stop at today
// rather than running to month-end.
import { PeriodKey, PERIOD_OPTIONS } from './period';
import { todayKey, monthKey, formatFullDate } from './format';

export type ExportRangeKey = PeriodKey | 'custom';

export const EXPORT_RANGE_OPTIONS: { key: ExportRangeKey; short: string }[] = [
  ...PERIOD_OPTIONS.map(p => ({ key: p.key as ExportRangeKey, short: p.short })),
  { key: 'custom', short: 'Custom' },
];

export interface ResolvedExportRange {
  /** 'YYYY-MM-DD', inclusive. Null = no lower bound (all-time). */
  start: string | null;
  /** 'YYYY-MM-DD', inclusive. */
  end: string;
  /** Human label for the sheet + report header, e.g. "This month" or "1 Jan 2026 – 20 Aug 2026". */
  label: string;
}

/** Resolve a preset or custom selection into a concrete day-precision range, ending today. */
export function resolveExportRange(key: ExportRangeKey, custom?: { start: string; end: string }): ResolvedExportRange {
  const end = key === 'custom' && custom ? custom.end : todayKey();

  if (key === 'custom') {
    const start = custom?.start ?? end;
    return { start, end, label: `${formatFullDate(start)} – ${formatFullDate(end)}` };
  }
  if (key === 'all') {
    return { start: null, end, label: 'All time' };
  }
  if (key === 'month') {
    return { start: `${monthKey()}-01`, end, label: 'This month' };
  }
  const back = key === '3m' ? 2 : 5;
  const now = new Date();
  const startMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - back, 1));
  const short = PERIOD_OPTIONS.find(p => p.key === key)?.short ?? 'This month';
  return { start: `${startMonth}-01`, end, label: short };
}
