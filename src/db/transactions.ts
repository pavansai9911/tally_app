import { getDb, genId, buildUpdate } from './database';

export interface Transaction {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  note: string | null;
  occurred_at: string;
  recurring_id: string | null;
}

export interface TransactionWithDetails extends Transaction {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  account_name: string;
}

export async function listTransactions(limit?: number): Promise<TransactionWithDetails[]> {
  const db = await getDb();
  const sql = `
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
           a.name as account_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    JOIN accounts a ON a.id = t.account_id
    ORDER BY t.occurred_at DESC
    ${limit ? 'LIMIT ?' : ''}
  `;
  return limit ? db.getAllAsync(sql, [limit]) : db.getAllAsync(sql);
}

export async function getTransaction(id: string): Promise<TransactionWithDetails | null> {
  const db = await getDb();
  return db.getFirstAsync(
    `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color, a.name as account_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     JOIN accounts a ON a.id = t.account_id
     WHERE t.id = ?`,
    [id]
  );
}

export async function createTransaction(input: Omit<Transaction, 'id'>): Promise<string> {
  const db = await getDb();
  const id = genId('tx');
  await db.runAsync(
    `INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, note, occurred_at, recurring_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.type, input.amount, input.account_id, input.to_account_id, input.category_id, input.note, input.occurred_at, input.recurring_id]
  );
  return id;
}

export async function updateTransaction(id: string, input: Partial<Transaction>): Promise<void> {
  const db = await getDb();
  const { clause, values } = buildUpdate<Transaction>(input, [
    'type', 'amount', 'account_id', 'to_account_id', 'category_id', 'note', 'occurred_at', 'recurring_id',
  ]);
  if (!clause) return;
  await db.runAsync(
    `UPDATE transactions SET ${clause}, updated_at = datetime('now') WHERE id = ?`,
    [...values, id]
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export interface MonthSummary {
  income: number;
  expense: number;
  net: number;
}

export async function getMonthSummary(monthKey: string): Promise<MonthSummary> {
  // monthKey format: 'YYYY-MM'
  const db = await getDb();
  const row = await db.getFirstAsync<{ income: number; expense: number }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
     FROM transactions
     WHERE occurred_at LIKE ? || '%'`,
    [monthKey]
  );
  const income = row?.income ?? 0;
  const expense = row?.expense ?? 0;
  return { income, expense, net: income - expense };
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
}

export async function getExpenseBreakdownByCategory(monthKey: string): Promise<CategoryBreakdown[]> {
  const db = await getDb();
  return db.getAllAsync<CategoryBreakdown>(
    `SELECT c.id as category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
            SUM(t.amount) as total
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense' AND t.occurred_at LIKE ? || '%'
     GROUP BY c.id
     ORDER BY total DESC`,
    [monthKey]
  );
}

export async function getMonthlyTrend(months: string[]): Promise<MonthSummary[]> {
  const results: MonthSummary[] = [];
  for (const m of months) {
    results.push(await getMonthSummary(m));
  }
  return results;
}

export async function getDailyBalanceSeries(startDate: string, endDate: string): Promise<{ date: string; balance: number }[]> {
  const db = await getDb();
  // Cumulative net change per day within range; caller adds the starting total balance offset.
  return db.getAllAsync(
    `SELECT occurred_at as date,
            SUM(CASE WHEN type='income' THEN amount WHEN type='expense' THEN -amount ELSE 0 END) as balance
     FROM transactions
     WHERE occurred_at BETWEEN ? AND ?
     GROUP BY occurred_at
     ORDER BY occurred_at ASC`,
    [startDate, endDate]
  );
}
