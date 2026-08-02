// Hard reset — permanently erase everything and return the app to a fresh first-install state.
//
// This is the counterpart to automatic backup: because a valid Tally-tracker backup would
// otherwise be auto-restored on the next launch, a true reset must ALSO delete that backup.

import { getDb, resetDbHandle } from '@/db/database';
import { clearPin } from './lock';
import { deleteAutoBackupFile, resetAutoBackupState } from './autoBackup';

// Children before parents so foreign keys never block the delete.
const WIPE_ORDER = [
  'transactions', 'budgets', 'recurring_rules', 'habit_logs', 'habits', 'accounts', 'categories', 'settings',
];

/**
 * Erase all local data, the PIN, and the on-device backup. After this resolves the caller must
 * re-bootstrap the app (App restart) — the DB handle is dropped so the next getDb() re-seeds
 * default categories and, with onboarding_complete gone, the app starts fresh.
 */
export async function hardResetAllData(): Promise<void> {
  // 1. Detach auto-backup FIRST so the wipe below cannot schedule a backup of empty state.
  resetAutoBackupState();
  // 2. Delete the persistent backup so a reinstall / next launch can't bring the data back.
  await deleteAutoBackupFile();
  // 3. Remove the PIN from the OS keychain.
  try { await clearPin(); } catch { /* ignore */ }
  // 4. Wipe every table (including settings) in one transaction.
  const db = await getDb();
  await db.runAsync('BEGIN');
  try {
    for (const table of WIPE_ORDER) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    await db.runAsync('COMMIT');
  } catch (e) {
    try { await db.runAsync('ROLLBACK'); } catch { /* ignore */ }
    throw e;
  }
  // 5. Drop the cached handle so the next getDb() re-runs initDb (re-seeds default categories).
  resetDbHandle();
}
