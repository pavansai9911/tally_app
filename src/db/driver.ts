// Thin SQLite driver adapter.
//
// The rest of the app talks to `SqlDb`, never to op-sqlite directly. This keeps the
// query layer identical to what it was under expo-sqlite (getFirstAsync / getAllAsync /
// runAsync / execAsync) and means a future driver swap only touches this one file.
//
// The adapter is deliberately defensive about op-sqlite's result shape and sync/async
// `execute` behaviour because those have varied across op-sqlite versions.

import { open } from '@op-engineering/op-sqlite';

type RawDb = ReturnType<typeof open>;

export interface SqlResult {
  insertId?: number;
  rowsAffected: number;
}

export interface SqlDb {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<SqlResult>;
  getAllAsync<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T = any>(sql: string, params?: unknown[]): Promise<T | null>;
}

// op-sqlite rejects `undefined` bind values — coerce them to null. This also fixes the
// original edit-transaction crash where `occurred_at: undefined` was bound.
function sanitize(params?: unknown[]): unknown[] {
  if (!params || params.length === 0) return [];
  return params.map((p) => (p === undefined ? null : p));
}

async function run(raw: RawDb, sql: string, params?: unknown[]): Promise<any> {
  const r: any = (raw as any).execute(sql, sanitize(params));
  return r && typeof r.then === 'function' ? await r : r;
}

function extractRows(res: any): any[] {
  if (!res) return [];
  const rows = res.rows ?? res;
  if (Array.isArray(rows)) return rows;
  if (rows && Array.isArray(rows._array)) return rows._array;
  return [];
}

export function wrapDb(raw: RawDb): SqlDb {
  const db: SqlDb = {
    async execAsync(sql: string) {
      // Run a (possibly multi-statement) SQL script one statement at a time.
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const s of statements) {
        await run(raw, s);
      }
    },
    async runAsync(sql: string, params?: unknown[]) {
      const res = await run(raw, sql, params);
      return { insertId: res?.insertId, rowsAffected: res?.rowsAffected ?? 0 };
    },
    async getAllAsync<T>(sql: string, params?: unknown[]) {
      const res = await run(raw, sql, params);
      return extractRows(res) as T[];
    },
    async getFirstAsync<T>(sql: string, params?: unknown[]) {
      const rows = await db.getAllAsync<T>(sql, params);
      return rows.length ? (rows[0] as T) : null;
    },
  };
  return db;
}

export function openDatabase(name: string): RawDb {
  return open({ name });
}
