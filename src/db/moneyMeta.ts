import { getDb, genId, buildUpdate } from './database';

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  archived: number;
}

export async function listCategories(type?: 'expense' | 'income'): Promise<Category[]> {
  const db = await getDb();
  if (type) {
    return db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE archived = 0 AND type = ? ORDER BY sort_order ASC',
      [type]
    );
  }
  return db.getAllAsync<Category>('SELECT * FROM categories WHERE archived = 0 ORDER BY sort_order ASC');
}

export async function createCategory(input: Omit<Category, 'id' | 'archived'>): Promise<string> {
  const db = await getDb();
  const id = genId('cat');
  await db.runAsync(
    'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
    [id, input.name, input.type, input.icon, input.color]
  );
  return id;
}

export async function updateCategory(id: string, input: Partial<Category>): Promise<void> {
  const db = await getDb();
  const { clause, values } = buildUpdate<Category>(input, ['name', 'type', 'icon', 'color', 'archived']);
  if (!clause) return;
  await db.runAsync(`UPDATE categories SET ${clause} WHERE id = ?`, [...values, id]);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET archived = 1 WHERE id = ?', [id]);
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
