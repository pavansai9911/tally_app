import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, DEFAULT_CATEGORIES } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('tally.db');
  await dbInstance.execAsync(SCHEMA_SQL);
  await seedDefaultsIfEmpty(dbInstance);
  return dbInstance;
}

async function seedDefaultsIfEmpty(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );
  if (row && row.count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
        [genId('cat'), cat.name, cat.type, cat.icon, cat.color]
      );
    }
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row ? row.value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const v = await getSetting('onboarding_complete');
  return v === '1';
}
