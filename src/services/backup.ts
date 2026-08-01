// Backup / restore + CSV export.
//
// Critical for an offline app: without this, a user loses everything on a phone change or
// "clear storage". Backup is a portable JSON snapshot of every table (shared via the OS
// share sheet). Restore reads a snapshot back, replacing all data inside one transaction.
// Security-sensitive values (the PIN salt) are never exported.

import * as RNFS from '@dr.pogodin/react-native-fs';
import Share from 'react-native-share';
import { pick } from '@react-native-documents/picker';
import { getDb } from '@/db/database';
import { LATEST_SCHEMA_VERSION } from '@/db/schema';
import { SEED_FLAG_KEY } from '@/services/seed';

const BACKUP_TABLES = [
  'accounts',
  'categories',
  'habits',
  'transactions',
  'budgets',
  'recurring_rules',
  'habit_logs',
] as const;

// Delete children before parents (FKs on); insert parents before children.
const DELETE_ORDER = ['transactions', 'budgets', 'recurring_rules', 'habit_logs', 'habits', 'accounts', 'categories'];
const INSERT_ORDER = ['accounts', 'categories', 'habits', 'transactions', 'budgets', 'recurring_rules', 'habit_logs'];

// Never leave the device inside a backup/restore:
//  - pin_salt: security-sensitive; the PIN hash itself lives only in the OS keychain.
//  - lock_enabled / biometric_enabled: credentials can't survive a reinstall (keychain is
//    wiped), so a restored install must start with the lock off rather than showing a phantom
//    "enabled" lock with no PIN behind it. The user re-enables it and re-sets the PIN.
//  - seed marker + auto-backup bookkeeping: device-local state that must not travel.
const EXCLUDED_SETTINGS = new Set([
  'pin_salt', 'lock_enabled', 'biometric_enabled', SEED_FLAG_KEY, 'auto_backup_last_at',
]);

export interface BackupFile {
  app: 'tally';
  schemaVersion: number;
  exportedAt: string;
  data: Record<string, any[]>;
  settings: Record<string, string>;
}

export async function buildBackupObject(): Promise<BackupFile> {
  const db = await getDb();
  const data: Record<string, any[]> = {};
  for (const table of BACKUP_TABLES) {
    data[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  }
  const settingsRows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const row of settingsRows) {
    if (!EXCLUDED_SETTINGS.has(row.key)) settings[row.key] = row.value;
  }
  return {
    app: 'tally',
    schemaVersion: LATEST_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
    settings,
  };
}

/**
 * Backup object that EXCLUDES sample/seed data. Used by the automatic local backup so a
 * restore never resurrects demo records — even if the user had seeded data on the last install.
 * Seeded account/category/habit ids are read from the seed marker; dependent rows (transactions,
 * budgets, recurring rules, habit logs) that reference a seeded id are excluded too.
 */
export async function buildCleanBackupObject(): Promise<BackupFile> {
  const db = await getDb();
  const marker = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?', [SEED_FLAG_KEY],
  );
  let seededAccounts = new Set<string>();
  let seededCategories = new Set<string>();
  let seededHabits = new Set<string>();
  if (marker?.value) {
    try {
      const m = JSON.parse(marker.value);
      seededAccounts = new Set<string>(m.accounts ?? []);
      seededCategories = new Set<string>(m.categories ?? []);
      seededHabits = new Set<string>(m.habits ?? []);
    } catch {
      // Malformed marker -> back up everything rather than losing real data.
    }
  }

  const all: Record<string, any[]> = {};
  for (const table of BACKUP_TABLES) all[table] = await db.getAllAsync(`SELECT * FROM ${table}`);

  const data: Record<string, any[]> = {
    accounts: all.accounts.filter(r => !seededAccounts.has(r.id)),
    categories: all.categories.filter(r => !seededCategories.has(r.id)),
    habits: all.habits.filter(r => !seededHabits.has(r.id)),
    transactions: all.transactions.filter(r =>
      !seededAccounts.has(r.account_id) && !seededAccounts.has(r.to_account_id) && !seededCategories.has(r.category_id)),
    budgets: all.budgets.filter(r => !seededCategories.has(r.category_id)),
    recurring_rules: all.recurring_rules.filter(r =>
      !seededAccounts.has(r.account_id) && !seededCategories.has(r.category_id)),
    habit_logs: all.habit_logs.filter(r => !seededHabits.has(r.habit_id)),
  };

  const settingsRows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const row of settingsRows) {
    if (!EXCLUDED_SETTINGS.has(row.key)) settings[row.key] = row.value;
  }
  return { app: 'tally', schemaVersion: LATEST_SCHEMA_VERSION, exportedAt: new Date().toISOString(), data, settings };
}

/** True when the clean (seed-excluded) snapshot has at least one real user record worth saving. */
export async function hasRealUserData(): Promise<boolean> {
  const backup = await buildCleanBackupObject();
  return Object.values(backup.data).some(rows => rows.length > 0);
}

function timestampSlug(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Write the backup to a file and open the share sheet. */
export async function exportBackup(): Promise<void> {
  const backup = await buildBackupObject();
  const filename = `tally-backup-${timestampSlug()}.json`;
  const path = `${RNFS.CachesDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, JSON.stringify(backup, null, 2), 'utf8');
  await Share.open({
    url: `file://${path}`,
    type: 'application/json',
    filename,
    failOnCancel: false,
  });
}

/** Export all transactions as a CSV and open the share sheet. */
export async function exportTransactionsCsv(): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    occurred_at: string; type: string; amount: number; category_name: string | null;
    account_name: string; note: string | null;
  }>(`
    SELECT t.occurred_at, t.type, t.amount, c.name AS category_name, a.name AS account_name, t.note
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    JOIN accounts a ON a.id = t.account_id
    ORDER BY t.occurred_at DESC
  `);

  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // occurred_at is 'YYYY-MM-DD HH:MM' (older rows may be date-only).
  const header = 'Date & time,Type,Amount,Category,Account,Note';
  const lines = rows.map((r) =>
    [r.occurred_at, r.type, r.amount, r.category_name ?? '', r.account_name, r.note ?? ''].map(esc).join(','),
  );
  const csv = [header, ...lines].join('\n');

  const filename = `tally-transactions-${timestampSlug()}.csv`;
  const path = `${RNFS.CachesDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, csv, 'utf8');
  await Share.open({
    url: `file://${path}`,
    type: 'text/csv',
    filename,
    failOnCancel: false,
  });
}

function insertSql(table: string, row: Record<string, unknown>): { sql: string; values: unknown[] } {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
  const values = cols.map((c) => (row[c] === undefined ? null : row[c]));
  return { sql, values };
}

/** True if an object looks like a Tally backup we can restore. */
export function isValidBackup(backup: any): backup is BackupFile {
  return !!backup && backup.app === 'tally' && !!backup.data;
}

/**
 * Replace ALL current data with the contents of a parsed backup, inside one transaction.
 * Shared by manual restore and automatic restore. Throws on failure (caller keeps old data
 * because the transaction is rolled back).
 */
export async function applyBackupObject(backup: BackupFile): Promise<void> {
  const db = await getDb();
  try {
    await db.runAsync('BEGIN');
    for (const table of DELETE_ORDER) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    for (const table of INSERT_ORDER) {
      const rows = backup.data[table] ?? [];
      for (const row of rows) {
        const { sql, values } = insertSql(table, row);
        await db.runAsync(sql, values);
      }
    }
    if (backup.settings) {
      for (const [key, value] of Object.entries(backup.settings)) {
        if (EXCLUDED_SETTINGS.has(key)) continue;
        await db.runAsync(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          [key, value],
        );
      }
    }
    await db.runAsync('COMMIT');
  } catch (e) {
    try { await db.runAsync('ROLLBACK'); } catch { /* ignore */ }
    throw e;
  }
}

/** Let the user pick a backup file and restore it (replaces ALL current data). */
export async function importBackupInteractive(): Promise<{ restored: boolean; error?: string }> {
  let contents: string;
  try {
    const results = await pick({ allowMultiSelection: false });
    const file = Array.isArray(results) ? results[0] : results;
    if (!file?.uri) return { restored: false, error: 'No file selected' };
    contents = await RNFS.readFile(file.uri, 'utf8');
  } catch (e: any) {
    // User cancelled the picker, or read failed.
    if (e?.code === 'DOCUMENT_PICKER_CANCELED' || e?.message?.includes('cancel')) {
      return { restored: false };
    }
    return { restored: false, error: 'Could not read the selected file' };
  }

  let backup: BackupFile;
  try {
    backup = JSON.parse(contents);
  } catch {
    return { restored: false, error: 'That file is not valid JSON' };
  }
  if (!isValidBackup(backup)) {
    return { restored: false, error: 'That does not look like a Tally backup' };
  }

  try {
    await applyBackupObject(backup);
    return { restored: true };
  } catch {
    return { restored: false, error: 'Restore failed — your existing data was kept' };
  }
}
