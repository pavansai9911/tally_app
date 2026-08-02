// Automatic local backup & restore.
//
// Keeps an always-current encrypted snapshot of the user's REAL data in a public
// `Tally-tracker` folder (via the native TallyBackup module) so it survives an uninstall.
// On a fresh launch that finds a valid backup, it restores automatically so the user feels
// the app was never gone. Sample/seed data is excluded (see buildCleanBackupObject). The
// manual Backup & Restore feature is untouched and coexists with this.

import { NativeModules, Platform, PermissionsAndroid, AppState } from 'react-native';
import { getSetting, setSetting } from '@/db/database';
import { setMutationListener } from '@/db/driver';
import {
  buildCleanBackupObject, applyBackupObject, isValidBackup, BackupFile,
} from './backup';

interface TallyBackupNative {
  isPermissionGranted(): Promise<boolean>;
  requestPermission(): Promise<void>;
  getStatus(): Promise<{ granted: boolean; exists: boolean; path: string; modifiedAt: number; sizeBytes: number }>;
  writeBackup(json: string): Promise<{ path: string; modifiedAt: number }>;
  readBackup(): Promise<string | null>;
  deleteBackup(): Promise<boolean>;
}

const Native: TallyBackupNative | undefined = NativeModules.TallyBackup;

export const AUTO_BACKUP_ENABLED_KEY = 'auto_backup_enabled';
export const AUTO_BACKUP_LAST_AT_KEY = 'auto_backup_last_at';
const DEBOUNCE_MS = 1800;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let suppressed = false;      // true while restoring, so restore writes don't trigger a backup
let enabledCache = true;
let initialized = false;

export function isNativeBackupAvailable(): boolean {
  return !!Native;
}

export async function isPermissionGranted(): Promise<boolean> {
  if (!Native) return false;
  try { return await Native.isPermissionGranted(); } catch { return false; }
}

/** Open the system grant flow (All-files access on Android 11+, runtime permission below that). */
export async function requestPermission(): Promise<void> {
  if (!Native) return;
  const sdk = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  if (Platform.OS === 'android' && sdk < 30) {
    try { await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE); } catch { /* ignore */ }
    return;
  }
  try { await Native.requestPermission(); } catch { /* ignore */ }
}

export async function getBackupStatus(): Promise<{ granted: boolean; exists: boolean; path: string; modifiedAt: number; sizeBytes: number }> {
  const fallback = { granted: false, exists: false, path: '', modifiedAt: 0, sizeBytes: 0 };
  if (!Native) return fallback;
  try { return await Native.getStatus(); } catch { return fallback; }
}

export async function isAutoBackupEnabled(): Promise<boolean> {
  const v = await getSetting(AUTO_BACKUP_ENABLED_KEY);
  return v == null ? true : v === '1'; // default ON
}

export async function setAutoBackupEnabled(on: boolean): Promise<void> {
  enabledCache = on;
  await setSetting(AUTO_BACKUP_ENABLED_KEY, on ? '1' : '0');
  if (on) scheduleBackup();
}

export async function getLastBackupAt(): Promise<string | null> {
  return getSetting(AUTO_BACKUP_LAST_AT_KEY);
}

/**
 * Register the mutation listener so future edits trigger debounced backups. Call ONCE, and only
 * AFTER the restore decision is made — otherwise initial seeding or the restore itself would
 * overwrite the good backup with half-built state.
 */
export async function initAutoBackup(): Promise<void> {
  if (initialized || !Native) return;
  initialized = true;
  enabledCache = await isAutoBackupEnabled();
  setMutationListener(() => { if (!suppressed) scheduleBackup(); });
  // Flush a pending (debounced) backup when the app leaves the foreground, so an edit made
  // moments before the app is backgrounded/killed still reaches the on-disk backup.
  AppState.addEventListener('change', (s) => {
    if ((s === 'background' || s === 'inactive') && debounceTimer) {
      backupNow().catch(() => {});
    }
  });
}

/** Debounced: coalesces a burst of edits into a single backup write ~1.8s later. */
export function scheduleBackup(): void {
  if (!Native || !enabledCache) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { performBackup().catch(() => {}); }, DEBOUNCE_MS);
}

/** Build a clean (seed-excluded) snapshot and write it encrypted. Returns false if it couldn't run. */
export async function performBackup(): Promise<boolean> {
  if (!Native || !enabledCache) return false;
  if (!(await isPermissionGranted())) return false;
  try {
    const backup = await buildCleanBackupObject();
    await Native.writeBackup(JSON.stringify(backup));
    // Record the timestamp WITHOUT retriggering the mutation listener — otherwise this write
    // would schedule another backup, which writes the timestamp again, forever.
    suppressed = true;
    try { await setSetting(AUTO_BACKUP_LAST_AT_KEY, new Date().toISOString()); }
    finally { suppressed = false; }
    return true;
  } catch {
    return false;
  }
}

/** Force a backup now regardless of the debounce (used by "Back up now" and after onboarding). */
export async function backupNow(): Promise<boolean> {
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  return performBackup();
}

/** Delete the on-device backup file (used by Hard Reset). */
export async function deleteAutoBackupFile(): Promise<void> {
  if (!Native) return;
  try { await Native.deleteBackup(); } catch { /* ignore */ }
}

/**
 * Fully detach auto-backup (used by Hard Reset before wiping): unregister the mutation listener
 * so the wipe doesn't schedule a backup, cancel any pending write, and reset init state so a
 * later initAutoBackup() re-arms cleanly as if the app had just launched.
 */
export function resetAutoBackupState(): void {
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  suppressed = false;
  enabledCache = true;
  initialized = false;
  setMutationListener(null);
}

/**
 * Attempt an automatic restore from the Tally-tracker backup. Returns true only if valid data
 * was restored. The native layer returns null for a missing/corrupt/wrong-device backup, so an
 * invalid backup simply results in a normal fresh start (no crash).
 */
export async function tryAutoRestore(): Promise<boolean> {
  if (!Native) return false;
  if (!(await isPermissionGranted())) return false;
  let json: string | null = null;
  try { json = await Native.readBackup(); } catch { return false; }
  if (!json) return false;

  let backup: BackupFile;
  try { backup = JSON.parse(json); } catch { return false; }
  if (!isValidBackup(backup)) return false;

  suppressed = true;
  try {
    await applyBackupObject(backup);
    return true;
  } catch {
    return false;
  } finally {
    suppressed = false;
  }
}
