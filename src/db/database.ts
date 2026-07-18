import { openDatabase, wrapDb, SqlDb } from './driver';
import { MIGRATIONS, DEFAULT_CATEGORIES } from './schema';

export const DB_NAME = 'tally.db';

let dbInstance: SqlDb | null = null;
let initPromise: Promise<SqlDb> | null = null;

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function initDb(): Promise<SqlDb> {
  const raw = openDatabase(DB_NAME);
  const db = wrapDb(raw);
  // Per-connection pragmas (foreign_keys is NOT persisted, must be set every open).
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.runAsync('PRAGMA foreign_keys = ON');
  await runMigrations(db);
  await seedDefaultsIfEmpty(db);
  return db;
}

export async function getDb(): Promise<SqlDb> {
  if (dbInstance) return dbInstance;
  if (!initPromise) {
    initPromise = initDb().then((db) => {
      dbInstance = db;
      return db;
    });
  }
  return initPromise;
}

/** Drop the cached handle (used after a restore replaces the DB file). */
export function resetDbHandle(): void {
  dbInstance = null;
  initPromise = null;
}

async function runMigrations(db: SqlDb): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      for (const stmt of migration.statements) {
        await db.runAsync(stmt);
      }
      // PRAGMA cannot be parameterised; version is our own trusted integer.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      current = migration.version;
    }
  }
}

async function seedDefaultsIfEmpty(db: SqlDb): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  if (row && row.count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.runAsync('INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)', [
        genId('cat'),
        cat.name,
        cat.type,
        cat.icon,
        cat.color,
      ]);
    }
  }
}

/**
 * Build a safe `SET a = ?, b = ?` clause from a partial input, restricted to an explicit
 * column whitelist. Prevents unexpected/undefined keys reaching SQL and keeps updates
 * injection-safe even if a caller passes an over-broad object.
 */
export function buildUpdate<T extends object>(
  input: Partial<T>,
  allowed: (keyof T)[],
): { clause: string; values: unknown[] } {
  const keys = (Object.keys(input) as (keyof T)[]).filter(
    (k) => allowed.includes(k) && input[k] !== undefined,
  );
  const clause = keys.map((k) => `${String(k)} = ?`).join(', ');
  const values = keys.map((k) => input[k] as unknown);
  return { clause, values };
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const v = await getSetting('onboarding_complete');
  return v === '1';
}
