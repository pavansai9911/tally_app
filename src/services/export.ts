// Reports export: CSV / JSON / PDF, all scoped to a date range picked in the export sheet.
//
// Deliberately separate from services/backup.ts: backup.ts is a full-database snapshot used for
// disaster recovery (every table, restorable); this is a read-only report of transactions in a
// window, for the user's own records / sharing. They share only file-write + share-sheet plumbing
// (RNFS + Share, timestampSlug from backup.ts).

import * as RNFS from '@dr.pogodin/react-native-fs';
import Share from 'react-native-share';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import {
  listTransactionsInRange, getSummaryInRange, getExpenseBreakdownInRange,
  TransactionExportRow, MonthSummary, CategoryBreakdown,
} from '@/db';
import { formatCurrency, formatDateTimeLabel, formatFullDate, formatTime12, todayKey, toTimeKey } from '@/utils/format';
import { ResolvedExportRange } from '@/utils/exportRange';
import { APP_VERSION } from '@/constants/app';
import { timestampSlug } from '@/services/backup';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export const EXPORT_STAGES = ['Fetching your data…', 'Preparing your report…', 'Formatting your export…', 'Finalizing…'];

// Detail table rows shown in the PDF are capped for render time/memory in the WebView print
// pipeline; CSV/JSON are plain text and stay unlimited. ~2,600 is this app's own "large" seed
// dataset ceiling (src/services/seed.ts) — comfortably above that with headroom to spare.
const PDF_ROW_CAP = 2000;

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Same 6-column shape as the original all-time export — only the row set is now filtered. */
function buildCsv(rows: TransactionExportRow[]): string {
  const header = 'Date & time,Type,Amount,Category,Account,Note';
  const lines = rows.map((r) =>
    [r.occurred_at, r.type, r.amount, r.category_name ?? '', r.account_name, r.note ?? ''].map(csvEscape).join(','),
  );
  return [header, ...lines].join('\n');
}

function buildJson(rows: TransactionExportRow[], summary: MonthSummary, range: ResolvedExportRange): string {
  const payload = {
    app: 'tally',
    appVersion: APP_VERSION,
    generatedAt: new Date().toISOString(),
    range: { start: range.start, end: range.end, label: range.label },
    summary,
    transactionCount: rows.length,
    transactions: rows.map((r) => ({
      id: r.id,
      occurredAt: r.occurred_at,
      type: r.type,
      amount: r.amount,
      category: r.category_name,
      account: r.account_name,
      toAccount: r.to_account_name,
      note: r.note,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

const PDF_COLORS = { accent: '#3D5AFE', accentTint: '#E8EAFD', income: '#1A9E6B', incomeTint: '#E3F5EC', expense: '#E0473F', expenseTint: '#FCEAE9', ink: '#13161A', sub: '#6B7280', line: '#EAEAEF' };

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildReportHtml(
  rows: TransactionExportRow[],
  summary: MonthSummary,
  breakdown: CategoryBreakdown[],
  range: ResolvedExportRange,
): string {
  const c = PDF_COLORS;
  const shown = rows.slice(0, PDF_ROW_CAP);
  const breakdownTotal = breakdown.reduce((s, b) => s + b.total, 0);

  const categoryRows = breakdown.map((b) => {
    const pct = breakdownTotal > 0 ? Math.round((b.total / breakdownTotal) * 100) : 0;
    return `<tr>
      <td><span class="dot" style="background:${b.category_color}"></span>${escapeHtml(b.category_name)}</td>
      <td class="amt">${formatCurrency(b.total)}</td>
      <td class="amt">${pct}%</td>
    </tr>`;
  }).join('');

  const txRows = shown.map((r) => {
    const amtClass = r.type === 'income' ? 'pos' : r.type === 'expense' ? 'neg' : '';
    const sign = r.type === 'income' ? '+' : r.type === 'expense' ? '-' : '';
    const typeLabel = r.type === 'transfer' ? `Transfer${r.to_account_name ? ` → ${escapeHtml(r.to_account_name)}` : ''}` : r.type[0].toUpperCase() + r.type.slice(1);
    return `<tr>
      <td>${escapeHtml(formatDateTimeLabel(r.occurred_at))}</td>
      <td>${typeLabel}</td>
      <td>${escapeHtml(r.category_name ?? '—')}</td>
      <td>${escapeHtml(r.account_name)}</td>
      <td class="note">${escapeHtml(r.note ?? '')}</td>
      <td class="amt ${amtClass}">${sign}${formatCurrency(r.amount)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Roboto, Arial, sans-serif; color: ${c.ink}; font-size: 11px; margin: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${c.accent}; padding-bottom: 14px; margin-bottom: 22px; }
  .brand { font-size: 22px; font-weight: 700; color: ${c.accent}; letter-spacing: -0.3px; }
  .subtitle { font-size: 11px; color: ${c.sub}; margin-top: 3px; }
  .meta { text-align: right; font-size: 10px; color: ${c.sub}; line-height: 1.6; }
  .meta b { color: ${c.ink}; }
  .summary { display: flex; gap: 10px; margin-bottom: 26px; }
  .tile { flex: 1; border-radius: 8px; padding: 12px 14px; }
  .tile-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
  .tile-value { font-size: 17px; font-weight: 700; margin-top: 5px; color: ${c.ink}; }
  h2 { font-size: 13px; margin: 24px 0 10px; color: ${c.ink}; border-left: 3px solid ${c.accent}; padding-left: 9px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { text-align: left; background: #F7F7FA; padding: 7px 9px; font-weight: 700; color: ${c.sub}; text-transform: uppercase; font-size: 8.5px; letter-spacing: 0.3px; border-bottom: 1px solid ${c.line}; }
  td { padding: 7px 9px; border-bottom: 1px solid ${c.line}; }
  tr { page-break-inside: avoid; }
  .amt { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .note { color: ${c.sub}; max-width: 140px; }
  .pos { color: ${c.income}; } .neg { color: ${c.expense}; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 4px; margin-right: 7px; }
  .empty { text-align: center; padding: 40px 0; color: ${c.sub}; font-size: 12px; }
  .cap-note, .footer { margin-top: 16px; font-size: 9px; color: ${c.sub}; }
  .footer { text-align: center; margin-top: 26px; border-top: 1px solid ${c.line}; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Tally</div>
      <div class="subtitle">Financial Report</div>
    </div>
    <div class="meta">
      <div>Generated <b>${escapeHtml(formatFullDate(todayKey()))} · ${escapeHtml(formatTime12(toTimeKey()))}</b></div>
      <div>Period: <b>${escapeHtml(range.label)}</b></div>
    </div>
  </div>

  <div class="summary">
    <div class="tile" style="background:${c.incomeTint}">
      <div class="tile-label" style="color:${c.income}">Income</div>
      <div class="tile-value">${formatCurrency(summary.income)}</div>
    </div>
    <div class="tile" style="background:${c.expenseTint}">
      <div class="tile-label" style="color:${c.expense}">Expense</div>
      <div class="tile-value">${formatCurrency(summary.expense)}</div>
    </div>
    <div class="tile" style="background:${c.accentTint}">
      <div class="tile-label" style="color:${c.accent}">Net</div>
      <div class="tile-value ${summary.net >= 0 ? 'pos' : 'neg'}">${summary.net >= 0 ? '+' : ''}${formatCurrency(summary.net)}</div>
    </div>
  </div>

  ${breakdown.length > 0 ? `
  <h2>Expense breakdown</h2>
  <table>
    <thead><tr><th>Category</th><th class="amt">Amount</th><th class="amt">Share</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>` : ''}

  <h2>Transactions (${rows.length})</h2>
  ${rows.length > 0 ? `
  <table>
    <thead><tr><th>Date &amp; time</th><th>Type</th><th>Category</th><th>Account</th><th>Note</th><th class="amt">Amount</th></tr></thead>
    <tbody>${txRows}</tbody>
  </table>
  ${rows.length > PDF_ROW_CAP ? `<div class="cap-note">Showing the most recent ${PDF_ROW_CAP.toLocaleString()} of ${rows.length.toLocaleString()} transactions. Export as CSV or JSON for the complete dataset.</div>` : ''}
  ` : `<div class="empty">No transactions in this period.</div>`}

  <div class="footer">Generated by Tally — offline personal finance tracker · v${APP_VERSION}</div>
</body>
</html>`;
}

async function withMinDelay<T>(promise: Promise<T>, minMs: number): Promise<T> {
  const start = Date.now();
  const result = await promise;
  const elapsed = Date.now() - start;
  if (elapsed < minMs) await new Promise<void>((resolve) => setTimeout(resolve, minMs - elapsed));
  return result;
}

const MIME: Record<ExportFormat, string> = { csv: 'text/csv', json: 'application/json', pdf: 'application/pdf' };
const EXT: Record<ExportFormat, string> = { csv: 'csv', json: 'json', pdf: 'pdf' };

/**
 * Generate the requested export for a resolved range and hand it to the OS share sheet.
 * `onStage` is called with an index into EXPORT_STAGES as each phase starts, so the UI can show
 * a staged progress experience — each phase has a small minimum dwell so fast steps don't flash
 * by unreadably, without holding up anything that's genuinely slower (e.g. PDF conversion).
 */
export async function runExport(
  format: ExportFormat,
  range: ResolvedExportRange,
  onStage?: (stage: number) => void,
): Promise<void> {
  onStage?.(0);
  const needsBreakdown = format === 'pdf';
  const [rows, summary, breakdown] = await withMinDelay(
    Promise.all([
      listTransactionsInRange(range.start, range.end),
      getSummaryInRange(range.start, range.end),
      needsBreakdown ? getExpenseBreakdownInRange(range.start, range.end) : Promise.resolve([]),
    ]),
    450,
  );

  onStage?.(1);
  const filename = `tally-report-${timestampSlug()}.${EXT[format]}`;
  await withMinDelay(Promise.resolve(), 350);

  onStage?.(2);
  let path: string;
  if (format === 'csv') {
    path = `${RNFS.CachesDirectoryPath}/${filename}`;
    await withMinDelay(RNFS.writeFile(path, buildCsv(rows), 'utf8'), 400);
  } else if (format === 'json') {
    path = `${RNFS.CachesDirectoryPath}/${filename}`;
    await withMinDelay(RNFS.writeFile(path, buildJson(rows, summary, range), 'utf8'), 400);
  } else {
    const html = buildReportHtml(rows, summary, breakdown, range);
    const result = await withMinDelay(
      RNHTMLtoPDF.convert({ html, fileName: filename.replace(/\.pdf$/, ''), base64: false, width: 595, height: 842 }),
      600,
    );
    path = result.filePath;
  }

  onStage?.(3);
  await withMinDelay(
    Share.open({ url: `file://${path}`, type: MIME[format], filename, failOnCancel: false }),
    300,
  );
}
