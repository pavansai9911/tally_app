import { getDb, genId, buildUpdate } from './database';

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  archived: number;
  sort_order: number;
  /** Stable id for a seeded default (e.g. 'other'); null for user-created categories. */
  default_key: string | null;
}

// The default "Other" category is always pinned to the very bottom, regardless of sort_order or
// any drag-drop reordering. Everything else follows sort_order (new categories sort above).
const ORDER_BY = "ORDER BY (CASE WHEN default_key = 'other' THEN 1 ELSE 0 END) ASC, sort_order ASC";

export async function listCategories(type?: 'expense' | 'income'): Promise<Category[]> {
  const db = await getDb();
  if (type) {
    return db.getAllAsync<Category>(
      `SELECT * FROM categories WHERE archived = 0 AND type = ? ${ORDER_BY}`,
      [type]
    );
  }
  return db.getAllAsync<Category>(`SELECT * FROM categories WHERE archived = 0 ${ORDER_BY}`);
}

export async function createCategory(input: Omit<Category, 'id' | 'archived' | 'sort_order' | 'default_key'>): Promise<string> {
  const db = await getDb();
  const id = genId('cat');
  // Place new categories at the TOP of their type: one below the current minimum sort_order.
  const min = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MIN(sort_order) as m FROM categories WHERE type = ?', [input.type],
  );
  const sortOrder = (min?.m ?? 0) - 1;
  await db.runAsync(
    'INSERT INTO categories (id, name, type, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.name, input.type, input.icon, input.color, sortOrder]
  );
  return id;
}

export async function updateCategory(id: string, input: Partial<Category>): Promise<void> {
  const db = await getDb();
  const { clause, values } = buildUpdate<Category>(input, ['name', 'type', 'icon', 'color', 'archived', 'sort_order']);
  if (!clause) return;
  await db.runAsync(`UPDATE categories SET ${clause} WHERE id = ?`, [...values, id]);
}

/** Persist a manual (drag-drop) reorder: sort_order becomes the position in `orderedIds`. */
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', [i, orderedIds[i]]);
  }
}

const DELETED_DEFAULTS_KEY = 'deleted_default_keys';

/** Default categories the user has deleted — never recreate these on a future app update. */
export async function getDeletedDefaultKeys(): Promise<string[]> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [DELETED_DEFAULTS_KEY]);
  if (!row?.value) return [];
  try { return JSON.parse(row.value) as string[]; } catch { return []; }
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  const cat = await db.getFirstAsync<{ default_key: string | null }>(
    'SELECT default_key FROM categories WHERE id = ?', [id],
  );
  await db.runAsync('UPDATE categories SET archived = 1 WHERE id = ?', [id]);
  // Tombstone a deleted default so a future update's default-seeding respects the choice.
  if (cat?.default_key) {
    const keys = await getDeletedDefaultKeys();
    if (!keys.includes(cat.default_key)) {
      keys.push(cat.default_key);
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [DELETED_DEFAULTS_KEY, JSON.stringify(keys)],
      );
    }
  }
}

export async function countTransactionsForCategory(id: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
    [id]
  );
  return row?.count ?? 0;
}

// ---------------- BUDGETS ----------------

export interface Budget {
  id: string;
  category_id: string;
  monthly_limit: number;
  recurrence: 'monthly' | 'one_time';
  alert_near_limit: number;
  alert_threshold_pct: number;
}

export interface BudgetWithSpend extends Budget {
  category_name: string;
  category_icon: string;
  category_color: string;
  spent: number;
}

export async function listBudgetsWithSpend(monthKey: string): Promise<BudgetWithSpend[]> {
  const db = await getDb();
  return db.getAllAsync<BudgetWithSpend>(
    `SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
            COALESCE((SELECT SUM(t.amount) FROM transactions t
                      WHERE t.category_id = b.category_id AND t.type = 'expense' AND t.occurred_at LIKE ? || '%'), 0) as spent
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     ORDER BY b.created_at DESC`,
    [monthKey]
  );
}

/** A category can hold at most one budget — used to update instead of duplicating. */
export async function getBudgetByCategory(categoryId: string): Promise<Budget | null> {
  const db = await getDb();
  return db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE category_id = ? LIMIT 1', [categoryId]);
}

export async function createBudget(input: Omit<Budget, 'id'>): Promise<string> {
  const db = await getDb();
  const id = genId('bud');
  await db.runAsync(
    `INSERT INTO budgets (id, category_id, monthly_limit, recurrence, alert_near_limit, alert_threshold_pct)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.category_id, input.monthly_limit, input.recurrence, input.alert_near_limit, input.alert_threshold_pct]
  );
  return id;
}

export async function updateBudget(id: string, input: Partial<Budget>): Promise<void> {
  const db = await getDb();
  const { clause, values } = buildUpdate<Budget>(input, [
    'category_id', 'monthly_limit', 'recurrence', 'alert_near_limit', 'alert_threshold_pct',
  ]);
  if (!clause) return;
  await db.runAsync(`UPDATE budgets SET ${clause} WHERE id = ?`, [...values, id]);
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}

// ---------------- RECURRING ----------------

export interface RecurringRule {
  id: string;
  type: 'expense' | 'income';
  name: string;
  amount: number;
  category_id: string | null;
  account_id: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  next_date: string;
  auto_add: number;
  active: number;
}

export async function listRecurringRules(): Promise<RecurringRule[]> {
  const db = await getDb();
  return db.getAllAsync<RecurringRule>(
    'SELECT * FROM recurring_rules WHERE active = 1 ORDER BY next_date ASC'
  );
}

export async function createRecurringRule(input: Omit<RecurringRule, 'id' | 'active'>): Promise<string> {
  const db = await getDb();
  const id = genId('rec');
  await db.runAsync(
    `INSERT INTO recurring_rules (id, type, name, amount, category_id, account_id, frequency, next_date, auto_add)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.type, input.name, input.amount, input.category_id, input.account_id, input.frequency, input.next_date, input.auto_add]
  );
  return id;
}

export async function updateRecurringRule(id: string, input: Partial<RecurringRule>): Promise<void> {
  const db = await getDb();
  const { clause, values } = buildUpdate<RecurringRule>(input, [
    'type', 'name', 'amount', 'category_id', 'account_id', 'frequency', 'next_date', 'auto_add', 'active',
  ]);
  if (!clause) return;
  await db.runAsync(`UPDATE recurring_rules SET ${clause} WHERE id = ?`, [...values, id]);
}

export async function deleteRecurringRule(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE recurring_rules SET active = 0 WHERE id = ?', [id]);
}
